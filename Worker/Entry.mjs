import { Server } from './index.mjs';

const prefix = self.registration.scope;

const server_pending = new Promise((resolve, reject) => {
	async function install(){
		const request = await fetch(prefix + 'about:/]/config/');
		const config = await request.json();
		console.log(config);
		return new Server(config);
	}

	self.addEventListener('install', event => {
		event.waitUntil(install().then(resolve));
	});
});

self.addEventListener('activate', event => {
	console.log('now ready to handle fetches');
});

async function on_fetch(request){
	const server = await server_pending;
	
	console.log(request);

	return new Response('k', { status: 200 });
}

self.addEventListener('fetch', event => {
	const {request} = event;
	// only handle process on about:
	if(request.url == prefix || !request.url.startsWith(prefix) || request.url.startsWith(`${prefix}about:/]/`) && !request.url.startsWith(`${prefix}about:/]/process`)){
		console.log('not handling', request.url);
		return false;
	}

	event.respondWith(on_fetch(request));
	console.log('handled');
});

self.addEventListener('push', event => {
	console.log('Push', event.request.url);
});