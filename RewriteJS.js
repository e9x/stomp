import Rewriter from './Rewriter.js';
import AcornIterator from './IterateAcorn.js';
import { parseScript } from 'meriyah-loose';
import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';

export const global_client = 'tompc$';

const global_access = b.memberExpression(b.identifier(global_client), b.identifier('access'));

export const providers = ['window','document'];
export const undefinable = ['eval','location','top'];
// only eval and location are of interest

const parse_options = module => {
	return { 
		ecmaVersion: 2022,
		module: module === true,
		webcompat: true,
		globalReturn: true,
		next: true,
		ranges: true,
	};
};

export default class RewriteJS extends Rewriter {
	static service = 'js';
	worker_main(url){
		const cli = `${this.tomp.directory}client.js`;

		return `void function ${global_client}_main(){`
			+ `if(!(${JSON.stringify(global_client)} in this)){`
				+ `importScripts(${JSON.stringify(cli)});`
				+ `${global_client}(${JSON.stringify(this.tomp)});`
			+ `}`
		+ `}();`;
	}
	wrap(code, url, worker, module){
		if(this.tomp.noscript)return '';

		code = String(code);

		let ast;

		try{
			ast = parseScript(code, parse_options(module));
		}catch(err){
			if(err instanceof SyntaxError){
				this.tomp.log.trace(code, err);
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
					
					if(ctx.parent.type === 'ArrayPattern' || ctx.parent.type === 'ObjectPattern')break;
					if(ctx.parent.type === 'MemberExpression' && ctx.parent_key === 'property')break; // window.location;
					if(ctx.parent.type === 'LabeledStatement')break; // { location: null, };
					if(ctx.parent.type === 'VariableDeclarator' && ctx.parent_key === 'id')break;
					if(ctx.parent.type === 'Property' && ctx.parent_key === 'key')break;
					if(ctx.parent.type === 'MethodDefinition')break;
					if(ctx.parent.type === 'ClassDeclaration')break;
					if(ctx.parent.type === 'RestElement')break;
					if(ctx.parent.type === 'ExportSpecifier')break;
					if(ctx.parent.type === 'ImportSpecifier')break;
					if((ctx.parent.type === 'FunctionDeclaration' || ctx.parent.type === 'FunctionExpression' || ctx.parent.type === 'ArrowFunctionExpression') && ctx.parent_key === 'params')break;
					if((ctx.parent.type === 'FunctionDeclaration' || ctx.parent.type === 'FunctionExpression') && ctx.parent_key === 'id')break;
					if(ctx.parent.type === 'AssignmentPattern' && ctx.parent_key === 'left') break;
					if(!undefinable.includes(ctx.node.name))break;
					
					if(ctx.parent.type === 'UpdateExpression' || ctx.parent.type === 'AssignmentExpression' && ctx.parent_key === 'left'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('set1')), [
							ctx.node,
							b.literal(ctx.node.name),
							// return what the intended value is
							b.arrowFunctionExpression([
								b.identifier('tomp$target'),
								b.identifier('tomp$prop'),
								b.identifier('tomp$value'),
							], ctx.parent.type === 'UpdateExpression' ? b.updateExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								ctx.parent.node.prefix,
							) : b.assignmentExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								b.identifier('tomp$value'),
							)),
							// set
							b.arrowFunctionExpression([
								b.identifier('tomp$value'),
							], b.assignmentExpression(
								'=',
								ctx.node,
								b.identifier('tomp$value'),
							)),
							ctx.parent.type === 'UpdateExpression' ? b.identifier('undefined') : ctx.parent.node.right,
							b.literal(this.generate_part(code, ctx.parent)),
						]));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get')), [
							ctx.node,
							b.literal(ctx.node.name),
						]));
					}
					
					break;
				case'MemberExpression':
				
					if(ctx.parent.type === 'ArrayPattern' || ctx.parent.type === 'ObjectPattern')break;
					if(ctx.parent.type === 'UnaryExpression' && ctx.parent.node.operator === 'delete')break;
					if(ctx.node[this.prevent_rewrite])break;
				
					let rewrite = false;
					
					if(ctx.node.computed){
						if(ctx.node.object.type === 'Super'){
							rewrite = false;
						}else if(ctx.node.property.type === 'Literal'){
							if(undefinable.includes(ctx.node.property.value)){
								rewrite = true;
							}else{
								rewrite = false;
							}
						}else{
							rewrite = true;
						}
					}else switch(ctx.node.property.type) {
						case'Identifier':
							if(!undefinable.includes(ctx.node.property.name)){
								rewrite = false;
							}else{
								rewrite = true;
							}
							
							break;
						case'Literal':
							if(!undefinable.includes(ctx.node.property.value)){
								rewrite = false;
							}else{
								rewrite = true;
							}

							break;
						case'TemplateLiteral':
							rewrite = true;
							break;
					};

					if(!rewrite)break;

					// if not computed (object.property), make property a string
					// computed is object[property]
					
					let property_argument;
					
					if(ctx.node.computed){
						property_argument = ctx.node.property;
					}else if(ctx.node.property.type === 'Identifier'){
						property_argument = b.literal(ctx.node.property.name);
					}

					if(ctx.parent.type === 'NewExpression' && ctx.parent_key === 'callee'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('new2')), [
							ctx.node.object,
							property_argument,
							b.arrayExpression(ctx.parent.node.arguments),
							b.literal(this.generate_part(code, ctx.parent)),
						]));
					}else if(ctx.parent.type === 'CallExpression' && ctx.parent_key === 'callee'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('call2')), [
							ctx.node.object,
							property_argument,
							b.arrayExpression(ctx.parent.node.arguments),
							b.literal(this.generate_part(code, ctx.parent)),
						]));
					}else if(ctx.parent.type === 'UpdateExpression' || ctx.parent.type === 'AssignmentExpression' && ctx.parent_key === 'left'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('set2')), [
							ctx.node.object,
							property_argument,
							b.arrowFunctionExpression([
								b.identifier('tomp$target'),
								b.identifier('tomp$prop'),
								b.identifier('tomp$value'),
							], ctx.parent.type === 'UpdateExpression' ? b.updateExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								ctx.parent.node.prefix,
							) : b.assignmentExpression(
								ctx.parent.node.operator,
								b.memberExpression(b.identifier('tomp$target'), b.identifier('tomp$prop'), true),
								b.identifier('tomp$value'),
							)),
							ctx.parent.type === 'UpdateExpression' ? b.identifier('undefined') : ctx.parent.node.right,
							b.literal(this.generate_part(code, ctx.parent)),
						]));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get2')), [
							ctx.node.object,
							property_argument,
							b.literal(this.generate_part(code, ctx)),
						]));
					}

					break;
				case'ObjectPattern':
					
					// declaring a variable that was received, not setting
					if(ctx.parent.type === 'VariableDeclarator'){
						// this.pattern_declarator(ctx);	
					}

					break;
				case'ArrayPattern':
					
					// declaring a variable that was received, not setting
					if(ctx.parent.type === 'VariableDeclarator'){
						// this.pattern_declarator(ctx);	
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
	pattern_declarator(ctx){
		if(!ctx.parent.node.init){
			// very weird...
			console.log('No init:', generate(ctx.parent.parent.node));
			return;
		}

		/*
		const {
			window: {location: test},
			location: wrapped,		
		} = window;
		console.log(test);

		const { test, wrapped } = tompc$.access.pattern(window, [ { window: { location: 'test' }, location: 'wrapped' } ]);
		*/
		
		const pattern_root = ctx.type === 'ObjectPattern' ? b.objectExpression([]) : b.arrayExpression([]);
		const declare = [];
		const stack = [
			[
				pattern_root,
				ctx.node,
			],
		];
		
		while(stack.length){
			let [result, pattern] = stack.pop();

			let list;

			if(pattern.type === 'ArrayPattern'){
				list = pattern.elements;
			}else if(pattern.type === 'ObjectPattern'){
				list = pattern.properties;
			}
			
			for(let i = 0; i < list.length; i++){
				let key;
				let value;
				
				let part = list[i];
				
				if(pattern.type === 'ArrayPattern'){
					value = part;
				}else if(pattern.type === 'ObjectPattern'){
					({value,key} = part);
				}

				// console.log(result.type, value.type);

				if(value === null){
					if(result.type === 'ArrayExpression'){
						result.elements.push(null);
					}

					continue;
				}

				if(value.type === 'ArrayPattern'){
					const expr = b.arrayExpression([]);

					if(result.type === 'ArrayExpression'){
						result.elements.push(expr);
					}else if(result.type === 'ObjectExpression'){
						result.properties.push(b.property('init', key, expr));
					}

					// console.log('ArrayPattern value:', value);
					stack.push([ expr, value ]);
				}else if(value.type === 'ObjectPattern'){
					const expr = b.objectExpression([]);
					
					if(result.type === 'ArrayExpression'){
						result.elements.push(expr);
					}else if(result.type === 'ObjectExpression'){
						result.properties.push(b.property('init', key, expr));
					}

					// console.log('ObjectPattern value:', value);
					stack.push([ expr, value ]);
				}else if(value.type === 'Identifier'){
					if(result.type === 'ArrayExpression'){
						declare.push({ ...b.property('init', value, value), shorthand: true });
						result.elements.push(b.literal(value.name));
					}else if(result.type === 'ObjectExpression'){
						declare.push({ ...b.property('init', value, value), shorthand: true });
						result.properties.push(b.property('init', key, b.literal(value.name)));
					}else{
						console.error(pattern.type, value.type, result.type, 'was id', generate(pattern), JSON.stringify(pattern));
					}
				}else{
					// AssignmentPattern
					console.warn('Unknown', value.type);
				}

			}
		}

		ctx.parent.replace_with(b.variableDeclarator(b.objectPattern(declare), b.callExpression(b.memberExpression(global_access, b.identifier('pattern')), [
			ctx.parent.node.init,
			pattern_root,
			b.literal(this.generate_part(code, ctx.parent)),
		])));
	}
	unwrap(code, url, module){
		if(this.tomp.noscript)return '';

		code = String(code);

		let ast;

		try{
			ast = parseScript(code, parse_options(module));
		}catch(err){
			if(err instanceof SyntaxError){
				this.tomp.log.trace(code, err);
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
					
					if(ctx.node.id.type !== 'ObjectPattern' || !ctx.node.init)break;
					
					if(!ctx.node.init.arguments)continue;

					ctx.node.init = ctx.node.init.arguments[0];
					
					break;
				case'CallExpression':
					
					// void function tompc$_main(){if(!("tompc$" in this))importScripts("/client.js")}();
					if(ctx.node.callee.type === 'FunctionExpression' && ctx.node.callee.id?.name === `${global_client}_main`){
						ctx.remove_descendants_from_stack();
						ctx.parent.parent.detach();

						break;
					}

					// console.log('call', code.slice(ctx.node.start, ctx.node.end));

					if(ctx.node.callee.type !== 'MemberExpression')continue;
					if(ctx.node.callee.object.type !== 'MemberExpression')continue;
					
					const parts = [ ctx.node.callee.object.object.name, ctx.node.callee.object.property.name, ctx.node.callee.property.name ];
					
					switch(parts[1]){
						case'access':
							switch(parts[2]){
								case'get':{
									const id = ctx.node.arguments[0].name;
									ctx.replace_with(b.identifier(id));
								} break;
								case'get2':
								case'set2':
								case'call2':
								case'new2': {
									const id = ctx.node.arguments[ctx.node.arguments.length - 1].value;

									ctx.replace_with(b.identifier(id));
									ctx.remove_descendants_from_stack();
								} break;
								case'set1': {
									const id = ctx.node.arguments[ctx.node.arguments.length - 1].value;

									ctx.parent.replace_with(b.identifier(id));
									ctx.parent.remove_descendants_from_stack();
								} break;
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
									ctx.parent.replace_with(b.callExpression(b.identifier('eval'), ctx.node.arguments.slice(1)));
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
	generate_part(code, ctx){
		let result = code.slice(ctx.node.range[0], ctx.node.range[1]);
		
		if(ctx.type.includes('Expression') && ctx.parent.type.includes('Expression')){
			result = `(${result})`;
		}

		return result;
	}
	serve(serve, url, worker){
		if(worker){
			return super.serve(serve, url, 'wjs');
		}else{
			return super.serve(serve, url);
		}
	}
};