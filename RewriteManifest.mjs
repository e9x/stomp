import { js_types } from "./RewriteHTML.mjs";

export class RewriteManifest {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(code, url, key){
		try{
			var manifest = JSON.parse(code);
		}catch(err){
			console.error(err);
			return code;
		}

		if('scope' in manifest){
			const resolved = new URL(manifest.scope, url).href;
			manifest.scope = this.tomp.html.serve(resolved, url, key);
		}

		if('start_url' in manifest){
			const resolved = new URL(manifest.start_url, url).href;
			manifest.start_url = this.tomp.html.serve(resolved, url, key);
		}

		if('shortcuts' in manifest)for(let shortcut of manifest.shortcuts){
			const resolved = new URL(shortcut.url, url).href;
			shortcut.url = this.tomp.binary.serve(resolved, url, key);
		}

		if('icons' in manifest)for(let icon of manifest.icons){
			const resolved = new URL(icon.src, url).href;
			icon.src = this.tomp.binary.serve(resolved, url, key);
		}

		if('screenshots' in manifest)for(let screenshot of manifest.screenshots){
			const resolved = new URL(screenshot.src, url).href;
			screenshot.src = this.tomp.binary.serve(resolved, url, key);
		}

		if('protocol_handlers' in manifest)for(let icon of manifest.protocol_handlers){
			const resolved = new URL(app.url, url).href;
			app.url = this.tomp.binary.serve(resolved, url, key);
		}

		if('related_applications' in manifest)for(let app of manifest.related_applications){
			const resolved = new URL(app.url, url).href;
			app.url = this.tomp.binary.serve(resolved, url, key);
		}

		return JSON.stringify(code);
	}
	unwrap(code, url, key){
		return code;
	}
	serve(serve, url, key){
		if(serve.startsWith('data:'))return serve;
		return this.tomp.url.wrap(serve, key, 'manifest');
	}
};