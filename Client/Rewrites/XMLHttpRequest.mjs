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

		const decoder = new TextDecoder('utf-8');

		const XMLHttpRequestResponseType = ['', 'arraybuffer', 'blob', 'document', 'json', 'text', 'moz-chunked-arraybuffer', 'ms-stream'];

		class XMLHttpRequestProxy extends XMLHttpRequestEventTargetProxy {
			constructor(){
				super(real);
			}
			#headers = new Headers();
			#response_headers = new Headers();
			#method = '';
			#url = '';
			#async = false;
			#username = undefined;
			#password = undefined;
			#responseType = '';
			#readyState = that.global.UNSENT;
			#responseURL = '';
			#responseXML = null;
			#response = new Uint8Array();
			get #loading_or_done(){
				return this.#readyState === that.global.LOADING || this.#readyState === that.global.DONE;
			}
			get #is_text(){
				return this.#responseType === '' || this.#responseType === 'text';
			}
			get responseText(){
				if(!this.#is_text){
					throw new DOMException(`Failed to read the 'responseText' property from 'XMLHttpRequest': The value is only accessible if the object's 'responseType' is '' or 'text' (was '${this.#responseType}').`)
				}

				return decoder.decode(this.#response);
			}
			get responseXML(){
				return this.#responseXML;
			}
			get responseType(){
				return this.#responseType;
			}
			set responseType(value){
				if(this.#loading_or_done){
					throw new DOMException(`Failed to set the 'responseType' property on 'XMLHttpRequest': The response type cannot be set if the object's state is LOADING or DONE.`);
				}else if(!this.#async){
					throw new DOMException(`Failed to set the 'responseType' property on 'XMLHttpRequest': The response type cannot be changed for synchronous requests made from a document.`)
				}

				if(!XMLHttpRequestResponseType.includes(value)){
					console.warn(`The provided value 'test' is not a valid enum value of type XMLHttpRequestResponseType.`);
					return;
				}

				this.#responseType = value;
				return value;
			}
			get readyState(){
				return this.#readyState;
			}
			get responseURL(){
				return this.#responseURL;
			}
			get response(){
				if(this.#is_text){
					return this.responseText;
				}else if(this.#responseType === 'arraybuffer'){
					return this.#response.buffer;
				}else if(this.#responseType === 'document'){
					return this.#responseXML;
				}

				return this.#response;
			}
			#fetch(url, init, callback/*(error, response, buffer)*/){
				if(this.#async){
					Reflect.apply(that.client.request.global_fetch, global, [ url, init ]).then(async response => {
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

					this.#response = buffer;
					this.#responseURL = response.url;
					this.#response_headers = response.headers;

					this.dispatchEvent(new ProgressEvent('loadstart', {
						total: response.headers.get('content-length') || 1000
					}));
					
					this.dispatchEvent(new ProgressEvent('loadend', {
						total: response.headers.get('content-length') || 1000
					}));
					
					this.dispatchEvent(new ProgressEvent('load', {
						total: response.headers.get('content-length') || 1000
					}));
					
				});
			}
			getResponseHeader(header){
				return this.#response_headers.get(header);
			}
			getAllResponseHeaders(){
				let result = '';

				for(let [ header, value ] in this.#response_headers){
					result += `${header}: ${value}\r\n`;
				}

				return result;
			}
		};

		XMLHttpRequestProxy = DOMObjectConstructor(XMLHttpRequestProxy);
		XMLHttpRequestEventTargetProxy = DOMObjectConstructor(XMLHttpRequestEventTargetProxy);

		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'abort');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'error');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'load');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'loadend');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'loadstart');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'progress');
		EventTarget_on(XMLHttpRequestEventTargetProxy.prototype, 'timeout');
		
		TargetConstant(XMLHttpRequestProxy, 'UNSENT', 0);
		TargetConstant(XMLHttpRequestProxy, 'OPENED', 1);
		TargetConstant(XMLHttpRequestProxy, 'HEADERS_RECEIVED', 2);
		TargetConstant(XMLHttpRequestProxy, 'LOADING', 3);
		TargetConstant(XMLHttpRequestProxy, 'DONE', 4);

		mirror_class(this.global, XMLHttpRequestProxy, instances);
		mirror_class(this.global_target, XMLHttpRequestEventTargetProxy, instances);

		global.XMLHttpRequest = XMLHttpRequestProxy;
		global.XMLHttpRequestEventTarget = XMLHttpRequestEventTargetProxy;
	}
};