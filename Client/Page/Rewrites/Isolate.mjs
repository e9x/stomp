import Rewrite from '../../Rewrite.mjs';
import global from '../../global.mjs';

export default class IsolateRewrite extends Rewrite {
	work(){
		delete global.CookieStore;
		delete global.cookieStore;
		delete global.CookieStoreManager;
		delete global.CookieChangeEvent;
		delete global.ServiceWorker;
		delete global.ServiceWorkerContainer;
		delete global.ServiceWorkerRegistration;
		delete Navigator.prototype.serviceWorker;
	}
};