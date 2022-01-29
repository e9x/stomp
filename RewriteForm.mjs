// for api compatibility

export class RewriteForm {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url){
		return code;
	}
	unwrap(code, url){
		return code;
	}
	serve(serve, url){
		serve = serve.toString();
		if(serve.startsWith('data:'))return serve;
		return this.tomp.url.wrap(serve, 'worker:form');
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