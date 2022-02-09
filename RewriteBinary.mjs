// for api compatibility
import { Rewriter } from './Rewriter.mjs';

export class RewriteBinary extends Rewriter {
	static service = 'worker:binary';
	wrap(code, url){
		return code;
	}
	unwrap(code, url){
		return code;
	}
};