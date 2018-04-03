function MessageStream( domElement, Utils ){

	//-- Variable State Values
	this.viewBuffer     = 0; // a function of the domElement offsetHeight;
	this.viewBufferOld  = 0; // updates on an exceeded viewbuffer
	this.domElementPageLocation = Utils.elementOffsetTop( domElement ); // set from wherever message component is on page
	this.documentHeight         = 0; // updates on viewport size change
	this.domElementWidth        = 0; // updates on viewport size change
	this.oldScrollY             = 0; // updates on scroll
	this.lastScrollDirection    = null; // 'up' 'down' or 'null'

	//-- Thresholds and Default Values
	this.swipeDirection = -1;          // [INTEGER] 1: swipe left to dismiss -1: swipe right to dismiss
	this.animationDurations = {
		swipeOutOfView:          1000, // [MILLISECONDS]
		returnToInitialPosition: 500,  // [MILLISECONDS]

	}

	//-- API
	this.static            = true;        // When enabled, will serve messages statically ( simulated server call ), as opposed to server fetch
	this.URL               = '/messages'; // base url for message requests
	this.domElementLimit   = 30;          // Buffer of messages. Should be divisible by three (3) as swaps are made by moving last third to first third of the available dom element group
	this.fetchLimit        = this.domElementLimit / 3; // general fetch of 1/3 total dom elements, to replace bottom or top third
	this.activeAjaxRequest = false;       // STATE: ignore multiple ajax calls until new token is received
	this.token             = '';          // continuation token to request addition message sets

	//-- DOM data
	this.debugPanel = document.querySelector('.debug-panel') || null;
	this.domElement = domElement;
	this.sentinel = {
		domElement : document.getElementById('sentinel'),
		trackedHeight: 0
	}
	this.domInterface = {
		fetchForwardIndex: this.domElementLimit,
		fetchReverseIndex: 0,
		removed:           0,
		collection:        [],
		cachedMessages :   []
	}

	//-- bound methods
	this.setupEventListeners = this.setupEventListeners.bind( this );
	this.setupQueues         = this.setupQueues.bind( this );
	this.fetchMessages       = this.fetchMessages.bind( this );
	this.httpGet             = this.httpGet.bind( this );

	this.createNode     = this.createNode.bind( this );
	this.generateMarkup = this.generateMarkup.bind( this );
	this.paintMarkup    = this.paintMarkup.bind( this );

	this.easeMessageToPosition = this.easeMessageToPosition.bind( this );
	this.reuseDomNodes         = this.reuseDomNodes.bind( this );

	//-- a set of useful functions
	this.Utils = Utils;
	this.scrolling = false; // debug for auto scroll

	this.initialize = this.initialize;
}

MessageStream.prototype.initialize = function(){

	if( this.static ){
		this.staticServer = new StaticDataServer();
	}

	this.updateViewportInfo();
	this.setupEventListeners();
	this.setupQueues();
	this.fetchMessages({ limit: this.domElementLimit });


}

MessageStream.prototype.onWindowResize = function(){
	this.updateViewportInfo();
}

//-- Update viewport size and viewBuffer
MessageStream.prototype.updateViewportInfo = function(){
	this.documentHeight    = Math.max( document.documentElement.clientHeight, window.innerHeight || 0 );
	this.documentWidth     = Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
	this.domElementWidth   = Math.max( this.domElement.clientWidth, this.domElement.innerWidth || 0 );
	this.domElementPageLocation = this.Utils.elementOffsetTop( this.domElement );
	this.viewBuffer        = Math.max( ( this.domElementPageLocation + this.domElement.offsetHeight ) - ( this.documentHeight * 3 )  , 0 );
}

MessageStream.prototype.setupEventListeners = function(){
	//-- setup scroll listener to handle fetching more messages
	window.addEventListener( 'scroll', this.handleMessagesContinuity.bind( this ) );

	//-- setup scroll listener to recalculate heights/widths and view buffer on resize
	window.addEventListener( 'resize', this.onWindowResize.bind( this ));

	//debug
	var actions = document.querySelectorAll('.scroll');
	for( var i = 0, len = actions.length; i < len; i++){
		actions[ i ].onclick = function(e){ this.autoScroll(e) }.bind(this);
	}
}

MessageStream.prototype.debugToggle = function(){

	if( window.scrollY <= this.domElementPageLocation ){

		this.debugPanel.classList.remove( 'visible' );
	}else if( !this.debugPanel.classList.contains( 'visible' ) ){

		this.debugPanel.classList.add( 'visible' );
	}
}

