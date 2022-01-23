import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { mirror_attributes, bind_natives, native_proxies, proxy_multitarget } from '../RewriteUtil.mjs';

export class DocumentRewrite extends Rewrite {
	work(){
		bind_natives(global.document);
		bind_natives(Document.prototype);
		bind_natives(Node.prototype);
		
		const document_defined = this.get_defined();

		const document_proxy = new Proxy(Object.setPrototypeOf({}, null), proxy_multitarget(document_defined, global.document));

		native_proxies.set(document_proxy, global.document)
		
		this.define_prototype();
		
		return document_proxy;
	}
	define_prototype(){
		const { defaultView, URL } = Object.getOwnPropertyDescriptors(Document.prototype);

		Object.defineProperty(Document.prototype, 'defaultView', {
			configurable: true,
			enumerable: true,
			get: mirror_attributes(defaultView.get, function(){
				return that.client.window;
			}),
			set: undefined,
		});
		
		Object.defineProperty(Document.prototype, 'URL', {
			get: mirror_attributes(URL.get, function(){
				return that.client.location.href;
			}),
			configurable: true,
			enumerable: true,
		});
		
	}
	get_defined(){
		const that = this;
		const { location } = Object.getOwnPropertyDescriptors(document);

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
		});

		return defined;
	}
};