import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors } from '../RewriteUtil.mjs';

export class HistoryRewrite extends Rewrite {
	work(){
		const that = this;
		const _History = global.History;
		const instances = [global.history];
		const {length,scrollRestoration,state} = getOwnPropertyDescriptors(_History.prototype);

		class History {
			constructor(){
				throw new TypeError('Illegal constructor');
			}
			[Symbol.toStringTag] = 'History';
			back(){
				return _History.prototype.back.call(this);
			}
			forward(){
				return _History.prototype.forward.call(this);
			}
			go(delta){
				return _History.prototype.go.call(this, delta);
			}
			pushState(data, title, url){
				if(url != undefined){
					url = url.toString();
					url = that.client.tomp.html.serve(new URL(url, that.client.location.proxy.href), that.client.location.proxy);
				}
				
				return _History.prototype.pushState.call(this, data, title, url);
			}
			replaceState(data, title, url){
				if(url != undefined){
					url = url.toString();
					url = that.client.tomp.html.serve(new URL(url, that.client.location.proxy).href, that.client.location.proxy);
				}
				
				return _History.prototype.replaceState.call(this, data, title, url);
			}
			get length(){
				return length.get.call(this);
			}
			get scrollRestoration(){
				return scrollRestoration.get.call(this);
			}
			get state(){
				return state.get.call(this);
			}
		};

		Object.defineProperty(global, 'History', {
			configurable: true,
			enumerable: false,
			value: History,
			writable: true,
		});

		Object.setPrototypeOf(global.history, History.prototype);
	}
};