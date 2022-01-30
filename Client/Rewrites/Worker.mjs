import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class WorkerRewrite extends Rewrite {
	work(){
		const that = this;

		const _Worker = global.Worker;

		class Worker extends EventTarget {
			#worker;
			#onerror;
			#onmessage;
			constructor(url, options){
				super();

				url = new URL(url, that.client.location.proxy);
				
				if(url.origin != that.client.location.proxy.origin){
					throw new DOMException(`Failed to construct 'Worker': Script at'${url}' cannot be accessed from origin '${that.client.location.proxy.origin}'.`);
				}
				
				this.#worker = new _Worker(that.client.tomp.js.serve(url, that.client.location.proxy, true), options);
				
				this.#worker.addEventListener('message', event => {
					this.#dispatch(new MessageEvent('message', event), this.#onmessage);
				});
				
				this.#worker.addEventListener('error', event => {
					this.#dispatch(new ErrorEvent('error', event), this.#onerror);
				});
			}
			terminate(){
				return this.#worker.terminate();
			}
			postMessage(message, options){
				return this.#worker.postMessage(message, options);
			}
			#dispatch(event, onlistener){
				var stopped = false;
				
				event.stopImmediatePropagation = () => {
					stopped = true;
					MessageEvent.prototype.stopImmediatePropagation.call(event);
				};
		
				this.dispatchEvent(event);
				if(!stopped && typeof onlistener == 'function')onlistener.call(this, event);
			}
			get onmessage(){
				return this.#onmessage;
			}
			set onmessage(value){
				if(typeof value == 'function')this.#onmessage = value;
				return value;
			}
			get onerror(){
				return this.#onerror;
			}
			set onerror(value){
				if(typeof value == 'function')this.#onerror = value;
				return value;
			}
		};

		global.Worker = Worker;
	}
};