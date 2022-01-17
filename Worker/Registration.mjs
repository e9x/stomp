import { TOMP } from '../TOMP.mjs'

export class Registration {
	constructor(config){
		this.tomp = new TOMP(config);
	}
	async work(){
		for(let registration of await navigator.serviceWorker.getRegistrations()){
			this.tomp.log.debug('Unregistering', registration.scope, registration.active?.scriptURL);
			await registration.unregister();
			this.tomp.log.debug('Unregistered', registration.scope, registration.active?.scriptURL);
		}

		this.tomp.log.debug('Unregistered service workers.');

		await navigator.serviceWorker.register(this.tomp.prefix + 'about:/]/static/worker.js', {
			scope: this.tomp.prefix,
			updateViaCache: 'none',
		});

		this.tomp.log.debug('Registered new service worker.');

		// throw '';
	}
};