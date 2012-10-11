//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
//>>description: placeholder
//>>label: AJAX Navigation System
//>>group: Navigation
define([
	"jquery",
	"./../jquery.mobile.core",
	"./../jquery.mobile.support",
	"./events/navigate",
	"./path"], function( $ ) {
//>>excludeEnd("jqmBuildExclude");

(function( $, undefined ) {
	var path = $.mobile.path, history;

	// TODO consider queueing navigation activity until previous activities have completed
	//      so that end users don't have to think about it. Punting for now
	$.navigate = function( url, data ) {
		var href, state,
			// firefox auto decodes the url when using location.hash but not href
			hash = path.parseUrl(url).hash,
			isPath = path.isPath( hash ),
			resolutionUrl = isPath ? path.getLocation() : $.mobile.getDocumentUrl();

		// #/foo/bar.html => /foo/bar.html
		// #foo => #foo
		hash = isPath ? hash.replace( "#", "" ) : hash;

		// make the hash abolute with the current href
		href = path.makeUrlAbsolute( hash, resolutionUrl );

		if ( isPath ) {
			href = path.resetUIKeys( href );
		}

		state = $.extend( data, {
			url: url,
			hash: hash,
			title: document.title
		});

		// NOTE we currently _leave_ the appended hash in the hash in the interest
		//      of seeing what happens and if we can support that before the hash is
		//      pushed down

		// set the hash to be squashed by replace state or picked up by
		// the navigation special event
		window.location.hash = url;
		history.ignoreNextHashChange = true;

		if( $.support.pushState ) {
			// replace the current url with the new href and store the state
			// Note that in some cases we might be replacing an url with the
			// same url. We do this anyways because we need to make sure that
			// all of our history entries have a state object associated with
			// them. This allows us to work around the case where $.mobile.back()
			// is called to transition from an external page to an embedded page.
			// In that particular case, a hashchange event is *NOT* generated by the browser.
			// Ensuring each history entry has a state object means that onPopState()
			// will always trigger our hashchange callback even when a hashchange event
			// is not fired.
			window.history.replaceState( state, document.title, href );
		}

		// record the history entry so that the information can be included
		// in hashchange event driven navigate events in a similar fashion to
		// the state that's provided by popstate

		history.add( url, state );
	};

	// NOTE must bind before `navigate` special event hashchange binding otherwise the
	//      navigation data won't be attached to the hashchange event in time for those
	//      bindings to attach it to the `navigate` special event
	// TODO add a check here that `hashchange.navigate` is bound already otherwise it's
	//      broken (exception?)
	$( window ).bind( "hashchange.history", function( event ) {
		// If pushstate is supported the state will be included in the popstate event
		// data and appended to the navigate event. Late check here for late settings (eg tests)
		if( $.support.pushState ) {
			return;
		}

		// If the hashchange has been explicitly ignored or we have no history at
		// this point skip the history managment and the addition of the history
		// entry to the event for the `navigate` bindings
		if( history.ignoreNextHashChange || history.stack.length == 0 ) {
			history.ignoreNextHashChange = false;
			return;
		}


		history.direct({
			currentUrl: path.parseLocation().hash ,
			either: function( historyEntry ) {
				event.hashchangeState = historyEntry;
			}
		});
	});

	// expose the history on the navigate method in anticipation of full integration with
	// existing navigation functionalty that is tightly coupled to the history information
	$.navigate.history = history = {
		// Array of pages that are visited during a single page load.
		// Each has a url and optional transition, title, and pageUrl (which represents the file path, in cases where URL is obscured, such as dialogs)
		stack: [],

		//maintain an index number for the active page in the stack
		activeIndex: 0,

		//get active
		getActive: function() {
			return this.stack[ this.activeIndex ];
		},

		getPrev: function() {
			return this.stack[ this.activeIndex - 1 ];
		},

		getNext: function() {
			return this.stack[ this.activeIndex + 1 ];
		},

		// addNew is used whenever a new page is added
		add: function( url, data ){
			data = data || {};

			//if there's forward history, wipe it
			if ( this.getNext() ) {
				this.clearForward();
			}

			data.url = url;
			this.stack.push( data );
			this.activeIndex = this.stack.length - 1;
		},

		//wipe urls ahead of active index
		clearForward: function() {
			this.stack = this.stack.slice( 0, this.activeIndex + 1 );
		},

		direct: function( opts ) {
			var back, forward, newActiveIndex, prev = this.getActive(), a = this.activeIndex;

			// check if url is in history and if it's ahead or behind current page
			$.each( this.stack, function( i, historyEntry ) {
				//if the url is in the stack, it's a forward or a back
				if ( decodeURIComponent( opts.currentUrl ) === decodeURIComponent( historyEntry.url ) ) {
					//define back and forward by whether url is older or newer than current page
					back = i < this.activeIndex;
					forward = !back;
					newActiveIndex = i;
				}
			});

			// save new page index, null check to prevent falsey 0 result
			this.activeIndex = newActiveIndex !== undefined ? newActiveIndex : this.activeIndex;

			if ( back ) {
				( opts.either || opts.isBack )( this.getActive() );
			} else if ( forward ) {
				( opts.either || opts.isForward )( this.getActive() );
			}
		},

		//disable hashchange event listener internally to ignore one change
		//toggled internally when location.hash is updated to match the url of a successful page load
		ignoreNextHashChange: false
	};

	// Set the initial url history state
	history.add( path.parseLocation().pathname + path.parseLocation().search, {});
})( jQuery );

//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
});
//>>excludeEnd("jqmBuildExclude");