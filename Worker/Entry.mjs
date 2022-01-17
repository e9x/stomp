import { Server } from './index.mjs';

// new Server();

self.addEventListener('install', () => {
	console.log('Installed, now what?');
});

self.addEventListener('fetch', event => {
	console.log(event);
	
});