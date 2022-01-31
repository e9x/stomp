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
					this.dispatchEvent(new MessageEvent('message', event));
				});
				
				this.#worker.addEventListener('error', event => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});
			}
			terminate(){
				return this.#worker.terminate();
			}
			postMessage(message, options){
				return this.#worker.postMessage(message, options);
			}
			get onmessage(){
				return this.#onmessage;
			}
			set onmessage(value){
				if(typeof value == 'function'){
					if(typeof this.#onmessage == 'function'){
						this.removeEventListener('message', this.#onmessage);
					}

					this.#onmessage = value;
					this.addEventListener('message', value);
				}

				return value;
			}
			get onerror(){
				return this.#onerror;
			}
			set onerror(value){
				if(typeof value == 'function'){
					if(typeof this.#onerror == 'function'){
						this.removeEventListener('error', this.#onerror);
					}

					this.#onerror = value;
					this.addEventListener('error', value);
				}
				
				return value;
			}
		};

		global.Worker = Worker;
	}
};