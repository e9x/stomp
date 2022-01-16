import { ParseDataURI } from './DataURI.mjs';
import { parse, walk, generate } from 'css-tree';
import { AcornIterator } from './IterateAcorn.mjs';

export class RewriteCSS {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, key, html){
		try{
			var ast = parse(code, { context: html ? 'declarationList' : 'stylesheet' });
		}catch(err){
			if(err instanceof SyntaxError){
				return `/*${JSON.stringify(err.message)}*/`;
			}else throw err;
		}

		const that = this;

		walk(ast, function(node, item, list){
			if (node.type === 'Url') {
				try{
					var resolved = new URL(node.value, url).href;
				}catch(err){
					var resolved = '';
					console.error(err);
				}
				
				if(this.atrule.name == 'import')node.value = that.tomp.css.serve(resolved, url, key);
				else node.value = that.tomp.binary.serve(resolved, url, key);
			}
		});

		return generate(ast);
	}
	unwrap(code, url, key){
		return code;
	}
	serve(serve, url, key){
		if(serve.startsWith('data:')){
			const [mime,buffer] = ParseDataURI(value);
			return 'data:text/css,' + /*encodeURIComponent but we need to support unicode*/escape(this.wrap(buffer.toString(), url, key));
		}
		return this.tomp.url.wrap(serve, key, 'css');
	}
};