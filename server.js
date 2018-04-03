var express = require( 'express' );
var http    = require( 'http' );
var https   = require( 'https' );
var path    = require( 'path' );
var request = require( 'request' );

var app        = express();
var bodyParser = require( 'body-parser' );

app.use( bodyParser.urlencoded() );
app.use( bodyParser.json() );

//allows to put, patch, and delete http verbs
var methodOverride = require( 'method-override' );
app.use( methodOverride( 'X-HTTP-Method-Override' ));

//sets up a static file server that points to the client /lib directory
app.use( '/',express.static( path.join( __dirname, '/' )));
app.use( '/lib',express.static( path.join( __dirname, '/lib' )));
app.use( '/js',express.static( path.join( __dirname, '/js' )));
app.use( '/css',express.static( path.join( __dirname, '/css' )));
app.use( '/images',express.static( path.join( __dirname, '/images' )));
app.use( '/fonts',express.static( path.join( __dirname, '/fonts' )));

//-- for deployment
var port = process.env.PORT || 3000;
var host = '0.0.0.0'

var server = app.listen( ( port ), function(){
	console.log( 'Tacos be happening on port ----> [ ' + port + ' ]' );
});

var routes = require( './config/routes.js' )( app, path, http, https, request );
