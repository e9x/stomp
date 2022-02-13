import { LOG_DEBUG } from '../Logger.mjs';

const { src } = document.currentScript;

export class Bootstrapper {
	constructor(config){
		this.config = config;

		this.ready = this.register();
	}
	get directory(){
		return new URL('.', src).pathname;
	}
	async register(){
		if(!('serviceWorker' in navigator))throw new Error('Your browser does not support service workers.' );
		
		/*for(let worker of await navigator.serviceWorker.getRegistrations()){
			await worker.unregister();
		}*/

		const url = `${this.directory}worker.js?config=${encodeURIComponent(JSON.stringify(this.config))}`;

		this.worker = await navigator.serviceWorker.register(url, {
			scope: this.directory,
			updateViaCache: 'none',
		});
		
		await this.worker.update();

		if(this.config.loglevel <= LOG_DEBUG)console.debug('Registered the service worker.');
	}
	#send(service, url){
		return `${this.directory}worker:process/?` + new URLSearchParams({ service, url });
	}
	html(url){
		return this.#send('html', url);
	}
	css(url){
		return this.#send('css', url);
	}
	js(url){
		return this.#send('js', url);
	}
	binary(url){
		return this.#send('binary', url);
	}
};