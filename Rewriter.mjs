import { ParseDataURI } from './DataURI.mjs'

export class Rewriter {
	static service = 'worker:unknown';
	constructor(tomp){
		this.tomp = tomp;
	}
	serve(serve, url){
		serve = String(serve);
		
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}

		return this.tomp.url.wrap(serve, this.constructor.service);
	}
	unwrap_serving(serving, url){
		serving = String(serving);

		if(serving.startsWith('data:')){
			const {mime,data} = ParseDataURI(serving);
			return `data:${mime},${encodeURIComponent(this.unwrap(data, url))}`;
		}
		
		return this.tomp.url.unwrap_ez(serving);
	}
	wrap(code, url){
		return code;
	}
	unwrap(code, url){
		return code;
	}
};