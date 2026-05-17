# bash-wasm-browser

**Live demo: [bash-drab.vercel.app](https://bash-drab.vercel.app/)**

A Next.js app that demonstrates running bash scripts directly in the browser via WebAssembly. Built on top of [bash-wasm](https://github.com/bahamas10/bash-wasm) by [@bahamas10](https://github.com/bahamas10), which compiles Bash 5.3 to wasm using Emscripten.

This is a proof of concept — the goal is to show what's possible when bash runs in the browser. DOM manipulation support is in its early stages, with more commands planned.

## How it works

`bashLoader.js` scans the page for `<script type="text/bash">` tags and runs them through the wasm-compiled bash binary. Scripts can be inline or loaded from an external file via `src`.

```html
<!-- inline -->
<script type="text/bash">
web dom.write '#output' "Hello from bash!"
</script>

<!-- external -->
<script type="text/bash" src="/scripts/hello.sh"></script>
```

## The `web` built-in

Bash scripts have access to a `web` command for interacting with the page. This is the beginning of what will become a fuller DOM API for bash-in-the-browser.

### `web dom.write`

Sets the text content of an element.

```bash
web dom.write '#selector' "text content"
```

### `web dom.appendHTML`

Appends HTML to an element.

```bash
web dom.appendHTML '#selector' "<strong>bold text</strong>"
```

### `web document.title`

Sets the page title.

```bash
web document.title "My New Title"
```

All `web` commands return `0` on success and `1` if the selector doesn't match any element.

## stdout

Output written to stdout (e.g. `echo`) is forwarded to the browser console. Open DevTools to see it.

```bash
echo "hello from bash"  # appears in the console
```

## JavaScript API

`bashLoader.js` exposes `window.runBashScript(src)` globally, so you can run bash scripts from JavaScript at any time:

```js
await window.runBashScript('echo "hello from JS"');
```

## Known limitations

- No job control — background processes (`&`, `wait`) are not supported in wasm
- No user/group identity — syscalls like `getresgid` are stubbed out (harmless)
- Scripts must be non-interactive
- External `.sh` files must be served from the same origin or a CORS-enabled server

## Credits

- [bash-wasm](https://github.com/bahamas10/bash-wasm) by [@bahamas10](https://github.com/bahamas10) — the foundation that makes all of this possible
- [GNU Bash 5.3](https://www.gnu.org/software/bash/)
- [Emscripten](https://emscripten.org/)

## License

GPLv3 (inherited from Bash)
