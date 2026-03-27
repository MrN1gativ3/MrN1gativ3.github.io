(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const topLink = document.getElementById("top-link");
  const traceBytes = document.querySelector("[data-trace-bytes]");
  const traceCommand = document.querySelector("[data-trace-command]");
  const traceTopic = document.querySelector("[data-trace-topic]");
  const traceState = document.querySelector("[data-trace-state]");
  const traceHash = document.querySelector("[data-trace-hash]");
  const traceAddress = document.querySelector("[data-trace-address]");
  const traceSegments = Array.from(document.querySelectorAll("[data-trace-segment]"));

  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch (error) {
      }
    });
  }

  const syncTopLink = () => {
    if (!topLink) {
      return;
    }
    topLink.classList.toggle("show", window.scrollY > 700);
  };

  syncTopLink();
  window.addEventListener("scroll", syncTopLink, { passive: true });

  const traceFrames = [
    {
      topic: "heap-exploitation",
      state: "tcache watch",
      hash: "0x7fa1",
      address: "0x55555575e2a0",
      command: "cmp chunk->size, 0x91",
      segment: "heap",
      bytes: ["48", "8b", "45", "f8", "48", "83", "f8", "91", "75", "0c", "48", "8b", "50", "10", "ff", "d2"]
    },
    {
      topic: "reversing",
      state: "xrefs mapped",
      hash: "0x41bc",
      address: "0x4012c0",
      command: "lea rdi, [rip+0x2f1] ; locate dispatcher",
      segment: "text",
      bytes: ["48", "8d", "3d", "f1", "02", "00", "00", "e8", "4a", "ff", "ff", "ff", "85", "c0", "75", "09"]
    },
    {
      topic: "malware-analysis",
      state: "unpack trace",
      hash: "0xc9d4",
      address: "0x140001120",
      command: "xor ecx, ecx ; decode loop enters stage_2",
      segment: "got",
      bytes: ["31", "c9", "8a", "04", "0a", "34", "5e", "88", "04", "0f", "41", "ff", "c1", "83", "f9", "20"]
    },
    {
      topic: "linux-kernel",
      state: "symbols resolved",
      hash: "0x8e13",
      address: "0xffffffff8100a1d0",
      command: "mov rax, [current->mm] ; walk task context",
      segment: "stack",
      bytes: ["65", "48", "8b", "04", "25", "00", "00", "00", "00", "48", "8b", "40", "18", "48", "85", "c0"]
    },
    {
      topic: "process-injection",
      state: "thread context",
      hash: "0x2dd0",
      address: "0x77b11290",
      command: "call remote_stub ; restore registers",
      segment: "stack",
      bytes: ["ff", "15", "90", "12", "b1", "77", "48", "89", "5c", "24", "20", "48", "89", "74", "24", "28"]
    }
  ];

  if (traceBytes && traceCommand && traceTopic && traceState && traceHash && traceAddress) {
    const byteCells = [];
    const bytePool = "0123456789abcdef";

    for (let index = 0; index < 32; index += 1) {
      const cell = document.createElement("span");
      cell.className = "trace-byte";
      cell.textContent = `${bytePool[(index * 3) % 16]}${bytePool[(index * 7 + 5) % 16]}`;
      traceBytes.appendChild(cell);
      byteCells.push(cell);
    }

    let frameIndex = 0;
    let pulseIndex = 0;

    const applyFrame = (frame) => {
      traceCommand.textContent = frame.command;
      traceTopic.textContent = frame.topic;
      traceState.textContent = frame.state;
      traceHash.textContent = frame.hash;
      traceAddress.textContent = frame.address;

      traceSegments.forEach((segment) => {
        segment.classList.toggle("is-active", segment.dataset.traceSegment === frame.segment);
      });

      byteCells.forEach((cell, index) => {
        cell.textContent = frame.bytes[index % frame.bytes.length];
      });
    };

    applyFrame(traceFrames[frameIndex]);

    window.setInterval(() => {
      frameIndex = (frameIndex + 1) % traceFrames.length;
      applyFrame(traceFrames[frameIndex]);
    }, 3200);

    window.setInterval(() => {
      byteCells.forEach((cell, index) => {
        const distance = Math.abs(index - pulseIndex);
        cell.classList.toggle("is-hot", distance <= 1);
      });
      pulseIndex = (pulseIndex + 1) % byteCells.length;
    }, 140);
  }

  const labCards = Array.from(document.querySelectorAll("[data-labcard]"));

  labCards.forEach((card) => {
    const type = card.dataset.labcardType;

    if (type === "malware") {
      const status = card.querySelector("[data-lab-status]");
      const nodes = Array.from(card.querySelectorAll("[data-malware-node]"));
      const hash = card.querySelector("[data-malware-hash]");
      const family = card.querySelector("[data-malware-family]");
      const barsRoot = card.querySelector("[data-malware-bars]");

      if (!status || !hash || !family || !barsRoot || nodes.length === 0) {
        return;
      }

      const frames = [
        { status: "sandbox", node: 0, hash: "sha256: 7f3a...c91d", family: "family: packed loader", bars: [26, 34, 42, 52, 60, 48, 38, 24, 28, 36, 46, 58, 40, 30] },
        { status: "unpack", node: 1, hash: "sha256: a912...7b40", family: "family: import rebuild", bars: [18, 24, 32, 48, 58, 66, 56, 44, 30, 24, 28, 36, 48, 54] },
        { status: "inject", node: 2, hash: "sha256: 55de...119c", family: "family: remote thread", bars: [20, 28, 40, 56, 62, 64, 54, 42, 34, 30, 26, 32, 46, 58] },
        { status: "beacon", node: 3, hash: "sha256: c0fe...e813", family: "family: c2 staging", bars: [14, 20, 28, 38, 50, 64, 68, 60, 46, 34, 24, 22, 26, 30] }
      ];

      const bars = [];
      for (let index = 0; index < 14; index += 1) {
        const bar = document.createElement("span");
        bar.className = "malware-bar";
        barsRoot.appendChild(bar);
        bars.push(bar);
      }

      let frameIndex = 0;

      const applyFrame = () => {
        const frame = frames[frameIndex];
        status.textContent = frame.status;
        hash.textContent = frame.hash;
        family.textContent = frame.family;

        nodes.forEach((node, index) => {
          node.classList.toggle("is-active", index === frame.node);
        });

        bars.forEach((bar, index) => {
          bar.style.height = `${frame.bars[index]}px`;
          bar.classList.toggle("is-hot", index === frame.node * 3 || index === frame.node * 3 + 1);
        });

        frameIndex = (frameIndex + 1) % frames.length;
      };

      applyFrame();
      window.setInterval(applyFrame, 1800);
      return;
    }

    if (type === "exploitation") {
      const status = card.querySelector("[data-lab-status]");
      const cells = Array.from(card.querySelectorAll("[data-heap-cell]"));
      const bins = Array.from(card.querySelectorAll("[data-heap-bin]"));
      const pointer = card.querySelector("[data-heap-pointer]");
      const mode = card.querySelector("[data-heap-mode]");

      if (!status || !pointer || !mode || cells.length === 0 || bins.length === 0) {
        return;
      }

      const frames = [
        { status: "overflow", cell: 2, bin: 0, pointer: "write -> tcache->fd", mode: "mode: forward pointer smash" },
        { status: "pivot", cell: 3, bin: 2, pointer: "write -> unsorted->bk", mode: "mode: fake chunk relay" },
        { status: "poison", cell: 4, bin: 0, pointer: "write -> __free_hook", mode: "mode: tcache poisoning" },
        { status: "claim", cell: 4, bin: 3, pointer: "write -> control ptr", mode: "mode: target reclaimed" }
      ];

      let frameIndex = 0;

      const applyFrame = () => {
        const frame = frames[frameIndex];
        status.textContent = frame.status;
        pointer.textContent = frame.pointer;
        mode.textContent = frame.mode;

        cells.forEach((cell, index) => {
          cell.classList.toggle("is-hot", index === frame.cell);
        });

        bins.forEach((bin, index) => {
          bin.classList.toggle("is-active", index === frame.bin);
        });

        frameIndex = (frameIndex + 1) % frames.length;
      };

      applyFrame();
      window.setInterval(applyFrame, 1750);
      return;
    }

    if (type === "kernel") {
      const status = card.querySelector("[data-lab-status]");
      const stages = Array.from(card.querySelectorAll("[data-kernel-stage]"));
      const pills = Array.from(card.querySelectorAll("[data-kernel-pill]"));
      const symbol = card.querySelector("[data-kernel-symbol]");
      const call = card.querySelector("[data-kernel-call]");

      if (!status || !symbol || !call || stages.length === 0 || pills.length === 0) {
        return;
      }

      const frames = [
        { status: "ring0", stage: 0, pill: 0, symbol: "symbol: pt_regs->orig_ax", call: "call: entry_SYSCALL_64" },
        { status: "vfs", stage: 2, pill: 2, symbol: "symbol: current->mm", call: "call: vfs_read" },
        { status: "lsm", stage: 3, pill: 1, symbol: "symbol: current_cred()", call: "call: security_file_permission" },
        { status: "task", stage: 4, pill: 3, symbol: "symbol: mmap_read_lock()", call: "call: wake_up_new_task" }
      ];

      let frameIndex = 0;

      const applyFrame = () => {
        const frame = frames[frameIndex];
        status.textContent = frame.status;
        symbol.textContent = frame.symbol;
        call.textContent = frame.call;

        stages.forEach((stage, index) => {
          stage.classList.toggle("is-active", index === frame.stage);
        });

        pills.forEach((pill, index) => {
          pill.classList.toggle("is-active", index === frame.pill);
        });

        frameIndex = (frameIndex + 1) % frames.length;
      };

      applyFrame();
      window.setInterval(applyFrame, 1850);
      return;
    }

    if (type === "reversing") {
      const status = card.querySelector("[data-lab-status]");
      const lines = Array.from(card.querySelectorAll("[data-rev-line]"));
      const note = card.querySelector("[data-rev-note]");
      const func = card.querySelector("[data-rev-func]");
      const regs = {
        rax: card.querySelector('[data-rev-reg="rax"]'),
        rdi: card.querySelector('[data-rev-reg="rdi"]'),
        rsp: card.querySelector('[data-rev-reg="rsp"]'),
        xref: card.querySelector('[data-rev-reg="xref"]')
      };

      if (!status || !note || !func || lines.length === 0 || Object.values(regs).some((entry) => !entry)) {
        return;
      }

      const frames = [
        {
          status: "trace",
          current: 0,
          func: "func: sub_4011b0",
          note: "xrefs -> dispatcher table",
          regs: { rax: "0x00000091", rdi: "0x00404040", rsp: "0x7fffffd0", xref: "switch" },
          lines: [
            ["0x4011b0", "push rbp"],
            ["0x4011b1", "mov rbp, rsp"],
            ["0x4011b4", "cmp eax, 0x91"],
            ["0x4011b9", "jne 0x4011d0"],
            ["0x4011be", "call qword ptr [rax]"]
          ]
        },
        {
          status: "xrefs",
          current: 2,
          func: "func: sub_4012d0",
          note: "xrefs -> heap handler",
          regs: { rax: "0x00000000", rdi: "0x00602020", rsp: "0x7fffffa8", xref: "heap" },
          lines: [
            ["0x4012d0", "lea rdi, [rip+0x2f1]"],
            ["0x4012d7", "mov rax, [rbx+0x18]"],
            ["0x4012db", "test rax, rax"],
            ["0x4012de", "je 0x401305"],
            ["0x4012e0", "call rax"]
          ]
        },
        {
          status: "rename",
          current: 4,
          func: "func: heap_dispatch",
          note: "xrefs -> vtable edge",
          regs: { rax: "0x00000001", rdi: "0x004012d0", rsp: "0x7fffff90", xref: "vtable" },
          lines: [
            ["0x401320", "mov ecx, [rdi+0x8]"],
            ["0x401323", "xor eax, eax"],
            ["0x401325", "cmp ecx, 0x2"],
            ["0x401328", "cmove rax, rsi"],
            ["0x40132c", "jmp qword ptr [rax*8+0x404800]"]
          ]
        }
      ];

      const regCards = Object.fromEntries(
        Object.entries(regs).map(([key, value]) => [key, value.closest(".rev-reg")])
      );

      let frameIndex = 0;

      const applyFrame = () => {
        const frame = frames[frameIndex];
        status.textContent = frame.status;
        note.textContent = frame.note;
        func.textContent = frame.func;

        lines.forEach((line, index) => {
          const [addr, op] = frame.lines[index];
          const addrNode = line.querySelector(".rev-addr");
          const opNode = line.querySelector(".rev-op");
          if (addrNode) {
            addrNode.textContent = addr;
          }
          if (opNode) {
            opNode.textContent = op;
          }
          line.classList.toggle("is-current", index === frame.current);
        });

        Object.entries(frame.regs).forEach(([key, value]) => {
          regs[key].textContent = value;
          regCards[key].classList.toggle("is-live", key === "xref" || key === "rax");
        });

        frameIndex = (frameIndex + 1) % frames.length;
      };

      applyFrame();
      window.setInterval(applyFrame, 2000);
    }
  });

  document.querySelectorAll("pre > code").forEach((code) => {
    const wrapper = code.parentElement.parentElement.classList.contains("highlight")
      ? code.parentElement.parentElement
      : code.parentElement;

    if (wrapper.querySelector(".copy-code")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.textContent = "copy";

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "copied";
      } catch (error) {
        button.textContent = "error";
      }

      window.setTimeout(() => {
        button.textContent = "copy";
      }, 1600);
    });

    wrapper.style.position = "relative";
    wrapper.appendChild(button);
  });
})();
