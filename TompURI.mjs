// encode %, ?, /
// use encodeURI notation: %0X

// Light-weight encoding for fields
// Created because all characters are expected to be within 1-127
export class TompURI {
	static chars = ['%','?','/',']/'];
	static encode(string){
		for(let char of this.chars){
			string = string.replaceAll(char, '%' + this.chars.indexOf(char).toString());
		}

		return string;
	}
	static decode(string){
		for(let char of this.chars){
			string = string.replaceAll('%' + this.chars.indexOf(char), char);
		}

		return string;
	}
};

// console.log(TompURI.encode('/okay?a=b'));
// console.log(TompURI.decode(TompURI.encode('/okay?a=b')));