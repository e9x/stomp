import { parse, walk, generate } from 'css-tree';
import { Rewriter } from './Rewriter.mjs';

export class RewriteCSS extends Rewriter {
	static service = 'worker:css';
	wrap(code, url, context = 'stylesheet'){
		try{
			var ast = parse(code, { context });
		}catch(err){
			if(err instanceof SyntaxError){
				return `/*${JSON.stringify(err.message)}*/`;
			}else throw err;
		}

		const that = this;

		walk(ast, function(node, item, list){
			if(node.type === 'Url')try{
				const resolved = new URL(node.value, url);
				
				if(this.atrule?.name === 'import'){
					node.value = that.tomp.css.serve(resolved, url);
				}else{
					node.value = that.tomp.binary.serve(resolved, url);
				}
			}catch(err){
				// console.error(err);
				return;
			}
			else if(node.name === 'import'){
				const data = node?.prelude?.children?.tail?.data;

				if(data !== undefined && data.type === 'String')try{
					const resolved = new URL(data.value, url);
					data.value = that.tomp.css.serve(resolved, url);
				}catch(err){
					// console.error(err);
					return;
				}
			}
		});

		return '@charset "UTF-8";' + generate(ast);
	}
	unwrap(code, url, context = 'stylesheet'){
		try{
			var ast = parse(code, { context });
		}catch(err){
			if(err instanceof SyntaxError){
				return `/*${JSON.stringify(err.message)}*/`;
			}else throw err;
		}

		const that = this;

		walk(ast, function(node, item, list){
			if(node.type === 'Url')try{
				if(this.atrule?.name == 'import'){
					node.value = that.tomp.css.unwrap_serving(node.value, url).toString();
				}else{
					node.value = that.tomp.binary.unwrap_serving(node.value, url).toString();
				}
			}catch(err){
				// console.error(err);
				return;
			}
			else if(node.name === 'import'){
				const data = node?.prelude?.children?.tail?.data;

				if(data !== undefined && data.type === 'String')try{
					data.value = that.tomp.css.unwrap_serving(data.value, url).toString();
				}catch(err){
					// console.error(err);
					return;
				}
			}
		});

		return generate(ast);
	}
};