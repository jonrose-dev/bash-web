import { ERROR, SUCCESS } from "./constants";

export const write = (args: string[]) => {
	const [selector, text] = args;
	const el = document.querySelector(selector);
	if (!el) return ERROR;
	el.textContent = text;

	return SUCCESS;
};
