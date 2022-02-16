import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect } from '../RewriteUtil.mjs';
import { mirror_class } from '../NativeUtil.mjs';

export class CookieStoreRewrite extends Rewrite {
	global = global.CookieStore;
	work(){}
};