export class HTMLRewriter {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(html, key){
		return html.replace(/<html.*?>/, match => `<script src=${JSON.stringify(this.tomp.prefix + 'script')}></script>`);
	}
	unwrap(html, key){
		return html;
	}
};