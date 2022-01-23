import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { mirror_attributes, bind_natives, native_proxies, proxy_multitarget } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;
		
		bind_natives(global);
		
		const window_defined = this.get_defined();

		const window_proxy = new Proxy(Object.setPrototypeOf({}, null), proxy_multitarget(window_defined, global));

		native_proxies.set(window_proxy, global)
		
		this.define_properties(window_proxy);

		return { window_defined, window_proxy };
	}
	define_properties(window_proxy){
		const that = this;
		const { origin, self, frames } = Object.getOwnPropertyDescriptors(global);

		Object.defineProperty(global, 'origin', {
			get: mirror_attributes(origin.get, function(){
				return that.client.location.origin;
			}),
			set: mirror_attributes(origin.set, function(){
				delete global.origin;
				return global.origin = value;
			}),
			configurable: true,
			enumerable: true,
		});

		Object.defineProperty(global, 'globalThis', {
			value: window_proxy,
			configurable: true,
			enumerable: true,
		});
		
		Object.defineProperty(global, 'self', {
			get: mirror_attributes(self.get, function(){
				return that.client.window;
			}),
			set: mirror_attributes(frames.set, function(){
				delete global.self;
				return global.self = value;
			}),
			configurable: true,
			enumerable: true,
		});

		Object.defineProperty(global, 'frames', {
			get: mirror_attributes(frames.get, function(){
				return that.client.window;
			}),
			set: mirror_attributes(frames.set, function(value){
				delete global.frames;
				return global.frames = value;
			}),
			configurable: true,
			enumerable: true,
		});
	}
	get_defined(){
		const that = this;
		const { location, window, document, top } = Object.getOwnPropertyDescriptors(global);

		const defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
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

		return defined;
	}
};