MessageStream.prototype.setupQueues = function(){
	this.swipeQueue  = new QUEUE();
	this.scrollQueue = new QUEUE();
}

MessageStream.prototype.autoScroll = function(e){
	var direction = e.target.classList.contains('down') ? -1 : 1;
	this.scrolling = true;

	function scroll(){

		if( window.scrollY === 0 || this.scrolling === false ){
			window.cancelAnimationFrame( scroll );
			return
		}

		if( this.scrolling ){
			window.requestAnimationFrame( scroll );
		}
		window.scrollTo( 0, window.scrollY + ( direction * 100 ) );
	}
	scroll = scroll.bind( this );
	scroll();

}

//-- Fetches Messages and appends them to DOM
MessageStream.prototype.fetchMessages = function( opts ){

	if( this.activeAjaxRequest ){ return }

	this.activeAjaxRequest = true;

	var request = {
		type:             null,
		data:             null,
		direction:        'forward',
		limit:            this.fetchLimit,
		replaceAmount:    null,
		replaceToIndex:   null,
		replaceFromIndex: null,
		domElement:       null
	}

	if( opts ){

		//-- specific limit passed : initial load should be this.domElementLimit, and 1/3 of that value ( captured in this.fetchLimit ) for subsequent requests
		if( opts.limit ){
			request.limit = opts.limit
		}

		//-- one message for cache offset
		if( opts.type === 'oneMessageToCache' ){
			request.limit = 1;
		}

		//-- request passed in the case of fetching one message
		if( opts.type === 'oneMessage' ){
			request.type             = opts.type;
			request.limit            = 1;
			request.replaceAmount    = 1;
			request.domElement       = opts.domElement;
			request.replaceToIndex   = this.domInterface.collection.length - 1;
			request.replaceFromIndex = opts.replaceFromIndex;
		}
	}

	handleResponse = function( data ){

		var json;

		if( this.static ){
			json = data;
		}else{
			json = JSON.parse( data );
		}

		this.token      = json.pageToken;
		request.data    = json;
		request.direction = 'forward';

		//-- cached message, create markup from template and store data in cachedMessages
		if( opts && opts.type === 'oneMessageToCache' ){
			this.generateMarkup({ data: json, type: 'oneMessageToCache' }, function(){
				this.activeAjaxRequest = false;
			}.bind( this ));
			return
		}

		//-- normal request, fulfill request and recycle  from available dom nodes
		if( this.domInterface.collection.length >= this.domElementLimit ){
			this.reuseDomNodes( request );
			this.activeAjaxRequest = false;
			return
		}

		//-- initial load : create markup from template, with new nodes, and paint to dom
		this.generateMarkup({ data: json, type: 'newDomNodes' }, function(){
			//-- append markup to DOM container
			this.paintMarkup();
			this.activeAjaxRequest = false;
		}.bind( this ));
	}.bind( this );

	//-- AJAX request
	if( this.static ){
		this.staticFetch( request.limit, handleResponse );
	}else{
		this.httpGet( request.limit, handleResponse );
	}
}

MessageStream.prototype.staticFetch = function( limit, callback ){

	data = this.staticServer.GET( this.token );

	if( data ){
		callback( data );
	}else{
		var el = document.createElement('span');
		el.innerHTML = 'this is the end!';
		this.domElement.appendChild(el);
		if( this.scrolling ){
			this.scrolling = false;
		}
	}
}

//-- HTTP GET delegated to node server
MessageStream.prototype.httpGet = function( limit, callback ){

	var xmlHttp = new XMLHttpRequest();
	var limit = limit ? limit: this.fetchLimit;

	var path = this.URL + '/' + limit + '/' + this.token;
	xmlHttp.open( 'GET', path, true );
	xmlHttp.send( null );

	xmlHttp.onreadystatechange = function() {
		if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ){
			callback( xmlHttp.responseText );
		}
	}
}

