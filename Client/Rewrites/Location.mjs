import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class LocationRewrite extends Rewrite {
	work(){
		const that = this;

		const location_clone = {};
		
		Object.defineProperty(location_clone, 'href', {
			configurable: false,
			enumerable: true,
			get(){
				return that.page_url.toString();
			},
			set(value){
				const resolved = new URL(value, that.page_url).href;
				global.location.href = that.client.tomp.url.wrap(resolved, 'worker:html');
				return value;
			},
		});
		
		Object.defineProperty(location_clone, 'protocol', {
			configurable: false,
			enumerable: true,
			get(){
				return that.page_urlo.protocol;
			},
			set(value){
				const urlo = that.page_urlo;
				urlo.protocol = value;
				global.location.href = that.client.tomp.url.wrap(urlo.href, 'worker:html');
				return value;
			},
		});
		
		Object.defineProperty(location_clone, 'origin', {
			configurable: false,
			enumerable: true,
			get(){
				return that.page_urlo.origin;
			},
			set(value){
				return value;
			},
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