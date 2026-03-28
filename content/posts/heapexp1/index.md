---
title: "Heap Exploitation Part 1"
date: 2024-06-10
draft: false
description: "Exploring GLIBC Heap"
intro: "Exploring GLIBC Heap"
tags: ["heap-exploitation", "reversing", "glibc"]
image: "cover.svg"
animcard: "exploitation"
animcardtitle: "GLIBC Heap Layout"
animcardnote: "Chunk anatomy, arena structure, and the allocator surface before exploitation."
showtoc: true
hideSummary: true
---
## Intro

This is the first part of the heap exploitation series. In this post I will build a clean mental model of the glibc allocator before getting into bugs and primitives. The goal here is not to memorize every macro in `malloc.c`, but to understand the objects that keep showing up in heap write-ups: arenas, chunks, the top chunk, and the different bins.

One important note before we start: glibc heap internals are version-sensitive. Constants, tcache behavior, and even which code path gets hit first can change between releases, so treat the structures in this post as the model you should verify against the exact glibc version on your target.

---

## What Is the Heap and Why Do We Use It?

The heap is the part of a process address space used for dynamic memory allocation. Programs use it when they need memory whose size or lifetime is not known at compile time. In C, the usual interface is `malloc` to allocate memory and `free` to release it.

From user space, that looks simple: ask for `n` bytes, get a pointer back. Internally, glibc has to do much more work. It needs to align requests, track chunk size and state, reuse freed chunks when possible, and sometimes ask the kernel for more memory with `brk`/`sbrk` or `mmap`.

The heap is useful when stack allocation is the wrong tool:

- the object size changes at runtime
- the object has to outlive the current function call
- the program needs many objects without risking stack exhaustion

---

## Illustrative Process Memory Layout

The following layout is only an illustration. Exact addresses vary with ASLR, PIE, loader behavior, mappings, and kernel configuration.

```markdown
High Memory Addresses
      +------------------+
      |      Stack       |
      |        |         |
      |        v         |
      | (grows downward) |
      +------------------+
      |                  |
      |        ^         |
      |        |         |
      |       Heap       |
      |  (grows upward)  |
      +------------------+
      |   BSS Segment    |
      +------------------+
      |   Data Segment   |
      +------------------+
      |   Code Segment   |
      +------------------+
Low Memory Addresses
```

---

## Allocator Lineage

glibc's allocator is not "ptmalloc3". The official GNU C Library manual describes glibc `malloc` as being derived from **ptmalloc**, which itself is derived from **dlmalloc**. Modern glibc keeps that lineage, but the allocator in current releases is glibc's own maintained implementation, not a separate allocator family you should label as `ptmalloc3`.

That distinction matters when you read exploitation material. A lot of posts casually mix historical names, but if you are checking behavior in a real target you should always go back to the exact glibc source and the release-specific internals.

There are several other widely used allocators outside glibc:

- `jemalloc`
- `tcmalloc`
- `mimalloc`

They are useful comparisons, but their internals and attack surface are different from glibc `malloc`.

---

## Arenas

glibc uses **multiple arenas** to reduce lock contention in multi-threaded programs. An arena is a region of allocator-managed state that tracks chunks and bins for a subset of allocations.

The important correction here is that it is **not** accurate to say "each thread has its own arena" as a strict rule. glibc can create multiple arenas and threads can create or reuse them depending on contention and configuration. The number of arenas is also tunable through settings such as `glibc.malloc.arena_test` and `glibc.malloc.arena_max`.

So the right mental model is:

- a process can have multiple arenas
- arenas improve scalability under multi-threading
- threads may allocate from different arenas, but arena ownership is not a simple permanent one-thread-one-arena rule

```markdown
   Process
   +------------------------------------------------+
   | Arena 0                                        |
   |  +-----------------------------+               |
   |  | bins, top chunk, metadata   |               |
   |  +-----------------------------+               |
   +------------------------------------------------+

   +------------------------------------------------+
   | Arena 1                                        |
   |  +-----------------------------+               |
   |  | bins, top chunk, metadata   |               |
   |  +-----------------------------+               |
   +------------------------------------------------+

   Threads allocate through whichever arena glibc
   assigns or reuses for that execution path.
```

---

## Chunks

A **chunk** is the allocator's basic unit of bookkeeping. `malloc` does not just hand out a raw region of bytes; it hands out memory that sits inside a chunk with allocator metadata around it.

```c
struct malloc_chunk {
  INTERNAL_SIZE_T      mchunk_prev_size;  /* Size of previous chunk (if free).  */
  INTERNAL_SIZE_T      mchunk_size;       /* Size in bytes, including overhead. */

  struct malloc_chunk* fd;                /* double links -- used only if free. */
  struct malloc_chunk* bk;

  struct malloc_chunk* fd_nextsize;       /* used for large free chunks */
  struct malloc_chunk* bk_nextsize;
};
```

One common beginner mistake is to treat chunk size as "requested size + fixed metadata" in every case. glibc actually computes the internal chunk size with macros such as `request2size`, plus alignment and minimum-size rules.

For example, on a typical 64-bit glibc build:

- `malloc(0x10)` requests 16 bytes of user data
- `request2size(0x10)` rounds that up to an internal chunk size of `0x20`

That result is correct for a normal x86-64 glibc configuration, but the reasoning should come from the allocator's size calculation logic, not from memorizing "16 bytes of metadata are always added".

---

## Chunk Metadata

