import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { bind_natives, native_proxies, proxy_multitarget, wrap_function } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const window_defined = this.get_defined();
		const window_defined_exclusive = this.get_defined_exclusive();
		
		const handler = proxy_multitarget(global, window_defined_exclusive, window_defined);
		handler[Symbol.toStringTag] = 'Window Proxy Handler';
		
		const window_proxy = new Proxy(Object.setPrototypeOf({}, null), handler);

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
	get_defined_exclusive(){
		const defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			eval: {
				configurable: true,
				enumerable: false,
				value: wrap_function(global.eval, (target, that, [ x ]) => this.client.global_eval(x)),
				writable: true,
			},
		});

		return defined;
	}
	get_defined(){
		const { location, window, document, top } = Object.getOwnPropertyDescriptors(global);

		const defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			location: {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					if(that != defined)throw new TypeError('Illegal invocation');
					return this.client.location;
				}),
				set: wrap_function(location.set, (target, that, [ url ]) => {
					if(that != defined)throw new TypeError('Illegal invocation');
					return this.client.location.href = url;
				}),
			},
			window: {
				configurable: false,
				enumerable: true,
				get: wrap_function(window.get, (target, that, args) => {
					if(that != defined)throw new TypeError('Illegal invocation');
					return this.client.window;
				}),
				set: undefined,
			},
			document: {
				configurable: false,
				enumerable: true,
				get: wrap_function(document.get, (target, that, args) => {
					if(that != defined)throw new TypeError('Illegal invocation');
					return this.client.document;
				}),
				set: undefined,
			},
			top: {
				configurable: false,
				enumerable: true,
				get: wrap_function(top.get, (target, that, args) => {
					if(that != defined)throw new TypeError('Illegal invocation');
					return this.client.top;
				}),
				set: undefined,
			},
		});

		return defined;
	}
};