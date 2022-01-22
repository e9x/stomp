import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;
		
		const desciptors = ['location'];

		const window_proxy = new Proxy(window, {
			get(target, prop, receiver){
				if(desciptors.includes(prop)){
					const desc = this.getOwnPropertyDescriptor(target, prop);

					return desc.get.call(window_proxy);
				}

				let got = Reflect.get(target, prop, receiver);

				return got;
			},
			getOwnPropertyDescriptor(target, prop){
				const desc = Reflect.getOwnPropertyDescriptor(target, prop);
				
				if(prop == 'location'){
					let location_desc = Object.getOwnPropertyDescriptor(that.client.with, 'location');
					desc.get = location_desc.get;
					desc.set = location_desc.set;
					
				}

				return desc;
			}
		});

		return window_proxy;
	}
};