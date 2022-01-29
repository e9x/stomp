import { ParseDataURI } from './DataURI.mjs'
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { AcornIterator } from './IterateAcorn.mjs';
import { builders as b } from 'ast-types';

export const global_client = 'tompc$';
const top_level_variables = ['const','let'];

const global_access = b.memberExpression(b.identifier(global_client), b.identifier('access'));

export const providers = ['window','document'];
export const undefinable = ['eval','location'];
// only eval and location are of interest


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
				case'ImportExpression':
					
					// todo: add tompc$.import(meta, url)
					ctx.replace_with(b.importExpression(b.callExpression(b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('import')), [
						b.metaProperty(b.identifier('import'), b.identifier('meta')),
						ctx.node.source,
					])));

					break;
				case'ImportDeclaration':
					
					ctx.node.source.value = this.serve(new URL(ctx.node.source.value, url), url);
					
					break;
				case 'VariableDeclarator':
					
					if(ctx.node.id.type != 'ObjectPattern' || !ctx.node.init)break;
					
					ctx.node.init = b.callExpression(b.memberExpression(global_access, b.identifier('pattern')), [
						ctx.node.init,
					]);
					
					break;
				case'Identifier':

					if(ctx.parent.type == 'MemberExpression' && ctx.parent_key == 'property')break; // window.location;
					if(ctx.parent.type == 'LabeledStatement')break; // { location: null, };
					if(ctx.parent.type == 'VariableDeclarator' && ctx.parent_key == 'id')break;
					if(ctx.parent.type == 'Property' && ctx.parent_key == 'key')break;
					if(ctx.parent.type == 'MethodDefinition')break;
					if(ctx.parent.type == 'ClassDeclaration')break;
					if(ctx.parent.type == 'RestElement')break;
					if(ctx.parent.type == 'ExportSpecifier')break;
					if(ctx.parent.type == 'ImportSpecifier')break;
					if((ctx.parent.type == 'FunctionDeclaration' || ctx.parent.type == 'FunctionExpression' || ctx.parent.type == 'ArrowFunctionExpression') && ctx.parent_key == 'params')break;
					if((ctx.parent.type == 'FunctionDeclaration' || ctx.parent.type == 'FunctionExpression') && ctx.parent_key == 'id')break;
					if(ctx.parent.type == 'AssignmentPattern' && ctx.parent_key == 'left') break;
					if(!undefinable.includes(ctx.node.name))break;
					
					if(ctx.parent.type == 'UpdateExpression'){
						ctx.parent.replace_with(b.assignmentExpression(
							'=',
							ctx.node,
							b.callExpression(b.memberExpression(global_access, b.identifier('set')), [
								ctx.node,
								b.binaryExpression(
									ctx.parent.node.operator.slice(0, -1),
									// convert to number
									b.unaryExpression('+', b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
										ctx.node,
									])),
									b.literal(1),
								),
								b.literal(generate(ctx.parent.node)),
							]),
						));
					}else if(ctx.parent.type == 'AssignmentExpression' && ctx.parent_key == 'left'){
						ctx.parent.replace_with(b.assignmentExpression(
							'=',
							ctx.node,
							b.callExpression(b.memberExpression(global_access, b.identifier('set')), [
								ctx.node,
								ctx.parent.node.operator == '='
									? ctx.parent.node.right
									: b.binaryExpression(
										ctx.parent.node.operator.slice(0, -1),
										b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
											ctx.node,
										]),
										ctx.parent.node.right,
										b.literal(generate(ctx.parent.node)),
									),
								b.literal(generate(ctx.parent.node)),
							]),
						));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
							ctx.node,
						]));
					}
					
					break;
				case'MemberExpression':
					
					let rewrite = false;
					if(ctx.parent.type == 'UnaryExpression' && ctx.parent.node.operator == 'delete')break;
					if(ctx.parent.type == 'NewExpression' && ctx.parent_key == 'callee')break;
					if(ctx.parent.type === 'CallExpression' && ctx.parent_key == 'callee')break;
					if(ctx.node[this.prevent_rewrite]) break;

					switch(ctx.node.property.type) {
						case'Identifier':
							if(ctx.node.computed)rewrite = true;
							
							if(!undefinable.includes(ctx.node.property.name))break;

							rewrite = true;
							
							break;
						case'Literal':
							if(undefinable.includes(ctx.node.property.value))rewrite = true;
							break;
						case'TemplateLiteral':
							rewrite = true;
							break;
						default:
							if(ctx.node.computed)rewrite = true;
							break;
					};

					if(!rewrite)break;
					
					if (ctx.parent.type == 'AssignmentExpression' && ctx.parent_key == 'left') {
						ctx.parent.replace_with(b.assignmentExpression(
							'=',
							ctx.node,
							b.callExpression(b.memberExpression(global_access, b.identifier('set')), [
								ctx.node,
								ctx.parent.node.operator == '='
									? ctx.parent.node.right
									: b.binaryExpression(ctx.parent.node.operator.slice(0, -1), b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
										ctx.node,
									]), ctx.parent.node.right),
								b.literal(generate(ctx.parent.node)),
							]),
						));
					}else if (ctx.parent.type == 'UpdateExpression') {
						ctx.parent.replace_with(b.assignmentExpression(
							'=',
							ctx.node,
							b.callExpression(b.memberExpression(global_access, b.identifier('set')), [
								ctx.node,
								b.binaryExpression(
									ctx.parent.node.operator.slice(0, -1),
									// convert to number
									b.unaryExpression('+', b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
										ctx.node,
									])),
									b.literal(1),
								),
								b.literal(generate(ctx.parent.node)),
							]),
						));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
							ctx.node,
						]));
					}

					break;
				case'CallExpression':
					
					const {callee} = ctx.node;

					if(callee.type != 'Identifier' || callee.name != 'eval')break;

					if(!ctx.node.arguments.length)break;

					/* May be a JS eval function!
					eval will only inherit the scope if the following is met:
					the keyword (not property or function) eval is called
					the keyword doesnt reference a variable named eval
					*/
					
					// transform eval(...) into eval(...tompc$.eval.eval_scope(eval, ...['code',{note:"eval is possibly a var"}]))
					ctx.replace_with(b.callExpression(b.identifier('eval'), [
						b.spreadElement(
							b.callExpression(b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('eval_scope')), [
								b.identifier('eval'),
								...ctx.node.arguments,
							])
						),
					]));

					break;
			}
		}

		return generate(ast);
	}
	unwrap(code, url){
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
				case'ImportDeclaration':
					
					ctx.node.source.value = this.unwrap_serving(ctx.node.source.value, url);
					
					break;
				case 'VariableDeclarator':
					
					if(ctx.node.id.type != 'ObjectPattern' || !ctx.node.init)break;
					
					if(!ctx.node.init.arguments)continue;

					ctx.node.init = ctx.node.init.arguments[0];
					
					break;
				case'CallExpression':
					
					// console.log('call', code.slice(ctx.node.start, ctx.node.end));

					if(ctx.node.callee.type != 'MemberExpression')continue;
					if(ctx.node.callee.object.type != 'MemberExpression')continue;
					
					const parts = [ ctx.node.callee.object.object.name, ctx.node.callee.object.property.name, ctx.node.callee.property.name ];
					
					if(parts[0] != global_client)continue;
					
					switch(parts[1]){
						case'access':
							switch(parts[2]){
								case'get':
									ctx.replace_with(ctx.node.arguments[0]);
									ctx.remove_descendants_from_stack();
									break;
								case'set':
									ctx.parent.replace_with(b.identifier(ctx.node.arguments[ctx.node.arguments.length - 1].value));
									ctx.parent.remove_descendants_from_stack();
									break;
								case'pattern':
									ctx.replace_with(ctx.node.arguments[0]);
									ctx.remove_descendants_from_stack();
									break;
								default:
									console.warn('unknown', parts);
									break;
							}
							break;
						case'eval':
							switch(parts[2]){
								case'eval_scope':
									ctx.parent.parent.replace_with(b.callExpression(b.identifier('eval'), ctx.node.arguments.slice(1)));
									ctx.parent.parent.remove_descendants_from_stack();
									break;
								case'import':
									ctx.parent.replace_with(b.callExpression(b.identifier('import'), ctx.node.arguments.slice(1)));
									ctx.parent.remove_descendants_from_stack();
									break;
								default:
									console.warn('unknown', parts);
									break;
							}
							break;
					}
					
					break;
				case'CallExpression':
					break;
						
					const {callee} = ctx.node;

					if(callee.type != 'Identifier' || callee.name != 'eval')break;

					if(!ctx.node.arguments.length)break;
					
					/* May be a JS eval function!
					eval will only inherit the scope if the following is met:
					the keyword (not property or function) eval is called
					the keyword doesnt reference a variable named eval
					*/
					
					// transform eval(...) into eval(...tompc$.eval.eval_scope(eval, ...['code',{note:"eval is possibly a var"}]))
					ctx.replace_with(b.callExpression(b.identifier('eval'), [
						b.spreadElement(
							b.callExpression(b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('eval_scope')), [
								b.identifier('eval'),
								...ctx.node.arguments,
							])
						),
					]));

					break;
			}
		}

		return generate(ast);
	}
	serve(serve, url){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, 'worker:js');
	}
	unwrap_serving(serving, url){
		serving = serving.toString();
		if(serving.startsWith('data:')){
			const {mime,data} = ParseDataURI(serving);
			return `data:${mime},${encodeURIComponent(this.unwrap(data, url))}`;
		}
		return this.tomp.url.unwrap_ez(serving);
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