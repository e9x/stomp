import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'
import { openDB } from 'idb/with-async-ittr';
import { WindowRewrite } from './Rewrites/Window.mjs';
import { LocationRewrite } from './Rewrites/Location.mjs';

export class Client {
	constructor(config){
		this.tomp = new TOMP(config);
		this.window = {};
		this.define = new Define(this);
		this.ready = this.work();
		this.window = new WindowRewrite(this).add();
		this.location = new LocationRewrite(this).add();
		this.with = {
			window: this.window,
			location: this.location,
		};
	}
	async work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the tomp database in time.`);
			},
		});
	}
};