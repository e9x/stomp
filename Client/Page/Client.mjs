import { SyncClient } from '../SyncClient.mjs';
import { Reflect } from '../RewriteUtil.mjs';
import Client from '../Client.mjs';
import HistoryRewrite from './Modules/History.mjs';
import DOMRewrite from './Modules/DOM.mjs';
import StorageRewrite from './Modules/Storage.mjs';
import DOMCookieRewrite from './Modules/DOMCookie.mjs';
import PageRequestRewrite from './Modules/PageRequest.mjs';
import IFrameRewrite from './Modules/IFrame.mjs';
import WindowRewrite from './Modules/Window.mjs';
import IsolateModule from './Modules/Isolate.mjs';

export default class PageClient extends Client {
	static type = 'page';
	#baseURI_desc = Reflect.getOwnPropertyDescriptor(Node.prototype, 'baseURI');
	get #baseURI(){
		return Reflect.apply(this.#baseURI_desc.get, document, []);
	}
	get base(){
		return this.tomp.url.parse_url(this.tomp.url.unwrap_ez(this.#baseURI));
	}
	get host(){
		return this.tomp.url.parse_url(this.#baseURI);
	}
	constructor(config){
		super(config);
		
		for(let node of document.querySelectorAll('[data-is-tomp]')){
			node.remove();
		}

		this.load_modules(
			SyncClient,
			HistoryRewrite,
			StorageRewrite,
			DOMRewrite,
			DOMCookieRewrite,
			PageRequestRewrite,
			WindowRewrite,
			IFrameRewrite,
			IsolateModule,
		);
	}
};