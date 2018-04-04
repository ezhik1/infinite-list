	var watchedElements = [];
function init(){

	var domElement = document.getElementById( 'message-stream' );
	var Utils        = new UTILS();


	// high level demo streams
	var animatedMessageElements = document.querySelectorAll('.message-animation');
	var animatedMessages = [].slice.call( animatedMessageElements );

	animatedMessages.map( function( message ){
		watchedElements.push( new AnimatedMessageComponent( Utils, message ) );
	});

	// demo messages
	var messageBlockElements = document.querySelectorAll('.message-block');
	var messageBlocks = [].slice.call( messageBlockElements );

	messageBlocks.map( function( messageBlock ){
		watchedElements.push( new MessageBlock( Utils, messageBlock ) );
	});

	// tombstone messages
	var tombstoneMessageElements = document.querySelectorAll('.tombstone-stack');
	var tombstones = [].slice.call( tombstoneMessageElements );

	tombstones.map( function( tombstone ){
		watchedElements.push( new TombstoneStack( Utils, tombstone ) );
	});

	// main message stream
	watchedElements.push( new MessageStream( domElement, Utils ) );

	// watch for elements to come into view before initializing their components
	var elementsViewed = 0; // keep track of elements that have come into view
	var pixelsInView = 300; // vertical pixels of element in viewport before element is 'in view'

	var inViewListener = function(){
		isInViewport( watchedElements );
	}

	function isInViewport( elements ){

		elements.forEach( function( element ){

			if( Utils.isInViewport( element.domElement, pixelsInView ) && !element.hasStarted ){
				element.domElement.classList.add('visible');
				element.initialize( element.opts );
				elementsViewed++;
				element.hasStarted = true;
			}
		});

		//remove once all have been triggered
		if( elementsViewed === elements.length ){
			window.removeEventListener( 'scroll', inViewListener, false );
		}
	}

	// add scroll listener
	window.addEventListener( 'scroll', inViewListener, false );

	// check for any components in viewport on load
	isInViewport( watchedElements );
}

init();
