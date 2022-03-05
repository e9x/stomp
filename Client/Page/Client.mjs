import Client from '../Client.mjs';
import { SyncClient } from '../SyncClient.mjs';
import { Reflect } from '../RewriteUtil.mjs';
import HistoryRewrite from './Rewrites/History.mjs';
import DOMRewrite from './Rewrites/DOM.mjs';
import StorageRewrite from './Rewrites/Storage.mjs';
import DOMCookieRewrite from './Rewrites/DOMCookie.mjs';
import PageRequestRewrite from './Rewrites/PageRequest.mjs';
import IFrameRewrite from './Rewrites/IFrame.mjs';
import WindowRewrite from './Rewrites/Window.mjs';
import IsolateRewrite from './Rewrites/Isolate.mjs';

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
			IsolateRewrite,
		);
	}
};