function AnimatedMessageComponent( Utils, target ){

	target = target ? target : null;

	this.domElement = target;
	this.messagesCount = 12;
	this.sentinel = null;
	this.messages = [];

	//-- a set of useful functions
	this.Utils = Utils;

	//-- bind
	this.grow = this.grow.bind(this);
	this.scroll = this.scroll.bind(this);
	this.initialize = this.initialize;
}


AnimatedMessageComponent.prototype.initialize = function(){

	// this.setupEventListeners();

	//create sentinel element
	this.initSentinel();

	this.initViewPortShadow();

	// create list of messages
	this.createMessages();

	var direction = this.domElement.dataset.direction;

	if( direction === 'forward' ){
		this.grow();
	}
	if( direction === 'reverse' ){
		this.shrink();
	}
	if( direction === 'scroll' ){
		this.scroll();
	}


}
// AnimatedMessageComponent.prototype.setupEventListeners = function(){

//     window.addEventListener( 'resize', this.onWindowResize.bind( this ));

// }

// AnimatedMessageComponent.prototype.onWindowResize = function(){
// 	this.domElement.offsetWidth = this.domElement.offsetWidth;
// }

AnimatedMessageComponent.prototype.animatedNode = function(){

	return {
		domNode: null,
		hasStarted: false,
		hasFinished: false
	}
}

AnimatedMessageComponent.prototype.initViewPortShadow = function(){

	this.viewportShadow = this.animatedNode();
	this.viewportShadow.domNode = document.createElement( 'span' );
	this.viewportShadow.domNode.innerHTML = 'Viewport';
	this.viewportShadow.domNode.classList.add( 'animated-shadow' )
	this.domElement.prepend( this.viewportShadow.domNode );

}

AnimatedMessageComponent.prototype.initSentinel = function(){

	this.sentinel = this.animatedNode();
	this.sentinel.domNode = document.createElement( 'span' );
	this.sentinel.domNode.innerHTML = 'Sentinel';
	this.sentinel.domNode.classList.add( 'animated-sentinel', 'row' )
	this.domElement.appendChild( this.sentinel.domNode );

}

AnimatedMessageComponent.prototype.createMessages = function( amount ){

	amount = amount ? amount : this.messagesCount;

	for( var i = 0, len = amount; i < len; i++ ){
		var message = this.createMessage();
		this.domElement.appendChild( message.domNode );
		this.messages.push( message );
	}
}

AnimatedMessageComponent.prototype.createMessage = function(){

	var message = this.animatedNode();

	var messageNode = document.createElement( 'span' );
	messageNode.classList.add( 'animated-message','row' );

	messageNode.innerHTML = '\
		<span class="col-lg-1 col-md-1 col-sm-1 col-1 user-image-col">\
			<img class="user-image">\
		</span>\
		<span class="message-content col-lg-11 col-md-11 col-sm-11 col-11">\
			<span class="message-line"></span>\
			<span class="message-line"></span>\
			<span class="message-line"></span>\
		</span>'

	message.domNode = messageNode;

	return message;
}

