# RFC: Fork Support via Web Workers + SharedArrayBuffer + Asyncify

## Summary

Implement POSIX `fork()` semantics in bash-wasm by combining three browser platform primitives: **SharedArrayBuffer** (shared/cloneable memory), **Web Workers** (the process model), and **Asyncify** (call stack serialization). This unlocks `$()` command substitution, `|` pipes, and background jobs.

## Motivation

Bash relies on `fork()` for essentially all concurrency and output-capture primitives:

| Bash feature | Why it needs fork |
|---|---|
| `$(cmd)` | Child runs cmd with stdout→pipe, parent reads pipe |
| `cmd1 \| cmd2` | Two children, one writes, one reads |
| `cmd &` | Child runs in background |
| Subshells `(...)` | Isolated execution environment |

Emscripten stubs `fork()` to return `ENOSYS`, so all of the above silently fail. This RFC describes what it takes to make fork work.

## Background: How fork() works natively

1. The kernel clones the process's memory (copy-on-write pages)
2. Both parent and child resume from the exact same instruction
3. `fork()` returns `0` in the child, the child's PID in the parent

Mapping each piece to the web platform:

| Unix concept | Web platform equivalent |
|---|---|
| Process memory clone | Copy of a `SharedArrayBuffer` |
| Parallel execution | Web Worker with its own wasm instance |
| Resume from same point | Asyncify stack serialization + rewind |
| Blocking `waitpid()` | `Atomics.wait` on a shared status cell |

## Architecture

```
Main Thread
  └─ bashLoader: loads wasm, sets up module
       └─ Worker 0 (PROXY_TO_PTHREAD): runs bash's main()
            ├─ fork() called
            │    ├─ Asyncify unwinds stack → stack saved in linear memory
            │    ├─ Linear memory snapshot → copied to new SAB
            │    ├─ Worker 1 spawned with copied SAB + wasm module
            │    │    └─ Asyncify rewinds → resumes at fork(), returns 0 (child)
            │    └─ Worker 0 Asyncify rewinds → resumes at fork(), returns Worker 1's PID
            │
            └─ pipe() + dup2() already work via Emscripten's virtual FS
```

## Required Changes

### 1. Build flags

Current:
```sh
emmake make LDFLAGS='-sFORCE_FILESYSTEM=1 -sEXPORTED_RUNTIME_METHODS=FS,callMain -sMODULARIZE=1 -sEXPORT_NAME=createBashModule -sASYNCIFY'
```

New:
```sh
emmake make LDFLAGS='-sFORCE_FILESYSTEM=1 \
  -sEXPORTED_RUNTIME_METHODS=FS,callMain \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=createBashModule \
  -sASYNCIFY \
  -sASYNCIFY_IMPORTS=["bash_web"] \
  -sPTHREADS \
  -sPROXY_TO_PTHREAD \
  -sPTHREAD_POOL_SIZE=4 \
  --js-library ../bash-web/fork.js'
```

Flag rationale:
- `-sPTHREADS`: wasm linear memory becomes a `SharedArrayBuffer`, required for sharing/copying memory across Workers
- `-sPROXY_TO_PTHREAD`: bash's `main()` runs in a Worker rather than the main thread; required because the main thread cannot call `Atomics.wait` (which blocks, needed for `waitpid`)
- `-sPTHREAD_POOL_SIZE=4`: pre-allocates Worker instances to avoid spawn latency on fork; tune based on typical script concurrency
- `-sASYNCIFY_IMPORTS=["bash_web"]`: scopes Asyncify instrumentation to functions reachable from `bash_web`, keeping binary size overhead minimal
- `--js-library ../bash-web/fork.js`: links the custom fork implementation

### 2. Server headers

`SharedArrayBuffer` requires the page to be cross-origin isolated:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

In Next.js (`next.config.ts`):

```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    },
  ]
}
```

**Note:** These headers prevent the page from being embedded in a cross-origin iframe and block loading cross-origin resources without explicit CORS headers. Audit any third-party scripts or fonts before enabling.

### 3. `fork.js` — the JS library

This is the core of the implementation. It overrides the `fork` syscall using Asyncify's `handleSleep` to pause the current wasm execution, clone state into a new Worker, and resume both.

