import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect } from '../RewriteUtil.mjs';
import { EventTarget_on, TargetConstant, DOMObjectConstructor, mirror_class } from '../NativeUtil.mjs';

export class XMLHttpRequestRewrite extends Rewrite {
	global = global.XMLHttpRequest;
	global_target = global.XMLHttpRequestEventTarget;
	work(){
		const instances = new WeakSet();
		const real = Symbol();
		const that = this;

		class XMLHttpRequestEventTargetProxy extends EventTarget {
			constructor(key){
				if(key === real){
					super();
					instances.add(this);
				}else{
					throw new TypeError(`Illegal constructor`);
				}
			}
		};

		class XMLHttpRequestProxy extends XMLHttpRequestEventTargetProxy {
			constructor(){
				super(real);
			}
			#headers = new Headers();
			#method = '';
			#url = '';
			#async = false;
			#username = undefined;
			#password = undefined;
			#fetch(url, init, callback/*(error, response, buffer)*/){
				if(this.#async){
					that.client.request.global_fetch(url, init).then(async response => {
						const buffer = await response.arrayBuffer();
						callback(undefined, response, buffer);
					}).catch(error => callback(error));	
				}else{
					const response = that.client.sync.fetch(url, init);
					callback(undefined, response, response.rawArrayBuffer);
				}
			}
			open(method, url, async, username, password){
				this.#method = String(method);
				
				this.#url = String(url);
				
				if(async){
					this.#async = true;
				}else{
					this.#async = false;
				}

				if(username){
					this.#username = String(password);
				}else{
					this.#username = undefined;
				}
				
				if(password){
					this.#password = String(password);
				}else{
					this.#password = undefined;
				}
			}
			setRequestHeader(header, value){
				// behavior is equal to append
				this.#headers.append(header, value);
			}
			send(body){
				this.#fetch(that.client.tomp.binary.serve(new URL(this.#url, that.client.base), that.client.base), {
					method: this.#method,
					headers: this.#headers,

				}, (error, response, buffer) => {
					console.log(error, response, buffer);
				});
			}

		};

		XMLHttpRequest = DOMObjectConstructor(XMLHttpRequest);
		XMLHttpRequestEventTarget = DOMObjectConstructor(XMLHttpRequestEventTarget);

		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'abort');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'error');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'load');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'loadend');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'loadstart');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'progress');
		EventTarget_on(XMLHttpRequestEventTarget.prototype, 'timeout');
		
		TargetConstant(XMLHttpRequestProxy, 'UNSENT', 0);
		TargetConstant(XMLHttpRequestProxy, 'OPENED', 1);
		TargetConstant(XMLHttpRequestProxy, 'HEADERS_RECEIVED', 2);
		TargetConstant(XMLHttpRequestProxy, 'LOADING', 3);
		TargetConstant(XMLHttpRequestProxy, 'DONE', 4);

		mirror_class(this.global, XMLHttpRequest, instances);
		mirror_class(this.global_target, XMLHttpRequestEventTarget, instances);

		global.XMLHttpRequest = XMLHttpRequestProxy;
		global.XMLHttpRequestEventTarget = XMLHttpRequestEventTargetProxy;
	}
};