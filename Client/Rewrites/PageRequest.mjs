import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { wrap_function, Reflect } from '../RewriteUtil.mjs';
import { engine } from '../../UserAgent.mjs';

export class PageRequestRewrite extends Rewrite {
	xml_raw_names = new WeakMap();
	work(){
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
			if(!async && engine != 'gecko'){
				this.tomp.log.warn('TOMP does not support synchronous XMLHTTPRequests. See https://bugs.chromium.org/p/chromium/issues/detail?id=602051');
				async = true;
			}

			this.xml_raw_names.set(that, new Set());
			url = this.client.tomp.binary.serve(new URL(url, this.client.location.proxy), this.client.location.proxy);
			return Reflect.apply(target, that, [ method, url, async, username, password ]);
		});

		const { setRequestHeader } = XMLHttpRequest.prototype;

		XMLHttpRequest.prototype.setRequestHeader = wrap_function(XMLHttpRequest.prototype.setRequestHeader, (target, that, [header, value]) => {
			if(this.xml_raw_names.has(that)){
				const raw = this.xml_raw_names.get(that);
				// if raw is undefined, xmlhttprequest likely isnt open and therefore cant have any headers set
				raw.add(header);
			}
			
			return Reflect.apply(target, that, [header, value]);
		});

		XMLHttpRequest.prototype.send = wrap_function(XMLHttpRequest.prototype.send, (target, that, [body]) => {
			if(this.xml_raw_names.has(that)){
				const raw = this.xml_raw_names.get(that);
				setRequestHeader.call(that, 'x-tomp-impl-names', JSON.stringify([...raw]));
			}
			return Reflect.apply(target, that, [body]);
		});
	}
};