```js
// fork.js - linked via --js-library

mergeInto(LibraryManager.library, {

  // Called by nojobs.c's make_child() → fork()
  fork__deps: ['$ERRNO_CODES', '$PThread'],
  fork__async: true,
  fork: function() {
    return Asyncify.handleSleep(function(wakeUp) {
      // At this point Asyncify has unwound the wasm stack into linear memory.
      // The entire process state (stack frames, heap) is in HEAPU8.buffer.

      var childPid = _nextPid++;

      // Allocate a shared status cell: child writes exit code here when done,
      // parent reads it in waitpid().
      var statusBuf = new SharedArrayBuffer(4);
      _pidStatusMap[childPid] = statusBuf;

      // Snapshot the current linear memory (the SAB).
      // This is the "copy" part of copy-on-write fork.
      var memSnapshot = HEAPU8.buffer.slice(0);

      // Snapshot wasm globals — these live outside linear memory and must be
      // transferred explicitly. Emscripten exposes them via the module.
      var globals = _captureGlobals();

      // Spawn the child Worker. It will receive the memory snapshot and
      // Asyncify stack data, load the same wasm module, then rewind.
      var worker = new Worker(/* same worker script URL as current worker */);

      worker.postMessage({
        type: 'fork-child',
        memory: memSnapshot,      // ArrayBuffer (detached from parent's SAB)
        globals: globals,
        asyncifyStack: _getAsyncifyData(),  // the unwound stack region
        pid: childPid,
        statusBuf: statusBuf,     // shared — parent reads this in waitpid()
      });

      worker.onmessage = function(e) {
        if (e.data.type === 'exit') {
          // Record that this child has exited (used by waitpid)
          Atomics.store(new Int32Array(statusBuf), 0, e.data.status);
          Atomics.notify(new Int32Array(statusBuf), 0);
        }
      };

      // Parent resumes: fork() returns the child PID.
      wakeUp(childPid);
    });
  },

  // Blocks until child `pid` exits. Called by bash after make_child().
  waitpid__async: true,
  waitpid: function(pid, statusPtr, options) {
    return Asyncify.handleSleep(function(wakeUp) {
      var statusBuf = _pidStatusMap[pid];
      if (!statusBuf) { wakeUp(-1); return; }

      var cell = new Int32Array(statusBuf);
      // Atomics.waitAsync is non-blocking on the main thread;
      // in a Worker (PROXY_TO_PTHREAD) we can use Atomics.wait.
      Atomics.waitAsync(cell, 0, 0).value.then(function() {
        var exitStatus = Atomics.load(cell, 0);
        if (statusPtr) HEAP32[statusPtr >> 2] = (exitStatus & 0xff) << 8;
        delete _pidStatusMap[pid];
        wakeUp(pid);
      });
    });
  },

  // Called in the child after it finishes to signal the parent.
  _web_fork_child_exit: function(status) {
    // Writes exit status to the shared cell and terminates this Worker.
    // The parent's waitpid Atomics.waitAsync fires when Atomics.notify runs.
    // (Implemented in fork-child Worker startup code, not here.)
  },

});

// Module-level state (lives in each Worker independently after fork)
var _nextPid = 2;           // pid 1 is the "shell" itself
var _pidStatusMap = {};     // pid → SharedArrayBuffer (exit status cell)

function _captureGlobals() {
  // Return a snapshot of wasm module globals that need to be restored
  // in the child. Exact list depends on Emscripten's generated code;
  // at minimum: __stack_pointer, __memory_base, any Asyncify globals.
  return {
    stackPointer: _emscripten_stack_get_current(),
    // ... enumerate via Module.asm exports
  };
}

function _getAsyncifyData() {
  // Return the memory range containing the Asyncify-unwound stack.
  // Emscripten stores this starting at _asyncify_data_ptr.
  var ptr = Module.asm.__asyncify_data.value;
  var top = HEAP32[(ptr + 4) >> 2];
  return { ptr: ptr, top: top, snapshot: HEAPU8.slice(ptr, top) };
}
```

The Worker startup code (in the worker script) handles the `fork-child` message:

```js
self.onmessage = function(e) {
  if (e.data.type !== 'fork-child') return;

  // Load the wasm module with the copied memory snapshot.
  createBashModule({
    wasmMemory: new WebAssembly.Memory({
      initial: e.data.memory.byteLength / 65536,
      maximum: /* same as parent */,
      shared: false,   // child gets its own independent copy
    }),
    // Restore globals
    // Restore Asyncify stack region
    // Then call Asyncify rewind — this resumes execution right after the
    // fork() call, returning 0 (the child's return value).
  }).then(function(mod) {
    // Override exit() to signal the parent instead of terminating the Worker.
    mod.onExit = function(status) {
      self.postMessage({ type: 'exit', status: status });
      self.close();
    };
  });
};
```

