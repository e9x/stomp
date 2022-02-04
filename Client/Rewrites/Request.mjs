import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect } from '../RewriteUtil.mjs';
import { engine } from '../../UserAgent.mjs';

export class RequestRewrite extends Rewrite {
	response_url = new WeakMap();
	request_urls = new WeakMap();
	global = global.Request;
	work(){
		const desc_url = Reflect.getOwnPropertyDescriptor(Response.prototype, 'url');

		const legal_windows = [null,undefined,global];

		global.fetch = wrap_function(global.fetch, async (target, that, [input, init]) => {
			if(!legal_windows.includes(that))throw new TypeError('Illegal invocation');
			
			if(this.request_urls.has(input)){
				// already handled
				// input.url on v8 side is rewritten
				// input = new this.global(this.request_urls.get(input), input);
			}else{
				input = this.client.tomp.binary.serve(new URL(input, this.client.location.proxy), this.client.location.proxy);
				
				if(typeof init == 'object' && init != undefined){
					init = {...init};
					
					if(init.headers != undefined && !(init.headers instanceof Headers)){
						// preserve header capitalization for http/1 and http/1.1
						init.headers = Object.setPrototypeOf({...init.headers, 'x-tomp-impl-names': JSON.stringify(Object.keys(init.headers)) }, null)
					}
				}
			}
			
			const response = await Reflect.apply(target, that, [ input, init ]);
			this.response_url.set(response, this.client.tomp.url.unwrap_ez(desc_url.get.call(response)));
			return response;
		});

		this.global = global.Request;

		global.Request = wrap_function(global.Request, (target, that, args) => {
			if(args.length === 0){
				throw new DOMException(`Failed to construct 'Request': 1 argument required, but only 0 present.`);
			}

			let [ url, init ] = args;

			url = new URL(url, this.client.location.proxy);
			
			const result = Reflect.construct(target, [ url, init ]);

			this.request_urls.set(result, url.toString())
			
			return result;
		}, true);
		
		const url = Reflect.getOwnPropertyDescriptor(this.global.prototype, 'url');

		Reflect.defineProperty(this.global.prototype, 'url', {
			configurable: true,
			enumerable: true,
			get: wrap_function(url.get, (target, that, args) => {
				if(!this.request_urls.has(that)){
					return Reflect.apply(target, that, args);
				}

				return this.request_urls.get(that);
			}),
			set: undefined,
		});

		return Request;
	}
};