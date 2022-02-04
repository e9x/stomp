import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { encode_protocol, valid_protocol } from '../EncodeProtocol.mjs';
import { load_setcookies, get_cookies } from '../../Worker/Cookies.mjs';
import { wrap_function } from '../RewriteUtil.mjs';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

const ws_protocols = ['wss:','ws:'];

function EventTarget_on(target, original, event, instances){
	const property = `on${event}`;
	const desc = Object.getOwnPropertyDescriptor(original, property);
	const listeners = new WeakMap();

	Object.defineProperty(target, property, {
		get: wrap_function(desc.get, () => { 
			if(!instances.has(this)){
				throw new TypeError('Illegal Invocation');
			}

			if(listeners.has(this)){
				return listeners.get(this);
			}else{
				return null;
			}
		}),
		set: wrap_function(desc.set, (target, that, [ value ]) => {
			if(!instances.has(that)){
				throw new TypeError('Illegal Invocation');
			}

			if(typeof value == 'function'){
				if(listeners.has(this)){
					that.removeEventListener('error', listeners.get(this));
				}

				listeners.set(this, value);
				that.addEventListener('error', value);
			}

			return value;
		}),
	});
}

export class WebSocketRewrite extends Rewrite {
	#socket
	work(){
		const that = this;

		const _WebSocket = global.WebSocket;

		const bare_ws = new URL(this.client.tomp.bare + 'v1/', location);
		bare_ws.protocol = bare_ws.protocol == 'https:' ? 'wss:' : 'ws:';
		
		const didnt_specify = Symbol();

		const instances = new WeakSet();

		class WebSocket extends EventTarget {
			static CONNECTING = 0;
			static OPEN = 1;
			static CLOSING = 2;
			static CLOSED = 3;
			CONNECTING = 0;
			OPEN = 1;
			CLOSING = 2;
			CLOSED = 3;
			#socket;
			#ready;
			#binaryType = 'blob';
			#remote;
			#protocol = '';
			#extensions = '';
			#id = Math.random().toString(36).slice(2);
			async #read_meta({ headers }){
				const lower_headers = {};
				
				for(let header in headers){
					const lower = header.toLowerCase();
					lower_headers[lower] = headers[header];
				}

				if('sec-websocket-protocol' in lower_headers){
					this.#protocol = lower_headers['sec-websocket-protocol'].toString();
				}
				
				if('sec-websocket-extensions' in lower_headers){
					this.#extensions = lower_headers['sec-websocket-extensions'].toString();
				}

				if('set-cookie' in lower_headers){
					load_setcookies(that.client, this.#remote, lower_headers['set-cookie']);
				}
			}
			async #open(remote, protocol){
				this.#remote = remote;

				const request_headers = Object.setPrototypeOf({}, null);
				request_headers['Host'] = remote.host;
				request_headers['Origin'] = that.client.location.proxy.origin;
				request_headers['Pragma'] = 'no-cache';
				request_headers['Cache-Control'] = 'no-cache';
				request_headers['Upgrade'] = 'websocket';
				request_headers['User-Agent'] = navigator.userAgent;
				request_headers['Connection'] = 'Upgrade';
				
				for(let proto of [].concat(protocol)){
					if(!valid_protocol(proto)){
						throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`);
					}
				}

				if(protocol.length){
					request_headers['Sec-Websocket-Protocol'] = protocol.join(', ');
				}
				
				let cookies = await get_cookies(that.client, remote);
				if(cookies.length > 0){
					request_headers['Cookie'] = cookies.toString();
				}
				
				this.#socket = new _WebSocket(bare_ws, [
					'bare',
					encode_protocol(JSON.stringify({
						remote,
						headers: request_headers,
						forward_headers: [
							'accept-encoding',
							'accept-language',
							'sec-websocket-extensions',
							'sec-websocket-key',
							'sec-websocket-version',
						],
						id: this.#id,
					})),
				]);

				this.#socket.addEventListener('message', event => {
					this.dispatchEvent(new MessageEvent('message', event));
				});

				this.#socket.addEventListener('open', async event => {
					const cookie_name = `bare-meta-${this.#id}`;
					const [,value] = that.client.cookie.value.match(new RegExp(`${cookie_name}=(.*?)(;|$)`));
					
					if(!value){
						that.tomp.log.error('Unable to read meta cookie ${cookie_name} in document.cookies.');
						throw{};
					}

					await this.#read_meta(JSON.parse(decodeURIComponent(value)));
					
					this.dispatchEvent(new Event('open', event));
				});

				this.#socket.addEventListener('error', event => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});

				this.#socket.addEventListener('close', event => {
					this.dispatchEvent(new Event('close', event));
				});
			}
			constructor(url = didnt_specify, protocol = []){
				super();

				instances.add(this);

				if(url == didnt_specify){
					throw new DOMException(`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`);
				}

				try{
					var parsed = new URL(url);
				}catch(err){
					throw new DOMException(`Faiiled to construct 'WebSocket': The URL '${url}' is invalid.`);
				}

				if(!ws_protocols.includes(parsed.protocol)){
					throw new DOMException(`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${parsed.protocol}' is not allowed.`)
				}
				
				let port = parseInt(parsed.port);
				
				if(isNaN(port))port = default_ports[parsed.protocol];
				
				this.#ready = this.#open({
					host: parsed.hostname,
					path: parsed.pathname + parsed.search,
					protocol: parsed.protocol,
					port,
				}, [].concat(protocol));
			}
			get protocol(){
				return this.#protocol;
			}
			get extensions(){
				return this.#extensions;
			}
			get readyState(){
				return this.socket ? this.socket.readyState : _WebSocket.CONNECTING;
			}
			get binaryType(){
				return this.#binaryType;
			}
			set binaryType(value){
				this.#binaryType = value;

				if(this.#ready){
					this.#socket.binaryType = value;
				}

				return value;
			}
			send(data){
				if(!this.#socket){
					throw new DOMException(`Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.`);
				}
				this.#socket.send(data);
			}
			close(code, reason){
				if(typeof code != 'string')code = 0;
				
				if(code != 1000 && (code < 3000 || code > 4999)){
					throw new DOMException(`Failed to execute 'close' on 'WebSocket': The code must be either 1000, or between 3000 and 4999. 0 is neither.`);
				}
				
				this.#ready.then(() => this.#socket.close(code, reason));
			}
		};

		EventTarget_on(WebSocket.prototype, _WebSocket.prototype, 'close', instances);
		EventTarget_on(WebSocket.prototype, _WebSocket.prototype, 'open', instances);
		EventTarget_on(WebSocket.prototype, _WebSocket.prototype, 'message', instances);
		EventTarget_on(WebSocket.prototype, _WebSocket.prototype, 'error', instances);

		global.WebSocket = WebSocket;
	}
};