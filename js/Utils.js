var UTILS = function(){

	this.timeSince = function( date ) {

		if( typeof date === 'string' ){
		   date = Date.parse( date );
		}
		if( typeof date != 'number' ){
			return 'some time';
		}

		var seconds = Math.floor( ( new Date() - date ) / 1000 );

		var interval = Math.floor( seconds / 31536000 );

		if ( interval > 1 ) {
			return interval + " years";
		}
			interval = Math.floor( seconds / 2592000);
		if ( interval > 1 ) {
			return interval + " months";
		}
			interval = Math.floor( seconds / 86400);
		if ( interval > 1 ) {
			return interval + " days";
		}
			interval = Math.floor( seconds / 3600);
		if ( interval > 1 ) {
			return interval + " hours";
		}
			interval = Math.floor( seconds / 60);
		if ( interval > 1 ) {
			return interval + " minutes";
		}
			return Math.floor( seconds ) + " seconds";
	}

	this.clamp = function( number, min, max ){
		return Math.min( Math.max( min, number ), max );
	}
	this.normalize = function( initial, min, max ){
		return ( initial - min ) / ( max - min );
	}

	this.easeValues = function( params ){
		// params -- single object or array of objects
		// {
		//   type:     easingFunctionType          [ STRING ],
		//   from:     beginning value             [ NUMBER ],
		//   to:       ending value                [ NUMBER ],
		//   duration: time                        [ MILLISECONDS ],
		//   execute:  props to be changed         [ FUNCTION ]
		// }
		params = params.constructor === Object ? [ params ] : params;

		// t: current time, b: begInnIng value, c: delta, d: duration
		var ease = {
			inQuad: function ( t, b, c, d ) {
				return c*(t/=d)*t + b;
			},
			outQuad: function ( t, b, c, d ) {
				return -c *(t/=d)*(t-2) + b;
			},
			inOutQuad: function ( t, b, c, d ) {
				if ((t/=d/2) < 1) return c/2*t*t + b;
				return -c/2 * ((--t)*(t-2) - 1) + b;
			},
			inCubic: function ( t, b, c, d ) {
				return c*(t/=d)*t*t + b;
			},
			outCubic: function ( t, b, c, d ) {
				return c*((t=t/d-1)*t*t + 1) + b;
			},
			inOutCubic: function ( t, b, c, d ) {
				if ((t/=d/2) < 1) return c/2*t*t*t + b;
				return c/2*((t-=2)*t*t + 2) + b;
			},
			inQuart: function ( t, b, c, d ) {
				return c*(t/=d)*t*t*t + b;
			}
		}
		var lastTime = Date.now();
		var delta    = 0;
		var elapsed  = 0;

		main();

		function main(){


			var param = params[ 0 ];

			if( !param ){ return }
			param.type = param.type ? param.type : 'inOutQuad';

			if( elapsed < param.duration ){
				var now = Date.now();
				delta = now - lastTime;
				lastTime = now;
				elapsed += delta;
				if( param.execute != null ){
					param.execute( ease[ param.type ]( elapsed, param.from, param.to - param.from, param.duration ) );
				}
				requestAnimationFrame( main );
			}else{
				//-- guarantee final state
				param.execute( param.to );
				elapsed = 0;
				delta = 0;
				lastTime = Date.now();
				params.shift();
				main();
			}
		}
	}
	this.isInViewport = function( element, pixelAmount ) {
		pixelAmount = pixelAmount ? pixelAmount : 0;
		var rect = element.getBoundingClientRect();

		var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
		var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

		var vertInView = (rect.top + pixelAmount <= windowHeight) && ((rect.top + rect.height) >= 0);
		var horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

		return (vertInView && horInView);
	}

	this.elementOffsetTop = function( element ) {
		var rect = element.getBoundingClientRect();

		var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

		return rect.top + scrollTop;
	}
}
