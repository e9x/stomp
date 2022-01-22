import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class WindowRewrite extends Rewrite {
	work(){
		const that = this;

		const window_proxy = new Proxy(window, {

		});

		return window_proxy;
	}
};