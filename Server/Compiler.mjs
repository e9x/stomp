import fs from 'fs';
import path from 'path';
import webpack from "webpack";
import serveStatic from 'serve-static';
import { fileURLToPath } from 'node:url';
import { CompilationErrors, CompileCommon } from '../WebpackUtil.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PublicDir = path.resolve(__dirname, 'public');

export const CompilationPath = path.join(PublicDir, 'main.js'); 

export const Static = serveStatic(PublicDir);

const frontend = webpack({
	...CompileCommon,
	entry: path.join(__dirname, '..', 'Client', 'Entry.mjs'),
	context: __dirname,
	output: {
		path: path.dirname(CompilationPath),
		filename: path.basename(CompilationPath),
	},
	plugins: [
		new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
	],
});

frontend.watch({}, (...args) => {
	if (!CompilationErrors(...args)) console.log('Successful build of backend.');
	else console.error('Failure building backend.');
});