import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'
import { openDB } from 'idb/with-async-ittr';
import { WindowRewrite } from './Rewrites/Window.mjs';
import { LocationRewrite } from './Rewrites/Location.mjs';
import { WebSocketRewrite } from './Rewrites/WebSocket.mjs';
import { DocumentRewrite } from './Rewrites/Document.mjs';
import { HistoryRewrite } from './Rewrites/History.mjs';
import { StorageRewrite } from './Rewrites/Storage.mjs';

export class Client {
	constructor(config){
		this.tomp = new TOMP(config);
		this.window = {};
		this.define = new Define(this);
		this.ready = this.work();
		this.window = new WindowRewrite(this).work();
		this.location = new LocationRewrite(this).work();
		this.document = new DocumentRewrite(this).work();
		this.with = this.create_with();
		
		new HistoryRewrite(this).work();
		new WebSocketRewrite(this).work();
		new StorageRewrite(this).work();
		
	}
	create_with(){
		const w = {};
		const that = this;

		Object.defineProperty(w, 'window', {
			get(){
				// check for illegal invocation
				return that.window;
			},
			set: undefined,
			configurable: false,
			enumerable: true,
		});
		
		Object.defineProperty(w, 'document', {
			get(){
				// check for illegal invocation
				return that.document;
			},
			set: undefined,
			configurable: false,
			enumerable: true,
		});
		
		Object.defineProperty(w, 'location', {
			get(){
				// check for illegal invocation
				return that.location;
			},
			set(value){
				// check for illegal invocation
				return that.location.href = value;
			},
			configurable: false,
			enumerable: true,
		});
		
		return w;
	}
	async work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the tomp database in time.`);
			},
		});
	}
};