import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { bind_natives, native_proxies, proxy_multitarget, wrap_function } from '../RewriteUtil.mjs';

export class WindowRewrite extends Rewrite {
	get_this(that){
		if(that == global)return this.proxy;
		else return that;
	}
	work(){
		this.defined = this.get_defined();
		this.exclusive = this.get_exclusive();
		
		const handler = proxy_multitarget(global, this.exclusive, this.defined);
		handler[Symbol.toStringTag] = 'Window Proxy Handler';
		
		this.proxy = new Proxy(Object.setPrototypeOf({}, null), handler);

		native_proxies.set(this.proxy, global)
		
		this.define_properties();

		bind_natives(global);
	}
	define_properties(){
		const { origin, self, frames } = Object.getOwnPropertyDescriptors(global);

		Object.defineProperty(global, 'origin', {
			get: wrap_function(origin.get, (target, that, args) => {
				if(that != global)throw new TypeError('Illegal invocation');
				return this.client.location.proxy.origin;
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
			value: this.proxy,
			configurable: true,
			enumerable: true,
		});
		
		Object.defineProperty(global, 'self', {
			get: wrap_function(self.get, (target, that, args) => {
				if(that != global)throw new TypeError('Illegal invocation');
				return this.proxy;
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
				return this.proxy;
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
	get_exclusive(){
		const exclusive = Object.defineProperties(Object.setPrototypeOf({}, null), {
			eval: {
				configurable: true,
				enumerable: false,
				value: wrap_function(global.eval, (target, that, [ x ]) => this.client.eval.global(x)),
				writable: true,
			},
		});

		return exclusive;
	}
	get_defined(){
		const {location,window,document,top} = Object.getOwnPropertyDescriptors(global);
		const windows = [ global ];
		
		const defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			location: {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					if(!windows.includes(defined))throw new TypeError('Illegal invocation');
					return this.client.location.proxy;
				}),
				set: wrap_function(location.set, (target, that, [ url ]) => {
					if(!windows.includes(defined))throw new TypeError('Illegal invocation');
					return this.client.location.proxy.href = url;
				}),
			},
			window: {
				configurable: false,
				enumerable: true,
				get: wrap_function(window.get, (target, that, args) => {
					if(!windows.includes(defined))throw new TypeError('Illegal invocation');
					return this.proxy;
				}),
				set: undefined,
			},
			document: {
				configurable: false,
				enumerable: true,
				get: wrap_function(document.get, (target, that, args) => {
					if(!windows.includes(defined))throw new TypeError('Illegal invocation');
					return this.client.document.proxy;
				}),
				set: undefined,
			},
			top: {
				configurable: false,
				enumerable: true,
				get: wrap_function(top.get, (target, that, args) => {
					if(!windows.includes(defined))throw new TypeError('Illegal invocation');
					return this.client.top;
				}),
				set: undefined,
			},
		});

		windows.push(defined);

		return defined;
	}
};