import { Client } from './Client.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { DOMRewrite } from './Rewrites/DOM.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';
import { CookieRewrite } from './Rewrites/Cookie.mjs';
import { PageRequestRewrite } from './Rewrites/PageRequest.mjs';
import { SyncClient } from './SyncClient.mjs';

export class PageClient extends Client {
	static type = 'page';
	constructor(config){
		super(config);

		this.sync = new SyncClient(this);
		this.history = new HistoryRewrite(this);
		this.storage = new StorageRewrite(this);
		this.dom = new DOMRewrite(this);
		this.cookie = new CookieRewrite(this);
		this.page_request = new PageRequestRewrite(this);

		this.sync.work();
		this.history.work();
		this.storage.work();
		this.dom.work();
		this.cookie.work();
		this.page_request.work();
	}
};