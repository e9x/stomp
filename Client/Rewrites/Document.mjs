import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class DocumentRewrite extends Rewrite {
	work(){
		const that = this;

		Object.defineProperty(Document.prototype, 'defaultView', {
			configurable: true,
			enumerable: true,
			get(){
				return that.client.window;
			},
			set: undefined,
		});
		
		return global.document;
	}
};