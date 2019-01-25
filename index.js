#!/usr/bin/env node

const { bold, green, red, underline, yellow } = require( 'chalk' );
const { exec } = require( 'child_process' );
const yarn = require( '@yarnpkg/lockfile' );
const path = require( 'path' );
const fs = require( 'fs' );

const pkgs = new Set();

function fetchPackages() {
	try {
		const package = require( path.resolve( process.cwd(), 'package-lock.json' ) );
		parse( 'root', package ); 
	} catch(e) {
		try {
			const package = path.resolve( process.cwd(), 'yarn.lock' );
			const lockfile = fs.readFileSync(package, 'utf8');
			parseYarn( lockfile );
		} catch(e) {
			throw('Your lockfile is missing.');
		}
	}
}

function parse ( name, { dependencies: deps, version } ) {
	if ( 'root' !== name ) {
		pkgs.add( `${name}@${version}` );
	}

	if ( 'object' !== typeof deps ) {
		return;
	}

	Object.keys( deps ).forEach( dep => parse( dep, deps[ dep ] ) );
}

function parseYarn ( lockfile ) {
	const re = /([^\s~\'!()*":^]+)@\^?[0-9]/g;
	const lock = yarn.parse(lockfile).object;
	var match, name, version;

	Object.keys( lock ).forEach( package => {
		while ( match = re.exec( package ) ) {
			name = match[1];
			version = lock[package].version;
			if ( name && version ) {
				pkgs.add( `${name}@${version}` );
			}
		}
	 })
}

function getAuthors( { author, contributors, maintainers, ...yo } ) {
	if ( 'string' === typeof author && author.trim().length ) {
		const output = author.replace( / *\([^\)]+\)/, '' ); // Remove author URLs.
		if ( output.includes( 'Sindre Sorhus' ) ) {
			return `${output}  ${yellow( '<== It\'s you-know-who again!' )}`;
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

	return red.bold( 'Who even wrote this???' );
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
		return `${years} years, ${days} days  ${red.bold( '<== Pretty darn old in JS years!' )}`;
	}

	return `${years} years, ${days} days`;
}

function npmExec ( command ) {
	return new Promise( ( resolve, reject ) => {
		exec( `npm ${command} --prefix "${process.cwd()}"`, ( err, stdout ) => {
			if ( err ) {
				reject( err );
				return;
			}

			resolve( stdout );
		} );
	} );
}

// Get started.
try {
	fetchPackages();
	console.log( bold( '\nHow much do you know about your dependencies? Let\'s pick one at random.\n' ) );

	// Get random item from set.
	const winner = [ ...pkgs ][ Math.floor( Math.random() * pkgs.size ) ];

	console.log( `OK. I chose ${green.bold( winner )} from ${yellow.bold( pkgs.size )} deduped packages!` );
	console.log( 'Let me tell you a little bit about this package...\n' );

	// Get info about the package from npm.
	const npmView = npmExec( `view ${winner} --json` );
	const npmTree = npmExec( `ls ${winner.substr( 0, winner.lastIndexOf( '@' ) )}` );

	npmView 
		.then( info => {
			const {
				description,
				name,
				homepage,
				time: { created, modified },
				...crap
			} = JSON.parse( info );

			console.log( `${bold( name )}\n${new Array( name.length ).fill( '=' ).join( '' )}` );
			console.log( description, '\n' );
			homepage && console.log( underline( homepage ), '\n' );
			console.log( `Authors: ${getAuthors( crap )}` );
			console.log( `License: ${getLicense( crap )}` );
			console.log( `Package age: ${getDateDiff( created )}` );
			console.log( `Version age: ${getDateDiff( modified )}\n` );

			console.log( bold( 'Here\'s how this package is used in your project:\n' ) );

			return npmTree
				.then( tree => console.log( tree.trim() ) )
				.catch();
		} )
		.catch( () => console.error( red.bold( `I'm sorry, I couldn't find any information about ${winner}.\n` ) ) )
		.then( () => console.log( '\nHave a nice day! Run this again to learn about another package!' ) );
} catch(e) {
	 console.error( red.bold( `\n${e}` ) );
}