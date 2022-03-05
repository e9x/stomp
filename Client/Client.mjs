import TOMP from '../TOMP.mjs'
import NativeHelper from './Rewrites/NativeHelper.mjs';
import LocationRewrite from './Rewrites/Location.mjs';
import WebSocketRewrite from './Rewrites/WebSocket.mjs';
import RequestRewrite from './Rewrites/Request.mjs';
import EvalRewrite from './Rewrites/Eval.mjs';
import AccessRewrite from './Rewrites/Access.mjs';
import IDBRewrite from './Rewrites/IndexedDB.mjs';
import WorkerRewrite from './Rewrites/Worker.mjs';
import FunctionRewrite from './Rewrites/Function.mjs';
import EventRewrite from './Rewrites/Event.mjs';
import XMLHttpRequestRewrite from './Rewrites/XMLHttpRequest.mjs';
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