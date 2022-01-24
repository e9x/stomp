import { ParseDataURI } from './DataURI.mjs'
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { AcornIterator } from './IterateAcorn.mjs';
import { builders as b } from 'ast-types';

export const global_client = 'tompc$';
const top_level_variables = ['const','let'];

const global_access = b.memberExpression(b.identifier(global_client), b.identifier('access'));

export class RewriteJS {
	constructor(tomp){
		this.tomp = tomp;
	}
	providers = ['window','document'];
	undefinable = ['top','location'];
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
					
					// todo: add tompc$.import()
					ctx.replace_with(b.callExpression(
						b.memberExpression(b.identifier(global_client), b.identifier('import')),
						[
							b.arrowFunctionExpression(
								[ b.identifier('x') ],
								b.callExpression(
									b.importExpression(b.identifier('x')),
									[ b.spreadElement(b.identifier('x')) ],
								),
							),
							ctx.node.source,
						],
					));

					break;
				case'ImportDeclaration':
					
					ctx.node.source.value = this.serve(new URL(ctx.node.source.value, url), url);
					
					break;
				case'Identifier':

					if (ctx.parent.type == 'MemberExpression' && ctx.parent_key == 'property') break; // window.location;
					if (ctx.parent.type == 'LabeledStatement') break; // { location: null, };
					if (ctx.parent.type == 'VariableDeclarator' && ctx.parent_key == 'id') break;
					if (ctx.parent.type == 'Property' && ctx.parent_key == 'key') break;
					if (ctx.parent.type == 'MethodDefinition') break;
					if (ctx.parent.type == 'ClassDeclaration') break;
					if (ctx.parent.type == 'RestElement') break;
					if (ctx.parent.type == 'ExportSpecifier') break;
					if (ctx.parent.type == 'ImportSpecifier') break;
					if ((ctx.parent.type == 'FunctionDeclaration' || ctx.parent.type == 'FunctionExpression' || ctx.parent.type == 'ArrowFunctionExpression') && ctx.parent_key == 'params') break;
					if ((ctx.parent.type == 'FunctionDeclaration' || ctx.parent.type == 'FunctionExpression') && ctx.parent_key == 'id') break;
					if (ctx.parent.type == 'AssignmentPattern' && ctx.parent_key == 'left') break;
					if (!this.undefinable.includes(ctx.node.name)) break;
					if (ctx.node[this.dont_rewrite]) break;

					if(ctx.parent.type == 'AssignmentExpression' && ctx.parent_key == 'left'){
						ctx.parent.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('set$')), [
							this.attribute_dont_rewrite(b.identifier(ctx.node.name)),
							ctx.parent.node.right,
							b.literal(ctx.parent.node.operator),
						]));
					}else{
						ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier('get$')), [
							this.attribute_dont_rewrite(b.identifier(ctx.node.name)),
						]));
					}
					
					break;
				case'MemberExpression':
					
					let rewrite = false;
					if(ctx.parent.type == 'UnaryExpression' && ctx.parent.node.operator == 'delete')break;
					if(ctx.parent.type == 'NewExpression' && ctx.parent_key == 'callee')break;
					if(ctx.parent.type === 'CallExpression' && ctx.parent_key == 'callee')break;
					if(ctx.node[this.prevent_rewrite]) return;

					switch(ctx.node.property.type) {
						case'Identifier':
							if(ctx.node.computed)rewrite = true;
							
							if (!ctx.node.computed && this.undefinable.includes(ctx.node.property.name)) {
								ctx.node.property = b.literal(ctx.node.property.name);
								rewrite = true;
							};
							break;
						case'Literal':
							if(this.undefinable.includes(node.property.name))rewrite = true;
							break;
						case'TemplateLiteral':
							rewrite = true;
							break;
						default:
							if(ctx.node.computed)rewrite = true;
							break;
					};

					if(!rewrite)break;

					let identifier = 'get$m';
					let rewrite_ctx = ctx;
					
					const args = [
						ctx.node.object,
						ctx.node.property,
					];

					if (ctx.node.computed) args[1][this.prevent_rewrite] = true;

					if (ctx.parent.type == 'AssignmentExpression' && ctx.parent_key == 'left') {
						identifier = 'set$m';
						rewrite_ctx = ctx.parent;
						args.push(ctx.parent.node.right, b.literal(ctx.parent.node.operator));
					};

					if (ctx.parent.node.type == 'CallExpression' && ctx.parent_key == 'callee') {
						identifier = 'call$m';
						rewrite_ctx = ctx.parent;
						args.push(b.arrayExpression(...ctx.parent.node.arguments));
					};

					if (ctx.parent.node.type == 'UpdateExpression') {
						identifier = 'set$m';
						rewrite_ctx = ctx.parent;
						args.push(b.nullLiteral(), b.literal(ctx.parent.node.operator));
					};
					
					rewrite_ctx.replace_with(b.callExpression(b.memberExpression(global_access, b.identifier(identifier)), args));
					
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
					
					// transform eval(...) into global_client.eval(eval, x => eval(...x))
					ctx.replace_with(b.callExpression(b.identifier('eval'), [
						b.spreadElement(
							b.callExpression(b.memberExpression(b.memberExpression(b.identifier(global_client), b.identifier('eval')), b.identifier('scope')), [
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
	dont_rewrite = Symbol();
	attribute_dont_rewrite(node){
		node[this.prevent_rewrite] = true;
		return node;
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