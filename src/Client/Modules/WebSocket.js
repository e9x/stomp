import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import { Reflect, wrap_function } from '../rewriteUtil.js';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

export default class WebSocketRewrite extends Rewrite {
	global = global.WebSocket;
	work() {
		/**
		 * @type {WeakMap<WebSocket, string>}
		 */
		const url_props = new WeakMap();

		const url_desc = Object.getOwnPropertyDescriptor(
			WebSocket.prototype,
			'url'
		);

		url_desc.get = wrap_function(url_desc.get, (target, that, args) => {
			if (url_props.has(that)) return url_props.get(that).toString();
			else return Reflect.apply(target, that, args);
		});

		Object.defineProperty(global.WebSocket.prototype, 'url', url_desc);

		/**
		 * @type {WeakMap<WebSocket, import('@tomphttp/bare-client').BareWebSocket.GetProtocolCallback>}
		 */
		const protocol_props = new WeakMap();

		const protocol_desc = Object.getOwnPropertyDescriptor(
			WebSocket.prototype,
			'protocol'
		);

		protocol_desc.get = wrap_function(
			protocol_desc.get,
			(target, that, args) => {
				// invoke it to get the protocol
				if (protocol_props.has(that)) return protocol_props.get(that)();
				else return Reflect.apply(target, that, args);
			}
		);

		Object.defineProperty(
			global.WebSocket.prototype,
			'protocol',
			protocol_desc
		);

		/**
		 * A map containing the readyState getters of Bare WebSockets
		 * @type {WeakMap<WebSocket, import('@tomphttp/bare-client').BareWebSocket.GetReadyStateCallback>}
		 */
		const socket_ready_state = new WeakMap();

		const ready_state_desc = Object.getOwnPropertyDescriptor(
			window.WebSocket.prototype,
			'readyState'
		);

		ready_state_desc.get = wrap_function(
			ready_state_desc.get,
			(target, that, args) => {
				if (socket_ready_state.has(that)) return socket_ready_state.get(that)();
				else return target.call(that, ...args);
			}
		);

		Object.defineProperty(
			window.WebSocket.prototype,
			'readyState',
			ready_state_desc
		);

		/**
		 * A map containing the send hooks of Bare WebSockets
		 * @type {WeakMap<WebSocket, import('@tomphttp/bare-client').BareWebSocket.GetSendErrorCallback}
		 */
		const socket_send_error = new WeakMap();

		WebSocket.prototype.send = wrap_function(
			WebSocket.prototype.send,
			(target, that, args) => {
				if (socket_send_error.has(that)) {
					const error = socket_send_error.get(that)();
					if (error) throw error;
				}

				target.call(that, ...args);
			}
		);

		/**
		 *
		 * @param {URL|string} url
		 */
		const getRemote = (url) => {
			const parsed = new URL(url);

			return {
				host: parsed.hostname,
				path: parsed.pathname + parsed.search,
				protocol: parsed.protocol,
				port: default_ports[parsed.protocol],
			};
		};

		window.WebSocket = wrap_function(
			window.WebSocket,
			(target, that, args) => {
				const socket = this.tomp.bare.createWebSocket(args[0], args[1], {
					headers: async () => {
						const request_headers = Object.create(null);

						request_headers['Origin'] = this.client.base.toOrigin();
						request_headers['User-Agent'] = navigator.userAgent;

						const cookies = await this.client.api('cookie', 'get_string', [
							getRemote(args[0]),
						]);

						if (cookies !== '') request_headers['Cookie'] = cookies.toString();

						return request_headers;
					},
					readyStateHook: (socket, getReadyState) =>
						socket_ready_state.set(socket, getReadyState),
					sendErrorHook: (socket, getSendError) =>
						socket_send_error.set(socket, getSendError),
					urlHook: (socket, url) => url_props.set(socket, url),
					protocolHook: (socket, getProtocol) =>
						protocol_props.set(socket, getProtocol),
					setCookiesCallback: async (setCookies) => {
						await this.client.api('cookie', 'set', [
							getRemote(args[0]),
							setCookies,
						]);
					},
					webSocketImpl: target,
				});

				return socket;
			},
			true
		);

		// websocket prototype contains these constants too
		// no need to store a local copy
		WebSocket.CONNECTING = WebSocket.prototype.CONNECTING;
		WebSocket.OPEN = WebSocket.prototype.OPEN;
		WebSocket.CLOSING = WebSocket.prototype.CLOSING;
		WebSocket.CLOSED = WebSocket.prototype.CLOSED;
	}
}
