import Rewrite from '../../Rewrite.js';
import global from '../../global.js';
import { context_this, Reflect, wrap_function } from '../../rewriteUtil.js';
import { mirror_class } from '../../NativeUtil.js';
import { SyncClient } from './SyncClient.js';

const decoder = new TextDecoder();

export default class StorageRewrite extends Rewrite {
	StorageHandler = {
		get: (target, prop, receiver) => {
			if(typeof prop == 'symbol' || prop in target || prop in this.proxy.prototype){
				return Reflect.get(target, prop, receiver);
			}
			
			let result = Reflect.apply(this.proxy.prototype.getItem, this.get_proxy(target), [ prop ]);
			
			// null
			if(typeof result !== 'string'){
				result = undefined;
			}

			return result;
		},
		set: (target, prop, value) => {
			if(typeof prop == 'symbol' || prop in target || prop in this.proxy.prototype){
				return Reflect.set(target, prop, value);
			}

			Reflect.apply(this.proxy.prototype.setItem, this.get_proxy(target), [ prop, value ]);

			return value;
		},
		getOwnPropertyDescriptor: (target, prop) => {
			if(typeof prop == 'symbol' || prop in target || prop in this.proxy.prototype){
				return Reflect.getOwnPropertyDescriptor(target, prop);
			}

			/*
			configurable: true
			enumerable: true
			value: "1"
			writable: true
			*/

			let result = Reflect.apply(this.proxy.prototype.getItem, this.get_proxy(target), [ prop ]);
			
			// null
			if(typeof result !== 'string'){
				return undefined;
			}

			return {
				value: result,
				writable: true,
				enumerable: true,
				configurable: true,
			};
		},
		deleteProperty: (target, prop) => {
			if(typeof prop == 'symbol' || prop in target || prop in this.proxy.prototype){
				return Reflect.deleteProperty(target, prop);
			}

			Reflect.apply(this.proxy.prototype.removeItem, this.get_proxy(target), [ prop ]);

			return true;
		},
		has: (target, prop) => {
			const { rawArrayBuffer } = this.client.get(SyncClient).fetch(this.worker_storage + new URLSearchParams({
				func: 'hasItem',
				args: JSON.stringify([ this.is_session(target), prop, this.client.base ]),
			}));

			return this.parse_worker_storage(rawArrayBuffer);
		},
		ownKeys: target => {
			const { rawArrayBuffer } = this.client.get(SyncClient).fetch(this.worker_storage + new URLSearchParams({
				func: 'getKeys',
				args: JSON.stringify([ this.is_session(target), this.client.base ]),
			}));

			const keys = this.parse_worker_storage(rawArrayBuffer);

			return Reflect.ownKeys(target).concat(keys);
		},
	};
	parse_worker_storage(rawArrayBuffer){
		if(rawArrayBuffer.byteLength === 0){
			return null;
		}else{
			return JSON.parse(decoder.decode(rawArrayBuffer));
		}
	}
	get_proxy(target){
		if(target === this.sessionStorageTarget){
			return this.sessionStorage;
		}else if(target === this.localStorageTarget){
			return this.localStorage;
		}
	}
	global = global.Storage;
	localStorageTarget = {};
	sessionStorageTarget = {};
	is_session(target){
		return target === this.sessionStorageTarget;
	}
	work(){
		this.worker_storage = `${this.client.tomp.directory}storage/?`;

		const that = this;
		const instances = new WeakSet();
		const unspecified = Symbol();

		class StorageProxy {
			clear(){
				that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'clear',
					args: JSON.stringify([ that.is_session(this), that.client.base ]),
				}));
			}
			getItem(key = unspecified){
				if(key === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'getItem' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);
				
				const { rawArrayBuffer } = that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'getItem',
					args: JSON.stringify([ that.is_session(this), key, that.client.base ]),
				}));

				return that.parse_worker_storage(rawArrayBuffer);
			}
			key(keyNum = unspecified){
				if(keyNum === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				keyNum = Number(keyNum);
				
				const { rawArrayBuffer } = that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'getItem',
					args: JSON.stringify([ that.is_session(this), keyNum, that.client.base ]),
				}));

				return that.parse_worker_storage(rawArrayBuffer);
			}
			get length(){
				const { rawArrayBuffer } = that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'length',
					args: JSON.stringify([ that.is_session(this), that.client.base ]),
				}));
				
				return that.parse_worker_storage(rawArrayBuffer);
			}
			removeItem(key = unspecified){
				if(key === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);

				that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'removeItem',
					args: JSON.stringify([ that.is_session(this), key, that.client.base ]),
				}));
			}
			setItem(key = unspecified, value = unspecified){
				if(key === unspecified || value === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);
				value = String(value);

				const { rawArrayBuffer } = that.client.get(SyncClient).fetch(that.worker_storage + new URLSearchParams({
					func: 'setItem',
					args: JSON.stringify([ that.is_session(this), key, value, that.client.base ]),
				}));

				return that.parse_worker_storage(rawArrayBuffer);
			}
			constructor(){
				throw new TypeError(`Illegal constructor`);
			}
		};

		this.proxy = StorageProxy;

		Reflect.defineProperty(StorageProxy.prototype, Symbol.toStringTag, {
			configurable: true,
			enumerable: false,
			writable: false,
			value: 'Storage',
		});

		const localStorage = new Proxy(this.localStorageTarget, this.StorageHandler);
		const sessionStorage = new Proxy(this.sessionStorageTarget, this.StorageHandler);
		
		instances.add(localStorage);
		instances.add(sessionStorage);

		Reflect.setPrototypeOf(this.localStorageTarget, StorageProxy.prototype);
		Reflect.setPrototypeOf(this.sessionStorageTarget, StorageProxy.prototype);

		this.localStorage = localStorage;
		this.sessionStorage = sessionStorage;

		const { get: localStorage_get } = Reflect.getOwnPropertyDescriptor(global, 'localStorage');
		const { get: sessionStorage_get } = Reflect.getOwnPropertyDescriptor(global, 'sessionStorage');
		

		Reflect.defineProperty(global, 'localStorage', {
			get: wrap_function(localStorage_get, (target, that, args) => {
				if(context_this(that) !== global){
					throw new TypeError('Illegal invocation');
				}

				return localStorage;
			}),
			enumerable: true,
			configurable: true,
		});

		Reflect.defineProperty(global, 'sessionStorage', {
			get: wrap_function(sessionStorage_get, (target, that, args) => {
				if(context_this(that) !== global){
					throw new TypeError('Illegal invocation');
				}

				return sessionStorage;
			}),
			enumerable: true,
			configurable: true,
		});

		mirror_class(this.global, StorageProxy, instances);

		this.proxy = StorageProxy;
		global.Storage = StorageProxy;
	}
};