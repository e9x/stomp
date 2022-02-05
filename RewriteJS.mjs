import { ParseDataURI } from './DataURI.mjs'
import { parseScript } from 'meriyah';
import { generate } from 'escodegen';
import { AcornIterator } from './IterateAcorn.mjs';
import { builders as b } from 'ast-types';

export const global_client = 'tompc$';

const global_access = b.memberExpression(b.identifier(global_client), b.identifier('access'));

export const providers = ['window','document'];
export const undefinable = ['eval','location'];
// only eval and location are of interest


export class RewriteJS {
	constructor(tomp){
		this.tomp = tomp;
	}
	worker_main(url){
		const cli = `${this.tomp.directory}client.js`;

		return `void function ${global_client}_main(){`
			+ `if(!(${JSON.stringify(global_client)} in this)){`
				+ `importScripts(${JSON.stringify(cli)});`
				+ `${global_client}(${JSON.stringify(this.tomp)});`
			+ `}`
		+ `}();`;
	}
	wrap(code, url, worker){
		if(this.tomp.noscript)return '';

		let ast;

		try{
			ast = parseScript(code, { 
				ecmaVersion: 2022,
				module: true,
				webcompat: true,
				globalReturn: true, 
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
				case'CallExpression':
					
					const {callee} = ctx.node;

					if(callee.type === 'Identifier' && callee.name === 'eval' && ctx.node.arguments.length){
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
					}

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
					
					if(ctx.parent.type == 'UpdateExpression' || ctx.parent.type == 'AssignmentExpression'){
						ctx.parent.replace_with(b.assignmentExpression(
							'=',
							ctx.node,
							b.callExpression(b.memberExpression(global_access, b.identifier('set1')), [
								ctx.node,
								b.literal(ctx.node.name),
								b.arrowFunctionExpression([
									b.identifier('tomp$target'),
								], ctx.parent.type == 'UpdateExpression' ? b.updateExpression(
									ctx.parent.node.operator,
									b.identifier('tomp$target'),
									ctx.parent.node.prefix,
								) : b.assignmentExpression(
									ctx.parent.node.operator,
									b.identifier('tomp$target'),
									ctx.parent.node.right,
								)),
								b.literal(generate(ctx.parent.node)),
							]),
						));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
							ctx.node,
							b.literal(ctx.node.name),
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

					// if not computed (object.property), make property a string
					// computed is object[property]
					
					const property_argument = !ctx.node.computed && ctx.node.property.type == 'Identifier' ? b.literal(ctx.node.property.name) : ctx.node.property;

					if(ctx.parent.type == 'UpdateExpression' || ctx.parent.type == 'AssignmentExpression' && ctx.parent_key == 'left'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('set2')), [
							ctx.node.object,
							property_argument,
							b.arrowFunctionExpression([
								b.identifier('tomp$target'),
								b.identifier('tomp$prop'),
							], ctx.parent.type == 'UpdateExpression' ? b.updateExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								ctx.parent.node.prefix,
							) : b.assignmentExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								ctx.parent.node.right,
							)),
							b.literal(generate(ctx.parent.node)),
						]));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get2')), [
							ctx.node.object,
							property_argument,
							b.literal(generate(ctx.node)),
						]));
					}

					break;
			}
		}

		code = generate(ast);
		
		if(worker){
			code = this.worker_main(url) + code;
		}

		return code;
	}
	unwrap(code, url){
		if(this.tomp.noscript)return '';

		let ast;

		try{
			ast = parseScript(code, { 
				ecmaVersion: 2022,
				module: true,
				webcompat: true,
				globalReturn: true, 
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
					
					ctx.node.source.value = this.unwrap_serving(ctx.node.source.value, url).toString();
					
					break;
				case 'VariableDeclarator':
					
					if(ctx.node.id.type != 'ObjectPattern' || !ctx.node.init)break;
					
					if(!ctx.node.init.arguments)continue;

					ctx.node.init = ctx.node.init.arguments[0];
					
					break;
				case'CallExpression':
					
					// void function tompc$_main(){if(!("tompc$" in this))importScripts("/client.js")}();
					if(ctx.node.callee.type == 'FunctionExpression' && ctx.node.callee.id.name == `${global_client}_main`){
						ctx.remove_descendants_from_stack();
						ctx.parent.parent.detach();
					}

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
									break;
								case'get2':
								case'set2':
									ctx.parent.replace_with(b.identifier(ctx.node.arguments[ctx.node.arguments.length - 1].value));
									ctx.parent.remove_descendants_from_stack();
									break;
								case'set1':
									ctx.parent.parent.replace_with(b.identifier(ctx.node.arguments[ctx.node.arguments.length - 1].value));
									ctx.parent.parent.remove_descendants_from_stack();
									break;
								case'pattern':
									ctx.replace_with(ctx.node.arguments[0]);
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
									break;
								case'import':
									ctx.parent.replace_with(b.callExpression(b.identifier('import'), ctx.node.arguments.slice(1)));
									break;
								default:
									console.warn('unknown', parts);
									break;
							}
							break;
					}
					
					break;
			}
		}

		return generate(ast);
	}
	serve(serve, url, worker){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, worker ? 'worker:wjs' : 'worker:js');
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