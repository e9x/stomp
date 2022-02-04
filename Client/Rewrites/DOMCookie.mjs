import { Rewrite } from '../Rewrite.mjs';;
import { Reflect, wrap_function } from '../RewriteUtil.mjs';

export class DOMCookieRewrite extends Rewrite {
	global_descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
	get value(){
		return Reflect.apply(this.global_descriptor.get, document, []);
	}
	set value(value){
		return Reflect.apply(this.global_descriptor.set, document, [ value ]);
	}
	work(){
		const legal_documents = [ document ];
		Reflect.defineProperty(Document.prototype, 'cookie', {
			configurable: true,
			enumerable: true,
			get: wrap_function(this.global_descriptor.get, (target, that, args) => {
				if(!legal_documents.includes(that)){
					throw new TypeError('Illegal invocation');
				}

				const { responseText } = this.client.sync.fetch(`${this.client.tomp.directory}worker:get-cookies/?` + new URLSearchParams({
					remote: JSON.stringify(this.client.location.page_url),
				}));

				return responseText;
			}),
			set: wrap_function(this.global_descriptor.set, (target, that, [ value ]) => {
				if(!legal_documents.includes(that)){
					throw new TypeError('Illegal invocation');
				}

				this.client.sync.fetch(`${this.client.tomp.directory}worker:set-cookies/?` + new URLSearchParams({
					remote: JSON.stringify(this.client.location.page_url),
					cookies: value,
				}));
				
				return value;
			}),
		});

	}
};