### 4. `bash-5.3/builtins/web.def`

Already changed in a previous step (`EM_JS` → `EM_ASYNC_JS`, `await` added). No additional changes needed here.

### 5. `apps/bash/src/bashLoader.ts`

With `-sPROXY_TO_PTHREAD`, `callMain` becomes async (it proxies to a Worker). It should already be awaited, but confirm:

```ts
await mod.callMain(["/script"]);
```

The Worker script URL must be accessible at runtime. Emscripten generates a `bash.worker.js` file that needs to be served alongside `bash.wasm`. Ensure the Next.js build copies it to `public/`.

## Key Risks

**Memory copy cost on fork.** Bash's wasm heap can be 10–30 MB. Copying it on each `$()` is expensive. Mitigations: keep the initial heap small with `-sINITIAL_MEMORY`, rely on lazy allocation, and consider copy-on-write via `SharedArrayBuffer` with page-level diff tracking (complex, probably not worth it for v1).

**Wasm globals are not in linear memory.** Emscripten uses wasm globals for `__stack_pointer` and others. These must be explicitly read and restored in the child. The list is stable per build but must be enumerated from the module's export list.

**Asyncify stack size.** The region of linear memory Asyncify uses to save the unwound stack must be large enough for bash's full call depth. Set with `-sASYNCIFY_STACK_SIZE` if the default overflows.

**COOP/COEP header impact.** These headers break cross-origin iframes and require all subresources (fonts, analytics, etc.) to opt in via CORS. The live demo on Vercel will need all resources audited.

**Nested forks.** A forked child may itself fork (e.g., nested `$()`). The Worker pool (`PTHREAD_POOL_SIZE`) must be large enough, and each Worker needs access to the same wasm binary URL. With `PROXY_TO_PTHREAD`, Emscripten handles Worker pooling, so this should work up to the pool size limit.

**`exec()` is not addressed.** Bash uses `exec` to replace the child process image with an external program. External programs can't run in wasm, so this remains a no-op. Bash scripts that fork-then-exec will fork successfully but the exec will fail; bash-wasm's existing behavior here is unchanged.

## Implementation Phases

**Phase 1 — Infrastructure** *(build + headers, no fork yet)*
- Add `-sPTHREADS -sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=4` to build
- Add COOP/COEP headers to Next.js config
- Verify `SharedArrayBuffer` is available in the running module
- Verify `bash.worker.js` is generated and served correctly
- Verify `await mod.callMain(...)` still works end-to-end

**Phase 2 — Basic fork**
- Write `fork.js` with memory snapshot + Worker spawn
- Implement Asyncify rewind in the child Worker startup
- Test: `pid=$(echo hello); echo $pid` — the simplest possible `$()`

**Phase 3 — Pipe integration**
- Verify `pipe()` + `dup2()` route correctly across forked processes
- Test: `$(web dom.read '#el')` captures DOM content into a variable
- Test: `web dom.read '#el' | tr '[:lower:]' '[:upper:]'`

**Phase 4 — waitpid + exit status**
- Implement `Atomics.waitAsync` path in `waitpid()`
- Verify exit status propagates correctly (`$?` after subshell)
- Test: `if $(grep foo /tmp/file); then ...`

**Phase 5 — Hardening**
- Measure memory copy overhead; tune `INITIAL_MEMORY` and `PTHREAD_POOL_SIZE`
- Verify nested `$()` works up to reasonable depth
- Audit COOP/COEP impact on all third-party resources in the app

## Open Questions

1. **Worker script URL at runtime.** With Next.js, how is `bash.worker.js` located by a running Worker? Emscripten defaults to `new Worker(locateFile('bash.worker.js'))`. This needs to resolve correctly in the browser's asset URL space.

2. **`PTHREAD_POOL_SIZE`.** Bash scripts that use many pipes or background jobs may need more than 4 Workers. What's the right default, and should it be configurable at `runBashScript` call time?

3. **Memory limit.** What is bash's actual wasm footprint at startup? This determines the per-fork copy cost and whether the approach is acceptable for the demo use case.

4. **Asyncify + pthreads interaction.** Emscripten's documentation notes some limitations when combining `-sASYNCIFY` and `-sPTHREADS`. Specifically, Asyncify stack state is per-thread and should be independent per Worker — this is the desired behavior, but needs verification with the actual Emscripten version in use.
