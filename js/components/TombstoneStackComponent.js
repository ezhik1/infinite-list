function TombstoneStack( Utils, target ){

	target = target ? target : '.tombstone-stack';

	this.messageCount = target.dataset.count ? target.dataset.count : 1;
	this.domElement = target || null;
	this.messages = [];
	this.Utils = Utils;
}

TombstoneStack.prototype.initialize = function(){

	this.createTombstones();
}

TombstoneStack.prototype.createTombstones = function(){

	for( var i = 0, len = this.messageCount; i < len; i++ ){
		var tombstone = this.createTombstone();
		this.messages.push( tombstone );
		this.domElement.appendChild( tombstone.domElement );
	}
}

TombstoneStack.prototype.createTombstone = function(){
	var message = new Message( 'tombstone' );

	message.domElement = document.createElement('div');
	message.domElement.className += 'message tombstone';
	message.domElement.innerHTML = message.template;
	message.domElement.classList.add( 'visible' );

	return message;
}
