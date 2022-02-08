import { Client } from './Client.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { DOMRewrite } from './Rewrites/DOM.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';
import { DOMCookieRewrite } from './Rewrites/DOMCookie.mjs';
import { PageRequestRewrite } from './Rewrites/PageRequest.mjs';
import { SyncClient } from './SyncClient.mjs';
import { global } from '../Global.mjs';

export class PageClient extends Client {
	static type = 'page';
	base = this.tomp.url.parse_url(document.baseURI);
	constructor(config){
		super(config);

		this.work_modules();
	}
	work_modules(){
		super.work_modules();
		
		this.sync = new SyncClient(this);
		this.history = new HistoryRewrite(this);
		this.storage = new StorageRewrite(this);
		this.dom = new DOMRewrite(this);
		this.cookie = new DOMCookieRewrite(this);
		this.page_request = new PageRequestRewrite(this);

		this.sync.work();
		this.history.work();
		this.storage.work();
		this.dom.work();
		this.cookie.work();
		this.page_request.work();

		delete global.CookieStore;
	}
};