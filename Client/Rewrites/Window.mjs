import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { mirror_attributes, bind_natives, native_proxies, proxy_multitarget, wrap_function } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;
		
		const window_defined = this.get_defined();

		const window_proxy = new Proxy(Object.setPrototypeOf({}, null), proxy_multitarget(window_defined, global));

		native_proxies.set(window_proxy, global)
		
		this.define_properties(window_proxy);

		bind_natives(global);
		
		return { window_defined, window_proxy };
	}
	define_properties(window_proxy){
		const { origin, self, frames } = Object.getOwnPropertyDescriptors(global);

		Object.defineProperty(global, 'origin', {
			get: wrap_function(origin.get, (target, that, args) => {
				if(that != global)throw new TypeError('Illegal invocation');
				return this.client.location.origin;
			}),
			set: wrap_function(origin.set, (target, that, [ value ]) => {
				if(that != global)throw new TypeError('Illegal invocation');
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
			get: wrap_function(self.get, (target, that, args) => {
				if(that != global)throw new TypeError('Illegal invocation');
				return this.client.window;
			}),
			set: wrap_function(self.set, (target, that, [ value ]) => {
				if(that != global)throw new TypeError('Illegal invocation');
				delete global.self;
				return global.self = value;
			}),
			configurable: true,
			enumerable: true,
		});

		Object.defineProperty(global, 'frames', {
			get: wrap_function(frames.get, (target, that, args) => {
				if(that != global)throw new TypeError('Illegal invocation');
				return this.client.window;
			}),
			set: wrap_function(frames.set, (target, that, [ value ]) => {
				if(that != global)throw new TypeError('Illegal invocation');
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