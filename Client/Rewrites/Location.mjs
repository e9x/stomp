import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

const location_props = ['href','protocol','port','pathname','origin','hash','search'];

export class LocationRewrite extends Rewrite {
	work(){
		const that = this;

		const location_clone = {};
		
		for(let prop of location_props){
			Object.defineProperty(location_clone, prop, {
				configurable: false,
				enumerable: true,
				get(){
					return that.page_urlo[prop];
				},
				set(value){
					const urlo = that.page_urlo;
					urlo[prop] = value;
					global.location.href = that.client.tomp.url.wrap(urlo.href, 'worker:html');
					return value;
				},
			});
		}

		Object.defineProperty(location_clone, 'assign', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(url){
				global.location.assign(that.client.tomp.url.wrap(new URL(url, that.page_url), 'worker:html'));
			},
		});

		Object.defineProperty(location_clone, 'replace', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(url){
				global.location.replace(that.client.tomp.url.wrap(new URL(url, that.page_url), 'worker:html'));
			},
		});

		Object.defineProperty(location_clone, 'reload', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(){
				global.location.reload();
			},
		});

		Object.defineProperty(location_clone, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value(){
				return that.page_url;
			},
		});

		Object.defineProperty(location_clone, 'ancestorOrigins', {
			configurable: false,
			enumerable: true,
			get(){
				// should have no items
				return global.location.ancestorOrigins;
			},
			set: undefined,
		});

		return Object.setPrototypeOf(location_clone, Location.prototype);
	}
	get page_url(){
		const url = global.location.href.slice(global.location.href.indexOf(this.client.tomp.directory));
		const { field } = this.client.tomp.url.get_attributes(url);

		return this.client.tomp.url.unwrap(field);
	}
	get page_urlo(){
		return new URL(this.page_url);
	}
};