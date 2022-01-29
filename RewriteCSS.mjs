import { ParseDataURI } from './DataURI.mjs';
import { parse, walk, generate } from 'css-tree';
import { AcornIterator } from './IterateAcorn.mjs';

export class RewriteCSS {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, inline){
		try{
			var ast = parse(code, { context: inline ? 'declarationList' : 'stylesheet' });
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
				
				if(this.atrule?.name == 'import')node.value = that.tomp.css.serve(resolved, url);
				else node.value = that.tomp.binary.serve(resolved, url);
			}
		});

		return generate(ast);
	}
	unwrap(code, url, inline){
		try{
			var ast = parse(code, { context: inline ? 'declarationList' : 'stylesheet' });
		}catch(err){
			if(err instanceof SyntaxError){
				return `/*${JSON.stringify(err.message)}*/`;
			}else throw err;
		}

		const that = this;

		walk(ast, function(node, item, list){
			if(node.type === 'Url'){
				if(this.atrule?.name == 'import')node.value = that.tomp.css.unwrap_serving(node.value, url);
				else node.value = that.tomp.binary.unwrap_serving(node.value, url);
			}
		});

		return generate(ast);
	}
	serve(serve, url){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, 'worker:css');
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