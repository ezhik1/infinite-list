module.exports = function ( app, path, http, https, request ) {

	//-- fetch index
	app.get( "/", function ( req, res ){
		res.sendFile( 'index.html', { root: path.join(__dirname, '../') } );
	});

	//-- handle image requests
	app.get( '/images:image', function( req, res ){

		var url   = 'http://message-list.appspot.com';
		var image = req.params.image;
		var path  = url + image;

		request( path ).pipe( res );
	});

	//-- handle message requests
	app.get( '/messages/:limit?/:token?', function( req, res ){
		var url   = 'http://message-list.appspot.com/messages?';
		var limit = '&limit=' + req.params.limit;
		var token = '';

		if( req.params.token ){
			token = 'pageToken=' + req.params.token;
			url   += token;
		}
		url += limit

		http.get( url, function( response ){

			var chunks = [];
			response.on( 'data', function (chunk) {
				chunks.push( chunk ) ;
			});
			response.on( 'end', function () {
				console.log( 'Messages fetched...relaying. Continuation token: ' + token );

				//--Any sequences in the Buffers that aren't valid as UTF-8 will be lost and replaced by � at this point.
				//--body += chunk;

				//-- So, leave chunks as Buffers, concat, and convert to string.
				body = Buffer.concat( chunks ).toString();
				res.status( response.statusCode ).send( body );
			});
		});
	});
};

//--max data size appears to be 3000

// id:       0
// name:     shakespeare
// content:  Her pretty looks have been mine enemies, And therefore have I invoked thee for her seal, and meant thereby Thou shouldst print more, not let that pine to aggravate thy store Buy terms divine in selling hours of dross Within be fed, without be rich no more So shalt thou feed on Death, that feeds on men, And Death once dead, there's no more to shame nor me nor you.
// uploaded: 2015-02-01T07:46:23Z

// id:       3000,
// name:     shakespeare
// content:  To stand in thy glass, and there And made myself a motley to the heart Of bird of flower, or shape, which it was But flowers distill'd though they be outstripp'd by every pen, Reserve them for my love alone.
// uploaded: 2015-04-05T21:17:23Z
