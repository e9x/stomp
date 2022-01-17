import { TOMP } from '../TOMP.mjs'

export class Registration {
	constructor(config){
		this.tomp = new TOMP(config);
	}
	async work(){
		const worker = await navigator.serviceWorker.register(this.tomp.prefix + 'about:/]/static/worker.js', {
			scope: this.tomp.prefix,
			updateViaCache: 'none',
		});
		
		worker.update();

		this.tomp.log.debug('Registered the service worker.');
	}
};