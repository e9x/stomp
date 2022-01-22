import { Rewrite } from '../Rewrite.mjs';

class StorageRewrite extends Rewrite {
	work(){
		const that = this;

		class Storage {
			[Symbol(Symbol.toStringTag)] = 'Storage';
			clear(){}
			getItem(key){}
			key(keyNum){}
			get length(){}
			removeItem(key){}
			setItem(key, value){}
			constructor(){}
		};

		this.global.Storage = Storage;
	}
};