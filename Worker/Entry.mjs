import { Server } from './Server.mjs';

const prefix = self.registration.scope;

var server;

async function install(){
	console.log('Fetching config');
	const request = await fetch(prefix + 'about:/]/config/');
	const config = await request.json();
	server = new Server(config);
	await server.work();
	
	server.tomp.log.debug('Worker OK');
}

const installed = new Promise((resolve, reject) => {
	self.addEventListener('install', event => {
		event.waitUntil(install().then(resolve).catch(reject));
	});
})

self.addEventListener('fetch', event => {
	if(!server)return;
	const {request} = event;
	// only handle process on about:
	if(request.url == prefix || !request.url.startsWith(prefix) || request.url.startsWith(`${prefix}about:/]/`) && !request.url.startsWith(`${prefix}about:/]/process`)){
		return false;
	}
	server.request(event);
});



self.addEventListener('activate', event => {
	console.log('now ready to handle fetches');
});

self.addEventListener('push', event => {
	console.log('Push', event.request.url);
});