//-- Create Message from template and api data
MessageStream.prototype.generateMarkup = function( opts, callback ){

	if( !opts.type ){
		console.warn( 'MessageStream.generateMarkup(): incorrect opts.type passed! [ opts.type ] passed: ' + opts.type );
		return
	}
	var index = 0;
	var len   = opts.data.messages.length;

	if( opts.type == 'reuseDomNodes'){
		index = this.domInterface.collection.length  - this.domInterface.collection.length / 3;
	}

	if( opts.replaceToIndex ){
		index = this.domInterface.collection.length - 1;
	}

	//--consume [ opts.data ]  from api; assign to targets
	for( var i = 0; i < len; i++ ){

		var message   = opts.data.messages[ i ];
		var user      = message.author.name; //'Jack Dawson ';
		var image     = '/images' + encodeURIComponent( message.author.photoUrl ); //images/user.png
		var timeStamp = this.Utils.timeSince( message.updated ) + ' ago'; //'10 minutes ago';
		var content   = message.content; //'Just the other day, the ship seemed to go about in just the strangest manner.'

		var template = new Message({ id: message.id, image: image, timeStamp: timeStamp, content: content, user: user }).template;

		if( opts.type === 'newDomNodes' ){
			this.createNode( 1, template, message.id );
		}

		if( opts.type === 'reuseDomNodes' ){
			this.domInterface.collection[ index ].innerHTML = template;
			this.domInterface.collection[ index ].setAttribute('data-id', message.id)
			this.domInterface.cachedMessages.push({ id: message.id, markup: template });
			index++;
		}

		if( opts.type === 'oneMessageToCache' ){
			this.domInterface.cachedMessages.push({ id: message.id, markup: template });
		}
	}

	if( callback ){
		callback();
	}
}

MessageStream.prototype.createNode = function( amount, template, messageID ){
	template ? template : '';
	amount ? amount : 1;

	for( var i = 0; i < amount; i++ ){
		var divNode = document.createElement('div');
		divNode.className += 'message';
		divNode.setAttribute( 'data-id', messageID );
		divNode.innerHTML = template;
		this.domInterface.collection.push( divNode );
		this.domInterface.cachedMessages.push({ id: messageID, markup: template });
	}
}

