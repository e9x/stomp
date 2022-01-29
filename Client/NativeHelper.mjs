import { isIdentifierChar, isIdentifierStart } from 'acorn';

export class NativeHelper {
	constructor(){
		this.calculate();
	}
	calculate(){
		const specimen = Object.toString();
		const name = 'Object';
		const occurs = specimen.indexOf(name);
		this.left = specimen.slice(0, occurs);
		this.right = specimen.slice(occurs + name.length);
	}
	valid_identifier(string){
		/* astral = ecmaVersion >= 6 */
		for(let i = 0; i < string.length; i++){
			if(i == 0 && !isIdentifierStart(string.charCodeAt(0), true))return false;
			
			if(!isIdentifierChar(string[i], true))return false;
		}
	}
	is_native(string){
		const left = string.indexOf(this.left);
		if(left != 0)return false;
		const right = string.indexOf(this.right);
		let name = string.slice(this.left.length, right);
		if(name.startsWith('get ') || name.startsWith('set '))name = name.slice(4);
		if(!this.valid_identifier(name))return false;
		return true;
	}
};