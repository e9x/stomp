import { Client } from './Client.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';

export class PageClient extends Client {
	constructor(config){
		super(config);

		new HistoryRewrite(this).work();
		new StorageRewrite(this).work();
	}
};