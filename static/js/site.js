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

  const randomFlag = (prefix) => {
    const alphabet = "abcdef0123456789";
    const bytes = new Uint8Array(8);

    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    const token = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
    return `mrn1{${prefix}-${token}}`;
  };

  const pushFeedLine = (feed, message, tone = "good") => {
    if (!feed) {
      return;
    }

    const line = document.createElement("div");
    line.className = `playlab-line is-${tone}`;
    line.textContent = message;
    feed.prepend(line);

    while (feed.children.length > 4) {
      feed.lastElementChild.remove();
    }
  };

  const shuffleChildren = (container) => {
    if (!container) {
      return;
    }

    const children = Array.from(container.children);

    for (let index = children.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [children[index], children[swapIndex]] = [children[swapIndex], children[index]];
    }

    children.forEach((child) => {
      container.appendChild(child);
    });
  };

  const homeDecks = Array.from(document.querySelectorAll("[data-labdeck]"));

  homeDecks.forEach((deck) => {
    const tabs = Array.from(deck.querySelectorAll("[data-lab-tab]"));
    const panels = Array.from(deck.querySelectorAll("[data-lab-panel]"));

    const showPanel = (name) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.labTab === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach((panel) => {
        const active = panel.dataset.labPanel === name;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        showPanel(tab.dataset.labTab);
      });
    });
  });

  const playLabs = Array.from(document.querySelectorAll("[data-playlab]"));

  playLabs.forEach((lab) => {
    const type = lab.dataset.playlab;
    const stages = Array.from(lab.querySelectorAll("[data-playlab-stage]"));
    const feed = lab.querySelector("[data-playlab-feed]");
    const flagBox = lab.querySelector("[data-playlab-flag-box]");
    const flagText = lab.querySelector("[data-playlab-flag]");
    const cardStatus = lab.closest("[data-labcard]")?.querySelector("[data-lab-status]");

    if (type === "heap") {
      const bin = lab.querySelector("[data-heap-bin]");
      const heapNext = lab.querySelector("[data-heap-next]");
      const heapReturn = lab.querySelector("[data-heap-return]");
      const heapTargetView = lab.querySelector("[data-heap-target-view]");
      const actionRow = lab.querySelector(".playlab-actions");
      const slotButtons = {
        a: lab.querySelector('[data-heap-slot="a"]'),
        b: lab.querySelector('[data-heap-slot="b"]'),
        c: lab.querySelector('[data-heap-slot="c"]'),
        target: lab.querySelector('[data-heap-slot="target"]')
      };
      const slotStates = {
        a: lab.querySelector('[data-heap-slot-state="a"]'),
        b: lab.querySelector('[data-heap-slot-state="b"]'),
        c: lab.querySelector('[data-heap-slot-state="c"]'),
        target: lab.querySelector('[data-heap-slot-state="target"]')
      };
      const actionButtons = Array.from(lab.querySelectorAll("[data-heap-action]"));
      const stageMap = Object.fromEntries(stages.map((stage) => [stage.dataset.playlabStage, stage]));
      const inspectText = {
        a: "chunk A @ 0x55555575e2a0 // user-controlled region directly before the victim",
        b: "chunk B @ 0x55555575e330 // same size class victim used to poison the freelist",
        c: "next 0x88 allocation return // reclaim the victim here before the target pop",
        target: "__free_hook @ 0x7ffff7fcf448 // arbitrary write target after the poisoned pop"
      };

      let state;

      const setFlag = (prefix) => {
        const value = randomFlag(prefix);
        if (flagBox && flagText) {
          flagText.textContent = value;
          flagBox.hidden = false;
        }
      };

      const render = () => {
        if (slotStates.a) {
          slotStates.a.textContent = state.a ? "size=0x91 | inuse" : "size=0x91 | available";
        }
        if (slotStates.b) {
          slotStates.b.textContent = state.b
            ? "size=0x91 | inuse"
            : state.bFreed
              ? (state.poisoned ? "size=0x91 | fd -> __free_hook" : "size=0x91 | in tcache")
              : "size=0x91 | available";
        }
        if (slotStates.c) {
          slotStates.c.textContent = state.owned
            ? "malloc returned target"
            : state.c
              ? (state.poisoned ? "victim reclaimed | next pop redirected" : "victim reclaimed | normal path")
              : "waiting for reclaim";
        }
        if (slotStates.target) {
          slotStates.target.textContent = state.owned
            ? "target claimed for write"
            : state.c && state.poisoned
              ? "next allocation reaches target"
              : state.poisoned
                ? "queued through poisoned fd"
                : "target guarded";
        }

        Object.entries(slotButtons).forEach(([name, button]) => {
          if (!button) {
            return;
          }

          button.classList.toggle("is-focus", state.focus === name);
          button.classList.toggle("is-live", name === "a" ? state.a : name === "b" ? state.b : name === "c" ? state.c && !state.owned : false);
          button.classList.toggle("is-freed", name === "b" && state.bFreed);
          button.classList.toggle("is-armed", (name === "b" && state.poisoned) || (name === "target" && state.poisoned && !state.owned));
          button.classList.toggle("is-owned", name === "target" && state.owned);
        });

        if (bin) {
          if (state.owned) {
            bin.textContent = "__free_hook";
          } else if (state.c && state.poisoned) {
            bin.textContent = "__free_hook pending";
          } else if (state.bFreed && state.poisoned) {
            bin.textContent = "B -> __free_hook";
          } else if (state.bFreed) {
            bin.textContent = "B";
          } else {
            bin.textContent = "empty";
          }
        }

        if (heapNext) {
          if (state.owned) {
            heapNext.textContent = "0x7ffff7fcf448";
          } else if (state.c && state.poisoned) {
            heapNext.textContent = "__free_hook pending";
          } else if (state.bFreed && state.poisoned) {
            heapNext.textContent = "0x7ffff7fcf448";
          } else {
            heapNext.textContent = "NULL";
          }
        }

        if (heapReturn) {
          if (state.owned) {
            heapReturn.textContent = "0x7ffff7fcf448 claimed";
          } else if (state.c && state.poisoned) {
            heapReturn.textContent = "0x7ffff7fcf448";
          } else if (state.c) {
            heapReturn.textContent = "top chunk";
          } else if (state.bFreed) {
            heapReturn.textContent = "0x55555575e330";
          } else if (state.b) {
            heapReturn.textContent = "top chunk";
          } else if (state.a) {
            heapReturn.textContent = "0x55555575e330";
          } else {
            heapReturn.textContent = "0x55555575e2a0";
          }
        }

        if (heapTargetView) {
          heapTargetView.textContent = state.owned
            ? "__free_hook writable"
            : state.poisoned
              ? "__free_hook queued"
              : "__free_hook guarded";
        }

        if (stageMap["alloc-a"]) {
          stageMap["alloc-a"].classList.toggle("is-done", state.a);
        }
        if (stageMap["alloc-b"]) {
          stageMap["alloc-b"].classList.toggle("is-done", state.b || state.c || state.owned);
        }
        if (stageMap["free-b"]) {
          stageMap["free-b"].classList.toggle("is-done", state.bFreed || state.c || state.owned);
        }
        if (stageMap.poison) {
          stageMap.poison.classList.toggle("is-done", state.poisoned);
        }
        if (stageMap.claim) {
          stageMap.claim.classList.toggle("is-done", state.owned);
        }

        actionButtons.forEach((button) => {
          const action = button.dataset.heapAction;
          button.disabled =
            (action === "alloc-a" && state.a) ||
            (action === "alloc-b" && (!state.a || state.b || state.bFreed || state.c || state.owned)) ||
            (action === "free-b" && !state.b) ||
            (action === "poison" && (!state.a || !state.bFreed || state.poisoned || state.owned)) ||
            (action === "alloc-c" && (!state.bFreed || state.c || state.owned)) ||
            (action === "claim" && (!state.c || state.owned));
        });

        if (cardStatus) {
          cardStatus.textContent = state.owned ? "solved" : state.c && state.poisoned ? "armed" : state.poisoned ? "poisoned" : state.bFreed ? "freed" : state.a ? "live" : "lab";
        }
      };

        const resetState = () => {
        state = {
          a: false,
          b: false,
          bFreed: false,
          poisoned: false,
          c: false,
          owned: false,
          focus: "a"
        };

        if (flagBox) {
          flagBox.hidden = true;
        }
        if (feed) {
          feed.innerHTML = "";
        }

        shuffleChildren(actionRow);
        pushFeedLine(feed, "arena reset // tcache[0x90] is empty and the target is not reachable");
        render();
      };

      const act = (action) => {
        if (action === "alloc-a") {
          if (state.a) {
            pushFeedLine(feed, "chunk A is already live in the arena", "bad");
          } else {
            state.a = true;
            state.focus = "a";
            pushFeedLine(feed, "malloc(0x88) => 0x55555575e2a0 (chunk A)");
          }
          render();
          return;
        }

        if (action === "alloc-b") {
          if (!state.a) {
            pushFeedLine(feed, "stabilize the layout first so the victim lands after A", "bad");
          } else if (state.b || state.bFreed || state.c) {
            pushFeedLine(feed, "the victim is no longer in the clean pre-free layout", "bad");
          } else {
            state.b = true;
            state.focus = "b";
            pushFeedLine(feed, "malloc(0x88) => 0x55555575e330 (victim chunk B)");
          }
          render();
          return;
        }

        if (action === "free-b") {
          if (!state.b) {
            pushFeedLine(feed, "chunk B is not live, so nothing enters the free list yet", "bad");
          } else {
            state.b = false;
            state.bFreed = true;
            state.focus = "b";
            pushFeedLine(feed, "free(0x55555575e330) // B moved into tcache[0x90]");
          }
          render();
          return;
        }

        if (action === "poison") {
          if (!state.a || !state.bFreed) {
            pushFeedLine(feed, "the forward pointer matters only after the victim is sitting in tcache", "bad");
          } else if (state.poisoned) {
            pushFeedLine(feed, "the victim fd is already forged");
          } else {
            state.poisoned = true;
            state.focus = "target";
            pushFeedLine(feed, "overflow(A) rewrote B->fd => __free_hook");
          }
          render();
          return;
        }

        if (action === "alloc-c") {
          if (!state.bFreed) {
            pushFeedLine(feed, "reclaim only works after B is sitting in the free list", "bad");
          } else if (state.c) {
            pushFeedLine(feed, "the victim has already been reclaimed once");
          } else {
            state.c = true;
            state.bFreed = false;
            state.focus = "c";
            pushFeedLine(
              feed,
              state.poisoned
                ? "malloc(0x88) => 0x55555575e330 // reclaimed B and preserved the poisoned next pointer"
                : "malloc(0x88) => 0x55555575e330 // normal reclaim with no target redirection"
            );
          }
          render();
          return;
        }

        if (action === "claim") {
          if (!state.c) {
            pushFeedLine(feed, "reclaim the victim first or the poisoned path never materializes", "bad");
          } else if (!state.poisoned) {
            state.focus = "target";
            pushFeedLine(feed, "normal malloc path // the allocator never reaches the hook", "bad");
          } else if (!state.owned) {
            state.owned = true;
            state.focus = "target";
            setFlag("tcache");
            pushFeedLine(feed, "malloc(0x88) => __free_hook // arbitrary write primitive reached");
          }
          render();
        }
      };

      lab.addEventListener("click", (event) => {
        const resetButton = event.target.closest("[data-playlab-reset]");
        if (resetButton) {
          resetState();
          return;
        }

        const actionButton = event.target.closest("[data-heap-action]");
        if (actionButton) {
          act(actionButton.dataset.heapAction);
          return;
        }

        const slot = event.target.closest("[data-heap-slot]");
        if (slot) {
          state.focus = slot.dataset.heapSlot;
          pushFeedLine(feed, inspectText[slot.dataset.heapSlot]);
          render();
        }
      });

      resetState();
      return;
    }

    if (type === "malware") {
      const focus = lab.querySelector("[data-mal-focus]");
      const loaderView = lab.querySelector("[data-mal-loader]");
      const injectView = lab.querySelector("[data-mal-inject]");
      const beaconView = lab.querySelector("[data-mal-beacon]");
      const probeRow = lab.querySelector(".mal-playground");
      const choiceRows = Array.from(lab.querySelectorAll(".playlab-choice-row"));
      const probeButtons = Array.from(lab.querySelectorAll("[data-mal-probe]"));
      const choiceButtons = Array.from(lab.querySelectorAll("[data-mal-choice]"));
      const stageMap = Object.fromEntries(stages.map((stage) => [stage.dataset.playlabStage, stage]));
      const correct = {
        loader: "staged-loader",
        inject: "create-remote-thread",
        beacon: "post-gate"
      };
      const labels = {
        loader: {
          "": "unknown",
          "staged-loader": "staged loader",
          "office-macro": "macro-only stage",
          "dll-sideload": "dll sideload"
        },
        inject: {
          "": "unknown",
          "create-remote-thread": "CreateRemoteThread",
          "apc-queue": "APC queue",
          "seh-pivot": "SEH pivot"
        },
        beacon: {
          "": "unknown",
          "post-gate": "TLS POST /gate",
          "dns-txt": "DNS TXT",
          "named-pipe": "named pipe"
        }
      };

      let state;

      const setFlag = (prefix) => {
        const value = randomFlag(prefix);
        if (flagBox && flagText) {
          flagText.textContent = value;
          flagBox.hidden = false;
        }
      };

      const render = () => {
        probeButtons.forEach((button) => {
          button.classList.toggle("is-focus", button.dataset.malProbe === state.probe);
        });

        choiceButtons.forEach((button) => {
          const group = button.dataset.malChoice;
          const value = button.dataset.malValue;
          const selected = state[group] === value;

          button.classList.toggle("is-selected", selected);
          button.classList.toggle("is-correct", selected && value === correct[group]);
          button.classList.toggle("is-wrong", selected && value !== correct[group]);
          button.disabled =
            (group === "loader" && !state.inspected) ||
            (group === "inject" && state.loader !== correct.loader) ||
            (group === "beacon" && state.inject !== correct.inject);
        });

        if (focus) {
          if (state.solved) {
            focus.textContent = "POST /gate over TLS";
          } else if (state.beacon === correct.beacon) {
            focus.textContent = "TLS POST /gate";
          } else if (state.inject === correct.inject) {
            focus.textContent = "CreateRemoteThread";
          } else if (state.loader === correct.loader) {
            focus.textContent = "staged unpack landing";
          } else if (state.probe === "rwx-jump") {
            focus.textContent = "unpacked RX landing";
          } else if (state.probe === "spawn") {
            focus.textContent = "spawn chain";
          } else if (state.probe === "gate") {
            focus.textContent = "network gate";
          } else {
            focus.textContent = "unresolved sample trace";
          }
        }

        if (loaderView) {
          loaderView.textContent = labels.loader[state.loader];
        }

        if (injectView) {
          injectView.textContent = labels.inject[state.inject];
        }

        if (beaconView) {
          beaconView.textContent = labels.beacon[state.beacon];
        }

        if (stageMap.triage) {
          stageMap.triage.classList.toggle("is-done", state.inspected);
        }
        if (stageMap.unpack) {
          stageMap.unpack.classList.toggle("is-done", state.loader === correct.loader);
        }
        if (stageMap.inject) {
          stageMap.inject.classList.toggle("is-done", state.inject === correct.inject);
        }
        if (stageMap.beacon) {
          stageMap.beacon.classList.toggle("is-done", state.solved);
        }

        if (cardStatus) {
          cardStatus.textContent =
            state.solved ? "solved" :
            state.inject === correct.inject ? "launch" :
            state.loader === correct.loader ? "loader" :
            state.inspected ? "triage" :
            "lab";
        }
      };

      const resetState = () => {
        state = {
          probe: "",
          inspected: false,
          loader: "",
          inject: "",
          beacon: "",
          solved: false
        };

        if (flagBox) {
          flagBox.hidden = true;
        }
        if (feed) {
          feed.innerHTML = "";
        }

        shuffleChildren(probeRow);
        choiceRows.forEach((row) => shuffleChildren(row));
        pushFeedLine(feed, "session reset // sample context cleared and no conclusion is locked in");
        render();
      };

      const probe = (name) => {
        state.probe = name;

        if (name === "rwx-jump") {
          state.inspected = true;
          pushFeedLine(feed, "decode loop exits into freshly unpacked executable memory // staged loader behavior fits");
        } else if (name === "spawn") {
          pushFeedLine(feed, "process tree is useful context, but it does not explain the unpack pivot by itself", "bad");
        } else {
          pushFeedLine(feed, "network telemetry matters later; the unpack pivot needs to be nailed down first", "bad");
        }

        render();
      };

      const choose = (group, value) => {
        if (group === "loader") {
          if (!state.inspected) {
            pushFeedLine(feed, "work the unpack pivot first before you classify the loader", "bad");
            return;
          }

          state.loader = value;

          if (value === correct.loader) {
            pushFeedLine(feed, "loader classification fits a staged loader unpacking into executable memory");
          } else {
            pushFeedLine(feed, `${labels.loader[value]} does not line up with the unpack behavior in this trace`, "bad");
          }

          render();
          return;
        }

        if (group === "inject") {
          if (state.loader !== correct.loader) {
            pushFeedLine(feed, "lock the loader model first or the launch primitive is just guessing", "bad");
            return;
          }

          state.inject = value;

          if (value === correct.inject) {
            pushFeedLine(feed, "remote thread launch lines up with the spawned target and memory write path");
          } else {
            pushFeedLine(feed, `${labels.inject[value]} is plausible, but it does not match this execution trace`, "bad");
          }

          render();
          return;
        }

        if (group === "beacon") {
          if (state.inject !== correct.inject) {
            pushFeedLine(feed, "pin down the launch primitive before you call the beacon route", "bad");
            return;
          }

          state.beacon = value;

          if (value === correct.beacon) {
            state.solved = true;
            setFlag("sandbox");
            pushFeedLine(feed, "beacon recovered -> HTTPS POST /gate // triage path closed");
          } else {
            pushFeedLine(feed, `${labels.beacon[value]} is background noise here, not the live beacon path`, "bad");
          }

          render();
        }
      };

      lab.addEventListener("click", (event) => {
        const resetButton = event.target.closest("[data-playlab-reset]");
        if (resetButton) {
          resetState();
          return;
        }

        const probeButton = event.target.closest("[data-mal-probe]");
        if (probeButton) {
          probe(probeButton.dataset.malProbe);
          return;
        }

        const choiceButton = event.target.closest("[data-mal-choice]");
        if (choiceButton) {
          choose(choiceButton.dataset.malChoice, choiceButton.dataset.malValue);
        }
      });

      resetState();
      return;
    }

    if (type === "reversing") {
      const focus = lab.querySelector("[data-rev-focus]");
      const labelView = lab.querySelector("[data-rev-label]");
      const xrefView = lab.querySelector("[data-rev-xref]");
      const sinkView = lab.querySelector("[data-rev-sink]");
      const probeRow = lab.querySelector(".rev-playground");
      const choiceRows = Array.from(lab.querySelectorAll(".playlab-choice-row"));
      const probeLines = Array.from(lab.querySelectorAll("[data-rev-probe]"));
      const choiceButtons = Array.from(lab.querySelectorAll("[data-rev-choice]"));
      const stageMap = Object.fromEntries(stages.map((stage) => [stage.dataset.playlabStage, stage]));
      const correct = {
        label: "dispatcher",
        xref: "jump-table",
        sink: "case-3"
      };
      const labels = {
        label: {
          "": "unknown",
          dispatcher: "dispatcher",
          "crc-loop": "crc loop",
          "socket-init": "socket init"
        },
        xref: {
          "": "unresolved",
          "jump-table": "jump table @ 0x404800",
          "format-string": "format string",
          "import-thunk": "import thunk"
        },
        sink: {
          "": "unresolved",
          "case-3": "case_3 -> win()",
          cleanup: "cleanup()",
          printf: "printf()"
        }
      };

      let state;

      const setFlag = (prefix) => {
        const value = randomFlag(prefix);
        if (flagBox && flagText) {
          flagText.textContent = value;
          flagBox.hidden = false;
        }
      };

      const render = () => {
        probeLines.forEach((line) => {
          line.classList.toggle("is-focus", line.dataset.revProbe === state.probe);
        });

        choiceButtons.forEach((button) => {
          const group = button.dataset.revChoice;
          const value = button.dataset.revValue;
          const selected = state[group] === value;

          button.classList.toggle("is-selected", selected);
          button.classList.toggle("is-correct", selected && value === correct[group]);
          button.classList.toggle("is-wrong", selected && value !== correct[group]);
          button.disabled =
            (group === "xref" && state.label !== correct.label) ||
            (group === "sink" && state.xref !== correct.xref);
        });

        if (focus) {
          if (state.solved) {
            focus.textContent = "dispatcher -> case_3";
          } else if (state.xref === correct.xref) {
            focus.textContent = "dispatcher / jump_table";
          } else if (state.label === correct.label) {
            focus.textContent = "dispatcher";
          } else if (state.probe === "jump") {
            focus.textContent = "indirect jmp @ 0x404800";
          } else if (state.probe === "call") {
            focus.textContent = "call rax";
          } else if (state.probe === "cmp") {
            focus.textContent = "guard check";
          } else {
            focus.textContent = "sub_4012d0";
          }
        }

        if (labelView) {
          labelView.textContent = labels.label[state.label];
        }

        if (xrefView) {
          xrefView.textContent = labels.xref[state.xref];
        }

        if (sinkView) {
          sinkView.textContent = labels.sink[state.sink];
        }

        if (stageMap.inspect) {
          stageMap.inspect.classList.toggle("is-done", state.inspected);
        }
        if (stageMap.rename) {
          stageMap.rename.classList.toggle("is-done", state.label === correct.label);
        }
        if (stageMap.xref) {
          stageMap.xref.classList.toggle("is-done", state.xref === correct.xref);
        }
        if (stageMap.follow) {
          stageMap.follow.classList.toggle("is-done", state.solved);
        }

        if (cardStatus) {
          cardStatus.textContent = state.solved ? "solved" : state.xref === correct.xref ? "mapped" : state.label === correct.label ? "renamed" : state.inspected ? "trace" : "lab";
        }
      };

      const resetState = () => {
        state = {
          probe: "",
          inspected: false,
          label: "",
          xref: "",
          sink: "",
          solved: false
        };

        if (flagBox) {
          flagBox.hidden = true;
        }
        if (feed) {
          feed.innerHTML = "";
        }

        shuffleChildren(probeRow);
        choiceRows.forEach((row) => shuffleChildren(row));
        pushFeedLine(feed, "analysis reset // symbol names and sink notes cleared");
        render();
      };

      const probe = (name) => {
        state.probe = name;

        if (name === "jump") {
          state.inspected = true;
          pushFeedLine(feed, "indirect jump confirmed // the fan-out looks like a real dispatch table");
        } else if (name === "call") {
          pushFeedLine(feed, "the call site matters less than the indirect edge that fans execution out", "bad");
        } else {
          pushFeedLine(feed, "the guard check is useful context, but it does not explain the branch fan-out", "bad");
        }

        render();
      };

      const choose = (group, value) => {
        if (group === "label") {
          if (!state.inspected) {
            pushFeedLine(feed, "inspect the indirect edge before you assign a symbol", "bad");
            return;
          }

          state.label = value;

          if (value === correct.label) {
            pushFeedLine(feed, "sub_4012d0 renamed -> dispatcher");
          } else {
            pushFeedLine(feed, `${labels.label[value]} does not fit the control-flow shape here`, "bad");
          }

          render();
          return;
        }

        if (group === "xref") {
          if (state.label !== correct.label) {
            pushFeedLine(feed, "name the function correctly first or the xref call is premature", "bad");
            return;
          }

          state.xref = value;

          if (value === correct.xref) {
            pushFeedLine(feed, "xref trail resolved -> the jump table is what actually drives the fan-out");
          } else {
            pushFeedLine(feed, `${labels.xref[value]} is a side path, not the dispatch source`, "bad");
          }

          render();
          return;
        }

        if (group === "sink") {
          if (state.xref !== correct.xref) {
            pushFeedLine(feed, "map the xrefs first or the sink selection is just blind branch chasing", "bad");
            return;
          }

          state.sink = value;

          if (value === correct.sink) {
            state.solved = true;
            setFlag("dispatcher");
            pushFeedLine(feed, "case_3 reached -> win() recovered from the dispatch graph");
          } else {
            pushFeedLine(feed, `${labels.sink[value]} is reachable, but it is not the winning sink`, "bad");
          }

          render();
        }
      };

      lab.addEventListener("click", (event) => {
        const resetButton = event.target.closest("[data-playlab-reset]");
        if (resetButton) {
          resetState();
          return;
        }

        const probeButton = event.target.closest("[data-rev-probe]");
        if (probeButton) {
          probe(probeButton.dataset.revProbe);
          return;
        }

        const choiceButton = event.target.closest("[data-rev-choice]");
        if (choiceButton) {
          choose(choiceButton.dataset.revChoice, choiceButton.dataset.revValue);
        }
      });

      resetState();
    }
  });

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
    button.textContent = "copy code";
    button.setAttribute("aria-label", "Copy code");

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "copied";
      } catch (error) {
        button.textContent = "error";
      }

      window.setTimeout(() => {
        button.textContent = "copy code";
      }, 1600);
    });

    wrapper.style.position = "relative";
    wrapper.appendChild(button);
  });
})();
