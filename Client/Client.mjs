import { TOMP } from '../TOMP.mjs'
import { openDB } from 'idb/with-async-ittr';
import { LocationRewrite } from './Rewrites/Location.mjs';
import { WebSocketRewrite } from './Rewrites/WebSocket.mjs';
import { RequestRewrite } from './Rewrites/Request.mjs';
import { EvalRewrite } from './Rewrites/Eval.mjs';
import { AccessRewrite } from './Rewrites/Access.mjs';
import { IDBRewrite } from './Rewrites/IndexedDB.mjs';
import { CookieRewrite } from './Rewrites/Cookie.mjs';
import { MediaRewrite } from './Rewrites/Media.mjs';
import { NativeHelper } from './NativeHelper.mjs';
import { wrap_function, function_strings } from './RewriteUtil.mjs';

export class Client {
	static type = 'worker';
	native = new NativeHelper();
	constructor(config){
		this.tomp = new TOMP(config);
		this.ready = this.work();
		
		new WebSocketRewrite(this).work();
		new RequestRewrite(this).work();
		new IDBRewrite(this).work();
		new CookieRewrite(this).work();
		new MediaRewrite(this).work();

		this.access = new AccessRewrite(this);
		this.eval = new EvalRewrite(this);
		this.location = new LocationRewrite(this);

		this.eval.work();
		this.location.work();
	
		// work access last
		this.access.work();
		
		Function.prototype.toString = wrap_function(Function.prototype.toString, (target, that, args) => {
			if(function_strings.has(that))return function_strings.get(that);
			else{
				let string = Reflect.apply(target, that, args);

				if(!this.native.is_native(string)){
					let left;
					let right;
					let part;

					string = this.tomp.js.unwrap(`x = ${string}`, this.location.proxy);
					
					string = string.slice(string.indexOf('=') + 1);
					if(string.startsWith(' '))string = string.slice(1);
					string = string.slice(0, string.lastIndexOf('}') + 1);
				}

				return string;
			}
		});
	}
	async work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the tomp database in time.`);
			},
		});
	}
};