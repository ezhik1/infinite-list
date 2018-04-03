// RAF event Queue

// {
//    pending        : [[ array ]]    : a collection of pendingRequest objects
//    isRunning      : [[ boolean ]]  : determines queue status. an empty pending array returns false
//    processCurrent : [[ function ]] : RAF loop for processing queued pendingRequest(s)
// }

// pendingRequest created by passing optional:
//     condition : [[ string ]]
//     target    : [[ object ]]
// and required:
//     run : [[ function ]]

// {
//    target:      [[ object ]]   : dom element, or other object to be passed along in context of queue
//    condition:   [[ string ]]   : key associated with target that completes queued request when that value bexomes true
//    hasFinished: [[ boolean ]]  : completes the pending request; if no condition passed, this must be explicitly set with QUEUE.dequeue();
//    run:         [[ function ]] : passed operation, executed when the pendingRequest has been fulfilled
// }

var QUEUE = function(){
	this.pending = [];
	this.isRunning = false;
	this.processCurrent = this.processCurrent.bind( this );
}

QUEUE.prototype.add = function( request ){
	var pendingRequest = {
		target:      request.target ? request.target : null,
		condition:   request.condition ? request.condition : null,
		hasFinished: false,
		active:      null,
		run:         null
	}

	if( request.run instanceof Function ){
		pendingRequest.run = request.run;
		this.pending.push( pendingRequest );
	}else{
		console.warn( request.run, 'is not a function. Expected f(x) to run in queue.');
	}
}

QUEUE.prototype.run = function(){
	if( !this.isRunning ){
		this.isRunning = true;
		this.processCurrent();
	}
}

QUEUE.prototype.dequeue = function(){
	if( !this.isRunning ){
		return
	}
	if( this.pending.length > 0 && !this.pending[ 0 ].hasFinished ){
		this.pending[ 0 ].hasFinished = true;
	}
}

QUEUE.prototype.stop = function(){
	this.isRunning = false;
	return
}

QUEUE.prototype.processCurrent = function( callback ){

	//-- when queue is empty, stop running queue.
	if( this.pending.length === 0 ){
		this.stop();
		return;
	}

	//-- no condition specified, 'hasFinished' must be resolved elsewhere to advanced queued operations
	if( !this.pending[ 0 ].condition && !this.pending[ 0 ].active ){
		this.pending[ 0 ].run();
		this.pending[0].active = true;
	}

	//-- pending request has finished
	if( this.pending[ 0 ].hasFinished ){

		//-- execute pending queue operation, provided there is a condition that will need to be satisfied
		if( this.pending[ 0 ].condition ){
			this.pending[ 0 ].run();
		}
		//-- carry on to the next pending operation
		this.pending.shift();
	}

	//-- dom element has met condition
	if( this.pending.length > 0 &&
		this.pending[ 0 ].condition &&
		!this.pending[ 0 ].hasFinished &&
		this.pending[ 0 ].target[ this.pending[ 0 ].condition ] )
	{
		this.pending[ 0 ].hasFinished = true;
	}

	//--run queue
	window.requestAnimationFrame( this.processCurrent, 0 );
}
