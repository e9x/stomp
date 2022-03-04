import { Rewrite } from '../Rewrite.mjs';
import { global_client } from '../../RewriteJS.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class IFrameRewrite extends Rewrite {
	same_origin(frame_window){
		return this.client.tomp.url.parse_url(frame_window.location).toOrigin() === this.client.base.toOrigin();
	}
	work(){
		const { contentWindow, contentDocument } = getOwnPropertyDescriptors(HTMLIFrameElement.prototype);
		
		const get_contentWindow = (target, that, args) => {
			const window = Reflect.apply(target, that, args);

			if(window === null){
				return null;
			}

			if(!(global_client in window)){
				const http = new window.XMLHttpRequest();
				
				http.open('GET', this.client.tomp.directory + 'client.js', false);

				http.send();

				let script = http.responseText;
				
				script = script.replace('//# sourceMappingURL=client.js.map', `//# sourceMappingURL=${this.client.host.toOrigin()}${this.client.tomp.directory}client.js.map`)

				window.eval(script);
				
				window[global_client](this.client.tomp);
			}

			return window;
		};

		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			get: wrap_function(contentWindow.get, get_contentWindow),
			enumerable: true,
			configurable: true,
		});
		
		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
			get: wrap_function(contentDocument.get, (target, that, args) => {
				const window = get_contentWindow(contentWindow.get, that, args);

				if(window === null || !this.same_origin(window)){
					return null;
				} 

				return window.document;
			}),
			enumerable: true,
			configurable: true,
		});
	}
};