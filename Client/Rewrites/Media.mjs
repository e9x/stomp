import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class MediaRewrite extends Rewrite {
	work(){
		AudioWorklet.prototype.addModule = wrap_function(AudioWorklet.prototype.addModule, (target, that, [ url, options ]) => {
			url = new URL(url, this.client.location.page_url);
			url = this.client.tomp.js.serve(url, this.client.location.page_url);
			return Reflect.apply(target, that, [ url, options ]);
		});
	}
};