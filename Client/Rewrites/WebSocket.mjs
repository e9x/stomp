import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { encode_protocol, valid_protocol } from '../EncodeProtocol.mjs';
import { wrap_function } from '../RewriteUtil.mjs';
import { load_setcookies, get_cookies } from '../../Worker/Cookies.mjs';

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

		const utf8 = new TextDecoder('utf-8');

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
			async #read_meta({ protocol, extensions, headers }){
				this.#protocol = protocol;
				this.#extensions = extensions;

				const lower_headers = {};
				
				for(let header in headers){
					const lower = header.toLowerCase();
					lower_headers[lower] = headers[header];
				}
				
				if('set-cookie' in lower_headers){
					load_setcookies(that.client, this.#remote, lower_headers['set-cookie'])
				}
			}
			get protocol(){
				return this.#protocol;
			}
			async #open(remote, protocols){
				this.#remote = remote;

				const request_headers = Object.setPrototypeOf({}, null);
				request_headers['Host'] = remote.host;
				request_headers['Origin'] = that.client.location.proxy.origin;
				request_headers['Pragma'] = 'no-cache';
				request_headers['Cache-Control'] = 'no-cache';
				request_headers['Upgrade'] = 'websocket';
				request_headers['User-Agent'] = navigator.userAgent;
				request_headers['Connection'] = 'Upgrade';
				
				for(let proto of protocols){
					if(!valid_protocol(proto)){
						throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`);
					}
				}
				
				let cookies = await get_cookies(that.client, remote);
				if(cookies.length > 0){
					request_headers['Cookie'] = cookies.toString();
				}
				
				this.#socket = new _WebSocket(bare_ws);

				let negoitate_open = false;

				this.#socket.addEventListener('message', event => {
					if(!negoitate_open){
						negoitate_open = true;
						// data is a string regardless of binaryType
						this.#read_meta(JSON.parse(event.data));
						this.#socket.binaryType = this.#binaryType;
						this.dispatchEvent(new Event('open', event));
					}else{
						this.dispatchEvent(new MessageEvent('message', event));
					}
				});

				this.#socket.addEventListener('open', event => {
					this.#socket.send(JSON.stringify({ 
						remote,
						protocols,
						headers: request_headers,
						forward_headers: [
							'accept-encoding',
							'accept-language',
						],
					}));
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

				if(url == didnt_specify){
					throw new DOMException(`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`);
				}

				let parsed;

				try{
					parsed = new URL(url);
				}catch(err){
					throw new DOMException(`Faiiled to construct 'WebSocket': The URL '${url}' is invalid.`);
				}

				if(!ws_protocols.includes(parsed.protocol)){
					throw new DOMException(`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${parsed.protocol}' is not allowed.`)
				}
				
				let port = parseInt(parsed.port);
				
				if(isNaN(port))port = default_ports[parsed.protocol];

				instances.add(this);
				
				this.#ready = this.#open({
					host: parsed.hostname,
					path: parsed.pathname + parsed.search,
					protocol: parsed.protocol,
					port,
				}, [].concat(protocol));
			}
			get readyState(){
				return this.socket ? this.socket.readyState : _WebSocket.CONNECTING;
			}
			get binaryType(){
				return this.#binaryType;
			}
			set binaryType(value){
				if(binaryTypes.includes(value)){
					this.#binaryType = value;
				}

				if(this.#socket){
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
		

		WebSocket.CLOSED = 3;
		WebSocket.CLOSING = 2;
		WebSocket.CONNECTING = 0;
		WebSocket.OPEN = 1;

		global.WebSocket = WebSocket;
	}
};