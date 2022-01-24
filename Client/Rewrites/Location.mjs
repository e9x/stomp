import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class LocationRewrite extends Rewrite {
	global = location;
	work(){
		const that = this;

		this.proxy = Object.setPrototypeOf({}, Location.prototype);
		
		for(let prop of ['host','hostname','protocol','port','pathname','origin','hash','search']){
			Object.defineProperty(this.proxy, prop, {
				configurable: false,
				enumerable: true,
				get(){
					return that.page_urlo[prop];
				},
				set(value){
					const urlo = that.page_urlo;
					urlo[prop] = value;
					that.global.href = that.client.tomp.url.wrap(urlo, 'worker:html');
					return value;
				},
			});
		}

		Object.defineProperty(this.proxy, 'href', {
			configurable: false,
			enumerable: true,
			get(){
				return that.page_url.toString();
			},
			set(value){
				const urlo = new URL(value, that.page_urlo);
				that.global.href = that.client.tomp.url.wrap(urlo, 'worker:html');
				return value;
			},
		});

		Object.defineProperty(this.proxy, 'assign', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(url){
				that.global.assign(that.client.tomp.url.wrap(new URL(url, that.page_url), 'worker:html'));
			},
		});

		Object.defineProperty(this.proxy, 'replace', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(url){
				that.global.replace(that.client.tomp.url.wrap(new URL(url, that.page_url), 'worker:html'));
			},
		});

		Object.defineProperty(this.proxy, 'reload', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(){
				that.global.reload();
			},
		});

		Object.defineProperty(this.proxy, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: () => {
				return that.page_url.toString();
			},
		});

		Object.defineProperty(this.proxy, 'ancestorOrigins', {
			configurable: false,
			enumerable: true,
			get(){
				// should have no items
				return that.global.ancestorOrigins;
			},
			set: undefined,
		});
	}
	get page_url(){
		const url = this.global.href.slice(this.global.href.indexOf(this.client.tomp.directory));
		const { field } = this.client.tomp.url.get_attributes(url);

		return this.client.tomp.url.unwrap(field);
	}
	get page_urlo(){
		return new URL(this.page_url);
	}
};