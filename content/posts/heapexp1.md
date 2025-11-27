---
layout: default
title: Heap Exploitation Part 1
date: 2024-06-10
tag: ["exploitation", "heap", "glibc"] 
description: Exploring GLIBC Heap
---

## **Intro**

This is the first part of the heap exploitation series in this post i will give you an basic overview of glibc heap implementation and discuss about some basic terminologies and in the upcoming post we will take a look at how the memory allocation takes place and how it gets free and further we will look at different heap related vulnerabilities and see how to exploit them.

---

## **What is Heap and Why?**

Heap is a type of memory used in programs to store data that needs to be dynamically allocated and can change in size during the program's execution. The programmer can request chunk of memory from the heap and the heap manager will allocate that chunk to the program. To request a chunk of memory on heap we use ***malloc*** function and provide the size of memory that we need and it will return a pointer to that allocated chunk and using ***free*** function we can deallocate that chunk form the heap. It is very effective method for allocating memory which lives in a program for long period time and the size of the memory can be expended when its fully exhausted. You can do that using [***sbrk***](https://linux.die.net/man/2/sbrk) or [***mmap***](https://man7.org/linux/man-pages/man2/mmap.2.html) system call and when the memory is no longer needed you can free it.

***You may be wondering why don’t we use stack it also get’s the job done.***

Think about a scenario where you have a dynamic game in which there are multiple items and your player collect those items and the size of its inventory grow. Using the heap, you can easily expand the inventory array as needed without worrying about the fixed size limitations of the stack.

**OR** 

When the player enters a new area in the game, you might need to create 100 new enemy objects. Allocating these on the stack could quickly exhaust stack space, leading to stack overflow. The heap, on the other hand, can handle such allocations more gracefully. In some case some enemies often need to alive for entire game or for some specific amount of time. The stack is unsuitable for such long-lived objects as it is designed for temporary storage within function calls. which means when the function exits the memory allocated for those variable will be reclaimed by the stack.

---

***Memory layout example of x86-64 architecture*** 

- On a 64-bit Linux system, the stack might start at around `0x7fffffffffff` and grow downwards
- Heap might start at around `0x600000000000` on a 64-bit system and grow upwards
- BSS segment addresses might be in the lower range, just above the data segment.
- Data segment Typically located just above the code segment
- Code segment might start at a fixed low address, such as `0x00400000` on a 64-bit Linux system

```markdown
High Memory Addresses        
      +------------------+   
      |      Stack       |    0x7fffffffffff {Top of stack}
      |        |         |
      |        v         |
      |                  |
      | (grows downward) |
      +------------------+
      |                  |
      |        ^         |
      |        |         |
      |       Heap       |
      | (grows upward)   |    0x600000000000 {Start of heap}
      +------------------+
      |   BSS Segment    |
      +------------------+
      |   Data Segment   |
      +------------------+
      |   Code Segment   |    0x00400000 {Start of code segment}
      +------------------+   
Low Memory Addresses
```

---

## **History of Dynamic Memory Allocator**

Memory allocators are fundamental components of modern computer systems, responsible for managing dynamic memory allocation and deallocation. Over the years, several allocators have been developed, each optimized for different use cases and performance scenarios.

One of the earliest and most influential memory allocators was **dlmalloc**, developed by Doug Lea in 1987. Initially designed as a general-purpose allocator, dlmalloc became widely used due to its efficiency and portability across different systems.

