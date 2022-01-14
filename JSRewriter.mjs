import {parse} from 'acorn';
import {generate} from 'escodegen';
import {AcornIterator} from './IterateAcorn.mjs';

export const global_client = 'tompc$';

export class JSRewriter {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, key){
		const ast = parse(code, { ecmaVersion: 2020 });
		// unload from memory
		code = null;

		for(let ctx of new AcornIterator(ast)){
			console.log(ctx);
		}
		
		code = generate(ast);
		return `with(${global_client}.with){${code}}`;
	}
	unwrap(code, url, key){
		code = Buffer.from(code);
		return code.slice(12 + global_client.length, -1);
	}
	serve(url, key){
		return `${this.tomp.prefix}js/${encodeURIComponent(this.tomp.codec.wrap(url, key))}`
	}
};


/*
** determine if the code is within a scope
** if its top level, make all let call x.define.let()
** example
with(x.ctx){
	// let variable = false;
	window.variable = false;

	// let win = this;
	window.win = x.window
}
*/