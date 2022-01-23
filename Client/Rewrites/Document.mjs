import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, bind_natives, native_proxies, proxy_multitarget } from '../RewriteUtil.mjs';

export class DocumentRewrite extends Rewrite {
	work(){
		this.defined = this.get_defined();

		const handler = proxy_multitarget(global.document, this.defined);
		handler[Symbol.toStringTag] = 'Document Proxy Handler';
		
		this.proxy = new Proxy(Object.setPrototypeOf({}, null), handler);

		native_proxies.set(this.proxy, global.document)
		
		this.define_prototype();
		
		bind_natives(global.document);
		bind_natives(Document.prototype);
		bind_natives(Node.prototype);
	}
	define_prototype(){
		const { defaultView, URL } = Object.getOwnPropertyDescriptors(Document.prototype);

		Object.defineProperty(Document.prototype, 'defaultView', {
			configurable: true,
			enumerable: true,
			get: wrap_function(defaultView.get, (target, that, args) => {
				if(that != document)throw new TypeError('Illegal invocation');
				return this.client.window.proxy;
			}),
			set: undefined,
		});
		
		Object.defineProperty(Document.prototype, 'URL', {
			get: wrap_function(URL.get, (target, that, args) => {
				if(that != document)throw new TypeError('Illegal invocation');
				return this.client.location.proxy.href;
			}),
			configurable: true,
			enumerable: true,
		});
		
	}
	get_defined(pointer){
		const that = this;
		const { location } = Object.getOwnPropertyDescriptors(document);

		const defined = Object.defineProperties(Object.setPrototypeOf({}, null), {
			location: {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					if(that != this.proxy)throw new TypeError('Illegal invocation');
					return this.client.location.proxy;
				}),
				set: wrap_function(location.set, (target, that, [ url ]) => {
					if(that != this.proxy)throw new TypeError('Illegal invocation');
					return this.client.location.proxy.href = url;
				}),
			},
		});

		return defined;
	}
};