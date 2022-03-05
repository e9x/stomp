import TOMP from '../TOMP.mjs'
import NativeHelper from './Modules/NativeHelper.mjs';
import LocationRewrite from './Modules/Location.mjs';
import WebSocketRewrite from './Modules/WebSocket.mjs';
import RequestRewrite from './Modules/Request.mjs';
import EvalRewrite from './Modules/Eval.mjs';
import AccessRewrite from './Modules/Access.mjs';
import IDBRewrite from './Modules/IndexedDB.mjs';
import WorkerRewrite from './Modules/Worker.mjs';
import FunctionRewrite from './Modules/Function.mjs';
import EventRewrite from './Modules/Event.mjs';
import XMLHttpRequestRewrite from './Modules/XMLHttpRequest.mjs';
import { openDB } from 'idb/with-async-ittr';

export default class Client {
	type = this.constructor.type;
	constructor(config){
		this.tomp = new TOMP(config);
		this.ready = this.async_work();
		
		this.load_modules(
			NativeHelper,
			FunctionRewrite,
			WebSocketRewrite,
			IDBRewrite,
			EventRewrite,
			WorkerRewrite,
			RequestRewrite,
			EvalRewrite,
			LocationRewrite,
			AccessRewrite,
			XMLHttpRequestRewrite,
		);

		// this.modules.get(NativeHelper)[...]
	}
	modules = new Map();
	load_modules(...Modules){
		for(let Module of Modules){
			this.modules.set(Module, new Module(this));
		}
	}
	work(){
		for(let [Module, module] of this.modules){
			module.work();
		}
	}
	async async_work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the TOMP database.`);
			},
		});
	}
};