import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class HTMLRewrite extends Rewrite {
	work(){
		for(let clname in this.router){
			const cls = global[clname];

			if(!cls)continue;

			const proto = cls.prototype;

			this.router[clname](proto, getOwnPropertyDescriptors(proto));
		}
	}
	og_set_attribute = Element.prototype.setAttribute;
	og_get_attribute = Element.prototype.getAttribute;
	router = {
		HTMLImageElement: (proto, descs)  => {
			for(let attr of ['src','srcset'])Reflect.defineProperty(proto, attr, {
				configurable: true,
				enumerable: true,
				...this.attribute_description(attr, descs[attr]),
			});

			Reflect.defineProperty(proto, 'currentSrc', {
				configurable: true,
				enumerable: true,
				get: wrap_function(descs.currentSrc.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.tomp.url.unwrap_ez(result);
					return result;
				}),
			});
		}
		
	};
	// TODO
	get_attribute(node, attribute){
		return Reflect.apply(this.og_get_attribute, node, [ attribute ]);
	}
	set_attribute(node, attribute, value){
		return Reflect.apply(this.og_set_attribute, node, [ attribute, value ]);
	}
	attribute_description(attribute, desc){
		return {
			get: wrap_function(desc.get, (target, that) => {
				return this.get_attribute(that, attribute);
			}),
			set: wrap_function(desc.set, (target, that, [ value ]) => {
				this.set_attribute(that, attribute, value);
				return value;
			}),
		};
	}
};