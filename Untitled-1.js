
	wrap_innerHTML(value, url, element, wrap){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag))continue;
			
			if('content' in ab){
				let condition = true;

				if('condition' in ab.content){
					condition = ab.content.condition(value, url, element);
				}
				
				if(condition){
					const changed = this.abstract_type(value, url, element, ab.content, wrap);

					if(changed != undefined){
						return changed;
					}
				}
			}
		}

		if(wrap){
			return this.tomp.html.wrap(value, url, true);
		}else{
			return this.tomp.html.unwrap(value, url, true);
		}
	}
	wrap_textContent(value, url, element, wrap){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag))continue;
			
			if('content' in ab){
				let condition = true;

				if('condition' in ab.content){
					condition = ab.content.condition(value, url, element);
				}
				
				if(condition){
					const changed = this.abstract_type(value, url, element, ab.content, wrap);

					if(changed != undefined){
						return changed;
					}
				}
			}
		}

		return value;
	}
	abstract = [
		{
			name: {
				tag: /./,
				class: 'HTMLElement', // /HTML.*?Element/
			},
			attributes: [
				{ name: 'style', type: 'css', context: 'declarationList' },
				{ name: /^on.*?/, class_name: /[]/, type: 'js' },
				{
					name: /[]/,
					class_name: 'innerText',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
				{
					name: /[]/,
					class_name: 'outerText',
					type: 'custom',
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
				// see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/nonce
				{ name: 'nonce', type: 'delete' },
			],
		},
		{
			name: {
				tag: /[]/,
				class: /^HTML.*?Element$/
			},
			attributes: [
				{
					name: /[]/,
					class_name: 'text',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
			],
		},
		{
			name: {
				tag: /[]/,
				class: 'Node',
			},
			attributes: [
				{ name: /[]/, class_name: 'baseURI', type: 'url', service: 'html' },
				{
					name: /[]/,
					class_name: 'textContent',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
			],
		},
		{
			name: {
				tag: /[]/,
				class: 'Element',
			},
			attributes: [
				{
					name: /[]/,
					class_name: 'innerHTML',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_innerHTML(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_innerHTML(value, url, element, false),
				},
				{ name: /[]/, class_name: 'outerHTML', type: 'html', fragment: true },
			],
		},
		{
			name: {
				tag: 'form',
				class: 'HTMLFormElement',
			},
			attributes: [
				// name must be a string for allow_notexist to work
				{ name: 'action', type: 'url', service: 'form', allow_notexist: true, allow_empty: true },
			],
		},
		{
			name: {
				tag: 'link',
				class: 'HTMLLinkElement',
			},
			attributes: [
				{
					name: 'href',
					type: 'delete',
					wrap: this.link_wrap('href'),
				},
				{
					name: 'rel',
					type: 'delete',
					wrap: this.link_wrap('rel'),
				},
				{
					name: 'as',
					type: 'delete',
					wrap: this.link_wrap('as'),
				},
			],
		},
		
	];
	link_wrap(name){
		return (value, url, element) => {
			let href;
			
			// console.log('run link');

			if(name === 'href'){
				href = value;
			}else if(element.attributes.has('data-tomp-href')){
				href = element.attributes.get('data-tomp-href');
			}else if(element.attributes.has('href')){
				href = element.attributes.get('href');
			}else{
				// console.log('where is href in', name);
				return value;
			}

			let as;
			
			if(name === 'as'){
				as = value;
			}else if(element.attributes.has('data-tomp-as')){
				as = element.attributes.get('data-tomp-as');
			}else if(element.attributes.has('as')){
				as = element.attributes.get('as');
			}else{
				// return value;
				as = undefined;
			}

			let rel;
			
			if(name === 'rel'){
				rel = value;
			}else if(element.attributes.has('data-tomp-rel')){
				rel = element.attributes.get('data-tomp-rel');
			}else if(element.attributes.has('rel')){
				rel = element.attributes.get('rel');
			}else{
				// console.log('where is rel in', name);
				return value;
			}

			const resolved = new URL(href, url).href;
			const wrapped = this.wrap_link(url, resolved, rel, as);

			if(wrapped === undefined){
				element.attributes.delete('href');
			}else{
				if(name === 'href'){
					value = wrapped;
				}else{
					element.attributes.set('href', wrapped);
				}
			}

			element.attributes.set('data-tomp-href', href);
			
			return value;
		};
	}
	wrap_link(url, resolved, rel, as){
		switch(rel){
			case'prefetch':
			case'preload':
				switch(as){
					case'style':
						return this.tomp.css.serve(resolved, url);
					case'worker':
					case'script':
						return this.tomp.js.serve(resolved, url);
					case'object':
					case'document':
						return this.tomp.html.serve(resolved, url);
					default:
						return this.tomp.binary.serve(resolved, url);
				}
				break;
			case'manifest':
				return this.tomp.manifest.serve(resolved, url);
			case'alternate':
			case'amphtml':
			// case'profile':
				return this.tomp.html.serve(resolved, url);
			case'stylesheet':
				return this.tomp.css.serve(resolved, url);
			default:
				// this.tomp.log.warn('unknown rel', element.attributes.get('rel'));
				return this.tomp.binary.serve(resolved, url);
		}
	}

	abstract_type(value, url, element, data, wrap){
		if(typeof data.wrap == 'function' && wrap == true){
			return data.wrap(value, url, element);
		}else if(typeof data.unwrap == 'function' && wrap == false){
			return data.unwrap(value, url, element);
		}

		switch(data.type){
			case'delete':
				return null;
				break;
			case'css':
				if(wrap){
					return this.tomp.css.wrap(value, url, data.context);
				}else{
					return this.tomp.css.unwrap(value, url, data.context);
				}
			case'js':
				if(wrap){
					return this.tomp.js.wrap(value, url);
				}else{
					return this.tomp.js.unwrap(value, url);
				}
			case'html':
				if(wrap){
					return this.tomp.html.wrap(value, url, data.fragment);
				}else{
					return this.tomp.html.unwrap(value, url, data.fragment);
				}
			case'url':
				switch(data.service){
					case'js':
					case'css':
					case'manifest':
					case'form':
					case'binary':
					case'html':
						if(wrap){
							return this.tomp[data.service].serve(new URL(value, url), url);
						}else{
							return this.tomp[data.service].unwrap_serving(value, url).toString();
						}
					default:
						this.tomp.log.warn('unknown service:', data.service);
						if(wrap){
							return this.tomp.url.wrap(new URL(value, url), data.service);
						}else{
							return this.tomp.url.unwrap_ez(value, url).toString();
						}
				}
		}
		
		return value;
	}