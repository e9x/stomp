import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect } from '../RewriteUtil.mjs';

export class RequestRewrite extends Rewrite {
	response_url = new WeakMap();
	request_urls = new WeakMap();
	eventsource_urls = new WeakMap();
	global_fetch = global.fetch;
	global = global.Request;
	work(){
		const desc_url = Reflect.getOwnPropertyDescriptor(Response.prototype, 'url');
		const legal_windows = [null,undefined,global];
		
		{
			const url = Reflect.getOwnPropertyDescriptor(global.EventSource.prototype, 'url');

			Reflect.defineProperty(global.EventSource.prototype, 'url', {
				configurable: true,
				enumerable: true,	
				get: wrap_function(url.get, (target, that, args) => {
					if(this.eventsource_urls.has(that)){
						return this.eventsource_urls.get(that);
					}else{
						return Reflect.apply(target, that, args);
					}
				}),
			});
		}

		global.EventSource = wrap_function(global.EventSource, (target, that, [ url ]) => {
			url = new URL(input, this.client.location.proxy);
			

			const result = Reflect.construct(target, [ this.client.tomp.binary.serve(url, this.client.location.proxy) ]);
			this.eventsource_urls.set(result, url.href);

			return result;
		}, true);

		global.fetch = wrap_function(global.fetch, async (target, that, [input, init]) => {
			if(!legal_windows.includes(that))throw new TypeError('Illegal invocation');
			
			if(!this.request_urls.has(input)){
				input = this.client.tomp.binary.serve(new URL(input, this.client.location.proxy), this.client.location.proxy);
				
				if(typeof init == 'object' && init != undefined){
					init = {...init};
					
					if(init.headers != undefined && !(init.headers instanceof Headers)){
						// preserve header capitalization for http/1 and http/1.1
						init.headers = {...init.headers, 'x-tomp-impl-names': JSON.stringify(Reflect.ownKeys(init.headers)) };
					}
				}
			}
			
			const response = await Reflect.apply(target, that, [ input, init ]);
			this.response_url.set(response, this.client.tomp.url.unwrap_ez(desc_url.get.call(response)));
			return response;
		});
		
		Reflect.defineProperty(Response.prototype, 'url', {
			get: wrap_function(desc_url.get, (target, that, args) => {
				if(this.response_url.has(that)){
					return this.response_url.get(that);
				}else{
					return Reflect.apply(target, that, args);
				}
			}),
		});

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
		
		{
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
			});
		}

		return Request;
	}
};