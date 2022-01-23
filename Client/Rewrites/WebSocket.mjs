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

		const bare_ws = new URL(this.client.tomp.bare, location);
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
				if(typeof value == 'function')this.#onclose = value;
				return value;
			}
			get onopen(){
				return this.#onopen;
			}
			set onopen(value){
				if(typeof value == 'function')this.#onopen = value;
				return value;
			}
			get onerror(){
				return this.#onerror;
			}
			set onerror(value){
				if(typeof value == 'function')this.#onerror = value;
				return value;
			}
			#dispatch(event, onlistener){
				var stopped = false;
				
				event.stopImmediatePropagation = () => {
					stopped = true;
					MessageEvent.prototype.stopImmediatePropagation.call(event);
				};
		
				this.dispatchEvent(event);
				if(!stopped && typeof onlistener == 'function')onlistener.call(this, event);
			}
			async #open(parsed, protocol){
				const request_headers = Object.setPrototypeOf({}, null);
				request_headers['host'] = parsed.hostname;
				request_headers['origin'] = that.client.location.proxy.origin;
				request_headers['pragma'] = 'no-cache';
				request_headers['cache-control'] = 'no-cache';
				request_headers['upgrade'] = 'websocket';
				request_headers['user-agent'] = navigator.userAgent;
				request_headers['connection'] = 'Upgrade';
				
				let cookies = await get_cookies(that.client, parsed);
				if(cookies)request_headers['cookie'] = cookies;
				
				const protos = [
					encode_protocol(JSON.stringify(request_headers)),
					encode_protocol(parsed.protocol),
					encode_protocol(parsed.host),
					encode_protocol(parsed.port),
					encode_protocol(parsed.path),
				];
				
				for(let proto of [].concat(protocol)){
					if(!valid_protocol(proto)){
						throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`);
					}else{
						protos.push(proto);
					}
				}

				this.#socket = new _WebSocket(bare_ws, protos);

				this.#socket.addEventListener('message', event => {
					this.#dispatch(new MessageEvent('message', event), this.#onmessage);
				});

				this.#socket.addEventListener('open', event => {
					this.#dispatch(new Event('open', event), this.#onopen);
				});

				this.#socket.addEventListener('error', event => {
					this.#dispatch(new ErrorEvent('error', event), this.#onerror);
				});

				this.#socket.addEventListener('close', event => {
					this.#dispatch(new Event('close', event), this.#onclose);
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
				
				// if(isNaN(port))throw...
				
				this.#ready = this.#open({
					host: parsed.host,
					path: parsed.pathname + parsed.search,
					port,
					protocol: parsed.protocol,
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

		global.WebSocket = WebSocket;
	}
};