MessageStream.prototype.reuseDomNodes = function( opts, callback ){

	opts.direction = opts.direction ? opts.direction : null;
	opts.data = opts.data ? opts.data : '';
	opts.cachedMessagesAvailable = opts.cachedMessagesAvailable ? opts.cachedMessagesAvailable : false;
	opts.replaceToIndex = opts.replaceToIndex ? opts.replaceToIndex : null;
	opts.replaceFromIndex = opts.replaceFromIndex ? opts.replaceFromIndex : 0;
	opts.replaceAmount = opts.replaceAmount ? opts.replaceAmount : this.domInterface.collection.length / 3 ;
	opts.type = opts.type ? opts.type : null;

	var elements = this.domInterface.collection;
	var targetIndex = elements.length - 1;

	if( opts.direction === null ){
		console.warn( 'reuseDomNodes(): no direction passed' )
		return;
	}

	if( opts.direction === 'forward' ){

		var forwardOffset = 0;

		for( var i = 0, len = opts.replaceAmount; i < len; i++ ){

			var element = this.domInterface.collection[ opts.replaceFromIndex ];

			//-- normal message swap: add on to offset to account for the removed space
			//-- removed message: the occupied space will not need to be removed on scrollback, as the element is removed forever
			if( opts.type === null ){
				forwardOffset += element.offsetHeight;
			}
			//-- remove from 0 index for groups of messages, or from specific index for single replacements
			this.domInterface.collection.splice( opts.replaceFromIndex , 1 );
			this.domInterface.collection.push( element );

			//-- propagate change to dom structure
			this.domElement.appendChild( element );

			//--cached messages available: replace markup with cached markup
			if( opts.cachedMessagesAvailable ){

				if( opts.type === 'oneMessage' ){
					this.domInterface.collection[ targetIndex ].innerHTML = opts.data.markup;
				}else{
					this.domInterface.collection[ targetIndex ].innerHTML = this.domInterface.cachedMessages[ this.domInterface.fetchForwardIndex  + i ].markup;
				}

				//-- update index attribute by message id, to preserve swapability even when messages have been removed
				this.domInterface.collection[ targetIndex ].setAttribute( 'data-id', this.domInterface.collection[ targetIndex ].firstChild.dataset.id );
			}
		}

		//-- account for sentinel height to maintain scroll position
		this.sentinel.trackedHeight += forwardOffset;
		this.sentinel.domElement.style.height = this.sentinel.trackedHeight + 'px';

		//-- no cached messages stored; generate new markup from template with passed data
		if( !opts.cachedMessagesAvailable ){
			this.generateMarkup({ data: opts.data, type: 'reuseDomNodes', replaceToIndex: opts.replaceToIndex  });
		}

		//-- update indices for next set of messages in either direction
		this.domInterface.fetchForwardIndex += opts.replaceAmount;
		this.domInterface.fetchReverseIndex += opts.replaceAmount;

		//-- reset swapped element from removed position ( out of container ) back to center
		this.domInterface.collection[ targetIndex ].style.transform = 'translateX(0)';

		//--restore message visibility
		if( this.domInterface.collection[ targetIndex ].classList.contains( 'hide' ) ){
			this.domInterface.collection[ targetIndex ].classList.remove( 'hide' );
		}
	}

	if( opts.direction === 'reverse' && this.domInterface.fetchReverseIndex > 0 ){

		var cachedMessages = this.domInterface.cachedMessages;
		var reverseOffset  = 0;

		for( var j = 0, len = elements.length / 3; j < len ; j++ ){

			var lastElement = this.domInterface.collection[ this.domInterface.collection.length - 1 ];

			//-- grab last element, push to top, ahead of the sentinel; update markup from cached message data
			this.sentinel.domElement.parentNode.insertBefore( lastElement ,this.sentinel.domElement.nextSibling );
			this.domInterface.collection.unshift( lastElement );
			this.domInterface.collection[ 0 ].innerHTML = cachedMessages[ this.domInterface.fetchReverseIndex - 1 - j ].markup;
			this.domInterface.collection.pop();

			//-- keep track of how much the sentinel will need to shrink
			reverseOffset +=  this.domInterface.collection[ 0 ].offsetHeight;

			//-- update index attribute by message id, to preserve swapability even when messages have been removed
			this.domInterface.collection[ 0 ].setAttribute( 'data-id', this.domInterface.collection[ 0 ].firstChild.dataset.id );
		}

		this.sentinel.trackedHeight -= reverseOffset;
		//-- something didnt reduce to zero: a message(s) has been skipped when reordering.
		//-- TODO: scrolling 'way' too fast seems to skip entire swap cycles ( inference; could be confounded by cached message retrieval,
		//-- scroll event order, or re-sort on swipe-to-remove message ) failing to account for the needed message replace amount. This can be somehow calculated and resolved; for now, just guarantee 0 state.
		if( this.sentinel.trackedHeight < 0 ){
			console.warn( 'Calculation fault! A message(s) was skipped on reverse swap, or viewport has changed between swap operations.\n\tHeight delta, whitespace added - removed ( on scroll and swap ) must resolve to 0.\n\tCalculated ∆: ', this.sentinel.trackedHeight, 'px');
			this.sentinel.trackedHeight = 0;
			console.warn( 'resetting to: ', this.sentinel.trackedHeight, 'px' );
		}
		//-- a resized viewport will not guarantee 0 height sentinel when returning back to top of doc, so we guartantee 0 height on any delta in remaining height
		if( this.domInterface.fetchReverseIndex <= this.domElementLimit / 3 ){
			this.sentinel.trackedHeight = 0;
		}
		//-- shrink sentinel
		this.sentinel.domElement.style.height = this.sentinel.trackedHeight + 'px';

		//-- update indices for next set of messages in either direction
		this.domInterface.fetchReverseIndex -= opts.replaceAmount;
		this.domInterface.fetchForwardIndex -= opts.replaceAmount;
	}

	//-- set scroll position here to give the reordered state a chance to report correct scroll position
	this.oldScrollY = window.scrollY//Math.max( window.scrollY - this.domElementPageLocation, 0);
}

//-- Append Message elements to their target container
MessageStream.prototype.paintMarkup = function( index ){

	//-- If we already have messages, append only the latest fetched set;
	for( var i = 0, len = this.domInterface.collection.length; i < len; i++ ){
		var element = this.domInterface.collection[ i ];
		this.domElement.appendChild( element );
		//-- introduce messages
		this.easeMessageToPosition( element, i );
		//--setup swipe listener for each message
		this.swipeHandler( element );
	}
}

MessageStream.prototype.easeMessageToPosition = function( element, index ){
	//-- ease from offset position to 0
	this.Utils.easeValues({ from: 100 , to: 0, duration: 1000 + ( 100 * index ),
		execute: function( step ){
			element.style.transform = 'translateY(' + step + 'px)';
		}
	});
}

