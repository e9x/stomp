import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { encode_protocol, valid_protocol } from '../EncodeProtocol.mjs';
import { load_setcookies, get_cookies } from '../../Worker/Cookies.mjs';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

const ws_protocols = ['wss:','ws:'];

export class WebSocketRewrite extends Rewrite {
	#socket
	work(){
		const that = this;

		const _WebSocket = global.WebSocket;

		const bare_ws = new URL(this.client.tomp.bare + 'v1/', location);
		bare_ws.protocol = bare_ws.protocol == 'https:' ? 'wss:' : 'ws:';
		
		const didnt_specify = Symbol();

		class WebSocket extends EventTarget {
			static CONNECTING = 0;
			CONNECTING = 0;
			static OPEN = 1;
			OPEN = 1;
			static CLOSING = 2;
			CLOSING = 2;
			static CLOSED = 3;
			CLOSED = 3;
			#onmessage = null;
			#onclose = null;
			#onopen = null;
			#onerror = null;
			#socket;
			#ready;
			#binary_type;
			get onmessage(){
				return this.#onmessage;
			}
			set onmessage(value){
				if(typeof value == 'function')this.#onmessage = value;
				return value;
			}
			get onclose(){
				return this.#onclose;
			}
			set onclose(value){
				if(typeof value == 'function'){
					if(typeof this.#onclose == 'function'){
						this.removeEventListener('close', this.#onclose);
					}

					this.#onclose = value;
					this.addEventListener('close', value);
				}

				return value;
			}
			get onopen(){
				return this.#onopen;
			}
			set onopen(value){
				if(typeof value == 'function'){
					if(typeof this.#onopen == 'function'){
						this.removeEventListener('open', this.#onopen);
					}

					this.#onopen = value;
					this.addEventListener('open', value);
				}

				return value;
			}
			get onerror(){
				return this.#onerror;
			}
			set onerror(value){
				if(typeof value == 'function'){
					if(typeof this.#onerror == 'function'){
						this.removeEventListener('error', this.#onerror);
					}

					this.#onerror = value;
					this.addEventListener('error', value);
				}

				return value;
			}
			async #open(remote, protocol){
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
					})),
				]);

				this.#socket.addEventListener('message', event => {
					this.dispatchEvent(new MessageEvent('message', event), this.#onmessage);
				});

				this.#socket.addEventListener('open', event => {
					this.dispatchEvent(new Event('open', event), this.#onopen);
				});

				this.#socket.addEventListener('error', event => {
					this.dispatchEvent(new ErrorEvent('error', event), this.#onerror);
				});

				this.#socket.addEventListener('close', event => {
					this.dispatchEvent(new Event('close', event), this.#onclose);
				});
			}
			constructor(url = didnt_specify, protocol = []){
				super();

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
				}, protocol);
			}
			get readyState(){
				return this.socket ? this.socket.readyState : _WebSocket.CONNECTING;
			}
			get binaryType(){
				return this.#binary_type;
			}
			set binaryType(value){
				this.#binary_type = value;

				this.#ready.then(() => this.#socket.binaryType = value);

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

		WebSocket.CLOSED = 3;
		WebSocket.CLOSING = 2;
		WebSocket.CONNECTING = 0;
		WebSocket.OPEN = 1;

		global.WebSocket = WebSocket;
	}
};