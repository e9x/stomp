import { TOMP } from '../TOMP.mjs'
import { openDB } from 'idb/with-async-ittr';
import { LocationRewrite } from './Rewrites/Location.mjs';
import { WebSocketRewrite } from './Rewrites/WebSocket.mjs';
import { RequestRewrite } from './Rewrites/Request.mjs';
import { EvalRewrite } from './Rewrites/Eval.mjs';
import { AccessRewrite } from './Rewrites/Access.mjs';
import { IDBRewrite } from './Rewrites/IndexedDB.mjs';
import { WorkerRewrite } from './Rewrites/Worker.mjs';
import { FunctionRewrite } from './Rewrites/Function.mjs';
import { NativeHelper } from './NativeHelper.mjs';
import { wrap_function, function_strings } from './RewriteUtil.mjs';

export class Client {
	native = new NativeHelper();
	type = this.constructor.type;
	constructor(config){
		this.tomp = new TOMP(config);
		this.ready = this.work();
		
		this.function = new FunctionRewrite(this);
		this.websocket = new WebSocketRewrite(this);
		this.idb = new IDBRewrite(this);
		this.worker = new WorkerRewrite(this);
		this.request = new RequestRewrite(this);
		this.eval = new EvalRewrite(this);
		this.location = new LocationRewrite(this);
		this.access = new AccessRewrite(this);

		this.function.work();
		this.websocket.work();
		this.idb.work();
		this.worker.work();
		
		this.request.work();
		this.eval.work();
		this.location.work();
	
		// work access last
		this.access.work();
		
		Function.prototype.toString = wrap_function(Function.prototype.toString, (target, that, args) => {
			if(function_strings.has(that))return function_strings.get(that);
			else{
				let string = Reflect.apply(target, that, args);

				if(!this.native.is_native(string)){
					if(/^class[{ ]/.test(string)){
						string = this.tomp.js.unwrap(`x = ${string}`, this.location.proxy);
						string = string.slice(string.indexOf('=') + 1);
						if(string.startsWith(' ')){
							string = string.slice(1);
						}

						if(string.endsWith(';')){
							string = string.slice(0, -1);
						}
					}else{
						let left = 0;
						let right;

						if(!(/^((async\s+)?(\(|function[( ]))/).test(string)){
							// (){kind of function}
							left = 1;
							right = -1;
							string = `{${string}}`
						}

						string = this.tomp.js.unwrap(`x = ${string}`, this.location.proxy);

						string = string.slice(string.indexOf('=') + 1);
						
						if(string.startsWith(' ')){
							string = string.slice(1);
						}
					
						if(string.endsWith(';')){
							string = string.slice(0, -1);
						}

						string = string.slice(left, right);
					}
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