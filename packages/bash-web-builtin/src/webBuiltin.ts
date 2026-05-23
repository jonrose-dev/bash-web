import { appendHTML } from "./appendHTML";
import { ERROR, SUCCESS } from "./constants";
import { read } from "./read";
import { write } from "./write";

export const webBuiltin = async (argv: string[]): Promise<number | string> => {
	const [cmd, ...args] = argv;
	switch (cmd) {
		case "dom.write": {
			return write(args);
		}
		case "dom.appendHTML": {
			return appendHTML(args);
		}
		case "document.title": {
			document.title = args[0];
			return SUCCESS;
		}
		case "dom.read": {
			return read(args);
		}

		// TODO: dom.attr <selector> <attr> [value] — if value omitted, write current
		// attribute value to stdout (return ERROR if missing); if value provided, set
		// the attribute. Enables reading <input> values, href, data-* attrs, etc.
		case "dom.attr": {
			return ERROR;
		}

		// TODO: dom.class.has <selector> <class> — return SUCCESS if element has the
		// class, ERROR otherwise. Designed for use in bash conditionals:
		//   if web dom.class.has '#el' 'active'; then ...
		case "dom.class.has": {
			return ERROR;
		}

		// TODO: dom.class.add <selector> <class> — add a CSS class to matched element.
		// Return ERROR if selector matches nothing.
		case "dom.class.add": {
			return ERROR;
		}

		// TODO: dom.class.remove <selector> <class> — remove a CSS class from matched
		// element. Return ERROR if selector matches nothing.
		case "dom.class.remove": {
			return ERROR;
		}

		// TODO: dom.class.toggle <selector> <class> — toggle a CSS class on matched
		// element. Return ERROR if selector matches nothing.
		case "dom.class.toggle": {
			return ERROR;
		}

		// TODO: dom.style <selector> <property> <value> — set an inline CSS property
		// on matched element (e.g. web dom.style '#box' 'color' 'red').
		// Return ERROR if selector matches nothing.
		case "dom.style": {
			return ERROR;
		}

		// TODO: dom.remove <selector> — remove matched element from the DOM.
		// Return ERROR if selector matches nothing.
		case "dom.remove": {
			return ERROR;
		}

		// TODO: storage.set <key> <value> — call localStorage.setItem(key, value).
		// Lets bash scripts persist state across page loads.
		case "storage.set": {
			return ERROR;
		}

		// TODO: storage.get <key> — write localStorage.getItem(key) to stdout.
		// Return ERROR if key is not present.
		case "storage.get": {
			return ERROR;
		}

		// TODO: storage.remove <key> — call localStorage.removeItem(key).
		case "storage.remove": {
			return ERROR;
		}

		// TODO: fetch <url> — perform an HTTP GET and write the response body to stdout.
		// Must be awaited somehow — needs careful thought around how async integrates
		// with the synchronous wasm call model (Asyncify or pre-fetch before callMain).
		// Enables: web fetch https://api.example.com/data | grep foo
		case "fetch": {
			return ERROR;
		}

		// TODO: event.dispatch <selector> <eventName> — fire a CustomEvent with the
		// given name on the matched element. Lets bash trigger JS-land listeners.
		// Return ERROR if selector matches nothing.
		case "event.dispatch": {
			return ERROR;
		}

		default:
			console.error("unknown command");
			return ERROR;
	}
};