//-- Guarantee Messages are fetched as user scrolls closer to end of view buffer
MessageStream.prototype.handleMessagesContinuity = function( e ){
	this.updateViewportInfo();
	this.debugToggle();

	//-- wait until removed elements are replaced before advancing scrollQueue
	if( this.swipeQueue.isRunning || this.viewBuffer === this.viewBufferOld ){ return }


	var currentScroll = window.scrollY;
	var scroll = null;

	//-- DOWN
	if( currentScroll > this.oldScrollY ){
		scroll = 'down';
	//-- UP
	}else if( currentScroll < this.oldScrollY ){
	   scroll = 'up';
	//-- LAST : assumption for anything that doesn't fall into up or down for a given scroll position ie. dom re-drawing (scroll position shrinks relative to doc size)
	}else{
		scroll = this.lastScrollDirection;
	}
	this.lastScrollDirection = scroll;

	var run = null;                    //-- method to execute when queued event is ready to be executed
	var request = { completed: false } //-- keep track of requests to dequeue them correctly

	var conditions = {
		forward : {
			p : currentScroll > this.viewBuffer, // reached view buffer ( bottom 1/3 of doc )
			q : scroll === 'down'                // scrolling down
		},
		reverse : {
			p : currentScroll < this.sentinel.domElement.offsetHeight + this.domElementPageLocation + ( this.domElement.offsetHeight / 3 ), // at the top third of the doc height
			q : this.domInterface.fetchReverseIndex > 0, // there are still messages to be loaded in the reverse direction
			r : scroll === 'up'                         // scrolling up
		}
	}

	//--  FORWARD DIRECTION : Scrolled to threshold - fetch more messages
	if( conditions.forward.p && conditions.forward.q ) {

		//-- prevent unwanted scroll position / viewBuffer equivalence while buffer is updated;
		this.viewBufferOld = this.viewBuffer;

		//-- cached messages available ( not guaranteed to be all, as we may have removed some that will need fresh fetching)
		if( this.domInterface.fetchForwardIndex < this.domInterface.cachedMessages.length ){
			run = function(){
				this.reuseDomNodes({ direction: 'forward', cachedMessagesAvailable: true });
			};

		}else{
		//-- fetch a new set from api
			run = function(){
				this.fetchMessages();
			}
		}
	}

	//-- REVERSE DIRECTION : scroll position is less than available message stream height, relative to sentinel offset
	if( conditions.reverse.p && conditions.reverse.q && conditions.reverse.r ){

		this.viewBufferOld = 0;
		run = function(){
			this.reuseDomNodes({ direction: 'reverse' });
		}
	}

	//-- add relavent method to scroll queue
	if( run ){
		this.scrollQueue.add({ target: request, condition: 'completed', run: run.bind( this ) });
		request.completed = true;
	}
	this.checkContinuity();
	this.scrollQueue.run();
}
//-- debug: bring attention to non-linearity in message stream. removed message will also throw this warning.
MessageStream.prototype.checkContinuity = function( ){

	var elements = this.domElement.querySelectorAll( '.message' );

	if( !elements ){
		return
	}

	for( var i = 0, len = elements.length -1; i < len; i++ ){
		var index = elements[ i ].firstChild.dataset.id;
		var index1 = elements[ i + 1 ].firstChild.dataset.id;
		if( index1 - index  != 1 ){
			console.warn('non-linearity found: ', elements[ i ].firstChild.dataset.id, elements[ i + 1].firstChild.dataset.id)
		}
	}
}
//-- Swipe Events
MessageStream.prototype.swipeHandler = function( domElement ){

	var swipeOutThreshold = this.domElementWidth / 3;
	var hammerOptions     = { preventDefault: true };
	var hammer            = new Hammer( domElement, hammerOptions );

	//--anytime the Swipe Event is fired
	hammer.on('pan', function(event ){
		if( this.swipeDirection * event.deltaX >= 0 || event.deltaY ){ return }

		var min = this.domElementWidth;
		var max = 0;
		domElement.style.opacity = this.Utils.normalize( event.distance, min, max );

	}.bind( this ));

	//-- only while user is moving element with pointer/touch
	hammer.on('panmove', function( event ) {

		//--ignore anything that's not in the relavent direction
		if( this.swipeDirection * event.deltaX >= 1 ){ return }

		//-- reached threshold, finish animation with outOfView
		if( event.distance >= swipeOutThreshold && !domElement.swipingOutofView ){
			//-- stop listner to prevent phantom re-positiong ( ie. releasing mouse, which triggers hammer.on('pan',..) )
			hammer.stop();

			var easeFunction = '';
			domElement.swipingOutofView = true;

			//-- fast swipe: fast exit animation. slow swipe: slow start animation
			if( Math.abs( event.velocity ) >= 1 ){
				easeFunction = 'outQuad';
			}else{
				easeFunction = 'inOutQuad';
			}
			this.swipeOutOfView( domElement, hammer, easeFunction, this.swipeDirection * event.deltaX );

		}else{
			//-- begin transform
			domElement.style.transform = 'translateX(' + this.swipeDirection * -Math.abs( event.deltaX )+ 'px)';
		}

		//-- return opacity to 1 as function of viewport width
		var min = this.domElementWidth;
		var max = 0;
		domElement.style.opacity = this.Utils.normalize( this.swipeDirection * -event.deltaX, min, max );
	}.bind( this ));

	//-- on Swipe end
	hammer.on('panend', function( event ){
		if( this.swipeDirection * event.deltaX >= 1 ){ return }

		//-- user swipe hasn't reached threshold, so return element to its initial position
		if( event.distance < swipeOutThreshold  && !domElement.returningToInitPos && !domElement.swipingOutOfView ){
			domElement.returningToInitPos = true;
			this.returnToInitialPosition( domElement, this.swipeDirection * event.deltaX );
		}
	}.bind( this ));
}

