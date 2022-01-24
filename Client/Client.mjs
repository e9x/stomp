import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'
import { openDB } from 'idb/with-async-ittr';
import { LocationRewrite } from './Rewrites/Location.mjs';
import { WebSocketRewrite } from './Rewrites/WebSocket.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';
import { RequestRewrite } from './Rewrites/Request.mjs';
import { EvalRewrite } from './Rewrites/Eval.mjs';
import { AccessRewrite } from './Rewrites/Access.mjs';

/*import * as acorn from 'acorn';
self.acorn = acorn;*/

export class Client {
	constructor(config){
		this.tomp = new TOMP(config);
		this.ready = this.work();
		this.define = new Define(this);
		
		new HistoryRewrite(this).work();
		new WebSocketRewrite(this).work();
		new StorageRewrite(this).work();
		new RequestRewrite(this).work();
		
		this.access = new AccessRewrite(this);
		this.eval = new EvalRewrite(this);
		this.location = new LocationRewrite(this);

		this.eval.work();
		this.location.work();
	}
	async work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the tomp database in time.`);
			},
		});
	}
};