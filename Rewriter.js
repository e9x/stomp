import { createDataURI, parseDataURI } from './dataURI.js'

export default class Rewriter {
	static service = 'unknown';
	constructor(tomp){
		this.tomp = tomp;
	}
	get overwrites_wrap(){
		return this.wrap !== Rewriter.prototype.wrap;
	}
	get overwrites_unwrap(){
		return this.unwrap !== Rewriter.prototype.unwrap;
	}
	serve(serve, url, service = this.constructor.service){
		serve = String(serve);
		
		if(serve.startsWith('data:')){
			if(!this.overwrites_wrap){
				return serve;
			}
			
			const {mime,data,base64} = parseDataURI(serve);
			
			const wrapped = this.wrap(data, url);
			
			return CreateDataURI(mime, wrapped, base64);
		}

		return this.tomp.url.wrap(serve, service);
	}
	unwrap_serving(serving, url){
		serving = String(serving);

		if(serving.startsWith('data:')){
			if(!this.overwrites_wrap){
				return serving;
			}
			
			const {mime,data,base64} = ParseDataURI(serving);
			
			const unwrapped = this.unwrap(data, url);
			
			return createDataURI(mime, unwrapped, base64);
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