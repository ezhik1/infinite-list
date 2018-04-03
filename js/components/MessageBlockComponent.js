function MessageBlock( Utils, target ){

	target = target ? target : '.message-block';

	this.messageCount = target.dataset.count ? target.dataset.count : 1;
	this.domElement = target || null;
	this.sum = null;
	this.rulers = [];
	this.messages = [];
	this.Utils = Utils;
}

MessageBlock.prototype.setupEventListeners = function(){
	window.addEventListener( 'resize', this.onWindowResize.bind( this ) );
}

MessageBlock.prototype.onWindowResize = function(){

	if( this.messages.length > 0 ){
		this.animateRulerHeightsByMessage();
	}
}

MessageBlock.prototype.initialize = function(){

	this.setupEventListeners();

	this.createMessages( function(){
		this.initRulers();
	}.bind(this));
}

MessageBlock.prototype.initRulers = function(){

	for( var i = 0, len = this.messages.length; i < len; i++ ){
		var ruler = this.createRuler();

		ruler.boxEl.appendChild( ruler.valueEl );
		this.messages[ i ].domElement.prepend( ruler.boxEl );
		this.messages[ i ].ruler = ruler;
		this.rulers.push( ruler );
	}
	var sum = this.createRuler();
	sum.boxEl = null;

	this.sum = {
		valueEl : sum.valueEl,
		domElement : document.createElement( 'span' )
	}
	this.sum.domElement.classList.add( 'animated-sum' );
	this.sum.domElement.appendChild( sum.valueEl );
	this.domElement.appendChild( this.sum.domElement );

	this.animateRulerHeightsByMessage();

}

MessageBlock.prototype.animateRulerHeightsByMessage = function(){

	var totalHeight = 0;

	// animate rulers
	for( var i = 0, len = this.messages.length; i < len; i++ ){
		var ruler = this.messages[ i ].ruler;
		var rulerHeight = this.messages[ i ].domElement.offsetHeight;

		ruler.boxEl.classList.add( 'visible' );
		totalHeight += rulerHeight;

		this.easeRuler( rulerHeight, ruler );
	}

	var sum = this.sum;
	// animate sum
	sum.domElement.classList.add( 'visible' );

	this.Utils.easeValues({from: 0, to: totalHeight, duration: 1500,
		execute: function( step ){
			sum.valueEl.innerHTML = 'Total:<br>' + Math.floor( step ) + ' px';
		}
	});
}

MessageBlock.prototype.easeRuler = function( value, ruler ){

	this.Utils.easeValues({from: 0, to: value, duration: 1500,
			execute: function( step ){
				ruler.boxEl.style.height = step + 'px';
				ruler.valueEl.innerHTML = Math.floor( step );
			}
		});
}

MessageBlock.prototype.createRuler = function(){

	var ruler = {
		boxEl : document.createElement( 'span' ),
		valueEl: document.createElement( 'span' )
	}

	ruler.valueEl.innerHTML = '0 px';
	ruler.valueEl.classList.add( 'value' );
	ruler.boxEl.classList.add( 'animated-ruler', 'row' );

	return ruler;
}

MessageBlock.prototype.animateRulerHeight = function(){

	var messagesHeight = this.getMessagesHeight();
}

MessageBlock.prototype.createMessages = function( callback ){

	var placeHolderText = [
		{ name: "Isaac Asimov", content: "I do not fear computers. I fear the lack of them."},
		{ name: "Carl Sagan", content: "Imagination will often carry us to worlds that never were. But without it we go nowhere."},
		{ name: "Malcom Gladwell", content: "It would be interesting to find out what goes on in that moment when someone looks at you and comes to all sorts of conclusions."},
		{ name: "Isaac Asimov", content: "The most exciting phrase to hear in science, the one that heralds new discoveries, is not 'Eureka!' (I've found it!), but 'That's funny...'"},
		{ name: "Isaac Asimov", content: "Life is pleasant. Death is peaceful. It's the transition that's troublesome."},
		{ name: "Isaac Asimov", content: "Never let your sense of morals get in the way of doing what's right."},
		{ name: "Isaac Asimov", content: "I do not fear computers. I fear the lack of them."},
		{ name: "Isaac Asimov", content: "Self-education is, I firmly believe, the only kind of education there is."},
		{ name: "Isaac Asimov", content: "If knowledge can create problems, it is not through ignorance that we can solve them."},
		{ name: "Isaac Asimov", content: "Writing, to me, is simply thinking through my fingers."}
	];
	var count = 0;
	for( var i = 0, len = this.messageCount; i < len; i++ ){

		var message = new Message({
			content: placeHolderText[ count ].content,
			timeStamp: this.Utils.timeSince( '2015-0' + (count + 1) + '-01T07:46:23Z' ) + ' ago',
			user: placeHolderText[ count ].name,
		});

		message.domElement = document.createElement('div');
		message.domElement.className += 'message';
		message.domElement.innerHTML = message.template;
		message.domElement.classList.add( 'visible' );
		this.messages.push( message );


		if( this.domElement ){
			this.domElement.appendChild( message.domElement );
		}
		count = ( count >= placeHolderText.length - 2 ) ? 0 : count+=1
	}

	callback();
}
