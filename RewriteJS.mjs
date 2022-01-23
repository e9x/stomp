import { ParseDataURI } from './DataURI.mjs'
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { AcornIterator } from './IterateAcorn.mjs';

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

					break;
				// handle top level const/let in import
				case'VariableDeclaration':
					
					if(ctx.parent.node == ast && top_level_variables.includes(ctx.node.kind)){
						let expressions = [];
						for(let declaration of ctx.node.declarations){
							expressions.push({
								type: 'CallExpression',
								callee: {
									type: 'MemberExpression',
									object: {
										type: 'MemberExpression',
										object: {
											type: 'Identifier',
											name: global_client,
										},
										property: {
											name: 'Identifier',
											name: 'define',
										},
									},
									property: {
										type: 'Identifier',
										name: ctx.node.kind,
									},
								},
								arguments: [
									{
										type: 'Literal',
										value: declaration.id.name,
									},
									declaration.init,
								],
							});
						}
						ctx.replace_with({
							type: 'ExpressionStatement',
							expression: {
								type: 'SequenceExpression',
								expressions,
							},
						});
					}
					break;
			}
		}
		
		ast = {
			type: 'WithStatement',
			object: {
				type: 'MemberExpression',
				object: {
					type: 'Identifier',
					name: global_client,
				},
				property: {
					type: 'Identifier',
					name: 'with',	
				},
				computed: false,
			},
			body: {
				type: 'BlockStatement',
				body: ast.body,
			},
		};
		
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