import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class HTMLRewrite extends Rewrite {
	work(){
		this.image();
		
	}
	// TODO
	set_attribute = Element.prototype.setAttribute;
	get_attribute = Element.prototype.getAttribute;
	attribute_description(attribute, desc){
		return {
			get: wrap_function(desc.get, (target, that) => {
				return Reflect.apply(this.get_attribute, that, [ attribute ]);
			}),
			set: wrap_function(desc.set, (target, that, [ value ]) => {
				return Reflect.apply(this.set_attribute, that, [ attribute, value ]);
			}),
		};
	}
	image(){
		const imp = global.HTMLImageElement.prototype;
		const { src, srcset } = getOwnPropertyDescriptors(imp);

		Reflect.defineProperty(imp, 'src', {
			configurable: true,
			enumerable: true,
			...this.attribute_description('src', src),
		});
		
		Reflect.defineProperty(imp, 'srcset', {
			configurable: true,
			enumerable: true,
			...this.attribute_description('srcset', src),
		});
	}
};