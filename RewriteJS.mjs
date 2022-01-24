import { ParseDataURI } from './DataURI.mjs'
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { AcornIterator } from './IterateAcorn.mjs';
import { builders as b } from 'ast-types';

export const global_client = 'tompc$';
const top_level_variables = ['const','let'];

export class RewriteJS {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url){
		if(this.tomp.noscript)return '';

		try{
			var ast = parse(code, { 
				ecmaVersion: 2022,
				allowAwaitOutsideFunction: true,
				allowReturnOutsideFunction: true, 
				allowImportExportEverywhere: true,
			});
		}catch(err){
			if(err instanceof SyntaxError){
				return `throw new SyntaxError(${JSON.stringify(err.message)})`;
			}else throw err;
		}

		// unload from memory
		// code = null;

		for(let ctx of new AcornIterator(ast)){
			switch(ctx.type){
				case'ThisExpression':

					ctx.replace_with(b.callExpression(
						b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('window')), b.identifier('get_this')),
						[ b.thisExpression() ],
					));
					
					break;
				case'Identifier':
					
					/*
					 * allow eval.toString
					 * disallow window.eval.toString
					 * disallow window.eval
					 * do the same for top,location,window,document
					*/
					
					if(!(['top','location','window','document'].includes(ctx.node.name)))break;
					
					if(ctx.parent.type == 'MemberExpression'){
						if(ctx.parent_key != 'object')break;
						// must be the top level memberexpression eg eval.toString
						// not window.eval.toString 2nd level
						if(ctx.parent.parent.type == 'MemberExpression')break;
					}

					if(ctx.parent.type == 'VariableDeclarator'){
						if(ctx.parent_key != 'init')break;
					}

					let newm = b.memberExpression(b.memberExpression(b.identifier('tompc$'), b.identifier('window')), b.identifier('proxy'));

					if(ctx.node.name != 'window'){
						newm = b.memberExpression(newm, b.identifier(ctx.node.name));
					}

					ctx.replace_with(newm);
					
					break;
				case'CallExpression':
					
					const {callee} = ctx.node;

					if(callee.type != 'Identifier' || callee.name != 'eval')break;

					/* May be a JS eval function!
					eval will only inherit the scope if the following is met:
					the keyword (not property or function) eval is called
					the keyword doesnt reference a variable named eval
					*/
					
					// transform eval(...) into global_client.eval(eval, x => eval(...x))
					ctx.replace_with(b.callExpression(
						b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('scope')),
						[
							b.identifier('eval'),
							b.arrowFunctionExpression(
								[ b.identifier('x') ],
								b.callExpression(b.identifier('eval'), [ b.spreadElement(b.identifier('x')) ]),
							),
							...ctx.node.arguments,
						],
					));
					
					break;
			}
		}
		
		code = generate(ast);
		return code;
	}
	unwrap(code, url){
		return code.slice(12 + global_client.length, -1);
	}
	serve(serve, url){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, 'worker:js');
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