MessageStream.prototype.swipeOutOfView = function( domElement, hammer, easeFunction, position ){
	var outOfViewPosition = this.domElementWidth;

	this.domInterface.fetchReverseIndex -= 1;
	this.domInterface.fetchForwardIndex -= 1;
	this.domInterface.removed++;

	//-- run operation to execute when condition met.
	var conditionToMeet = 'isOutOfView';
	var run = function(){
		this.reorderRemovedElement( domElement );
		domElement.isOutOfView = false;
	}
	this.swipeQueue.add({ target: domElement, condition: conditionToMeet, run: run.bind( this ) });
	var swipeDirection = this.swipeDirection;
	this.Utils.easeValues({ type: easeFunction, from: position , to: -outOfViewPosition, duration: this.animationDurations.swipeOutOfView,
		execute: function( step ){

			domElement.style.transform = 'translateX(' + swipeDirection * step + 'px)';

			//-- element is out of view, update element state
			if( Math.abs( step ) === outOfViewPosition && !domElement.isOutOfView ){
				domElement.isOutOfView = true;
				domElement.swipingOutofView = false;
			}
		}
	});
	this.swipeQueue.run();
}


MessageStream.prototype.reorderRemovedElement = function( domElement ){
	var replaceFromIndex = this.domInterface.collection.indexOf( domElement );
	var messageID        = domElement.dataset.id;
	var elementToRemove  = this.domInterface.cachedMessages.map( function(x){ return x.id; }).indexOf( +messageID );
	var cachedMessageIndex = this.domInterface.cachedMessages.map( function(x){ return x.id; }).indexOf( +this.domInterface.collection[ this.domInterface.collection.length - 1 ].dataset.id + 1 );

	this.domInterface.cachedMessages.splice( elementToRemove  , 1 );

	//-- css class for smooth transition from empty space created from message
	domElement.style.opacity = 1;
	domElement.className += ' hide';

	//-- non negative index: cached messages available
	if( cachedMessageIndex > 0  ){
		this.reuseDomNodes({
			direction: 'forward',
			type: 'oneMessage',
			domElement: domElement,
			cachedMessagesAvailable: true,
			data: this.domInterface.cachedMessages[ cachedMessageIndex - 1 ],
			replaceAmount: 1,
			replaceToIndex: this.domInterface.fetchForwardIndex,
			replaceFromIndex: replaceFromIndex,
		});
		//--we want to fetch forward one message to the cached array, to offset the removed element and avoid not having enough when we restore messages from cache on scroll events
		this.fetchMessages({ type: 'oneMessageToCache' });
	}else{
		//-- no cached messages available, fetch one new entry from API at current fetchForward Index
		this.fetchMessages({ type: 'oneMessage', replaceFromIndex: replaceFromIndex, domElement: domElement });
	}
}

MessageStream.prototype.returnToInitialPosition = function( domElement, position ){
	var domElementWidth = this.domElementWidth;
	var Utils = this.Utils;
	var swipeDirection = this.swipeDirection;

	this.Utils.easeValues({ from: Math.abs( position ) , to: 0, duration: this.animationDurations.returnToInitialPosition,
		execute : function( step ){
			//-- translate dom element back to init
			domElement.style.transform = 'translateX(' + swipeDirection * -step + 'px)';

			//-- return opacity to 1 as function of viewport width
			var min = domElementWidth;
			var max = 0;
			domElement.style.opacity = Utils.normalize(  step, min, max );

			//-- reset state flag
			if( Math.abs( step ) <= 0 ){
				domElement.returningToInitPos = false;
			}
		}
	});
}