AnimatedMessageComponent.prototype.scroll = function(){

	this.createMessages( 12 );

	var sentinel = this.sentinel;
	var messages = this.messages;
	var viewportShadow = this.viewportShadow;
	var swapBlockLength = this.messages.length / 3;
	var stepDuration = 1000;
	var messageOffsetFrom = 0;
	var messageOffsetTo = messageOffsetFrom + messages.length / 3;
	var marginOffset = parseFloat( window.getComputedStyle( messages[ 0 ].domNode ).marginTop );
	var swapBlockHeight = 0;
	var swapBlockStride = ( messages[ 0 ].domNode.offsetHeight + marginOffset ) * swapBlockLength;
	var cycle = 0;
	var continuous = true;

	var animate = animate.bind( this );
	var resetStream = resetStream.bind( this );

	animate();

	function animate(){
		this.Utils.easeValues([
			// scroll viewport down list
			{ from: swapBlockHeight , to:  swapBlockHeight + swapBlockStride , duration: stepDuration,
				execute: function( step ){
					viewportShadow.domNode.style.transform = 'translateY('  +  step + 'px)';
				}
			},
			// move block of messages back in play
			{ from: 1 , to: 0.3, duration: stepDuration,
				execute: function( step ){
					for( var i = messageOffsetFrom, len = messageOffsetTo; i < len; i++ ){
						messages[ i ].domNode.style.opacity = step;
					}
				}
			},
			{ from: 0, to: 1, duration: 0,
				execute: function( step ){
					if( cycle >= 1 ){
						resetStream();
						return
					}

					swapBlockHeight += swapBlockStride;
					messageOffsetFrom += swapBlockLength;
					messageOffsetTo = messageOffsetFrom + messages.length / 3;
					cycle++

					if( continuous ){
						animate();
					}
					return
				}
			}
		]);
	}
	function resetStream(){

		this.Utils.easeValues([
			{ from: swapBlockStride * 2, to: 0, duration: stepDuration,
				execute( step ){
					viewportShadow.domNode.style.transform = 'translateY(' +  step + 'px)';

					var normalized =  (step / ( swapBlockStride * 2 ));

					for( var i = 0, len = messageOffsetTo; i < len; i++ ){

						//grow from 0.3 - 1
						messages[ i ].domNode.style.opacity = 1 - ( 0.7 * normalized );
					}
				}
			},
			// stall
			{ from: 0 , to: 1, duration: stepDuration,
				execute: function( step ){

				}
			},
			// reset values and restart animation
			{ from: 0, to: 1, duration: 0,
				execute: function( step ){

					swapBlockHeight = 0;
					messageOffsetFrom = 0;
					messageOffsetTo = messageOffsetFrom + messages.length / 3;
					cycle = 0;

					if( continuous ) {
						animate();
					}
					return
				}
			}
		]);
	}

}

