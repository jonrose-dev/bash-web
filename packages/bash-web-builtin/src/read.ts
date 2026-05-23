import { ERROR } from "./constants";

export const read = (args: string[]) => {
	const el = document.querySelector(args[1]);
	if (!el) return ERROR;
	return el.textContent ?? ""; // string → C writes it via
};
