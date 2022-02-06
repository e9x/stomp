import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { encode_protocol, valid_protocol } from '../EncodeProtocol.mjs';
import { load_setcookies, get_cookies } from '../../Worker/Cookies.mjs';
import { mirror_attributes, Reflect, getOwnPropertyDescriptors, wrap_function } from '../RewriteUtil.mjs';
import { TargetConstant, EventTarget_on, mirror_class } from '../NativeUtil.mjs';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

const ws_protocols = ['wss:','ws:'];

export class WebSocketRewrite extends Rewrite {
	#socket
	global = global.WebSocket;
	work(){
		const that = this;

		const bare_ws = new URL(this.client.tomp.bare + 'v1/', location);
		bare_ws.protocol = bare_ws.protocol == 'https:' ? 'wss:' : 'ws:';
		
		const didnt_specify = Symbol();

		const instances = new WeakSet();

		class WebSocketProxy extends EventTarget {
			#socket;
			#ready;
			#remote = {};
			#binaryType = 'blob';
			#protocol = '';
			#extensions = '';
			#url = '';
			#id = Math.random().toString(36).slice(2);
			async #read_meta({ headers }){
				const lower_headers = {};
				
				for(let header in headers){
					const lower = header.toLowerCase();
					lower_headers[lower] = headers[header];
				}

				if('sec-websocket-protocol' in lower_headers){
					this.#protocol = String(lower_headers['sec-websocket-protocol']);
				}
				
				if('sec-websocket-extensions' in lower_headers){
					this.#extensions = String(lower_headers['sec-websocket-extensions']);
				}

				if('set-cookie' in lower_headers){
					load_setcookies(that.client, this.#remote, lower_headers['set-cookie']);
				}
			}
			async #open(remote, protocol){
				this.#remote = remote;

				const request_headers = {};
				Reflect.setPrototypeOf(request_headers, null);
				
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
				
				this.#socket = new this.global(bare_ws, [
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
					const meta = await(await Reflect.apply(that.client.request.global_fetch, global, [
						new URL(that.client.tomp.bare + 'v1/ws-meta', location),
						{
							headers: {
								'x-bare-id': this.#id,
							},
							method: 'GET',
						}
					])).json();
					
					await this.#read_meta(meta);
					
					this.dispatchEvent(new Event('open', event));
				});

				this.#socket.addEventListener('error', event => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});

				this.#socket.addEventListener('close', event => {
					this.dispatchEvent(new Event('close', event));
				});
			}
			get url(){
				return this.#url;
			}
			constructor(url = didnt_specify, protocol = []){
				super();

				instances.add(this);

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
				
				this.#url = parsed.href;

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
				return this.socket ? this.socket.readyState : this.global.CONNECTING;
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
				if(typeof code !== 'undefined'){
					if(typeof code != 'string')code = 0;
					
					if(code != 1000 && (code < 3000 || code > 4999)){
						throw new DOMException(`Failed to execute 'close' on 'WebSocket': The code must be either 1000, or between 3000 and 4999. 0 is neither.`);
					}
				}

				this.#ready.then(() => this.#socket.close(code, reason));
			}
		};

		EventTarget_on(WebSocketProxy.prototype, 'close');
		EventTarget_on(WebSocketProxy.prototype, 'open');
		EventTarget_on(WebSocketProxy.prototype, 'message');
		EventTarget_on(WebSocketProxy.prototype, 'error');
		TargetConstant(WebSocketProxy, 'CONNECTING', 0);
		TargetConstant(WebSocketProxy, 'OPEN', 1);
		TargetConstant(WebSocketProxy, 'CLOSING', 2);
		TargetConstant(WebSocketProxy, 'CLOSED', 3);
		mirror_class(this.global, WebSocketProxy, instances);

		global.WebSocket = WebSocketProxy;
	}
};