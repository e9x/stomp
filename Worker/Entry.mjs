import { Server } from './Server.mjs';

const params = new URLSearchParams(location.search);
const config = JSON.parse(params.get('config'));
config.directory = new URL('.', location).pathname;
const server = new Server(config);

async function install(){
	server.tomp.log.debug('Working');

	try{
		await server.work();
		server.tomp.log.debug('Success');
	}catch(err){
		server.tomp.log.error('Error working:', err);
	}
}

const installed = new Promise((resolve, reject) => {
	self.addEventListener('install', event => {
		event.waitUntil(install().then(resolve).catch(reject));
	});
});

self.addEventListener('fetch', event => {
	const {request} = event;
	
	if(server.request(event))return; // handled 
});

self.addEventListener('activate', event => {
	console.log('Now ready to handle fetches');
});

self.addEventListener('push', event => {
	console.log('Push', event.request.url);
});