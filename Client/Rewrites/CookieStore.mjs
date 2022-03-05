import Rewrite from '../Rewrite.mjs';
import global from '../global.mjs';

export default class CookieStoreRewrite extends Rewrite {
	global = global.CookieStore;
	work(){}
};