// for api compatibility

export class RewriteForm {
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
		if(serve.startsWith('data:'))return serve;
		return `${this.tomp.prefix}form/${this.tomp.url.wrap(serve, key)}`
	}
};