import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, Reflect, wrap_function } from '../RewriteUtil.mjs';
import { TOMPElement } from '../../RewriteElements.mjs';

const { getAttribute, setAttribute, hasAttribute, removeAttribute, getAttributeNames } = Element.prototype;

class TOMPElementDOMAttributes {
	#node;
	constructor(node){
		this.#node = node;
	}
	get(attribute){
		return Reflect.apply(getAttribute, this.#node, [ attribute ]);
	}
	set(attribute, value){
		return Reflect.apply(setAttribute, this.#node, [ attribute ]);
	}
	has(attribute){
		return Reflect.apply(hasAttribute, this.#node, [ attribute ]);
	}
	delete(attribute){
		return Reflect.apply(removeAttribute, this.#node, [ attribute ]);
	}
	*keys(){
		for(let name of Reflect.apply(getAttributeNames, this.#node, [])){
			yield name;
		}
	}
	*values(){
		for(let name of this.keys()){
			yield this.get(name);
		}
	}
	*entries(){
		for(let name of this.keys()){
			yield [ name, this.get(name) ];
		}
	}
};

class TOMPElementDOM {
	#node;
	constructor(node){
		this.#node = node;
		this.attributes = new TOMPElementDOMAttributes(this.#node);
	}
	get type(){
		return this.#node.nodeName;
	}
	set type(value){
		this.node.remove();
		const replacement = document.createElement(value);
		replacement.append(...this.node.children);
		this.#node = replacement;
		return value;
	}
	get detached(){
		return !this.node.parentNode;
	}
	get text(){
		return this.#node.textContent;
	}
	set text(value){
		return this.#node.textContent = value;
	}
	detach(){
		this.#node.remove();
	}
	get parent(){
		return new TOMPElementDOM(this.parentNode);
	}
};

export class HTMLRewrite extends Rewrite {
	work(){
		for(let clname in this.router){
			const cls = global[clname];

			if(!cls)continue;

			const proto = cls.prototype;

			for(let key in this.router[clname]){
				const desc = Reflect.getOwnPropertyDescriptor(proto, key);
				
				if(!desc){
					this.client.tomp.warn('Missing', key, 'in', proto);
					continue;
				}
	
				const new_desc = this.router[clname][key](desc);

				Reflect.defineProperty(proto, key, new_desc);
			}
		}

		// TODO
		this.get_attribute = Element.prototype.getAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute ]) => {
			attribute = String(attribute).toLowerCase();
			const result = Reflect.apply(target, that, [ attribute ]);
			
			if(attribute == 'style'){
				result = this.client.tomp.css.unwrap(result, this.client.location.proxy);
				
			}
			
			return 
		});

		this.set_attribute = Element.prototype.setAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute, value ]) => {
			attribute = String(attribute).toLowerCase();
			return Reflect.apply(target, that, [ attribute, value ]);
		});
	}
	define_attrs(...attrs){
		const result = {};

		for(let attr of attrs){
			result[attr] = desc => ({
				configurable: true,
				enumerable: true,
				get: wrap_function(desc.get, (target, that) => {
					return Reflect.apply(this.get_attribute, that, [ attr ]);
				}),
				set: wrap_function(desc.set, (target, that, [ value ]) => {
					return Reflect.apply(this.get_attribute, that, [ attr ]);
				}),
			});
		}

		return result;
	}
	router = {
		HTMLImageElement: {
			...this.define_attrs('src','lowsrc','srcset'),
			currentSrc: desc => ({
				configurable: true,
				enumerable: true,
				get: wrap_function(desc.get, (target, that, args) => {
					let result = Reflect.apply(target, that, args);
					result = this.client.tomp.url.unwrap_ez(result);
					return result;
				}),
			}),
		},
	};
};