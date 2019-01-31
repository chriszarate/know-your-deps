#!/usr/bin/env node

const { bold, green, red, underline, yellow } = require( 'chalk' );
const { exec } = require( 'child_process' );
const yarn = require( '@yarnpkg/lockfile' );
const path = require( 'path' );
const fs = require( 'fs' );

const pkgs = new Set();

const npmLockPath = path.resolve( process.cwd(), 'package-lock.json' );
const yarnLockPath = path.resolve( process.cwd(), 'yarn.lock' );

let isNpm = false;

function fetchPackages() {
	if ( fs.existsSync( npmLockPath ) ) {
		const npmLock = require( npmLockPath );
		isNpm = true;
		parse( 'root', npmLock );
	}

	if ( fs.existsSync( yarnLockPath ) ) {
		const yarnLock = fs.readFileSync( yarnLockPath, 'utf8' );
		return parseYarn( yarn.parse( yarnLock ) );
	}

	console.error( red.bold( 'Could not find package-lock.json or yarn.lock.' ) );
	process.exit( 1 );
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

function parseYarn ( { object } ) {
	Object.keys( object ).forEach( dep => pkgs.add( dep.replace( /@\^/, '@' ) ) );
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

function getUsagePromise ( winner ) {
	const name = winner.substr( 0, winner.lastIndexOf( '@' ) );

	if ( isNpm ) {
		return npmExec( `ls ${name}` )
			.then( tree => tree.trim() )
			.catch( () => red.bold( 'Could not get usage information from NPM.' ) );
	}

	return yarnExec( `why ${name} --json` )
		.then( info => info.trim().split( /[\n\r]/ ).map( line => JSON.parse( line ) ) )
		.then( lines => {
			const list = lines.find( ( { type } ) => 'list' === type );
			if ( list ) {
				return list.data.items.map( item => item.replace( /"/g, '' ).replace( /#/g, ' => ' ) ).join( '\n' );
			}

			return `${name} is a direct dependency of the project.`;
		} )
		.catch( (err) => err );
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

function yarnExec ( command ) {
	return new Promise( ( resolve, reject ) => {
		exec( `yarn ${command} --cwd "${process.cwd()}"`, ( err, stdout ) => {
			if ( err ) {
				reject( err );
				return;
			}

			resolve( stdout );
		} );
	} );
}

// Get started.
fetchPackages();

console.log( bold( '\nHow much do you know about your dependencies? Let\'s pick one at random.\n' ) );

// Get random item from set.
const winner = [ ...pkgs ][ Math.floor( Math.random() * pkgs.size ) ];

console.log( `OK. I chose ${green.bold( winner )} from ${yellow.bold( pkgs.size )} deduped packages!` );
console.log( 'Let me tell you a little bit about this package...\n' );

// Get info about the package usage from npm or yarn.
const usagePromise = getUsagePromise( winner );

// Get info about the package from npm.
npmExec( `view ${winner} --json` )
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
	} )
	.catch( () => console.error( red.bold( `I'm sorry, I couldn't find any information about ${winner}.\n` ) ) )
	.then( () =>	usagePromise.then( console.log ) )
	.then( () => console.log( '\nHave a nice day! Run this again to learn about another package!' ) );
