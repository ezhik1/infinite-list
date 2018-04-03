function Message( opts ){
	this.template = null;

	var tombstoneText = '<span class="place-holder-text"></span>';
	if( opts === 'tombstone' ){
		opts = {}
		opts.id        = '';
		opts.image     = '';
		opts.user      = tombstoneText;
		opts.timeStamp = tombstoneText;
		opts.content   = tombstoneText.repeat( 3 );
	}else{
		opts.id        = opts.id ? opts.id : '';
		opts.image     = opts.image ? opts.image : '';
		opts.user      = opts.user ? opts.user : '';
		opts.timeStamp = opts.timeStamp ? opts.timeStamp : '';
	}

	this.initialize( opts );
}


Message.prototype.initialize = function( opts ){

	var imageTemplate = '<img class="user-image';
	var hasTombstone = ''
	if( opts.image != ''){
		imageTemplate += '" src="' + opts.image + '" alt="">';

	}else{
		hasTombstone = '-tombstone';
		imageTemplate += hasTombstone + '" alt="">';
	}

	this.template = '<div data-id="' + opts.id + '" class="row message-container slide-wrapper">\
		<div class="col-sm-2 col-3 image-container' + hasTombstone + '">' + imageTemplate + '</div>\
		<div class="col-sm-10 col-9 message-user-container' + hasTombstone + '">\
			<h5 class="user-name">' + opts.user + '</h5>\
			<h6 class="time-stamp">' + opts.timeStamp + '</h6>\
		</div>\
	</div>\
	<div class="row">\
		<div class="col-sm-12">\
			<p class="message-content">' + opts.content + '</p>\
		</div>\
	</div>'

	return this.template;
}