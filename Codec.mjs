// interface for wrap/unwrap is
// input, crytographic key
// eg for salts, seeds
// per client basis

export class CodecInterface {
	static generate_key(){
		throw new Error('generate_key() not implemented');
	}
	static wrap(input, key){
		throw new Error('wrap() not implemented');
	}
	static unwrap(input, key){
		throw new Error('unwrap() not implemented');
	}
};

export class PlainCodec extends CodecInterface {
	static generate_key(){
		return String(0);
	}
	static wrap(input, key){
		key = parseInt(key);
		return input;
	}
	static unwrap(input, key){
		key = parseInt(key);
		return input;
	}
};

// nature of xor allows wrap to be used both ways
export class XORCodec extends CodecInterface {
	static URI_max = 0x7F;
	static URI_min = 0x01;
	static generate_key(){
		const
			xor = ~~(Math.random() * (this.URI_max - 1)),
			// 0-5
			frequency = Math.min(~~(Math.random() * 0xF), 5);

		// SHORT xor
		// CHAR frequency
		return ((xor << 4) + frequency).toString(16);
	}
	static wrap(input, key){
		key = parseInt(key, 16);

		const xor = key >> 0x4, frequency = key & 0xF;
		var result = '';
		
		for(let i = 0; i < input.length; i++){
			if(i % frequency == 0){
				const char = (input[i].charCodeAt() ^ xor) + this.URI_min;
				result += String.fromCharCode(char);
			}else{
				result += input[i];
			}
		}

		return result;
	}
	static unwrap(input, key){
		key = parseInt(key, 16);

		const xor = key >> 0x4, frequency = key & 0xF;
		var result = '';
		
		for(let i = 0; i < input.length; i++){
			if(i % frequency == 0){
				const char = (input[i].charCodeAt() - this.URI_min) ^ xor;
				result += String.fromCharCode(char);
			}else{
				result += input[i];
			}
		}

		return result;
	}
};

// todo...
export class RC4Codec extends CodecInterface {
	
};