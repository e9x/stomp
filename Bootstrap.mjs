const { src } = document.currentScript;
import { TOMPError } from './TOMPError.mjs';

import { TOMP } from './TOMP.mjs'

export class Bootstrapper {
	pending_messages = {};
	constructor(config){
		this.tomp = new TOMP(config);
	}
	async register(){
		if(!('serviceWorker' in navigator))throw new TOMPError(400, { message: 'Your browser does not support service workers.' });
		if(!('cookieStore' in window))throw new TOMPError(400, { message: 'Your browser does not support the cookieStore API.' });

		this.worker = await navigator.serviceWorker.register(new URL('./worker.js', src), {
			scope: this.tomp.prefix,
			updateViaCache: 'none',
		});
		
		await this.worker.update();

		this.tomp.log.debug('Registered the service worker.');
	}
	process(dest){
		return new URL('../process/?dest=' + encodeURIComponent(dest), src);
	}
	static async create(){
		const request = await fetch(new URL('../server:config/', src));
		const config = await request.json();
		const bootstrapper = new Bootstrapper(config);
		await bootstrapper.register();
		return bootstrapper;
	}
};

window.tomp = Bootstrapper.create();