import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { encode_protocol, valid_protocol } from '../EncodeProtocol.mjs';

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
			#socket
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
				
				const headers = Object.setPrototypeOf({}, null);
				headers['host'] = parsed.hostname;
				headers['origin'] = that.client.location.origin;
				headers['pragma'] = 'no-cache';
				headers['cache-control'] = 'no-cache';
				headers['upgrade'] = 'websocket';
				headers['user-agent'] = navigator.userAgent;
				
				const protos = [
					encode_protocol(JSON.stringify(headers)),
					encode_protocol(parsed.protocol),
					encode_protocol(parsed.hostname),
					encode_protocol(port),
					encode_protocol(parsed.pathname + parsed.search),
				];
				
				for(let proto of [].concat(protocol)){
					if(!valid_protocol(proto)){
						throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`);
					}else{
						protos.push(proto);
					}
				}
				
				this.#socket = new _WebSocket(bare_ws, protos);
			}
		};

		global.WebSocket = WebSocket;
	}
};