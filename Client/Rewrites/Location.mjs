import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect, getOwnPropertyDescriptors } from '../RewriteUtil.mjs';
import { Type } from 'ast-types';

export class LocationRewrite extends Rewrite {
	description = {};
	global_description = {};
	global_description_document = {};
	work(){
		if(this.client.type == 'page')this.work_page();
		else this.work_worker();
	}
	work_worker(){
		this.global = Object.setPrototypeOf(global.location, Object.defineProperties({}, Object.getOwnPropertyDescriptors(WorkerLocation.prototype)));
		this.proxy = Object.setPrototypeOf({}, WorkerLocation.prototype);

		const scope_location = Reflect.getOwnPropertyDescriptor(WorkerGlobalScope.prototype, 'location');
		const legal_contexts = [ this.proxy, null, undefined ];

		Object.defineProperty(WorkerGlobalScope.prototype, 'location', {
			configurable: true,
			enumerable: true,
			get: wrap_function(scope_location.get, (target, that, args) => {
				if(!legal_contexts.includes(that))throw new TypeError('Illegal Invocation');
				return this.proxy;
			}),
			set: undefined,
		});
		
		for(let prop of ['href','host','hostname','protocol','port','pathname','origin','hash','search']){
			const desc = Reflect.getOwnPropertyDescriptor(WorkerLocation.prototype, prop);
			
			Object.defineProperty(WorkerLocation.prototype, prop, {
				configurable: true,
				enumerable: true,
				get: desc.get ? wrap_function(desc.get, (target, that, args) => {
					if(!legal_contexts.includes(that))throw new TypeError('Illegal Invocation');
					return this.page_urlo[prop];
				}) : undefined,
				set: desc.set ? wrap_function(desc.set, (target, that, [ value ]) => {
					if(!legal_contexts.includes(that))throw new TypeError('Illegal Invocation');
					const urlo = this.page_urlo;
					urlo[prop] = value;
					this.global.href = this.client.tomp.url.wrap(urlo, 'worker:html');
					return value;
				}) : undefined,
			});
		}

		const toString = Reflect.getOwnPropertyDescriptor(WorkerLocation.prototype, 'toString');

		Object.defineProperty(WorkerLocation.prototype, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(toString.value, (target, that, args) => {
				if(that !== this.proxy)throw new TypeError('Invalid invocation');
				return this.page_url.toString();
			}),
		});
	}
	work_page(){
		this.global = global.location;

		{
			const location = Reflect.getOwnPropertyDescriptor(global, 'location');

			this.global_description = location;

			this.description = {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.access.get(result);
					return result;
				}),
				set: wrap_function(location.set, (target, that, [ value ]) => {
					return global.location = this.client.access.set(Reflect.apply(global_location.get, that, []), value);
				}),
			};
		}

		{
			const location = Object.getOwnPropertyDescriptor(global.document, 'location');

			this.global_description_document = location;
			
			this.description_document = {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.access.get(result);
					return result;
				}),
				set: wrap_function(location.set, (target, that, [ value ]) => {
					const result = this.client.access.get(Reflect.apply(target, that, [ value ]));
					return result;
				}),
			};
		}

		this.proxy = Object.setPrototypeOf({}, Location.prototype);

		for(let prop of ['href','host','hostname','protocol','port','pathname','origin','hash','search']){
			const desc = Reflect.getOwnPropertyDescriptor(this.global, prop);
			
			Object.defineProperty(this.proxy, prop, {
				configurable: false,
				enumerable: true,
				get: desc.get ? wrap_function(desc.get, (target, that, args) => {
					if(that !== this.proxy)throw new TypeError('Invalid invocation');
					return this.page_urlo[prop];
				}) : undefined,
				set: desc.set ? wrap_function(desc.set, (target, that, [ value ]) => {
					if(that !== this.proxy)throw new TypeError('Invalid invocation');
					const urlo = this.page_urlo;
					urlo[prop] = value;
					this.global.href = this.client.tomp.url.wrap(urlo, 'worker:html');
					return value;
				}) : undefined,
			});
		}

		const toString = Reflect.getOwnPropertyDescriptor(this.global, 'toString');

		Object.defineProperty(this.proxy, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(toString.value, (target, that, args) => {
				if(that !== this.proxy)throw new TypeError('Invalid invocation');
				return this.page_url.toString();
			}),
		});
		
		const { assign, replace, reload, ancestorOrigins } = getOwnPropertyDescriptors(this.global);

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
		
		if(ancestorOrigins)Object.defineProperty(this.proxy, 'ancestorOrigins', {
			configurable: false,
			enumerable: true,
			get: wrap_function(ancestorOrigins.get, (target, that, args) => {
				if(that != this.proxy)throw new TypeError('Invalid invocation');
				// should have no items
				return this.global.ancestorOrigins;
			}),
			set: undefined,
		});
	}
	get page_url(){
		return this.client.tomp.url.unwrap_ez(this.global.href);
	}
	get page_urlo(){
		return new URL(this.page_url);
	}
};