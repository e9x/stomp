export function CompilationErrors(error, stats = { compilation: { errors: [] } }){
	var had_error = false;
	
	if(error){
		had_error = true;
		console.error(error);
	}
	
	for(let error of stats.compilation.errors){
		console.error(error);
	}
	
	return had_error;
}