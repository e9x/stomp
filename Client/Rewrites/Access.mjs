import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

export class AccessRewrite extends Rewrite {
	get$m(obj, key) {
		if (!this.serviceWorker && this.window != this.window.parent && obj == this.window.parent) {
			return this.parent.$corrosion.get$m(this.parent, key);
		};
		if (!this.serviceWorker && this.window != this.window.top && obj == this.window.top) {
			return this.top.$corrosion.get$m(this.top, key);
		};
		if (obj == this.window && key == 'location' || !this.serviceWorker && obj == this.window.document && key == 'location') return this.location;
		if (!this.serviceWorker && obj == this.window && key == 'parent' && this.window != this.window.parent) return this.parent;	
		if (!this.serviceWorker && obj == this.window && key == 'top' && this.window != this.window.top) return this.top;
		return obj[key];
    }
    set$m(obj, key, val, operator) {
		if(!this.serviceWorker && this.window != this.window.parent && obj == this.window.parent){
			return this.parent.$corrosion.set$m(this.parent, key, val, operator);
		}

		if(!this.serviceWorker && this.window != this.window.top && obj == this.window.top){
			return this.top.$corrosion.set$m(this.top, key, val, operator);
		}

		if(obj == this.window && key == 'location' || !this.serviceWorker && obj == this.window.document && key == 'location'){
			obj = this;
		}

		switch(operator) {
			case '+=':
				return obj[key] += val;
			case '-=':
				return obj[key] -= val;
			case '*=':
				return obj[key] *= val;
			case '/=':
				return obj[key] /= val;
			case '%=':
				return obj[key] %= val;
			case '**=':
				return obj[key] **= val;
			case '<<=':
				return obj[key] <<= val;
			case '>>=':
				return obj[key] >>= val;
			case '>>>=':
				return obj[key] >>>= val;
			case '&=':
				return obj[key] &= val;
			case '^=':
				return obj[key] ^= val;
			case '|=':
				return obj[key] |= val;
			case '&&=':
				return obj[key] &&= val;
			case '||=':
				return obj[key] ||= val;
			case '??=':
				return obj[key] ??= val;
			case '++':
				return obj[key]++;
			case '--':
				return obj[key]--;
			case '=':
			default:
				return obj[key] = val;
		};
    }
    call$m(obj, key, args){
		if(!this.serviceWorker && this.window != this.window.parent && obj == this.window.parent){
			return this.parent.$corrosion.call$m(this.parent, key, args);
		}

        if(!this.serviceWorker && this.window != this.window.top && obj == this.window.top){
			return this.top.$corrosion.call$m(this.top, key, args);
		}

		return obj[key](...args);
    }
    get$(obj){
		if(obj == this.client.location.global)return this.client.location.proxy;
		if(!this.serviceWorker && obj == this.window.parent)return this.parent;
		if(!this.serviceWorker && obj == this.window.top)return this.top;
        return obj;
    }
    set$(obj, val, operator){
        if(obj == this.client.location.global){
			return this.set$(this.location, val, operator);
		}
		
		if(!this.serviceWorker && this.window != this.window.parent && obj == this.window.parent){
			return this.parent.set$(this.parent, val, operator);
		}
		
		if(!this.serviceWorker && this.window != this.window.top && obj == this.window.top){
			return this.top.set$(this.top, val, operator);
		}
		
		switch(operator){
			case '+=':
				return obj += val;
			case '-=':
				return obj -= val;
			case '*=':
				return obj *= val;
			case '/=':
				return obj /= val;
			case '%=':
				return obj %= val;
			case '**=':
				return obj **= val;
			case '<<=':
				return obj <<= val;
			case '>>=':
				return obj >>= val;
			case '>>>=':
				return obj >>>= val;
			case '&=':
				return obj &= val;
			case '^=':
				return obj ^= val;
			case '|=':
				return obj |= val;
			case '&&=':
				return obj &&= val;
			case '||=':
				return obj ||= val;
			case '??=':
				return obj ??= val;
			case '++':
				return obj++;
			case '--':
				return obj--;
			case '=':
			default:
				return obj = val;
		}
	}
};