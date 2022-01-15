// for api compatibility

export class RewriteBinary {
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
		return `${this.tomp.prefix}binary/${encodeURIComponent(this.tomp.codec.wrap(serve, key))}`
	}
};