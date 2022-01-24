import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, native_proxies } from '../RewriteUtil.mjs';

export class RequestRewrite extends Rewrite {
	work(){
		const that = this;
		const { original_request, Request } = this.get_request();
		
		const desc_url = Object.getOwnPropertyDescriptor(Response.prototype, 'url');

		Navigator.prototype.sendBeacon = wrap_function(Navigator.prototype.sendBeacon, (target, that, [url, data]) => {
			if(that != navigator)throw new TypeError('Illegal invocation');	

			url = this.client.tomp.binary.serve(new URL(url, this.client.location.proxy), this.client.location.proxy);
			return Reflect.apply(target, that, [url, data]);
		});

		Object.defineProperty(Response.prototype, 'url', {
			get(){
				return that.response_url.has(this) ? that.response_url.get(this) : desc_url.get.call(this);
			}
		});

		const legal_windows = [null,undefined,global];

		global.fetch = wrap_function(global.fetch, async (target, that, [input, init]) => {
			if(!legal_windows.includes(that))throw new TypeError('Illegal invocation');
			
			if(input instanceof Request){
				const raw = this.raw_requests.get(input);
				input = raw;
			}else{
				input = this.client.tomp.binary.serve(new URL(input, this.client.location.proxy), this.client.location.proxy);
				
				if(typeof init == 'object' && init != undefined){
					init = {...init};
					
					const headers = init.headers;

					if(init.headers != undefined && !(init.headers instanceof Headers)){
						// preserve header capitalization for http/1 and http/1.1
						init.headers = Object.setPrototypeOf({...init.headers, 'x-tomp-impl-names': JSON.stringify(Object.keys(init.headers)) }, null)
					}
				}
			}
			
			const response = await Reflect.apply(target, that, [ input, init ]);
			const got_url = desc_url.get.call(response);
			const sliced = got_url.slice(got_url.indexOf(this.client.tomp.directory));
			const { field } = this.client.tomp.url.get_attributes(sliced);
			this.response_url.set(response, this.client.tomp.url.unwrap(field, this.client.location.proxy).toString());
			return response;
		});

		global.Request = Request;
	}
	response_url = new WeakMap();
	raw_requests = new WeakMap();
	get_request(){
		const that = this;

		const didnt_specify = Symbol();
		const original_request = global.Request;

		const { bodyUsed, cache, credentials, destination, headers, integrity, isHistoryNavigation, keepalive, method, mode, redirect, referrer, referrerPolicy, signal, url} = Object.getOwnPropertyDescriptors(original_request.prototype);
		
		class Request {
			#request
			static #invoke(that){
				if(!(that instanceof Request))throw new TypeError('Invalid invocation');
				return that.#request;
			}
			[Symbol.toStringTag] = 'Request';
			constructor(url = didnt_specify, init){
				if(url == didnt_specify){
					throw new DOMException(`Failed to construct 'Request': 1 argument required, but only 0 present.`);
				}

				url = new URL(url, that.client.location.proxy);

				this.#request = new original_request(that.client.tomp.binary.serve(url, that.client.location.proxy), init);
				that.raw_requests.set(this, this.#request);
			}
			arrayBuffer(){
				return original_request.prototype.arrayBuffer.call(Request.#invoke(this));
			}
			blob(){
				return original_request.prototype.blob.call(Request.#invoke(this));
			}
			clone(){
				return original_request.prototype.clone.call(Request.#invoke(this));
			}
			formData(){
				return original_request.prototype.formData.call(Request.#invoke(this));
			}
			json(){
				return original_request.prototype.json.call(Request.#invoke(this));
			}
			text(){
				return original_request.prototype.text.call(Request.#invoke(this));
			}
			get bodyUsed(){
				return bodyUsed.get.call(Request.#invoke(this));
			}
			get cache(){
				return cache.get.call(Request.#invoke(this));
			}
			get credentials(){
				return credentials.get.call(Request.#invoke(this));
			}
			get destination(){
				return destination.get.call(Request.#invoke(this));
			}
			get headers(){
				return headers.get.call(Request.#invoke(this));
			}
			get integrity(){
				return integrity.get.call(Request.#invoke(this));
			}
			get isHistoryNavigation(){
				return isHistoryNavigation.get.call(Request.#invoke(this));
			}
			get keepalive(){
				return keepalive.get.call(Request.#invoke(this));
			}
			get method(){
				return method.get.call(Request.#invoke(this));
			}
			get mode(){
				return mode.get.call(Request.#invoke(this));
			}
			get redirect(){
				return redirect.get.call(Request.#invoke(this));
			}
			get referrer(){
				return referrer.get.call(Request.#invoke(this));
			}
			get referrerPolicy(){
				return referrerPolicy.get.call(Request.#invoke(this));
			}
			get signal(){
				return signal.get.call(Request.#invoke(this));
			}
			get url(){
				const got_url = url.get.call(Request.#invoke(this));
				const sliced = got_url.slice(got_url.indexOf(that.client.tomp.directory));
				const { field } = that.client.tomp.url.get_attributes(sliced);
				
				return that.client.tomp.url.unwrap(field).toString();
			}
		};

		return { original_request, Request };
	}
};