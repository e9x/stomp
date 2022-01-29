import { TOMP } from './TOMP.mjs';

const tomp = new TOMP({
	directory: '/',
	bare: '/',

});

const input = /*`
<script type='module' src='/assets/beta.1.js'></script>
` || */`
<!DOCTYPE HTML>
<html>
	<head>/>
		<meta name='description' content='Web access service' />
		<meta charset='utf-8' />
		<link rel='stylesheet' href='./assets/beta.css' />
		<style>
body {
	background: url('pretty.jpeg');
}
		</style>
	</head>
	<body style='background:url("better.png")'>
		<img src='./test' srcset='/272x92dp.png 1x, /272x92dp.png 2x'></img>
		<script src='../../../assets/beta.js'></script>
		<a href='click'>click</a>
		<script type='module' src='/assets/beta.1.js'></script>
		<script src='data:application/javascript,covered()'></script>
		<script>
if(location.host != 'www.sys32.dev'){
	console.warn('Location leak or proxy failure.');
}
		</script>
		<script type='fake' src='/assets/beta.-1.js'></script>
		<script type='fake'>alert("Won't alert.")</script>
	</body>
</html>
`;

const base = new URL('https://www.sys32.dev/');
const rewritten = tomp.html.wrap(input, base);
const unrewritten = tomp.html.unwrap(rewritten, base);

console.log(rewritten);
console.log('UNRW: ==========');
console.log(unrewritten);