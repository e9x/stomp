import { Server } from './Server.mjs';

const prefix = self.registration.scope;

const server_pending = new Promise(resolve => {
	async function install(){
		console.log('Fetching config');
		const request = await fetch(prefix + 'about:/]/config/');
		const config = await request.json();
		console.log(config);
		const server = new Server(config);
		await server.work();
		resolve(server);
		console.log('OK');
	}

	self.addEventListener('install', event => {
		event.waitUntil(install());
	});
});

self.addEventListener('activate', event => {
	console.log('now ready to handle fetches');
});

async function on_fetch(request){
	const server = await server_pending;
	return await server.request(request);
}

self.addEventListener('fetch', event => {
	const {request} = event;
	// only handle process on about:
	if(request.url == prefix || !request.url.startsWith(prefix) || request.url.startsWith(`${prefix}about:/]/`) && !request.url.startsWith(`${prefix}about:/]/process`)){
		return false;
	}

	event.respondWith(on_fetch(request));
	return true;
});

self.addEventListener('push', event => {
	console.log('Push', event.request.url);
});