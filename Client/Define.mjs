import { global_client } from "../RewriteJS.mjs";
import { global } from '../Global.mjs';

const global_eval = global.eval('(x => eval(x))');

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
		this.client.declare_temp = value;
		try{
			global_eval(`let ${variable} = ${global_client}.declare_temp;`);
			delete this.client.declare_temp;
		}catch(err){
			delete this.client.declare_temp;
			throw err;
		}
	}
	const(variable, value){
		this.client.declare_temp = value;
		try{
			global_eval(`const ${variable} = ${global_client}.declare_temp;`);
			delete this.client.declare_temp;
		}catch(err){
			delete this.client.declare_temp;
			throw err;
		}
	}
}