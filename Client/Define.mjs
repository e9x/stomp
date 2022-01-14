import { global_client } from "../RewriteJS.mjs";
import { global } from '../Global.mjs';

const global_eval = global.eval.bind(global);

// Store defined variables names.
export class Define {
	// Global consts/lets cannot be undone
	lets = new Set();
	consts = new Set();
	constructor(client){
		this.client = client;
	}
	error(identifier){
		return new SyntaxError(`Identifier '${identifier}' has already been declared`);
	}
	let(variable, value){
		global_eval(`let ${variable} = ${global_client}.declare_temp;`);
	}
	const(variable, value){
		global_eval(`const ${variable} = ${global_client}.declare_temp;`);
	}
}