import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { mirror_attributes } from '../RewriteUtil.mjs';

export class RequestRewrite extends Rewrite {
	work(){
		const that = this;

		const original_fetch = global.fetch;
		const { original_request, Request } = this.get_request();
		
		const desc_url = Object.getOwnPropertyDescriptor(Response.prototype, 'url');

		async function fetch(input, init){
			if(input instanceof Request){
				const raw = that.raw_requests.get(input);
				input = raw;
			}else{
				input = that.client.tomp.binary.serve(new URL(input, that.client.location).href, that.client.location.href);
				
				if(typeof init == 'object' && init != undefined){
					init = {...init};
					
					const headers = init.headers;

					if(init.headers != undefined && !(init.headers instanceof Headers)){
						// preserve header capitalization for http/1 and http/1.1
						init.headers = Object.setPrototypeOf({...init.headers, 'x-tomp-impl-names': JSON.stringify(Object.keys(init.headers)) }, null)
					}
				}
			}
			
			const response = await original_fetch(input, init);
			const got_url = desc_url.get.call(response);
			const sliced = got_url.slice(got_url.indexOf(that.client.tomp.directory));
			const { field } = that.client.tomp.url.get_attributes(sliced);
			that.response_url.set(response, that.client.tomp.url.unwrap(field, that.client.location.href).toString());
			return response;
		};

		Object.defineProperty(Response.prototype, 'url', {
			get(){
				return that.response_url.has(this) ? that.response_url.get(this) : desc_url.get.call(this);
			}
		});

		mirror_attributes(global.fetch, fetch);
		
		global.fetch = fetch;
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

				url = new URL(url, that.client.location).href;

				this.#request = new original_request(that.client.tomp.binary.serve(url, that.client.location.href), init);
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