AnimatedMessageComponent.prototype.grow = function(){


	var sentinel = this.sentinel;
	var messages = this.messages;
	var viewportShadow = this.viewportShadow;
	var swapBlockLength = this.messages.length / 3;
	var stepDuration = 1000;
	var messageOffsetFrom = 0;
	var messageOffsetTo = messageOffsetFrom + messages.length / 3;
	var marginOffset = parseFloat( window.getComputedStyle( messages[ 0 ].domNode ).marginTop );
	var swapBlockHeight = 0;
	var swapBlockStride = ( messages[ 0 ].domNode.offsetHeight + marginOffset ) * swapBlockLength;
	var cycle = 0;
	var swaps = this.domElement.dataset.swaps ? this.domElement.dataset.swaps : 3;
	var continuous = this.domElement.dataset.continuous ? this.domElement.dataset.continuous : true;
	var animateSentinel = this.domElement.dataset.sentinel === 'false' ? false : true;

	var animate = animate.bind( this );
	var resetStream = resetStream.bind( this );

	animate();

	function animate(){

		this.Utils.easeValues([
			// scroll viewport down list
			{ from: swapBlockHeight , to:  swapBlockHeight + swapBlockStride , duration: stepDuration,
				execute: function( step ){
					viewportShadow.domNode.style.transform = 'translateY('  +  step + 'px)';
				}
			},
			// move message out of stack
			{ from: 0 , to: -this.domElement.offsetWidth, duration: stepDuration,
				execute: function( step ){

					for( var i = messageOffsetFrom, len = messageOffsetTo; i < len; i++ ){

						var message = messages[ i ];
						message.domNode.style.transform = 'translateX(' + step + 'px)';

						if( !message.domNode.classList.contains('active') && step === 0 ){
							message.domNode.classList.add('active');
						}
					}
				}
			},
			// expand sentinel to empty space
			{ from: swapBlockHeight , to: swapBlockHeight + swapBlockStride, duration: animateSentinel ? stepDuration : 0,
				execute: function( step ){
					sentinel.domNode.style.height = step + 'px';

					if( step > (swapBlockHeight + swapBlockStride ) / 8 && animateSentinel ) {
						if( !sentinel.domNode.classList.contains('visible') ){
							sentinel.domNode.classList.add( 'visible' );
						}
					}
				}
			},
			// move block of messages down
			{ from: 0 , to: swapBlockStride * 3, duration: stepDuration,
				execute: function( step ){
					for( var i = messageOffsetFrom, len = messageOffsetTo; i < len; i++ ){
						var message = messages[ i ];
						message.domNode.style.transform = 'translate(-' + this.domElement.offsetWidth + 'px,' + step + 'px)';
					}
				}.bind(this)
			},
			// move block of messages back in play
			{ from: -this.domElement.offsetWidth , to: 0, duration: stepDuration,
				execute: function( step ){
					for( var i = messageOffsetFrom, len = messageOffsetTo; i < len; i++ ){
						var message = messages[ i ];
						message.domNode.style.transform = 'translate(' + step + 'px,' + swapBlockStride * 3 + 'px)';
						if( message.domNode.classList.contains('active') && step === 0 ){
							message.domNode.classList.remove('active');
						}
					}
				}
			},
			{ from: 0, to: 1, duration: 0,
				execute: function( step ){
					if( cycle >= swaps - 1 ){
						resetStream( swapBlockStride * swaps );
						return
					}

					swapBlockHeight += swapBlockStride;
					messageOffsetFrom += swapBlockLength;
					messageOffsetTo = messageOffsetFrom + messages.length / 3;
					cycle++

					if( continuous ){
						animate();
					}
					return
				}
			}
		]);
	}

	function resetStream( swapFrom ){

		swapFrom = swapFrom ? swapFrom : swapBlockStride * 3;
		this.Utils.easeValues([
			// scale back sentinel
			{ from: sentinel.domNode.offsetHeight , to: 0, duration: animateSentinel ? stepDuration : 500,
				execute: function( step ){
					sentinel.domNode.style.height = step + 'px';
					if( step < 50  && sentinel.domNode.classList.contains( 'visible' )){
						sentinel.domNode.classList.remove( 'visible' );
					}
				}
			},
			// reset all messages
			{ from: swapFrom, to: 0, duration: stepDuration,
				execute: function( step ){
					for( var i = 0, len = messages.length; i < len; i++ ){
						var message = messages[ i ];
						message.domNode.style.transform = 'translateY(' + step + 'px)';
					}
					viewportShadow.domNode.style.transform = 'translateY('  +  step + 'px)';
				}
			},
			//stall a bit
			{ from: 0, to: 1, duration: stepDuration,
				execute: function( step ){
				}
			},
			// reset values and restart animation
			{ from: 0, to: 1, duration: 0,
				execute: function( step ){

					swapBlockHeight = 0;
					messageOffsetFrom = 0;
					messageOffsetTo = messageOffsetFrom + messages.length / 3;
					cycle = 0;

					if( continuous ) {
						animate();
					}
					return
				}
			}
		]);
	}
}

