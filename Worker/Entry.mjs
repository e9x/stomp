import { Server } from './Server.mjs';

const prefix = self.registration.scope;

var server;

function on_fetch(event){
	const {request} = event;
	// only handle process on about:
	if(request.url == prefix || !request.url.startsWith(prefix) || request.url.startsWith(`${prefix}about:/]/`) && !request.url.startsWith(`${prefix}about:/]/process`)){
		return false;
	}

	server.request(event);
}

async function install(){
	console.log('Fetching config');
	const request = await fetch(prefix + 'about:/]/config/');
	const config = await request.json();
	server = new Server(config);
	await server.work();
	
	server.tomp.log.debug('Worker OK');

	self.addEventListener('fetch', on_fetch);
}

self.addEventListener('install', event => {
	event.waitUntil(install());
});

self.addEventListener('activate', event => {
	console.log('now ready to handle fetches');
});

self.addEventListener('push', event => {
	console.log('Push', event.request.url);
});