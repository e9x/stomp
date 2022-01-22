import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'
import { openDB } from 'idb/with-async-ittr';

export class Client {
	constructor(config){
		this.tomp = new TOMP(config);
		this.window = {};
		this.define = new Define(this);
		this.ready = this.work();
		this.context = {
			
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