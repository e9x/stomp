import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class StorageRewrite extends Rewrite {
	work(){
		const that = this;

		class Storage {
			[Symbol.toStringTag] = 'Storage';
			clear(){}
			getItem(key){}
			key(keyNum){}
			get length(){}
			removeItem(key){}
			setItem(key, value){}
			constructor(){}
		};

		global.Storage = Storage;
	}
};