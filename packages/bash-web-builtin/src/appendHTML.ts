import { SUCCESS, ERROR } from "./constants";

export const appendHTML = (args: string[]) => {
	const [selector, html] = args;
	const el = document.querySelector(selector);
	if (!el) return ERROR;
	el.innerHTML += html;
	return SUCCESS;
};
