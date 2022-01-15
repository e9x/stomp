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
	static generate_key(){
		const
			xor = ~~(Math.random() * 0xFF),
			// 0-5
			frequency = Math.min(~~(Math.random() * 0xF), 5);

		// SHORT xor
		// CHAR frequency
		return String((xor << 4) + frequency);
	}
	static wrap(input, key){
		key = parseInt(key);

		const xor = key >> 0x4, frequency = key & 0xF;
		var result = '';
		
		for(let i = 0; i < input.length; i++){
			if(i % frequency == 0){
				result += String.fromCharCode(input[i].charCodeAt() ^ xor);
			}else{
				result += input[i];
			}
		}

		return result;
	}
	static unwrap(input, key){
		return this.wrap(input, key);
	}
};

// todo...
export class RC4Codec extends CodecInterface {
	
};