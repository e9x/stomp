import { Client } from './Client.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { DOMRewrite } from './Rewrites/DOM.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';
import { CookieRewrite } from './Rewrites/Cookie.mjs';
import { PageRequestRewrite } from './Rewrites/PageRequest.mjs';
import { Reflect, wrap_function } from './RewriteUtil.mjs';
import { global } from '../Global.mjs';

export class PageClient extends Client {
	static type = 'page';
	constructor(config){
		super(config);

		new HistoryRewrite(this).work();
		new StorageRewrite(this).work();
		new DOMRewrite(this).work();
		new CookieRewrite(this).work();
		new PageRequestRewrite(this).work();

		global.open = wrap_function(global.open, (target, that, [ url, tar, features ]) => {
			url = new URL(url, this.location.proxy);
			url = this.tomp.html.serve(url, this.location.proxy);
			return Reflect.apply(target, that, [ url, tar, features ]);
		});
	}
};