import Client from '../Client.mjs';
import ImportScriptsRewrite from './Rewrites/ImportScripts.mjs';

export default class WorkerClient extends Client {
	static type = 'worker';
	base = this.tomp.url.parse_url(this.tomp.url.unwrap_ez(location));
	host = this.tomp.url.parse_url(location.href);
	constructor(config){
		super(config);

		this.load_modules(
			ImportScriptsRewrite
		);
	}
};