```markdown
An allocated chunk looks like this:

chunk->     +-------------------------------------------+
            | Size of previous chunk, if previous free  |
            +-------------------------------------------+
            | Size of chunk, in bytes             |N|M|P|
mem->       +-------------------------------------------+
            | User data starts here...                  |
            .                                           .
            .                                           .
            .                                           .
nextchunk-> +-------------------------------------------+
            | Size of next chunk, in bytes        |N|M|P|
            +-------------------------------------------+
```

The low bits in `mchunk_size` are not `Allocated / Mmap / Previous In Use`. In glibc source they are:

- `PREV_INUSE` (`P`): the previous chunk is in use
- `IS_MMAPPED` (`M`): this chunk came from `mmap`
- `NON_MAIN_ARENA` (`N`): this chunk belongs to a non-main arena

That last bit is especially important because a lot of beginner diagrams incorrectly label it as "allocated". glibc does **not** store a simple "this chunk is allocated" bit in the current chunk header. For normal arena chunks, whether the current chunk is in use is inferred from the **next** chunk's `PREV_INUSE` bit.

Two practical takeaways:

- `mchunk_prev_size` is meaningful when the previous chunk is free
- you should read `mchunk_size` as "size plus flag bits", not just as a pure size field

---

## Bins

glibc organizes freed chunks into several structures so future allocations can be served quickly. The exact layout is version-dependent, but the big picture stays the same: recently freed small chunks are often served from per-thread caches first, while other free chunks move through arena-managed bin lists.

### Small Bins

Small bins are **exact-size doubly linked bins** for smaller chunk classes below the large-bin threshold. In current glibc source, `NBINS` is `128`, `NSMALLBINS` is `64`, and the boundary between small and large bins is computed with `MIN_LARGE_SIZE`.

In practice, when people say "small bins", they mean:

- exact-size classes
- doubly linked lists
- chunks that are too large for the fastbin path but still below the large-bin range

```markdown
Small bins
+--------------+
| smallbin[i]  |
+--------------+
       |
       v
+-------------+ <--> +-------------+ <--> +-------------+
| Chunk (fd)  |      | Chunk (fd)  |      | Chunk (fd)  |
| Chunk (bk)  |      | Chunk (bk)  |      | Chunk (bk)  |
+-------------+      +-------------+      +-------------+
```

### Fastbins

Fastbins are singly linked lists used for the smallest freed chunks. The exact maximum size is controlled by `glibc.malloc.mxfast`. According to the glibc manual, the default fastbin limit is:

- `80` bytes on 32-bit systems
- `160` bytes on 64-bit systems

That value includes allocator overhead, so it is more accurate than the oversimplified "fastbins are always <= 64 bytes" rule you often see in old notes.

```markdown
Fastbins
+------------+
| fastbin[i] |
+------------+
       |
       v
+-------------+ ---> +-------------+ ---> +-------------+ ---> NULL
| Chunk (fd)  |      | Chunk (fd)  |      | Chunk (fd)  |
+-------------+      +-------------+      +-------------+
```

### Large Bins

Large bins hold bigger free chunks and are managed as doubly linked lists with additional ordering information. Unlike small bins, they represent size ranges rather than one exact size per bin.

### Tcache

Tcache is the per-thread cache layer introduced to speed up common allocation and free patterns. It sits in front of the older arena bins for many small allocations.

The corrections that matter here are:

- the default **count per tcache bin is 7**, not 64
- the default `tcache_max` on 64-bit systems is `1032` bytes
- the exact tcache bin layout is version-sensitive

Older write-ups often describe tcache as "64 bins with up to 64 chunks each", but current official glibc documentation only supports the `7`-chunks-per-bin default. Newer glibc source also added large-chunk tcache support, which is another reason to verify behavior against the target version instead of copying one static table forever.

```markdown
Tcache
+-----------+
| tcache[i] |
+-----------+
      |
      v
+-------------+ ---> +-------------+ ---> NULL
| Chunk (fd)  |      | Chunk (fd)  |
+-------------+      +-------------+
```

### Unsorted Bin

The unsorted bin is the temporary landing zone for many freed chunks before they are split or sorted into their final small-bin or large-bin positions. It matters a lot in exploitation because many interesting allocator transitions pass through it.

---

## Fragmentation and Consolidation

Heap fragmentation happens when free memory is split into pieces that are difficult to reuse efficiently. glibc tries to reduce this through reuse, binning, and chunk consolidation.

Consolidation means merging neighboring free chunks into a larger free chunk. This is one of the reasons chunk metadata and the `PREV_INUSE` bit matter so much: the allocator needs reliable neighbor state to know when adjacent free space can be merged safely.

---

## Final Notes Before Moving On

Before you attempt any heap technique on a real target, check at least these details first:

- the exact glibc version
- whether tcache is enabled
- whether the chunk is likely to hit tcache, fastbins, small bins, large bins, or the top chunk
- whether you are looking at the main arena or a non-main arena

Those four checks save a lot of confusion later.

---

## References

- [GNU C Library manual: The GNU Allocator](https://sourceware.org/glibc/manual/2.27/html_node/The-GNU-Allocator.html)
- [GNU C Library manual: Memory Allocation Tunables](https://sourceware.org/glibc/manual/2.42/html_node/Memory-Allocation-Tunables.html)
- [Official glibc source diff showing `request2size`, `NBINS`, `NSMALLBINS`, and `MIN_LARGE_SIZE`](https://sourceware.org/pipermail/glibc-cvs/2020q4/071298.html)
- [Official glibc source diff showing `PREV_INUSE`, `IS_MMAPPED`, and `NON_MAIN_ARENA`](https://sourceware.org/pipermail/glibc-cvs/2016q4/061064.html)
- [Official glibc source diff showing newer tcache large-bin support](https://sourceware.org/pipermail/glibc-cvs/2025q2/088647.html)
