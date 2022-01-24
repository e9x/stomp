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
	wrap(code, url, module = false, global_scope = false){
		if(this.tomp.noscript)return '';

		try{
			console.log(module ? 'module' : 'script');
			var ast = parse(code, { 
				ecmaVersion: 2022,
				allowAwaitOutsideFunction: true,
				sourceType: module ? 'module' : 'script',
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

					ctx.replace_with(b.memberExpression(b.identifier('window'), b.identifier(ctx.node.name)));
					
					break;
				case'CallExpression':
					
					const {callee} = ctx.node;

					if(callee.type != 'Identifier' || callee.name != 'eval')break;

					/* May be a JS eval function!
					eval will only inherit the scope if the following is met:
					the keyword (not property or function) eval is called
					the keyword doesnt reference a variable named eval
					*/

					const code_arg = 'tomp$evalcode';
					// transform eval(...) into global_client.eval(eval, tomp$evalcode => eval(tomp$evalcode))
					ctx.replace_with(b.callExpression(
						b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('scope')),
						[
							b.identifier('eval'),
							b.arrowFunctionExpression(
								[ b.identifier(code_arg) ],
								b.callExpression(b.identifier('eval'), [ b.spreadElement(b.identifier(code_arg)) ]),
							),
							...ctx.node.arguments,
						],
					));
					
					break;
				// handle top level const/let in import
				case'VariableDeclaration':
					
					if(module || !global_scope || ctx.parent.node != ast || !top_level_variables.includes(ctx.node.kind))break;

					let expressions = [];
					for(let declaration of ctx.node.declarations){
						expressions.push(b.callExpression(
							b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('define')), b.identifier(ctx.node.kind)),
							[ b.literal(declaration.id.name), declaration.init ],
						));
					}
					
					ctx.replace_with(b.expressionStatement(b.sequenceExpression(expressions)));

					break;
			}
		}
		
		// ast = b.withStatement(b.memberExpression(b.identifier(global_client), b.identifier('with')), b.blockStatement(ast.body));
		
		code = generate(ast);
		return code;
	}
	unwrap(code, url){
		return code.slice(12 + global_client.length, -1);
	}
	serve(serve, url, module = false){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, module ? 'worker:js:module' : 'worker:js');
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