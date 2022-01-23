import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { mirror_attributes, wrap_function, bind_natives, native_proxies } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;
		
		bind_natives(global);
		
		const window_defined = this.get_window_defined();

		const window_target = Object.setPrototypeOf({}, null);

		const window_proxy = new Proxy(window_target, {
			get(target, prop, receiver){
				if(prop in window_defined)target = window_defined;
				else target = global;
				return Reflect.get(target, prop, receiver);
			},
			set(target, prop, value){
				if(prop in window_defined)target = window_defined;
				else target = global;
				return Reflect.set(target, prop, value);	
			},
			has(target, prop){
				if(prop in window_defined)target = window_defined;
				else target = global;
				return Reflect.has(target, prop);	
			},
			getOwnPropertyDescriptor(target, prop){
				if(prop in window_defined)target = window_defined;
				else target = global;

				const desc = Reflect.getOwnPropertyDescriptor(target, prop);
				Reflect.defineProperty(window_target, prop, desc);
				return desc;
			},
			defineProperty(target, prop, desc){
				if(prop in window_defined)target = window_defined;
				else target = global;
				
				Reflect.defineProperty(window_target, prop, desc);
				return Reflect.defineProperty(target, prop, desc);
			},
			deleteProperty(target, prop, descriptor){
				if(prop in window_defined)target = window_defined;
				else target = global;
				return Reflect.deleteProperty(target, prop, descriptor);
			},
		});

		native_proxies.set(window_proxy, global)
		
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
	get_window_defined(){
		const that = this;
		const { location, window, document, top } = Object.getOwnPropertyDescriptors(global);

		const window_defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			location: {
				configurable: false,
				enumerable: true,
				get: mirror_attributes(location.get, function(){
					return that.client.location;
				}),
				set: mirror_attributes(location.set, function(url){
					return that.client.location.href = url;
				}),
			},
			window: {
				configurable: false,
				enumerable: true,
				get: mirror_attributes(window.get, function(){
					return that.client.window;
				}),
				set: undefined,
			},
			document: {
				configurable: false,
				enumerable: true,
				get: mirror_attributes(document.get, function(){
					return that.client.document;
				}),
				set: undefined,
			},
			top: {
				configurable: false,
				enumerable: true,
				get: mirror_attributes(top.get, function(){
					return that.client.top;
				}),
				set: undefined,
			},
		});

		return window_defined;
	}
};