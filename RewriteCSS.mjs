import { ParseDataURI } from './DataURI.mjs'
// import that one css lib

export class RewriteCSS {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, key){
		return code;
	}
	unwrap(code, url, key){
		return code;
	}
	serve(serve, url, key){
		if(serve.startsWith('data:')){
			const [mime,buffer] = ParseDataURI(value);
			return this.wrap(buffer.toString(), url, key);
		}
		return `${this.tomp.prefix}css/${this.tomp.url.wrap(serve, key)}`
	}
};