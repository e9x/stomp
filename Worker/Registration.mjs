import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'

export class Registration {
	#key
	constructor(config = {}, key){
		navigator.serviceWorker.register(config.prefix + 'about:/]/static/worker.js');
	}
};