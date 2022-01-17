import { Server } from './index.mjs';

const server_pending = new Promise((resolve, reject) => {
	self.addEventListener('install', async () => {
		const request = await fetch(self.registration.scope + 'about:/]/config/');
		const config = await request.json();
		resolve(new Server(config));
	});
});

self.addEventListener('push', async event => {
	console.log(event.request.url);

	const server = await server_pending;
	// event.respondWith()
	console.log(event);

});