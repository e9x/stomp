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
			if (node.type === 'Url') {
				let resolved;
				
				try{
					resolved = new URL(node.value, url);
				}catch(err){
					// console.error(err);
					return;
				}
				
				if(this.atrule?.name == 'import'){
					node.value = that.tomp.css.serve(resolved, url);
				}else{
					node.value = that.tomp.binary.serve(resolved, url);
				}
			}
		});

		return generate(ast);
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
			if(node.type === 'Url'){
				if(this.atrule?.name == 'import'){
					node.value = that.tomp.css.unwrap_serving(node.value, url).toString();
				}else{
					node.value = that.tomp.binary.unwrap_serving(node.value, url).toString();
				}
			}
		});

		return generate(ast);
	}
};