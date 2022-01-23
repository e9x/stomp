import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;
		
		for(let prop in global)if(typeof global[prop] == 'function'){
			global[prop] = wrap_function(global, prop, (target, that, args) => {
				return Reflect.apply(target, that == window_proxy ? global : that, args);
			});
		}

		const window_defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			location: {
				configurable: false,
				enumerable: true,
				get(){
					return that.client.location;
				},
				set(url){
					return that.client.location.href = url;
				},
			},
			window: {
				configurable: false,
				enumerable: true,
				get(){
					return that.client.window;
				},
				set: undefined,
			},
			document: {
				configurable: false,
				enumerable: true,
				get(){
					return that.client.document;
				},
				set: undefined,
			},
			top: {
				configurable: false,
				enumerable: true,
				get(){
					return that.client.top;
				},
				set: undefined,
			},
		});

		const window_proxy = new Proxy(global, {
			get(target, prop, receiver){
				if(prop in window_defined)target = window_defined;
				return Reflect.get(target, prop, receiver);
			},
			set(target, prop, value){
				if(prop in window_defined)target = window_defined;
				return Reflect.set(target, prop, value);	
			},
			has(target, prop){
				if(prop in window_defined)target = window_defined;
				return Reflect.has(target, prop);	
			},
			getOwnPropertyDescriptor(target, prop){
				if(prop in window_defined)target = window_defined;
				return Reflect.getOwnPropertyDescriptor(target, prop);
			},
			defineProperty(target, prop, descriptor){
				if(prop in window_defined)target = window_defined;
				return Reflect.defineProperty(target, prop, descriptor);
			},
			deleteProperty(target, prop, descriptor){
				if(prop in window_defined)target = window_defined;
				return Reflect.deleteProperty(target, prop, descriptor);
			},
		});

		Object.defineProperty(global, 'origin', {
			get(){
				return that.client.location.origin;
			},
			set(value){
				delete global.origin;
				global.origin = value;
			}
		});

		Object.defineProperty(global, 'globalThis', {
			value: window_proxy,
			configurable: true,
			enumerable: true,
		});
		
		return { window_defined, window_proxy };
	}
};