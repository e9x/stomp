import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class HTMLRewrite extends Rewrite {
	work(){
		this.image();
		
	}
	og_set_attribute = Element.prototype.setAttribute;
	og_get_attribute = Element.prototype.getAttribute;
	router = {
		HTMLImageElement: ['src','srcset'], // automatically apply attribute_description
	};
	// TODO
	get_attribute(node, attribute){
		return Reflect.apply(this.og_get_attribute, node, []);
	}
	set_attribute(node, attribute, value){
		return Reflect.apply(this.og_set_attribute, node, [ value ]);
	}
	attribute_description(attribute, desc){
		return {
			get: wrap_function(desc.get, (target, that) => {
				return Reflect.apply(this.get_attribute, that, [ attribute ]);
			}),
			set: wrap_function(desc.set, (target, that, [ value ]) => {
				Reflect.apply(this.set_attribute, that, [ attribute, value ]);
				return value;
			}),
		};
	}
	image(){
		const imp = global.HTMLImageElement.prototype;
		const { src, srcset, currentSrc } = getOwnPropertyDescriptors(imp);

		Reflect.defineProperty(imp, 'src', {
			configurable: true,
			enumerable: true,
			...this.attribute_description('src', src),
		});
		
		Reflect.defineProperty(imp, 'srcset', {
			configurable: true,
			enumerable: true,
			...this.attribute_description('srcset', srcset),
		});

		Reflect.defineProperty(imp, 'currentSrc', {
			configurable: true,
			enumerable: true,
			get: wrap_function(currentSrc.get, (target, that, args) => {
				let result = Reflect.apply(target, that, args);
				result = this.client.tomp.url.unwrap_ez(result);
				return result;
			}),
		});
	}
};