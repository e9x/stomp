// import that one css lib

export class CSSRewriter {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, key){
		return code;
	}
	unwrap(code, url, key){
		return code;
	}
	serve(url, key){
		return `${this.tomp.prefix}css/${encodeURIComponent(this.tomp.codec.wrap(url, key))}`
	}
};