import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect, getOwnPropertyDescriptors } from '../RewriteUtil.mjs';

export class LocationRewrite extends Rewrite {
	global = location;
	global_description = {};
	global_description_document = {};
	work(){
		const location_proto = this.client.type == 'worker' ? WorkerLocation.prototype : Location.prototype;

		if(this.client.type == 'page'){
			const global_location = Reflect.getOwnPropertyDescriptor(global, 'location');

			this.global_description = global_location;

			this.description = {
				configurable: false,
				enumerable: true,
				get: wrap_function(global_location.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.access.get(result);
					return result;
				}),
				set: wrap_function(global_location.set, (target, that, [ value ]) => {
					const result = this.client.access.get(Reflect.apply(target, that, [ value ]));
					return result;
				}),
			};

			const document_location = Object.getOwnPropertyDescriptor(global.document, 'location');

			this.global_description_document = document_location;
			
			this.description_document = {
				configurable: false,
				enumerable: true,
				get: wrap_function(document_location.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.access.get(result);
					return result;
				}),
				set: wrap_function(document_location.set, (target, that, [ value ]) => {
					const result = this.client.access.get(Reflect.apply(target, that, [ value ]));
					return result;
				}),
			};
		}

		const that = this;
		
		this.proxy = {};
		Reflect.setPrototypeOf(this.proxy, location_proto);

		for(let prop of ['host','hostname','protocol','port','pathname','origin','hash','search']){
			const desc = Reflect.getOwnPropertyDescriptor(global.location, prop);
			
			Reflect.defineProperty(this.proxy, prop, {
				configurable: false,
				enumerable: true,
				get: desc.get ? wrap_function(desc.get, (target, that, args) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					return this.page_urlo[prop];
				}) : undefined,
				set: desc.set ? wrap_function(desc.set, (target, that, [ value ]) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					const urlo = this.page_urlo;
					urlo[prop] = value;
					this.global.href = this.client.tomp.url.wrap(urlo, 'worker:html');
					return value;
				}) : undefined,
			});
		}

		const { href, toString } = getOwnPropertyDescriptors(global.location);

		Object.defineProperty(this.proxy, 'href', {
			configurable: false,
			enumerable: true,
			get: wrap_function(href.get, (target, that, args) => {
				if(that != this.proxy)throw new TypeError('Invalid invocation');
				return String(this.page_url);
			}),
			set: wrap_function(href.get, (target, that, [ value ]) => {
				if(that != this.proxy)throw new TypeError('Invalid invocation');
				const urlo = new URL(value, this.page_urlo);
				this.global.href = this.client.tomp.url.wrap(urlo, 'worker:html');
				return value;
			}),
		});

		Object.defineProperty(this.proxy, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(toString.value, () => {
				if(that != this.proxy)throw new TypeError('Invalid invocation');
				return this.page_url.toString();
			}),
		});
		
		if(this.client.type == 'page'){
			const { assign, replace, reload, ancestorOrigins } = getOwnPropertyDescriptors(global.location);

			Object.defineProperty(this.proxy, 'assign', {
				configurable: false,
				enumerable: true,
				writable: false,
				value: wrap_function(assign.value, (target, that, [ url ]) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					this.global.assign(this.client.tomp.url.wrap(new URL(url, this.page_url), 'worker:html'));
				}),
			});
	
			Object.defineProperty(this.proxy, 'replace', {
				configurable: false,
				enumerable: true,
				writable: false,
				value: wrap_function(replace.value, (target, that, [ url ]) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					this.global.replace(this.client.tomp.url.wrap(new URL(url, this.page_url), 'worker:html'));
				}),
			});
	
			Object.defineProperty(this.proxy, 'reload', {
				configurable: false,
				enumerable: true,
				writable: false,
				value: wrap_function(replace.value, (target, that, args) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					this.global.reload();
				}),
			});
			
			Object.defineProperty(this.proxy, 'ancestorOrigins', {
				configurable: false,
				enumerable: true,
				get: wrap_function(href.get, (target, that, args) => {
					if(that != this.proxy)throw new TypeError('Invalid invocation');
					// should have no items
					return this.global.ancestorOrigins;
				}),
				set: undefined,
			});
		}
	}
	get page_url(){
		return this.client.tomp.url.unwrap_ez(this.global.href);
	}
	get page_urlo(){
		return new URL(this.page_url);
	}
};