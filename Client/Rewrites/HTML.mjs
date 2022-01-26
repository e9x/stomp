import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class HTMLRewrite extends Rewrite {
	work(){
		for(let clname in this.router){
			const cls = global[clname];

			if(!cls)continue;

			const proto = cls.prototype;

			for(let key in this.router[clname]){
				const desc = Reflect.getOwnPropertyDescriptor(proto, key);
				
				if(!desc){
					this.client.tomp.warn('Missing', key, 'in', proto);
					continue;
				}
	
				const new_desc = this.router[clname][key](desc);

				Reflect.defineProperty(proto, key, new_desc);
			}
		}

		// TODO
		this.get_attribute = Element.prototype.getAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute ]) => {
			return Reflect.apply(target, that, [ attribute ]);
		});

		this.set_attribute = Element.prototype.setAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute, value ]) => {
			return Reflect.apply(target, that, [ attribute, value ]);
		});
	}
	define_attrs(...attrs){
		const result = {};

		for(let attr of attrs){
			result[attr] = desc => ({
				configurable: true,
				enumerable: true,
				get: wrap_function(desc.get, (target, that) => {
					return Reflect.apply(this.get_attribute, that, [ attr ]);
				}),
				set: wrap_function(desc.set, (target, that, [ value ]) => {
					return Reflect.apply(this.get_attribute, that, [ attr ]);
				}),
			});
		}

		return result;
	}
	router = {
		HTMLImageElement: {
			...this.define_attrs('src','srcset'),
			currentSrc: desc => ({
				configurable: true,
				enumerable: true,
				get: wrap_function(desc.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.tomp.url.unwrap_ez(result);
					return result;
				}),
			}),
		},
	};
};