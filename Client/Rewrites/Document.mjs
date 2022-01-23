import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, bind_natives, native_proxies, proxy_multitarget } from '../RewriteUtil.mjs';

export class DocumentRewrite extends Rewrite {
	work(){
		const pointer = {};
		const document_defined = this.get_defined(pointer);

		const handler = proxy_multitarget(global.document, document_defined);
		handler[Symbol.toStringTag] = 'Document Proxy Handler';
		
		const document_proxy = new Proxy(Object.setPrototypeOf({}, null), handler);

		pointer.document_proxy = document_defined;

		native_proxies.set(document_proxy, global.document)
		
		this.define_prototype();
		
		bind_natives(global.document);
		bind_natives(Document.prototype);
		bind_natives(Node.prototype);
		
		return document_proxy;
	}
	define_prototype(){
		const { defaultView, URL } = Object.getOwnPropertyDescriptors(Document.prototype);

		Object.defineProperty(Document.prototype, 'defaultView', {
			configurable: true,
			enumerable: true,
			get: wrap_function(defaultView.get, (target, that, args) => {
				if(that != document)throw new TypeError('Illegal invocation');
				return this.client.window;
			}),
			set: undefined,
		});
		
		Object.defineProperty(Document.prototype, 'URL', {
			get: wrap_function(URL.get, (target, that, args) => {
				if(that != document)throw new TypeError('Illegal invocation');
				return this.client.location.href;
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
					if(that != pointer.document_proxy)throw new TypeError('Illegal invocation');
					return this.client.location;
				}),
				set: wrap_function(location.set, (target, that, [ url ]) => {
					if(that != pointer.document_proxy)throw new TypeError('Illegal invocation');
					return this.client.location.href = url;
				}),
			},
		});

		return defined;
	}
};