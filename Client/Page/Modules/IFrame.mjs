import Rewrite from '../../Rewrite.mjs';
import { global_client } from '../../../RewriteJS.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../../RewriteUtil.mjs';
import WindowRewrite from './Window.mjs';

export default class IFrameRewrite extends Rewrite {
	get_contentWindow(target, that, args){
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
	}
	work(){
		const { contentWindow, contentDocument, src } = getOwnPropertyDescriptors(HTMLIFrameElement.prototype);
		
		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			get: wrap_function(contentWindow.get, (target, that, args) => {
				const window = this.get_contentWindow(contentWindow.get, that, []);
				
				if(window === null){
					return null;
				}
				
				return this.client.get(WindowRewrite).restrict_window(window);
			}),
			enumerable: true,
			configurable: true,
		});
		
		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
			get: wrap_function(contentDocument.get, (target, that, args) => {
				const window = this.get_contentWindow(contentWindow.get, that, []);

				if(window === null || !this.client.get(WindowRewrite).same_origin(window)){
					return null;
				} 

				return window.document;
			}),
			enumerable: true,
			configurable: true,
		});
	}
};