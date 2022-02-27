import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, mirror_attributes, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class EventRewrite extends Rewrite {
	work(){
		const filename = Reflect.getOwnPropertyDescriptor(ErrorEvent.prototype, 'filename');

		Reflect.defineProperty(ErrorEvent.prototype, 'filename', {
			configurable: true,
			enumerable: false,
			get: wrap_function(filename.get, (target, that, args) => {
				const name = Reflect.apply(target, that, args);

				if(name !== ''){
					return this.tomp.js.unwrap_serving(name, this.client.base).toString();
				}else{
					return name;
				}
			})
		});
	}
};