In the early days of Linux and Unix-like systems, **dlmalloc** (Doug Lea's malloc) was indeed one of the most commonly used memory allocators due to its efficiency and portability. However, the transition to **ptmalloc** (POSIX threads malloc) was driven by the need to support multi-threaded applications more effectively.

The current memory allocater used in linux is **ptmalloc3** it is an evolution of the ptmalloc (POSIX threads malloc) allocator, which itself is a fork of Doug Lea's original dlmalloc. ptmalloc3 represents a significant enhancement over its predecessors, focusing on improving performance and scalability for multi-threaded applications. 

*There are several other memory allocators created and used by different platforms* 

> **jemalloc** initially created for FreeBSD, offers scalable multi-threaded memory allocation
> 

> **tcmalloc** (Thread-Caching malloc), developed by Google, is optimized for performance in multi-threaded environments
> 

> **mimalloc** introduced by Microsoft, focuses on compact memory usage, low latency, and high concurrency.
> 

---

## **Arenas**

Arenas in ptmalloc are dedicated memory management regions assigned to individual threads within the GLIBC heap allocator. Each thread that interacts with the heap is associated with its own arena. This design allows threads to perform memory allocations and deallocations independently, minimizing contention and improving performance in multi-threaded applications. Arenas manage memory blocks and metadata specific to each thread, optimizing memory usage and reducing synchronization overhead. When a thread requests memory from the heap, it interacts solely with its designated arena, ensuring efficient and scalable memory management across concurrent threads. Multiple arenas can exist simultaneously, dynamically created and managed by ptmalloc based on the application's threading requirements.

```markdown
   Thread A
   +----------------------------------+
   |  Arena A (Thread-specific)        |
   |  +-----------------------------+  |
   |  |         Memory Blocks       |  |
   |  +-----------------------------+  |
   +----------------------------------+

   Thread B
   +----------------------------------+
   |  Arena B (Thread-specific)        |
   |  +-----------------------------+  |
   |  |         Memory Blocks       |  |
   |  +-----------------------------+  |
   +----------------------------------+

   Thread C
   +----------------------------------+
   |  Arena C (Thread-specific)        |
   |  +-----------------------------+  |
   |  |         Memory Blocks       |  |
   |  +-----------------------------+  |
   +----------------------------------+

```

---

## **Chunks**

> A chunk refers to a contiguous block of memory managed by the allocator. Chunks are the fundamental units of memory that `malloc` manages and allocates to the program
> 

```markdown
Strurture of malloc chunk

struct malloc_chunk {

  INTERNAL_SIZE_T      mchunk_prev_size;  /* Size of previous chunk (if free).  */
  INTERNAL_SIZE_T      mchunk_size;       /* Size in bytes, including overhead. */

  struct malloc_chunk* fd;         /* double links -- used only if free. */
  struct malloc_chunk* bk;

  /* Only used for large blocks: pointer to next larger size.  */
  struct malloc_chunk* fd_nextsize; /* double links -- used only if free. */
  struct malloc_chunk* bk_nextsize;
};
```

Whenever you call the malloc function to allocate some block of memory it simply allocate that memory and return a pointer to that allocated memory area but in reality the actual size of the chunk is grater then the requested size of the chunk. This is because the allocator need to store some metadata for managing the heap.

> *For example you requested 16 bytes of memory **malloc(0x10)** so the allocator will add some extra bytes to store the metadata in case of 64bit system it is 16 bytes so the actual size of the chunk is going to be  :: 16 bytes(requested size) + 16 bytes(metadata) = 32 bytes(actual allocation size)*
> 

> *For 32 bit system the size will be  ::  16 bytes(requested size) + 8 bytes(metadata) = 24 bytes(actual allocation size)*
> 

## **Chunk Metadata**

```markdown
An allocated chunk looks like this:

chunk->     +-------------------------------------------+
            | Size of previous chunk, if unallocated    | <-- 4 or 8 bytes
            +-------------------------------------------+
            | Size of chunk, in bytes             |A|M|P|  <-- 4 or 8 bytes
mem->       +-------------------------------------------+
            | User data starts here...                  | <-- malloc_usable_size() bytes
            .                                           .
            .                                           .
            .                                           |
nextchunk-> +-------------------------------------------+
            | (size of chunk, but used for application) |  <-- 4 or 8 bytes
            +-------------------------------------------+
            | Size of next chunk, in bytes        |A|0|1|  <-- 4 or 8 bytes
            +-------------------------------------------+

```

Each chunk begins with a field that stores the size of the previous chunk, but only if the previous chunk is unallocated. This size field is either 4 or 8 bytes, depending on the system architecture. This field helps in coalescing adjacent free chunks to reduce fragmentation.

The next field is the size of the current chunk, which also includes the size of its own header. This field is also either 4 or 8 bytes. Besides storing the chunk size, the least significant three bits of this field are used as flags: `A`, `M`, and `P`

**A** (Allocated), **M** (Mmap), **P** (Previous In Use) bit fields.*

> The `A` bit, found as the least significant bit of a chunk's size field, tells whether the chunk is currently in use (`1`) or free (`0`). It's crucial for quickly checking if memory is available for allocation or if it's already allocated by the program.
> 

> The `M` bit, the second least significant bit, distinguishes chunks allocated via `mmap` (`1`) from those managed by the heap (`0`). `mmap` is used for larger allocations to prevent heap fragmentation by managing memory differently from typical heap allocations
> 

> The `P` bit, located as the third least significant bit, indicates if the previous chunk in memory is allocated (`1`) or free (`0`). This helps in merging adjacent free chunks to reduce fragmentation and optimize memory usage in the heap.
> 

After the metadata fields, the chunk contains space for user data. The size of this area is determined by the `malloc_usable_size()` function, which tells us how much space is available for the application to store its data. This is where programs store the information they need to work with.

After the user data section lies the beginning of the next chunk in memory. This subsequent chunk starts with a field that serves dual purposes: it holds the size of this next chunk and, just like the current chunk's size field, its least significant bits are used as flags. Specifically, these flags include the `A` flag (Allocated) indicating if the next chunk is allocated (1) or free (0), and the `P` flag (Previous In Use) to show if the current chunk is in use (1)

---

## **Bins**

The glibc memory allocator organizes free memory chunks into various bins to optimize allocation and deallocation operations. These bins—Fastbins, Tcache bins, Small bins, and Large bins—differ in their structure, usage, and efficiency, and each type has a specific number of bins designed to handle different chunk sizes.

***Small bins*** handle chunks that are between 65 bytes and 512 bytes and are managed as doubly linked lists using both `fd` (forward) and `bk` (backward) pointers. There are 62 Small bins, each corresponding to a specific size class. The use of doubly linked lists allows efficient traversal and management of free chunks, although it introduces more complexity compared to the simpler Fastbins and Tcache bins.

```markdown
Small Bins ( 65 bytes to 512 bytes)
+--------------+
| Smallbin[0]  |
+--------------+
       |
       v
+-------------+ <--> +-------------+ <--> +-------------+
| Chunk (fd)  |      | Chunk (fd)  |      | Chunk (fd)  | <--> NULL
|  Size A     |      |  Size A     |      |  Size A     |
+-------------+      +-------------+      +-------------+
|   ...       |
+-------------+
| Smallbin[63]|
+-------------+
       |
       v
+-------------+ <--> NULL
| Chunk (fd)  |
|  Size B     |
+-------------+
```

***Fastbins*** are designed for very quick allocation and deallocation of small chunks, typically up to 64 bytes. Managed as singly linked lists using the `fd` (forward) pointer, there are 10 Fastbins (usually indexed from 0 to 9) in the array, each corresponding to a specific size class. When a chunk of memory is freed, it is added to the appropriate Fastbin list, making it available for rapid reallocation.

```
Fastbins ( <= 64 bytes)
+------------+
| Fastbin[0] |
+------------+
       |
       v
+-------------+      +-------------+      +-------------+
| Chunk (fd)  | ---> | Chunk (fd)  | ---> | Chunk (fd)  | ---> NULL
|  Size A     |      |  Size A     |      |  Size A     |
+-------------+      +-------------+      +-------------+
|   ...       |      |   ...       |      |   ...       |
+-------------+      +-------------+      +-------------+
| Fastbin[7]  |
+-------------+
       |
       v
+-------------+      +-------------+
| Chunk (fd)  | ---> | Chunk (fd)  | ---> NULL
|  Size B     |      |  Size B     |
+-------------+      +-------------+

```

***Large bins*** are used for chunks larger than 512 bytes and are also managed as doubly linked lists with `fd` and `bk` pointers. There are 63 Large bins, with each entry in the Largebin array corresponding to a range of chunk sizes rather than a specific size class. This approach is necessary to efficiently manage larger chunks of memory, but it also means that operations involving Large bins are typically slower and more complex due to the need to maintain sorted order and manage larger memory areas.

```markdown
Large Bins ( > 512 bytes)
+--------------+
| Largebin[0]  |
+--------------+
       |
       v
+-------------+ <--> +-------------+
| Chunk (fd)  |      | Chunk (fd)  | <--> NULL
|  Size A     |      |  Size A     |
+-------------+      +-------------+
|   ...       |
+-------------+
|Largebin[127]|
+-------------+
       |
       v
+-------------+ <--> NULL
| Chunk (fd)  |
|  Size B     |
+-------------+

```

***Tcache bins*** also use singly linked lists with the `fd` pointer but are stored in thread-local storage to improve performance and reduce contention. There are 64 Tcache bins, each corresponding to a specific size class, similar to Fastbins, but they can hold a limited number of chunks (typically 64 per bin). This caching mechanism speeds up allocation and deallocation operations by avoiding global locks and directly accessing recently freed chunks within the same thread.

```markdown
Tcache Bins ( <= 64 bytes)
+------------+
| Tcache[0]  |
+------------+
       |
       v
+-------------+      +-------------+
| Chunk (fd)  | ---> | Chunk (fd)  | ---> NULL
|  Size A     |      |  Size A     |
+-------------+      +-------------+
|   ...       |
+-------------+
| Tcache[63]  |
+-------------+
       |
       v
+-------------+
| Chunk (fd)  | ---> NULL
|  Size B     |
+-------------+
```

***Unsorted bins*** serve as a temporary holding area for freed chunks before they are placed into the appropriate Small or Large bin. Managed as doubly linked lists with `fd` and `bk` pointers, there is only one Unsorted bin. When a chunk is freed, it is initially placed in the Unsorted bin. Later, during memory allocation, chunks from the Unsorted bin are sorted and placed into the appropriate bin based on their size. This mechanism helps to reduce fragmentation and improve the efficiency of memory allocation.

---

## **Fragmentation**

Heap fragmentation refers to the phenomenon where memory becomes divided into small, unusable pieces over time due to allocations and deallocations. This fragmentation can occur in both the heap managed by the operating system and within individual memory arenas managed by allocators like ptmalloc in GLIBC

## **Consolidation**

Consolidation in the heap, refers to the process of combining fragmented memory blocks into larger contiguous blocks. This process helps reduce external fragmentation and improves the efficiency of memory usage.

<br>
Reference

---

[https://sploitfun.wordpress.com/2015/02/10/understanding-glibc-malloc/](https://sploitfun.wordpress.com/2015/02/10/understanding-glibc-malloc/)

[https://pwn.college/software-exploitation/dynamic-allocator-misuse](https://pwn.college/software-exploitation/dynamic-allocator-misuse/)/

[https://elixir.bootlin.com/glibc/glibc-2.39/source/malloc/malloc.c](https://elixir.bootlin.com/glibc/glibc-2.39/source/malloc/malloc.c#L53)

[https://0x434b.dev/overview-of-glibc-heap-exploitation-techniques/](https://0x434b.dev/overview-of-glibc-heap-exploitation-techniques/)

[https://azeria-labs.com/heap-exploitation-part-1-understanding-the-glibc-heap-implementation/](https://azeria-labs.com/heap-exploitation-part-1-understanding-the-glibc-heap-implementation/)

[https://azeria-labs.com/heap-exploitation-part-2-glibc-heap-free-bins/](https://azeria-labs.com/heap-exploitation-part-2-glibc-heap-free-bins/)

[https://infosecwriteups.com/the-toddlers-introduction-to-heap-exploitation-part-1-515b3621e0e8](https://infosecwriteups.com/the-toddlers-introduction-to-heap-exploitation-part-1-515b3621e0e8)

[https://en.wikipedia.org/wiki/C_dynamic_memory_allocation#dlmalloc_and_ptmalloc](https://en.wikipedia.org/wiki/C_dynamic_memory_allocation#dlmalloc_and_ptmalloc)
