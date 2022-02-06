import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect } from '../RewriteUtil.mjs';
import { mirror_class } from '../NativeUtil.mjs';

export class StorageRewrite extends Rewrite {
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
				return Reflect.set(target, prop, receiver);
			}

			Reflect.apply(this.proxy.prototype.setItem, this.get_proxy(target), [ prop, value ]);

			return value;
		},
		getOwnPropertyDescriptor: (target, prop) => {
			if(typeof prop == 'symbol' || prop in target || prop in this.proxy.prototype){
				return Reflect.getOwnPropertyDescriptor(target, prop, receiver);
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
			const { responseText } = this.client.sync.fetch(this.worker_storage + new URLSearchParams({
				func: 'hasItem',
				args: JSON.stringify([ this.is_session(target), prop, this.client.location.page_url ]),
			}));

			return JSON.parse(responseText);
		},
		ownKeys: target => {
			const { responseText } = this.client.sync.fetch(this.worker_storage + new URLSearchParams({
				func: 'getKeys',
				args: JSON.stringify([ this.is_session(target), this.client.location.page_url ]),
			}));

			const keys = JSON.parse(responseText);

			return Reflect.ownKeys(target).concat(keys);
		},
	};
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
	constructor(client){
		super(client);
	}
	work(){
		this.worker_storage = `${this.client.tomp.directory}worker:storage/?`;

		const that = this;
		const instances = new WeakSet();
		const unspecified = Symbol();

		class StorageProxy {
			clear(){
				that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'clear',
					args: JSON.stringify([ that.is_session(this), that.client.location.page_url ]),
				}));
			}
			getItem(key = unspecified){
				if(key === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'getItem' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);
				
				const { responseText } = that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'getItem',
					args: JSON.stringify([ that.is_session(this), key, that.client.location.page_url ]),
				}));

				if(responseText === ''){
					return null;
				}else{
					return JSON.parse(responseText);
				}
			}
			key(keyNum = unspecified){
				if(keyNum === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				keyNum = Number(keyNum);
				
				const { responseText } = that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'getItem',
					args: JSON.stringify([ that.is_session(this), keyNum, that.client.location.page_url ]),
				}));

				if(responseText === ''){
					return null;
				}else{
					return JSON.parse(responseText);
				}
			}
			get length(){
				const { responseText } = that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'length',
					args: JSON.stringify([ that.is_session(this), that.client.location.page_url ]),
				}));
				
				return JSON.parse(responseText);
			}
			removeItem(key = unspecified){
				if(key === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);

				that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'removeItem',
					args: JSON.stringify([ that.is_session(this), key, that.client.location.page_url ]),
				}));
			}
			setItem(key = unspecified, value = unspecified){
				if(key === unspecified || value === unspecified){
					throw new TypeError(`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`);
				}

				key = String(key);
				value = String(value);

				const { responseText } = that.client.sync.fetch(that.worker_storage + new URLSearchParams({
					func: 'setItem',
					args: JSON.stringify([ that.is_session(this), key, value, that.client.location.page_url ]),
				}));

				if(responseText === ''){
					return null;
				}else{
					return JSON.parse(responseText);
				}
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

		Reflect.defineProperty(global, 'localStorage', {
			get(){
				return localStorage;
			},
			enumerable: true,
			configurable: false,
		});

		Reflect.defineProperty(global, 'sessionStorage', {
			get(){
				return sessionStorage;
			},
			enumerable: true,
			configurable: false,
		});

		mirror_class(this.global, StorageProxy, instances);

		this.proxy = StorageProxy;
		global.Storage = StorageProxy;
	}
};