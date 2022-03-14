const whitespace = /\s/;
const http_s_protocol = /^https?:\/\//;

export default class SearchBuilder {
	constructor(template){
		this.template = String(template);
	}
	query(input){
		input = String(input);

		if(input.includes('.') && !input.match(http_s_protocol)){
			return `http://${input}`;
		}else if(input.match(whitespace) || !input.match(http_s_protocol)) {
			return this.template.replace('%s', encodeURIComponent(input));
		}else{
			return input;
		}
	}
};