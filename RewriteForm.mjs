// for api compatibility
import { Rewriter } from './Rewriter.mjs';

export class RewriteForm extends Rewriter {
	static service = 'worker:form';
	wrap(code, url){
		return code;
	}
	unwrap(code, url){
		return code;
	}
};