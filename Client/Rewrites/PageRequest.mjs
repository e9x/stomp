import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect } from '../RewriteUtil.mjs';
import { engine } from '../../UserAgent.mjs';

export class PageRequestRewrite extends Rewrite {
	xml_data = new WeakMap();
	work(){
		URL.createObjectURL = wrap_function(URL.createObjectURL, (target, that, args) => {
			let result = Reflect.apply(target, that, args);
			result = result.replace(this.client.location.global.origin, this.client.location.proxy.origin);
			return result;
		});

		AudioWorklet.prototype.addModule = wrap_function(AudioWorklet.prototype.addModule, (target, that, [ url, options ]) => {
			url = new URL(url, this.client.location.page_url);
			url = this.client.tomp.js.serve(url, this.client.location.page_url);
			// not a worker, worklet
			// worklets dont contain location etc
			// todo: rewrite MessageEvent.prototype.origin inside worklet
			return Reflect.apply(target, that, [ url, options ]);
		});

		Navigator.prototype.sendBeacon = wrap_function(Navigator.prototype.sendBeacon, (target, that, [url, data]) => {
			if(that != navigator)throw new TypeError('Illegal invocation');	

			url = this.client.tomp.binary.serve(new URL(url, this.client.location.proxy), this.client.location.proxy);
			return Reflect.apply(target, that, [url, data]);
		});
		
		XMLHttpRequest.prototype.open = wrap_function(XMLHttpRequest.prototype.open, (target, that, [method, url, async, username, password]) => {
			this.xml_data.set(that, {
				headers: Reflect.setPrototypeOf({}, null),
				url,
				method,
				async,
				username,
				password,
			});
			url = this.client.tomp.binary.serve(new URL(url, this.client.location.proxy), this.client.location.proxy);
			return Reflect.apply(target, that, [ method, url, async, username, password ]);
		});

		const { setRequestHeader } = XMLHttpRequest.prototype;

		XMLHttpRequest.prototype.setRequestHeader = wrap_function(XMLHttpRequest.prototype.setRequestHeader, (target, that, [header, value]) => {
			value = String(value);
			
			if(this.xml_data.has(that)){
				const data = this.xml_data.get(that);
				data.headers[header] = value;
				// if data is undefined, xmlhttprequest likely isnt open and therefore cant have any headers set
			}else{
				Reflect.apply(target, that, [header, value]);
				throw new Error('An unknown error occured');
			}
		});

		XMLHttpRequest.prototype.send = wrap_function(XMLHttpRequest.prototype.send, (target, that, [body]) => {
			if(this.xml_data.has(that)){
				const data = this.xml_data.get(that);

				data.headers['x-tomp-impl-names'] = JSON.stringify(Object.keys(data.headers));

				handle_xml_request
			}else{
				Reflect.apply(target, that, [body]);
				throw new Error('An unknown error occured');
			}
		});
	}
};