const { bold, green, red, underline, yellow } = require( 'chalk' );
const { exec } = require( 'child_process' );

const pkgs = new Set();

function parse ( name, { dependencies: deps, version } ) {
	if ( 'root' !== name ) {
		pkgs.add( `${name}@${version}` );
	}

	if ( 'object' !== typeof deps ) {
		return;
	}

	Object.keys( deps ).forEach( dep => parse( dep, deps[ dep ] ) );
}

function getAuthors( { author, contributors, maintainers, ...yo } ) {
	if ( 'string' === typeof author && author.trim().length ) {
		const output = author.replace( /\(http[^\)]+\)/, '' ); // Remove author URLs.
		if ( output.includes( 'Sindre Sorhus' ) ) {
			return `${output}  ${yellow( '<== It\'s you know who again!' )}`;
		}

		return output;
	}

	if ( Array.isArray( contributors ) && contributors.length ) {
		return contributors.join( ', ' );
	}

	if ( Array.isArray( maintainers ) && maintainers.length ) {
		return maintainers.join( ', ' );
	}
	console.log( author, contributors, maintainers, yo );

	return red.bold( 'It' );
}

function getLicense( { license, licenses } ) {
	if ( Array.isArray( licenses ) && licenses.length ) {
		return licenses.map( ( { type } ) => type ).join( ', ' );
	}

	if ( !license ) {
		return red.bold( 'None!?' );
	}

	if ( ! ( [ 'MIT', 'ISC' ].includes( license ) ) ) {
		return `${license}  ${yellow( '<== Oooh, rebel!' )}`;
	}

	return license;
}

function getDateDiff ( date ) {
	const date1 = new Date( date ).getTime();
	const date2 = new Date().getTime();

	const diffInDays = Math.ceil( ( date2 - date1 ) / ( 1000 * 60 * 60 * 24 ) );

	if ( diffInDays < 365 ) {
		return `${diffInDays} days`;
	}

	const years = Math.floor( diffInDays / 365 );
	const days = diffInDays % 365;

	if ( years > 3 ) {
		return `${years} years, ${days} days ${red.bold( '<== Pretty darn old in JS years!' )}`;
	}

	return `${years} years, ${days} days`;
}

// Get started.
console.log( '\nHow much do you know about your dependencies? Let\'s pick one at random.\n' );

// Parse dependency tree.
parse( 'root', require( './package-lock.json' ) );

// Get random item from set.
const winner = [ ...pkgs ][ Math.floor( Math.random() * pkgs.size ) ];

console.log( `I chose ${green.bold( winner )} from ${yellow.bold( pkgs.size )} unique packages!` );
console.log( bold( 'Let me tell you a little bit about this package...\n' ) );

// Get info about the package from npm.
exec( `npm view ${winner} --json`, ( err, stdout ) => {
	if ( err ) {
		console.error( red.bold( `I'm sorry, I couldn't find any information about ${winner}.\n` ) );
		return;
	}

	const {
		description,
		name,
		homepage,
		time: { created, modified },
		...crap
	} = JSON.parse( stdout );

	console.log( `${bold( name )}\n${new Array( name.length ).fill( '=' ).join( '' )}` );
	console.log( description, '\n' );
	homepage && console.log( underline( homepage ), '\n' );
	console.log( `Authors: ${getAuthors( crap )}` );
	console.log( `License: ${getLicense( crap )}` );
	console.log( `Package age: ${getDateDiff( created )}` );
	console.log( `Version age: ${getDateDiff( modified )}\n` );
} );
