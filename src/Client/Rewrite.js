// Base class for a client rewrite

export default class Rewrite {
	/**
	 *
	 * @param {import('./Client').default} client
	 */
	constructor(client) {
		this.client = client;
		this.tomp = this.client.tomp;
	}
	work() {
		// throw new Error('.work() not implemented');
	}
}
