import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import { validProtocol } from '../../encodeProtocol.js';
import { Reflect } from '../rewriteUtil.js';
import {
	DOMObjectConstructor,
	TargetConstant,
	EventTarget_on,
	mirror_class,
} from '../NativeUtil.js';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

const ws_protocols = ['wss:', 'ws:'];

export default class WebSocketRewrite extends Rewrite {
	global = global.WebSocket;
	work() {
		const that = this;

		const didnt_specify = Symbol();

		const instances = new WeakSet();

		const CONNECTING = 0;
		const OPEN = 1;
		const CLOSING = 2;
		const CLOSED = 3;

		class WebSocketProxy extends EventTarget {
			/**
			 * @type {import('@tomphttp/bare-client').BareWebSocket}
			 */
			#socket;
			#ready;
			#remote = {};
			#binaryType = 'blob';
			#protocol = '';
			#extensions = '';
			#url = '';
			/**
			 * @type {(() => number) | undefined}
			 */
			#getReadyState;
			/**
			 * fallback for when #getReadyState isn't set
			 * @type {number}
			 */
			#readyState = CONNECTING;
			/**
			 * @type {(() => Error | undefined) | undefined}
			 */
			#getSendError;
			/**
			 *
			 * @param {URL} remote
			 * @param {string[]} protocol
			 */
			async #open(remote, protocol) {
				this.#remote = remote;

				const request_headers = {};
				Reflect.setPrototypeOf(request_headers, null);

				request_headers['Host'] = remote.host;
				request_headers['Origin'] = that.client.base.toOrigin();
				request_headers['Pragma'] = 'no-cache';
				request_headers['Cache-Control'] = 'no-cache';
				request_headers['Upgrade'] = 'websocket';
				request_headers['User-Agent'] = navigator.userAgent;
				request_headers['Connection'] = 'Upgrade';

				const cookies = await that.client.api('cookie', 'get_string', [remote]);

				if (cookies !== '') request_headers['Cookie'] = cookies.toString();

				this.#socket = await that.tomp.bare.createWebSocket(
					remote.toString(),
					protocol,
					request_headers,
					(socket, getReadyState) => {
						this.#getReadyState = getReadyState;
					},
					(socket, getSendError) => {
						this.#getSendError = getSendError;
					}
				);

				this.#socket.binaryType = this.#binaryType;

				this.#socket.addEventListener('meta', async (event) => {
					event.preventDefault();

					this.#protocol = event.meta.protocol;

					await that.client.api('cookie', 'set', [
						this.#remote,
						event.meta.setCookies,
					]);
				});

				this.#socket.addEventListener('message', (event) => {
					this.dispatchEvent(new MessageEvent('message', event));
				});

				this.#socket.addEventListener('open', async (event) => {
					this.dispatchEvent(new Event('open', event));
				});

				this.#socket.addEventListener('error', (event) => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});

				this.#socket.addEventListener('close', (event) => {
					this.dispatchEvent(new Event('close', event));
				});
			}
			get url() {
				return this.#url;
			}
			constructor(url = didnt_specify, protocol = []) {
				super();

				instances.add(this);

				if (url == didnt_specify) {
					throw new DOMException(
						`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`
					);
				}

				let parsed;

				try {
					parsed = new URL(url);
				} catch (err) {
					throw new DOMException(
						`Faiiled to construct 'WebSocket': The URL '${url}' is invalid.`
					);
				}

				if (!ws_protocols.includes(parsed.protocol)) {
					throw new DOMException(
						`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${parsed.protocol}' is not allowed.`
					);
				}

				let port = parseInt(parsed.port);

				if (isNaN(port)) port = default_ports[parsed.protocol];

				this.#url = parsed.href;

				protocol = (Array.isArray(protocol) ? protocol : [protocol]).map(
					String
				);

				for (const proto of protocol) {
					if (!validProtocol(proto)) {
						throw new DOMException(
							`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`
						);
					}
				}

				this.#ready = this.#open(parsed, [].concat(protocol));
			}
			get protocol() {
				return this.#protocol;
			}
			get extensions() {
				return this.#socket ? this.#socket.extensions : this.#extensions;
			}
			get readyState() {
				if (this.#getReadyState) {
					return this.#getReadyState();
				} else {
					return this.#readyState;
				}
			}
			get binaryType() {
				return this.#binaryType;
			}
			set binaryType(value) {
				this.#binaryType = value;

				if (this.#socket) {
					this.#socket.binaryType = value;
				}

				return value;
			}
			send(data) {
				if (this.#getSendError) {
					const error = this.#getSendError();
					if (error) throw error;
				}

				if (!this.#socket) {
					throw new DOMException(
						`Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.`
					);
				}

				this.#socket.send(data);
			}
			close(code, reason) {
				if (typeof code !== 'undefined') {
					if (typeof code !== 'number') {
						code = 0;
					}

					if (code !== 1000 && (code < 3000 || code > 4999)) {
						throw new DOMException(
							`Failed to execute 'close' on 'WebSocket': The code must be either 1000, or between 3000 and 4999. ${code} is neither.`
						);
					}
				}

				if (this.#socket) this.#socket.close();
				else {
					this.#readyState = CLOSING;
					this.#ready.then(() => this.#socket.close(code, reason));
				}
			}
		}

		WebSocketProxy = DOMObjectConstructor(WebSocketProxy);
		EventTarget_on(WebSocketProxy.prototype, 'close');
		EventTarget_on(WebSocketProxy.prototype, 'open');
		EventTarget_on(WebSocketProxy.prototype, 'message');
		EventTarget_on(WebSocketProxy.prototype, 'error');
		TargetConstant(WebSocketProxy, 'CONNECTING', CONNECTING);
		TargetConstant(WebSocketProxy, 'OPEN', OPEN);
		TargetConstant(WebSocketProxy, 'CLOSING', CLOSING);
		TargetConstant(WebSocketProxy, 'CLOSED', CLOSED);
		mirror_class(this.global, WebSocketProxy, instances);

		global.WebSocket = WebSocketProxy;
	}
}
