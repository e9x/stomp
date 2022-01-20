const { src } = document.currentScript;

import { LOG_DEBUG } from './Logger.mjs';

export class Bootstrapper {
	pending_messages = {};
	constructor(config){
		this.config = config;
	}
	async register(){
		if(!('serviceWorker' in navigator))throw new Error('Your browser does not support service workers.' );
		
		/*for(let worker of await navigator.serviceWorker.getRegistrations()){
			await worker.unregister();
		}*/

		this.worker = await navigator.serviceWorker.register(this.config.prefix + 'worker.js', {
			scope: this.config.prefix,
			updateViaCache: 'none',
		});
		
		await this.worker.update();

		if(this.config.loglevel <= LOG_DEBUG)console.debug('Registered the service worker.');
	}
	process(dest){
		return this.config.prefix + 'worker:process/' + encodeURIComponent(dest);
	}
	static async create(){
		const request = await fetch(new URL('./server:config', src));
		const config = await request.json();
		const bootstrapper = new Bootstrapper(config);
		await bootstrapper.register();
		return bootstrapper;
	}
};

window.tomp = Bootstrapper.create();