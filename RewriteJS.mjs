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
				ecmaVersion: 2020,
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
						b.memberExpression(b.identifier(global_client), b.identifier('this')),
						[ b.thisExpression() ],
					));
					
					break;
				case'CallExpression':
					
					const {callee} = ctx.node;
					if(callee.type == 'Identifier' && callee.name == 'eval'){
						/* May be a JS eval function!
						eval will only inherit the scope if the following is met:
						the keyword (not property or function) eval is called
						the keyword doesnt reference a variable named eval
						*/

						// transform eval(...) into global_client.eval(eval, tomp$evalcode => eval(tomp$evalcode))

						
					}

					break;
				// handle top level const/let in import
				case'VariableDeclaration':
					
					if(ctx.parent.node == ast && top_level_variables.includes(ctx.node.kind)){
						let expressions = [];
						for(let declaration of ctx.node.declarations){
							expressions.push(b.callExpression(
								b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('define')), b.identifier(ctx.node.kind)),
								[ b.literal(declaration.id.name), declaration.init ],
							));
						}
						
						ctx.replace_with(b.expressionStatement(b.sequenceExpression(expressions)));
					}
					break;
			}
		}
		
		ast = b.withStatement(b.memberExpression(b.identifier(global_client), b.identifier('with')), b.blockStatement(ast.body));
		
		code = generate(ast);
		return code;
	}
	unwrap(code, url){
		return code.slice(12 + global_client.length, -1);
	}
	serve(serve, url){
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