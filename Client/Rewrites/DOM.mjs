import { Rewrite } from '../Rewrite.mjs';
import { global as g } from '../../Global.mjs';
// https://github.com/webpack/webpack/issues/12960
const global = g;
import { bind_natives, getOwnPropertyDescriptors, native_proxies, Proxy, Reflect, wrap_function } from '../RewriteUtil.mjs';
import { TOMPElement } from '../../RewriteElements.mjs';

const { getAttribute, setAttribute, hasAttribute, removeAttribute, getAttributeNames } = global?.Element?.prototype || {};
const { localName } = getOwnPropertyDescriptors(global?.Element?.prototype || {});

class TOMPElementDOMAttributes {
	#node;
	constructor(node){
		this.#node = node;
	}
	get(name){
		return Reflect.apply(getAttribute, this.#node, [ name ]);
	}
	set(name, value){
		return Reflect.apply(setAttribute, this.#node, [ name, value ]);
	}
	has(name){
		return Reflect.apply(hasAttribute, this.#node, [ name ]);
	}
	delete(name){
		return Reflect.apply(removeAttribute, this.#node, [ name ]);
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
	[Symbol.iterator](){
		return this.entries();
	}
};

class TOMPElementDOM extends TOMPElement {
	#node;
	constructor(node){
		super();
		this.#node = node;
		this.attributes = new TOMPElementDOMAttributes(this.#node);
	}
	get type(){
		return Reflect.apply(localName.get, this.#node, []);
	}
	set type(value){
		this.node.remove();
		const replacement = document.createElement(value);
		replacement.append(...this.node.children);

		for(let [attribute,value] of this.attributes){
			replacement.setAttribute(attribute, value);
		}

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
	sync(){
		
	}
	get parent(){
		return new TOMPElementDOM(this.parentNode);
	}
};

export class DOMRewrite extends Rewrite {
	style_proxy(style){
		const proxy = new Proxy(style, {
			get: (target, prop, receiver) => {
				let result = Reflect.get(target, prop, receiver);
				
				if(typeof result == 'string' && prop != 'cssText'){
					result = this.client.tomp.css.unwrap(result, this.client.location.proxy, 'value');
				}
				
				return result;
			},
			set: (target, prop, value) => {
				if(typeof value == 'string' && prop != 'cssText'){
					value = this.client.tomp.css.wrap(value, this.client.location.proxy, 'value');
				}
				
				const result = Reflect.set(target, prop, value);
				return result;
			},
			getOwnPropertyDescriptor: (target, prop) => {
				const desc = Reflect.getOwnPropertyDescriptor(target, prop);

				if(typeof desc.value == 'string'){
					desc.value = this.client.tomp.css.wrap(desc.value, this.client.location.proxy, 'value');
				}

				return desc;
			}
		});

		native_proxies.set(proxy, style);

		return proxy;
	}
	style_work(){
		const { cssText } = getOwnPropertyDescriptors(CSSStyleDeclaration.prototype);

		bind_natives(CSSStyleDeclaration.prototype);

		Reflect.defineProperty(CSSStyleDeclaration.prototype, 'cssText', {
			get: wrap_function(cssText.get, (target, that, args) => {
				let result = Reflect.apply(target, that, args);
				result = this.client.tomp.css.unwrap(result, this.client.location.proxy, 'declarationList');
				return result;
			}),
			set: wrap_function(cssText.set, (target, that, [ value ]) => {
				value = this.client.tomp.css.wrap(value, this.client.location.proxy, 'declarationList');
				const result = Reflect.apply(target, that, [ value ]);
				return result;
			}),
			configurable: true,
			enumerabe: true,
		});
		
		CSSStyleDeclaration.prototype.getPropertyValue = wrap_function(CSSStyleDeclaration.prototype.getPropertyValue, (target, that, [ property ]) => {
			let result = Reflect.apply(target, that, [ property ]);
			result = this.client.tomp.css.unwrap(result, this.client.location.proxy, 'value');
			return result;
		});
		
		CSSStyleDeclaration.prototype.setProperty = wrap_function(CSSStyleDeclaration.prototype.setProperty, (target, that, [ property, value, priority ]) => {
			value = this.client.tomp.css.wrap(value, this.client.location.proxy, 'value');
			const result = Reflect.apply(target, that, [ property, value, priority ]);
			return result;
		});
	}
	anchor_work(){
		const { href } = getOwnPropertyDescriptors(HTMLAnchorElement.prototype);

		for(let prop of ['port','host','hostname','pathname','origin','search','protocol','hash','username','password']){
			const desc = Reflect.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, prop);
			
			Reflect.defineProperty(HTMLAnchorElement.prototype, prop, {
				get: desc.get ? wrap_function(desc.get, (target, that, args) => {
					const the_href = Reflect.apply(href.get, that, []);
					const url = new URL(this.client.tomp.url.unwrap_ez(new URL(the_href, this.client.location.proxy), this.client.location.proxy));
					return url[prop];
				}) : undefined,
				set: desc.set ? wrap_function(desc.set, (target, that, [ value ]) => {
					const the_href = Reflect.apply(href.get, that, []);
					const url = new URL(this.client.tomp.url.unwrap_ez(new URL(the_href, this.client.location.proxy), this.client.location.proxy));
					url[prop] = value;
					Reflect.apply(href.set, that, [ this.client.tomp.url.wrap(url.href, this.client.location.priority) ]);
					return value;
				}) : undefined,
			});
		}
	}
	attr_work(){
		const { value } = getOwnPropertyDescriptors(Attr.prototype);

		Reflect.defineProperty(Attr.prototype, 'value', {
			get: wrap_function(value.get, (target, that, args) => {
				const node = that.ownerElement;
				const name = that.name;
				let result = Reflect.apply(target, that, args);
				result = this.process_get_attribute(that.ownerElement, name, false, result);
				return result;
			}),
			set: wrap_function(value.set, (target, that, [ value ]) => {
				const node = that.ownerElement;
				const name = that.name;
				value = String(value);
				value = this.process_set_attribute(node, name, false, value);
				return Reflect.apply(target, that, [ value ]);
			}),
		});
	}
	work(){
		this.style_work();
		this.attr_work();
		this.anchor_work();
		
		for(let key of Object.getOwnPropertyNames(global)){
			for(let ab of this.client.tomp.elements.abstract){
				if(!this.client.tomp.elements.test_name(key, ab.name.class)){
					continue;
				}

				const cls = global[key];

				if(!cls.prototype){
					this.client.tomp.log.warn('Class', key, 'has no prototype.');
					continue;
				}

				if('attributes' in ab)for(let data of ab.attributes){
					for(let name of Object.getOwnPropertyNames(cls.prototype)){
						if(!this.client.tomp.elements.test_name(name, data.class_name || data.name)){
							continue;
						}
						
						const desc = Reflect.getOwnPropertyDescriptor(cls.prototype, name);
						
						Reflect.defineProperty(cls.prototype, name, {
							get: desc.get ? wrap_function(desc.get, (target, that, args) => {
								let result = Reflect.apply(target, that, args);
								if(result instanceof CSSStyleDeclaration)return this.style_proxy(result);
								result = this.process_get_attribute(that, name, true, result, key);
								return result;
							}) : undefined,
							set: desc.set ? wrap_function(desc.set, (target, that, [ value ]) => {
								value = String(value);
								value = this.process_set_attribute(that, name, true, value, key);
								return Reflect.apply(target, that, [ value ]);
							}) : undefined,
						});
					}
				}
			}
		}
		
		this.get_attribute = Element.prototype.getAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute ]) => {
			attribute = String(attribute).toLowerCase();
			let result = Reflect.apply(target, that, [ attribute ]);
			result = this.process_get_attribute(that, attribute, false, result, Object.getPrototypeOf(that)[Symbol.toStringTag]);
			return result;
		});

		this.set_attribute = Element.prototype.setAttribute = wrap_function(Element.prototype.getAttribute, (target, that, [ attribute, value ]) => {
			attribute = String(attribute).toLowerCase();
			value = String(value);
			const result = Reflect.apply(target, that, [ attribute, this.process_set_attribute(that, attribute, false, value, Object.getPrototypeOf(that)[Symbol.toStringTag]) ]);
			return result;
		});
	}
	process_get_attribute(node, name, use_class, value, class_name){
		const element = new TOMPElementDOM(node);
		const result = this.client.tomp.elements.get_attribute(element, this.client.location.proxy, name, use_class, value, class_name);

		element.sync();
		
		if(result == undefined)return null;
		else return result;
	}
	process_set_attribute(node, name, use_class, value, class_name){
		const element = new TOMPElementDOM(node);
		const result = this.client.tomp.elements.set_attribute(element, this.client.location.proxy, name, use_class, value, class_name);
		element.sync();
		return result;
	}
};