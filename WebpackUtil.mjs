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

export const Development = process.argv.includes('--debug');
export const Production = !Development;
export const CompileCommon = Production ? {
	mode: 'production',
} : {
	mode: 'development',
	devtool: 'inline-source-map',
};