AnimatedMessageComponent.prototype.shrink = function(){

	var sentinel = this.sentinel;
	var messages = this.messages;
	var viewportShadow = this.viewportShadow;
	var swapBlockLength = this.messages.length / 3;
	var stepDuration = 1000;
	var marginOffset = parseFloat( window.getComputedStyle( messages[ 0 ].domNode ).marginTop );
	var messageOffsetFrom;
	var messageOffsetTo;
	var swapBlockStride;
	var swapBlockHeight;
	var viewportOffset;
	var cycle;
	var continuous = true;

	var animate = animate.bind( this );
	var setStream = setStream.bind( this );


	//setup scenario
	setStream();

	function setStream(){
		messageOffsetFrom = messages.length - 1;
		messageOffsetTo = messageOffsetFrom - ( messages.length / 3 );
		swapBlockStride = ( messages[ 0 ].domNode.offsetHeight + marginOffset ) * swapBlockLength;
		swapBlockHeight = swapBlockStride * 3;
		viewportOffset = swapBlockStride;
		cycle = 3;

		this.Utils.easeValues([
			// reset all messages
			{ from: 0 , to:  swapBlockHeight , duration: stepDuration,
				execute: function( step ){
					for( var i = 0, len = messages.length; i < len; i++ ){
						var message = messages[ i ];
						message.domNode.style.transform = 'translateY(' + step + 'px)';
					}
					 viewportShadow.domNode.style.transform = 'translateY('  + (step + viewportOffset)  + 'px)';
				}
			},
			// expand sentinel to empty space
			{ from: 0 , to: swapBlockHeight, duration: stepDuration,
				execute: function( step ){
					sentinel.domNode.style.height = step + 'px';
					if( step > 50 ) {
						if( !sentinel.domNode.classList.contains('visible') ){
							sentinel.domNode.classList.add( 'visible' );
						}
					}
				}
			},
			{ from: 0, to: 1, duration: 0,
				execute: function(){
					animate();
					return
				}

			}
		]);
	}

	function animate(){

		this.Utils.easeValues([
			// move viewport up the lists
			{ from: (swapBlockHeight + viewportOffset), to: (swapBlockHeight + viewportOffset - swapBlockStride) , duration: stepDuration,
				execute: function( step ){
					viewportShadow.domNode.style.transform = 'translateY(' + step + 'px)';
				}
			},
			// move message out of list
			{ from: 0 , to: -this.domElement.offsetWidth, duration: stepDuration,
				execute: function( step ){

					for( var i = messageOffsetFrom, len = messageOffsetTo; i > len; i-- ){

						var message = messages[ i ];
						message.domNode.style.transform = 'translate(' + step + 'px,' + ( swapBlockStride * 3 ) + 'px)';

						if( !message.domNode.classList.contains('active') && step === 0 ){
							message.domNode.classList.add('active');
						}
					}
				}
			},
			// move block of messages up
			{ from: ( swapBlockStride * 3 ) , to: swapBlockHeight - (swapBlockStride * cycle), duration: stepDuration,
				execute: function( step ){
					for( var i = messageOffsetFrom, len = messageOffsetTo; i > len; i-- ){
						var message = messages[ i ];
						message.domNode.style.transform = 'translate(-' + this.domElement.offsetWidth + 'px,' + step + 'px)';
					}
				}.bind(this)
			},
			// shrink sentinel to accomodate shift
			{ from: swapBlockHeight , to: swapBlockHeight - swapBlockStride, duration: stepDuration,
				execute: function( step ){

					sentinel.domNode.style.height = step + 'px';
					if( step < 50 ) {
						if( sentinel.domNode.classList.contains('visible') ){
							sentinel.domNode.classList.remove( 'visible' );
						}
					}
				}
			},
			// move block of messages back in play
			{ from: -this.domElement.offsetWidth , to: 0, duration: stepDuration,
				execute: function( step ){
					for( var i = messageOffsetFrom, len = messageOffsetTo; i > len; i-- ){
						var message = messages[ i ];

						message.domNode.style.transform = 'translate(' + step + 'px,' + ( swapBlockHeight - (swapBlockStride * cycle) ) + 'px)';
						if( message.domNode.classList.contains('active') && step === 0 ){
							message.domNode.classList.remove('active');
						}
					}
				}
			},
			{ from: 0, to: 1, duration: 0,
				execute: function( step ){
					if( cycle <= 1 ){
						setStream();
						return
					}

					swapBlockHeight -= swapBlockStride;
					messageOffsetFrom -= swapBlockLength;
					messageOffsetTo = messageOffsetFrom - ( messages.length / 3 );
					cycle--;

					if( continuous ){
						animate();
					}
					return
				}
			}
		]);
	}
}
