/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 1.0.1
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/


/**
 * Instantiate fast-clicking listeners on the specificed layer.
 *
 * @constructor
 * @param {Element} layer The layer to listen on
 * @param {Object} options The options to override the defaults
 */
function FastClick(layer, options) {
	'use strict';
	var oldOnClick;

	options = options || {};

	/**
	 * Whether a click is currently being tracked.
	 *
	 * @type boolean
	 */
	this.trackingClick = false;


	/**
	 * Timestamp for when click tracking started.
	 *
	 * @type number
	 */
	this.trackingClickStart = 0;


	/**
	 * The element being tracked for a click.
	 *
	 * @type EventTarget
	 */
	this.targetElement = null;


	/**
	 * X-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartX = 0;


	/**
	 * Y-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartY = 0;


	/**
	 * ID of the last touch, retrieved from Touch.identifier.
	 *
	 * @type number
	 */
	this.lastTouchIdentifier = 0;


	/**
	 * Touchmove boundary, beyond which a click will be cancelled.
	 *
	 * @type number
	 */
	this.touchBoundary = options.touchBoundary || 10;


	/**
	 * The FastClick layer.
	 *
	 * @type Element
	 */
	this.layer = layer;

	/**
	 * The minimum time between tap(touchstart and touchend) events
	 *
	 * @type number
	 */
	this.tapDelay = options.tapDelay || 200;

	if (FastClick.notNeeded(layer)) {
		return;
	}

	// Some old versions of Android don't have Function.prototype.bind
	function bind(method, context) {
		return function() { return method.apply(context, arguments); };
	}


	var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
	var context = this;
	for (var i = 0, l = methods.length; i < l; i++) {
		context[methods[i]] = bind(context[methods[i]], context);
	}

	// Set up event handlers as required
	if (deviceIsAndroid) {
		layer.addEventListener('mouseover', this.onMouse, true);
		layer.addEventListener('mousedown', this.onMouse, true);
		layer.addEventListener('mouseup', this.onMouse, true);
	}

	layer.addEventListener('click', this.onClick, true);
	layer.addEventListener('touchstart', this.onTouchStart, false);
	layer.addEventListener('touchmove', this.onTouchMove, false);
	layer.addEventListener('touchend', this.onTouchEnd, false);
	layer.addEventListener('touchcancel', this.onTouchCancel, false);

	// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
	// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
	// layer when they are cancelled.
	if (!Event.prototype.stopImmediatePropagation) {
		layer.removeEventListener = function(type, callback, capture) {
			var rmv = Node.prototype.removeEventListener;
			if (type === 'click') {
				rmv.call(layer, type, callback.hijacked || callback, capture);
			} else {
				rmv.call(layer, type, callback, capture);
			}
		};

		layer.addEventListener = function(type, callback, capture) {
			var adv = Node.prototype.addEventListener;
			if (type === 'click') {
				adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
					if (!event.propagationStopped) {
						callback(event);
					}
				}), capture);
			} else {
				adv.call(layer, type, callback, capture);
			}
		};
	}

	// If a handler is already declared in the element's onclick attribute, it will be fired before
	// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
	// adding it as listener.
	if (typeof layer.onclick === 'function') {

		// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
		// - the old one won't work if passed to addEventListener directly.
		oldOnClick = layer.onclick;
		layer.addEventListener('click', function(event) {
			oldOnClick(event);
		}, false);
		layer.onclick = null;
	}
}


/**
 * Android requires exceptions.
 *
 * @type boolean
 */
var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;


/**
 * iOS requires exceptions.
 *
 * @type boolean
 */
var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);


/**
 * iOS 4 requires an exception for select elements.
 *
 * @type boolean
 */
var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


/**
 * iOS 6.0(+?) requires the target element to be manually derived
 *
 * @type boolean
 */
var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);


/**
 * Determine whether a given element requires a native click.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element needs a native click
 */
FastClick.prototype.needsClick = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {

	// Don't send a synthetic click to disabled inputs (issue #62)
	case 'button':
	case 'select':
	case 'textarea':
		if (target.disabled) {
			return true;
		}

		break;
	case 'input':

		// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
		if ((deviceIsIOS && target.type === 'file') || target.disabled) {
			return true;
		}

		break;
	case 'label':
	case 'video':
		return true;
	}

	return (/\bneedsclick\b/).test(target.className);
};


/**
 * Determine whether a given element requires a call to focus to simulate click into element.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
 */
FastClick.prototype.needsFocus = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {
	case 'textarea':
		return true;
	case 'select':
		return !deviceIsAndroid;
	case 'input':
		switch (target.type) {
		case 'button':
		case 'checkbox':
		case 'file':
		case 'image':
		case 'radio':
		case 'submit':
			return false;
		}

		// No point in attempting to focus disabled inputs
		return !target.disabled && !target.readOnly;
	default:
		return (/\bneedsfocus\b/).test(target.className);
	}
};


/**
 * Send a click event to the specified element.
 *
 * @param {EventTarget|Element} targetElement
 * @param {Event} event
 */
FastClick.prototype.sendClick = function(targetElement, event) {
	'use strict';
	var clickEvent, touch;

	// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
	if (document.activeElement && document.activeElement !== targetElement) {
		document.activeElement.blur();
	}

	touch = event.changedTouches[0];

	// Synthesise a click event, with an extra attribute so it can be tracked
	clickEvent = document.createEvent('MouseEvents');
	clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
	clickEvent.forwardedTouchEvent = true;
	targetElement.dispatchEvent(clickEvent);
};

FastClick.prototype.determineEventType = function(targetElement) {
	'use strict';

	//Issue #159: Android Chrome Select Box does not open with a synthetic click event
	if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
		return 'mousedown';
	}

	return 'click';
};


/**
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.focus = function(targetElement) {
	'use strict';
	var length;

	// Issue #160: on iOS 7, some input elements (e.g. date datetime) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
	if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time') {
		length = targetElement.value.length;
		targetElement.setSelectionRange(length, length);
	} else {
		targetElement.focus();
	}
};


/**
 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
 *
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.updateScrollParent = function(targetElement) {
	'use strict';
	var scrollParent, parentElement;

	scrollParent = targetElement.fastClickScrollParent;

	// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
	// target element was moved to another parent.
	if (!scrollParent || !scrollParent.contains(targetElement)) {
		parentElement = targetElement;
		do {
			if (parentElement.scrollHeight > parentElement.offsetHeight) {
				scrollParent = parentElement;
				targetElement.fastClickScrollParent = parentElement;
				break;
			}

			parentElement = parentElement.parentElement;
		} while (parentElement);
	}

	// Always update the scroll top tracker if possible.
	if (scrollParent) {
		scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
	}
};


/**
 * @param {EventTarget} targetElement
 * @returns {Element|EventTarget}
 */
FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
	'use strict';

	// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
	if (eventTarget.nodeType === Node.TEXT_NODE) {
		return eventTarget.parentNode;
	}

	return eventTarget;
};


/**
 * On touch start, record the position and scroll offset.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchStart = function(event) {
	'use strict';
	var targetElement, touch, selection;

	// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
	if (event.targetTouches.length > 1) {
		return true;
	}

	targetElement = this.getTargetElementFromEventTarget(event.target);
	touch = event.targetTouches[0];

	if (deviceIsIOS) {

		// Only trusted events will deselect text on iOS (issue #49)
		selection = window.getSelection();
		if (selection.rangeCount && !selection.isCollapsed) {
			return true;
		}

		if (!deviceIsIOS4) {

			// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
			// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
			// with the same identifier as the touch event that previously triggered the click that triggered the alert.
			// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
			// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
			if (touch.identifier === this.lastTouchIdentifier) {
				event.preventDefault();
				return false;
			}

			this.lastTouchIdentifier = touch.identifier;

			// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
			// 1) the user does a fling scroll on the scrollable layer
			// 2) the user stops the fling scroll with another tap
			// then the event.target of the last 'touchend' event will be the element that was under the user's finger
			// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
			// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
			this.updateScrollParent(targetElement);
		}
	}

	this.trackingClick = true;
	this.trackingClickStart = event.timeStamp;
	this.targetElement = targetElement;

	this.touchStartX = touch.pageX;
	this.touchStartY = touch.pageY;

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
		event.preventDefault();
	}

	return true;
};


/**
 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.touchHasMoved = function(event) {
	'use strict';
	var touch = event.changedTouches[0], boundary = this.touchBoundary;

	if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
		return true;
	}

	return false;
};


/**
 * Update the last position.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchMove = function(event) {
	'use strict';
	if (!this.trackingClick) {
		return true;
	}

	// If the touch has moved, cancel the click tracking
	if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
		this.trackingClick = false;
		this.targetElement = null;
	}

	return true;
};


/**
 * Attempt to find the labelled control for the given label element.
 *
 * @param {EventTarget|HTMLLabelElement} labelElement
 * @returns {Element|null}
 */
FastClick.prototype.findControl = function(labelElement) {
	'use strict';

	// Fast path for newer browsers supporting the HTML5 control attribute
	if (labelElement.control !== undefined) {
		return labelElement.control;
	}

	// All browsers under test that support touch events also support the HTML5 htmlFor attribute
	if (labelElement.htmlFor) {
		return document.getElementById(labelElement.htmlFor);
	}

	// If no for attribute exists, attempt to retrieve the first labellable descendant element
	// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
	return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
};


/**
 * On touch end, determine whether to send a click event at once.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchEnd = function(event) {
	'use strict';
	var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

	if (!this.trackingClick) {
		return true;
	}

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
		this.cancelNextClick = true;
		return true;
	}

	// Reset to prevent wrong click cancel on input (issue #156).
	this.cancelNextClick = false;

	this.lastClickTime = event.timeStamp;

	trackingClickStart = this.trackingClickStart;
	this.trackingClick = false;
	this.trackingClickStart = 0;

	// On some iOS devices, the targetElement supplied with the event is invalid if the layer
	// is performing a transition or scroll, and has to be re-detected manually. Note that
	// for this to function correctly, it must be called *after* the event target is checked!
	// See issue #57; also filed as rdar://13048589 .
	if (deviceIsIOSWithBadTarget) {
		touch = event.changedTouches[0];

		// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
		targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
		targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
	}

	targetTagName = targetElement.tagName.toLowerCase();
	if (targetTagName === 'label') {
		forElement = this.findControl(targetElement);
		if (forElement) {
			this.focus(targetElement);
			if (deviceIsAndroid) {
				return false;
			}

			targetElement = forElement;
		}
	} else if (this.needsFocus(targetElement)) {

		// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
		// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
		if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
			this.targetElement = null;
			return false;
		}

		this.focus(targetElement);
		this.sendClick(targetElement, event);

		// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
		// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
		if (!deviceIsIOS || targetTagName !== 'select') {
			this.targetElement = null;
			event.preventDefault();
		}

		return false;
	}

	if (deviceIsIOS && !deviceIsIOS4) {

		// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
		// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
		scrollParent = targetElement.fastClickScrollParent;
		if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
			return true;
		}
	}

	// Prevent the actual click from going though - unless the target node is marked as requiring
	// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
	if (!this.needsClick(targetElement)) {
		event.preventDefault();
		this.sendClick(targetElement, event);
	}

	return false;
};


/**
 * On touch cancel, stop tracking the click.
 *
 * @returns {void}
 */
FastClick.prototype.onTouchCancel = function() {
	'use strict';
	this.trackingClick = false;
	this.targetElement = null;
};


/**
 * Determine mouse events which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onMouse = function(event) {
	'use strict';

	// If a target element was never set (because a touch event was never fired) allow the event
	if (!this.targetElement) {
		return true;
	}

	if (event.forwardedTouchEvent) {
		return true;
	}

	// Programmatically generated events targeting a specific element should be permitted
	if (!event.cancelable) {
		return true;
	}

	// Derive and check the target element to see whether the mouse event needs to be permitted;
	// unless explicitly enabled, prevent non-touch click events from triggering actions,
	// to prevent ghost/doubleclicks.
	if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

		// Prevent any user-added listeners declared on FastClick element from being fired.
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		} else {

			// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
			event.propagationStopped = true;
		}

		// Cancel the event
		event.stopPropagation();
		event.preventDefault();

		return false;
	}

	// If the mouse event is permitted, return true for the action to go through.
	return true;
};


/**
 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
 * an actual click which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onClick = function(event) {
	'use strict';
	var permitted;

	// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
	if (this.trackingClick) {
		this.targetElement = null;
		this.trackingClick = false;
		return true;
	}

	// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
	if (event.target.type === 'submit' && event.detail === 0) {
		return true;
	}

	permitted = this.onMouse(event);

	// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
	if (!permitted) {
		this.targetElement = null;
	}

	// If clicks are permitted, return true for the action to go through.
	return permitted;
};


/**
 * Remove all FastClick's event listeners.
 *
 * @returns {void}
 */
FastClick.prototype.destroy = function() {
	'use strict';
	var layer = this.layer;

	if (deviceIsAndroid) {
		layer.removeEventListener('mouseover', this.onMouse, true);
		layer.removeEventListener('mousedown', this.onMouse, true);
		layer.removeEventListener('mouseup', this.onMouse, true);
	}

	layer.removeEventListener('click', this.onClick, true);
	layer.removeEventListener('touchstart', this.onTouchStart, false);
	layer.removeEventListener('touchmove', this.onTouchMove, false);
	layer.removeEventListener('touchend', this.onTouchEnd, false);
	layer.removeEventListener('touchcancel', this.onTouchCancel, false);
};


/**
 * Check whether FastClick is needed.
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.notNeeded = function(layer) {
	'use strict';
	var metaViewport;
	var chromeVersion;

	// Devices that don't support touch don't need FastClick
	if (typeof window.ontouchstart === 'undefined') {
		return true;
	}

	// Chrome version - zero for other browsers
	chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

	if (chromeVersion) {

		if (deviceIsAndroid) {
			metaViewport = document.querySelector('meta[name=viewport]');

			if (metaViewport) {
				// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
				if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
					return true;
				}
				// Chrome 32 and above with width=device-width or less don't need FastClick
				if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
					return true;
				}
			}

		// Chrome desktop doesn't need FastClick (issue #15)
		} else {
			return true;
		}
	}

	// IE10 with -ms-touch-action: none, which disables double-tap-to-zoom (issue #97)
	if (layer.style.msTouchAction === 'none') {
		return true;
	}

	return false;
};


/**
 * Factory method for creating a FastClick object
 *
 * @param {Element} layer The layer to listen on
 * @param {Object} options The options to override the defaults
 */
FastClick.attach = function(layer, options) {
	'use strict';
	return new FastClick(layer, options);
};


if (typeof define !== 'undefined' && define.amd) {

	// AMD. Register as an anonymous module.
	define(function() {
		'use strict';
		return FastClick;
	});
} else if (typeof module !== 'undefined' && module.exports) {
	module.exports = FastClick.attach;
	module.exports.FastClick = FastClick;
} else {
	window.FastClick = FastClick;
}
/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.5.9
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
!function(a){"use strict";"function"==typeof define&&define.amd?define(["jquery"],a):"undefined"!=typeof exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){"use strict";var b=window.Slick||{};b=function(){function c(c,d){var f,e=this;e.defaults={accessibility:!0,adaptiveHeight:!1,appendArrows:a(c),appendDots:a(c),arrows:!0,asNavFor:null,prevArrow:'<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',nextArrow:'<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',autoplay:!1,autoplaySpeed:3e3,centerMode:!1,centerPadding:"50px",cssEase:"ease",customPaging:function(a,b){return'<button type="button" data-role="none" role="button" aria-required="false" tabindex="0">'+(b+1)+"</button>"},dots:!1,dotsClass:"slick-dots",draggable:!0,easing:"linear",edgeFriction:.35,fade:!1,focusOnSelect:!1,infinite:!0,initialSlide:0,lazyLoad:"ondemand",mobileFirst:!1,pauseOnHover:!0,pauseOnDotsHover:!1,respondTo:"window",responsive:null,rows:1,rtl:!1,slide:"",slidesPerRow:1,slidesToShow:1,slidesToScroll:1,speed:500,swipe:!0,swipeToSlide:!1,touchMove:!0,touchThreshold:5,useCSS:!0,useTransform:!0,variableWidth:!1,vertical:!1,verticalSwiping:!1,waitForAnimate:!0,zIndex:1e3},e.initials={animating:!1,dragging:!1,autoPlayTimer:null,currentDirection:0,currentLeft:null,currentSlide:0,direction:1,$dots:null,listWidth:null,listHeight:null,loadIndex:0,$nextArrow:null,$prevArrow:null,slideCount:null,slideWidth:null,$slideTrack:null,$slides:null,sliding:!1,slideOffset:0,swipeLeft:null,$list:null,touchObject:{},transformsEnabled:!1,unslicked:!1},a.extend(e,e.initials),e.activeBreakpoint=null,e.animType=null,e.animProp=null,e.breakpoints=[],e.breakpointSettings=[],e.cssTransitions=!1,e.hidden="hidden",e.paused=!1,e.positionProp=null,e.respondTo=null,e.rowCount=1,e.shouldClick=!0,e.$slider=a(c),e.$slidesCache=null,e.transformType=null,e.transitionType=null,e.visibilityChange="visibilitychange",e.windowWidth=0,e.windowTimer=null,f=a(c).data("slick")||{},e.options=a.extend({},e.defaults,f,d),e.currentSlide=e.options.initialSlide,e.originalSettings=e.options,"undefined"!=typeof document.mozHidden?(e.hidden="mozHidden",e.visibilityChange="mozvisibilitychange"):"undefined"!=typeof document.webkitHidden&&(e.hidden="webkitHidden",e.visibilityChange="webkitvisibilitychange"),e.autoPlay=a.proxy(e.autoPlay,e),e.autoPlayClear=a.proxy(e.autoPlayClear,e),e.changeSlide=a.proxy(e.changeSlide,e),e.clickHandler=a.proxy(e.clickHandler,e),e.selectHandler=a.proxy(e.selectHandler,e),e.setPosition=a.proxy(e.setPosition,e),e.swipeHandler=a.proxy(e.swipeHandler,e),e.dragHandler=a.proxy(e.dragHandler,e),e.keyHandler=a.proxy(e.keyHandler,e),e.autoPlayIterator=a.proxy(e.autoPlayIterator,e),e.instanceUid=b++,e.htmlExpr=/^(?:\s*(<[\w\W]+>)[^>]*)$/,e.registerBreakpoints(),e.init(!0),e.checkResponsive(!0)}var b=0;return c}(),b.prototype.addSlide=b.prototype.slickAdd=function(b,c,d){var e=this;if("boolean"==typeof c)d=c,c=null;else if(0>c||c>=e.slideCount)return!1;e.unload(),"number"==typeof c?0===c&&0===e.$slides.length?a(b).appendTo(e.$slideTrack):d?a(b).insertBefore(e.$slides.eq(c)):a(b).insertAfter(e.$slides.eq(c)):d===!0?a(b).prependTo(e.$slideTrack):a(b).appendTo(e.$slideTrack),e.$slides=e.$slideTrack.children(this.options.slide),e.$slideTrack.children(this.options.slide).detach(),e.$slideTrack.append(e.$slides),e.$slides.each(function(b,c){a(c).attr("data-slick-index",b)}),e.$slidesCache=e.$slides,e.reinit()},b.prototype.animateHeight=function(){var a=this;if(1===a.options.slidesToShow&&a.options.adaptiveHeight===!0&&a.options.vertical===!1){var b=a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.animate({height:b},a.options.speed)}},b.prototype.animateSlide=function(b,c){var d={},e=this;e.animateHeight(),e.options.rtl===!0&&e.options.vertical===!1&&(b=-b),e.transformsEnabled===!1?e.options.vertical===!1?e.$slideTrack.animate({left:b},e.options.speed,e.options.easing,c):e.$slideTrack.animate({top:b},e.options.speed,e.options.easing,c):e.cssTransitions===!1?(e.options.rtl===!0&&(e.currentLeft=-e.currentLeft),a({animStart:e.currentLeft}).animate({animStart:b},{duration:e.options.speed,easing:e.options.easing,step:function(a){a=Math.ceil(a),e.options.vertical===!1?(d[e.animType]="translate("+a+"px, 0px)",e.$slideTrack.css(d)):(d[e.animType]="translate(0px,"+a+"px)",e.$slideTrack.css(d))},complete:function(){c&&c.call()}})):(e.applyTransition(),b=Math.ceil(b),e.options.vertical===!1?d[e.animType]="translate3d("+b+"px, 0px, 0px)":d[e.animType]="translate3d(0px,"+b+"px, 0px)",e.$slideTrack.css(d),c&&setTimeout(function(){e.disableTransition(),c.call()},e.options.speed))},b.prototype.asNavFor=function(b){var c=this,d=c.options.asNavFor;d&&null!==d&&(d=a(d).not(c.$slider)),null!==d&&"object"==typeof d&&d.each(function(){var c=a(this).slick("getSlick");c.unslicked||c.slideHandler(b,!0)})},b.prototype.applyTransition=function(a){var b=this,c={};b.options.fade===!1?c[b.transitionType]=b.transformType+" "+b.options.speed+"ms "+b.options.cssEase:c[b.transitionType]="opacity "+b.options.speed+"ms "+b.options.cssEase,b.options.fade===!1?b.$slideTrack.css(c):b.$slides.eq(a).css(c)},b.prototype.autoPlay=function(){var a=this;a.autoPlayTimer&&clearInterval(a.autoPlayTimer),a.slideCount>a.options.slidesToShow&&a.paused!==!0&&(a.autoPlayTimer=setInterval(a.autoPlayIterator,a.options.autoplaySpeed))},b.prototype.autoPlayClear=function(){var a=this;a.autoPlayTimer&&clearInterval(a.autoPlayTimer)},b.prototype.autoPlayIterator=function(){var a=this;a.options.infinite===!1?1===a.direction?(a.currentSlide+1===a.slideCount-1&&(a.direction=0),a.slideHandler(a.currentSlide+a.options.slidesToScroll)):(a.currentSlide-1===0&&(a.direction=1),a.slideHandler(a.currentSlide-a.options.slidesToScroll)):a.slideHandler(a.currentSlide+a.options.slidesToScroll)},b.prototype.buildArrows=function(){var b=this;b.options.arrows===!0&&(b.$prevArrow=a(b.options.prevArrow).addClass("slick-arrow"),b.$nextArrow=a(b.options.nextArrow).addClass("slick-arrow"),b.slideCount>b.options.slidesToShow?(b.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),b.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),b.htmlExpr.test(b.options.prevArrow)&&b.$prevArrow.prependTo(b.options.appendArrows),b.htmlExpr.test(b.options.nextArrow)&&b.$nextArrow.appendTo(b.options.appendArrows),b.options.infinite!==!0&&b.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true")):b.$prevArrow.add(b.$nextArrow).addClass("slick-hidden").attr({"aria-disabled":"true",tabindex:"-1"}))},b.prototype.buildDots=function(){var c,d,b=this;if(b.options.dots===!0&&b.slideCount>b.options.slidesToShow){for(d='<ul class="'+b.options.dotsClass+'">',c=0;c<=b.getDotCount();c+=1)d+="<li>"+b.options.customPaging.call(this,b,c)+"</li>";d+="</ul>",b.$dots=a(d).appendTo(b.options.appendDots),b.$dots.find("li").first().addClass("slick-active").attr("aria-hidden","false")}},b.prototype.buildOut=function(){var b=this;b.$slides=b.$slider.children(b.options.slide+":not(.slick-cloned)").addClass("slick-slide"),b.slideCount=b.$slides.length,b.$slides.each(function(b,c){a(c).attr("data-slick-index",b).data("originalStyling",a(c).attr("style")||"")}),b.$slider.addClass("slick-slider"),b.$slideTrack=0===b.slideCount?a('<div class="slick-track"/>').appendTo(b.$slider):b.$slides.wrapAll('<div class="slick-track"/>').parent(),b.$list=b.$slideTrack.wrap('<div aria-live="polite" class="slick-list"/>').parent(),b.$slideTrack.css("opacity",0),(b.options.centerMode===!0||b.options.swipeToSlide===!0)&&(b.options.slidesToScroll=1),a("img[data-lazy]",b.$slider).not("[src]").addClass("slick-loading"),b.setupInfinite(),b.buildArrows(),b.buildDots(),b.updateDots(),b.setSlideClasses("number"==typeof b.currentSlide?b.currentSlide:0),b.options.draggable===!0&&b.$list.addClass("draggable")},b.prototype.buildRows=function(){var b,c,d,e,f,g,h,a=this;if(e=document.createDocumentFragment(),g=a.$slider.children(),a.options.rows>1){for(h=a.options.slidesPerRow*a.options.rows,f=Math.ceil(g.length/h),b=0;f>b;b++){var i=document.createElement("div");for(c=0;c<a.options.rows;c++){var j=document.createElement("div");for(d=0;d<a.options.slidesPerRow;d++){var k=b*h+(c*a.options.slidesPerRow+d);g.get(k)&&j.appendChild(g.get(k))}i.appendChild(j)}e.appendChild(i)}a.$slider.html(e),a.$slider.children().children().children().css({width:100/a.options.slidesPerRow+"%",display:"inline-block"})}},b.prototype.checkResponsive=function(b,c){var e,f,g,d=this,h=!1,i=d.$slider.width(),j=window.innerWidth||a(window).width();if("window"===d.respondTo?g=j:"slider"===d.respondTo?g=i:"min"===d.respondTo&&(g=Math.min(j,i)),d.options.responsive&&d.options.responsive.length&&null!==d.options.responsive){f=null;for(e in d.breakpoints)d.breakpoints.hasOwnProperty(e)&&(d.originalSettings.mobileFirst===!1?g<d.breakpoints[e]&&(f=d.breakpoints[e]):g>d.breakpoints[e]&&(f=d.breakpoints[e]));null!==f?null!==d.activeBreakpoint?(f!==d.activeBreakpoint||c)&&(d.activeBreakpoint=f,"unslick"===d.breakpointSettings[f]?d.unslick(f):(d.options=a.extend({},d.originalSettings,d.breakpointSettings[f]),b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b)),h=f):(d.activeBreakpoint=f,"unslick"===d.breakpointSettings[f]?d.unslick(f):(d.options=a.extend({},d.originalSettings,d.breakpointSettings[f]),b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b)),h=f):null!==d.activeBreakpoint&&(d.activeBreakpoint=null,d.options=d.originalSettings,b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b),h=f),b||h===!1||d.$slider.trigger("breakpoint",[d,h])}},b.prototype.changeSlide=function(b,c){var f,g,h,d=this,e=a(b.target);switch(e.is("a")&&b.preventDefault(),e.is("li")||(e=e.closest("li")),h=d.slideCount%d.options.slidesToScroll!==0,f=h?0:(d.slideCount-d.currentSlide)%d.options.slidesToScroll,b.data.message){case"previous":g=0===f?d.options.slidesToScroll:d.options.slidesToShow-f,d.slideCount>d.options.slidesToShow&&d.slideHandler(d.currentSlide-g,!1,c);break;case"next":g=0===f?d.options.slidesToScroll:f,d.slideCount>d.options.slidesToShow&&d.slideHandler(d.currentSlide+g,!1,c);break;case"index":var i=0===b.data.index?0:b.data.index||e.index()*d.options.slidesToScroll;d.slideHandler(d.checkNavigable(i),!1,c),e.children().trigger("focus");break;default:return}},b.prototype.checkNavigable=function(a){var c,d,b=this;if(c=b.getNavigableIndexes(),d=0,a>c[c.length-1])a=c[c.length-1];else for(var e in c){if(a<c[e]){a=d;break}d=c[e]}return a},b.prototype.cleanUpEvents=function(){var b=this;b.options.dots&&null!==b.$dots&&(a("li",b.$dots).off("click.slick",b.changeSlide),b.options.pauseOnDotsHover===!0&&b.options.autoplay===!0&&a("li",b.$dots).off("mouseenter.slick",a.proxy(b.setPaused,b,!0)).off("mouseleave.slick",a.proxy(b.setPaused,b,!1))),b.options.arrows===!0&&b.slideCount>b.options.slidesToShow&&(b.$prevArrow&&b.$prevArrow.off("click.slick",b.changeSlide),b.$nextArrow&&b.$nextArrow.off("click.slick",b.changeSlide)),b.$list.off("touchstart.slick mousedown.slick",b.swipeHandler),b.$list.off("touchmove.slick mousemove.slick",b.swipeHandler),b.$list.off("touchend.slick mouseup.slick",b.swipeHandler),b.$list.off("touchcancel.slick mouseleave.slick",b.swipeHandler),b.$list.off("click.slick",b.clickHandler),a(document).off(b.visibilityChange,b.visibility),b.$list.off("mouseenter.slick",a.proxy(b.setPaused,b,!0)),b.$list.off("mouseleave.slick",a.proxy(b.setPaused,b,!1)),b.options.accessibility===!0&&b.$list.off("keydown.slick",b.keyHandler),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().off("click.slick",b.selectHandler),a(window).off("orientationchange.slick.slick-"+b.instanceUid,b.orientationChange),a(window).off("resize.slick.slick-"+b.instanceUid,b.resize),a("[draggable!=true]",b.$slideTrack).off("dragstart",b.preventDefault),a(window).off("load.slick.slick-"+b.instanceUid,b.setPosition),a(document).off("ready.slick.slick-"+b.instanceUid,b.setPosition)},b.prototype.cleanUpRows=function(){var b,a=this;a.options.rows>1&&(b=a.$slides.children().children(),b.removeAttr("style"),a.$slider.html(b))},b.prototype.clickHandler=function(a){var b=this;b.shouldClick===!1&&(a.stopImmediatePropagation(),a.stopPropagation(),a.preventDefault())},b.prototype.destroy=function(b){var c=this;c.autoPlayClear(),c.touchObject={},c.cleanUpEvents(),a(".slick-cloned",c.$slider).detach(),c.$dots&&c.$dots.remove(),c.$prevArrow&&c.$prevArrow.length&&(c.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),c.htmlExpr.test(c.options.prevArrow)&&c.$prevArrow.remove()),c.$nextArrow&&c.$nextArrow.length&&(c.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),c.htmlExpr.test(c.options.nextArrow)&&c.$nextArrow.remove()),c.$slides&&(c.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function(){a(this).attr("style",a(this).data("originalStyling"))}),c.$slideTrack.children(this.options.slide).detach(),c.$slideTrack.detach(),c.$list.detach(),c.$slider.append(c.$slides)),c.cleanUpRows(),c.$slider.removeClass("slick-slider"),c.$slider.removeClass("slick-initialized"),c.unslicked=!0,b||c.$slider.trigger("destroy",[c])},b.prototype.disableTransition=function(a){var b=this,c={};c[b.transitionType]="",b.options.fade===!1?b.$slideTrack.css(c):b.$slides.eq(a).css(c)},b.prototype.fadeSlide=function(a,b){var c=this;c.cssTransitions===!1?(c.$slides.eq(a).css({zIndex:c.options.zIndex}),c.$slides.eq(a).animate({opacity:1},c.options.speed,c.options.easing,b)):(c.applyTransition(a),c.$slides.eq(a).css({opacity:1,zIndex:c.options.zIndex}),b&&setTimeout(function(){c.disableTransition(a),b.call()},c.options.speed))},b.prototype.fadeSlideOut=function(a){var b=this;b.cssTransitions===!1?b.$slides.eq(a).animate({opacity:0,zIndex:b.options.zIndex-2},b.options.speed,b.options.easing):(b.applyTransition(a),b.$slides.eq(a).css({opacity:0,zIndex:b.options.zIndex-2}))},b.prototype.filterSlides=b.prototype.slickFilter=function(a){var b=this;null!==a&&(b.$slidesCache=b.$slides,b.unload(),b.$slideTrack.children(this.options.slide).detach(),b.$slidesCache.filter(a).appendTo(b.$slideTrack),b.reinit())},b.prototype.getCurrent=b.prototype.slickCurrentSlide=function(){var a=this;return a.currentSlide},b.prototype.getDotCount=function(){var a=this,b=0,c=0,d=0;if(a.options.infinite===!0)for(;b<a.slideCount;)++d,b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;else if(a.options.centerMode===!0)d=a.slideCount;else for(;b<a.slideCount;)++d,b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;return d-1},b.prototype.getLeft=function(a){var c,d,f,b=this,e=0;return b.slideOffset=0,d=b.$slides.first().outerHeight(!0),b.options.infinite===!0?(b.slideCount>b.options.slidesToShow&&(b.slideOffset=b.slideWidth*b.options.slidesToShow*-1,e=d*b.options.slidesToShow*-1),b.slideCount%b.options.slidesToScroll!==0&&a+b.options.slidesToScroll>b.slideCount&&b.slideCount>b.options.slidesToShow&&(a>b.slideCount?(b.slideOffset=(b.options.slidesToShow-(a-b.slideCount))*b.slideWidth*-1,e=(b.options.slidesToShow-(a-b.slideCount))*d*-1):(b.slideOffset=b.slideCount%b.options.slidesToScroll*b.slideWidth*-1,e=b.slideCount%b.options.slidesToScroll*d*-1))):a+b.options.slidesToShow>b.slideCount&&(b.slideOffset=(a+b.options.slidesToShow-b.slideCount)*b.slideWidth,e=(a+b.options.slidesToShow-b.slideCount)*d),b.slideCount<=b.options.slidesToShow&&(b.slideOffset=0,e=0),b.options.centerMode===!0&&b.options.infinite===!0?b.slideOffset+=b.slideWidth*Math.floor(b.options.slidesToShow/2)-b.slideWidth:b.options.centerMode===!0&&(b.slideOffset=0,b.slideOffset+=b.slideWidth*Math.floor(b.options.slidesToShow/2)),c=b.options.vertical===!1?a*b.slideWidth*-1+b.slideOffset:a*d*-1+e,b.options.variableWidth===!0&&(f=b.slideCount<=b.options.slidesToShow||b.options.infinite===!1?b.$slideTrack.children(".slick-slide").eq(a):b.$slideTrack.children(".slick-slide").eq(a+b.options.slidesToShow),c=b.options.rtl===!0?f[0]?-1*(b.$slideTrack.width()-f[0].offsetLeft-f.width()):0:f[0]?-1*f[0].offsetLeft:0,b.options.centerMode===!0&&(f=b.slideCount<=b.options.slidesToShow||b.options.infinite===!1?b.$slideTrack.children(".slick-slide").eq(a):b.$slideTrack.children(".slick-slide").eq(a+b.options.slidesToShow+1),c=b.options.rtl===!0?f[0]?-1*(b.$slideTrack.width()-f[0].offsetLeft-f.width()):0:f[0]?-1*f[0].offsetLeft:0,c+=(b.$list.width()-f.outerWidth())/2)),c},b.prototype.getOption=b.prototype.slickGetOption=function(a){var b=this;return b.options[a]},b.prototype.getNavigableIndexes=function(){var e,a=this,b=0,c=0,d=[];for(a.options.infinite===!1?e=a.slideCount:(b=-1*a.options.slidesToScroll,c=-1*a.options.slidesToScroll,e=2*a.slideCount);e>b;)d.push(b),b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;return d},b.prototype.getSlick=function(){return this},b.prototype.getSlideCount=function(){var c,d,e,b=this;return e=b.options.centerMode===!0?b.slideWidth*Math.floor(b.options.slidesToShow/2):0,b.options.swipeToSlide===!0?(b.$slideTrack.find(".slick-slide").each(function(c,f){return f.offsetLeft-e+a(f).outerWidth()/2>-1*b.swipeLeft?(d=f,!1):void 0}),c=Math.abs(a(d).attr("data-slick-index")-b.currentSlide)||1):b.options.slidesToScroll},b.prototype.goTo=b.prototype.slickGoTo=function(a,b){var c=this;c.changeSlide({data:{message:"index",index:parseInt(a)}},b)},b.prototype.init=function(b){var c=this;a(c.$slider).hasClass("slick-initialized")||(a(c.$slider).addClass("slick-initialized"),c.buildRows(),c.buildOut(),c.setProps(),c.startLoad(),c.loadSlider(),c.initializeEvents(),c.updateArrows(),c.updateDots()),b&&c.$slider.trigger("init",[c]),c.options.accessibility===!0&&c.initADA()},b.prototype.initArrowEvents=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.on("click.slick",{message:"previous"},a.changeSlide),a.$nextArrow.on("click.slick",{message:"next"},a.changeSlide))},b.prototype.initDotEvents=function(){var b=this;b.options.dots===!0&&b.slideCount>b.options.slidesToShow&&a("li",b.$dots).on("click.slick",{message:"index"},b.changeSlide),b.options.dots===!0&&b.options.pauseOnDotsHover===!0&&b.options.autoplay===!0&&a("li",b.$dots).on("mouseenter.slick",a.proxy(b.setPaused,b,!0)).on("mouseleave.slick",a.proxy(b.setPaused,b,!1))},b.prototype.initializeEvents=function(){var b=this;b.initArrowEvents(),b.initDotEvents(),b.$list.on("touchstart.slick mousedown.slick",{action:"start"},b.swipeHandler),b.$list.on("touchmove.slick mousemove.slick",{action:"move"},b.swipeHandler),b.$list.on("touchend.slick mouseup.slick",{action:"end"},b.swipeHandler),b.$list.on("touchcancel.slick mouseleave.slick",{action:"end"},b.swipeHandler),b.$list.on("click.slick",b.clickHandler),a(document).on(b.visibilityChange,a.proxy(b.visibility,b)),b.$list.on("mouseenter.slick",a.proxy(b.setPaused,b,!0)),b.$list.on("mouseleave.slick",a.proxy(b.setPaused,b,!1)),b.options.accessibility===!0&&b.$list.on("keydown.slick",b.keyHandler),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().on("click.slick",b.selectHandler),a(window).on("orientationchange.slick.slick-"+b.instanceUid,a.proxy(b.orientationChange,b)),a(window).on("resize.slick.slick-"+b.instanceUid,a.proxy(b.resize,b)),a("[draggable!=true]",b.$slideTrack).on("dragstart",b.preventDefault),a(window).on("load.slick.slick-"+b.instanceUid,b.setPosition),a(document).on("ready.slick.slick-"+b.instanceUid,b.setPosition)},b.prototype.initUI=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.show(),a.$nextArrow.show()),a.options.dots===!0&&a.slideCount>a.options.slidesToShow&&a.$dots.show(),a.options.autoplay===!0&&a.autoPlay()},b.prototype.keyHandler=function(a){var b=this;a.target.tagName.match("TEXTAREA|INPUT|SELECT")||(37===a.keyCode&&b.options.accessibility===!0?b.changeSlide({data:{message:"previous"}}):39===a.keyCode&&b.options.accessibility===!0&&b.changeSlide({data:{message:"next"}}))},b.prototype.lazyLoad=function(){function g(b){a("img[data-lazy]",b).each(function(){var b=a(this),c=a(this).attr("data-lazy"),d=document.createElement("img");d.onload=function(){b.animate({opacity:0},100,function(){b.attr("src",c).animate({opacity:1},200,function(){b.removeAttr("data-lazy").removeClass("slick-loading")})})},d.src=c})}var c,d,e,f,b=this;b.options.centerMode===!0?b.options.infinite===!0?(e=b.currentSlide+(b.options.slidesToShow/2+1),f=e+b.options.slidesToShow+2):(e=Math.max(0,b.currentSlide-(b.options.slidesToShow/2+1)),f=2+(b.options.slidesToShow/2+1)+b.currentSlide):(e=b.options.infinite?b.options.slidesToShow+b.currentSlide:b.currentSlide,f=e+b.options.slidesToShow,b.options.fade===!0&&(e>0&&e--,f<=b.slideCount&&f++)),c=b.$slider.find(".slick-slide").slice(e,f),g(c),b.slideCount<=b.options.slidesToShow?(d=b.$slider.find(".slick-slide"),g(d)):b.currentSlide>=b.slideCount-b.options.slidesToShow?(d=b.$slider.find(".slick-cloned").slice(0,b.options.slidesToShow),g(d)):0===b.currentSlide&&(d=b.$slider.find(".slick-cloned").slice(-1*b.options.slidesToShow),g(d))},b.prototype.loadSlider=function(){var a=this;a.setPosition(),a.$slideTrack.css({opacity:1}),a.$slider.removeClass("slick-loading"),a.initUI(),"progressive"===a.options.lazyLoad&&a.progressiveLazyLoad()},b.prototype.next=b.prototype.slickNext=function(){var a=this;a.changeSlide({data:{message:"next"}})},b.prototype.orientationChange=function(){var a=this;a.checkResponsive(),a.setPosition()},b.prototype.pause=b.prototype.slickPause=function(){var a=this;a.autoPlayClear(),a.paused=!0},b.prototype.play=b.prototype.slickPlay=function(){var a=this;a.paused=!1,a.autoPlay()},b.prototype.postSlide=function(a){var b=this;b.$slider.trigger("afterChange",[b,a]),b.animating=!1,b.setPosition(),b.swipeLeft=null,b.options.autoplay===!0&&b.paused===!1&&b.autoPlay(),b.options.accessibility===!0&&b.initADA()},b.prototype.prev=b.prototype.slickPrev=function(){var a=this;a.changeSlide({data:{message:"previous"}})},b.prototype.preventDefault=function(a){a.preventDefault()},b.prototype.progressiveLazyLoad=function(){var c,d,b=this;c=a("img[data-lazy]",b.$slider).length,c>0&&(d=a("img[data-lazy]",b.$slider).first(),d.attr("src",null),d.attr("src",d.attr("data-lazy")).removeClass("slick-loading").load(function(){d.removeAttr("data-lazy"),b.progressiveLazyLoad(),b.options.adaptiveHeight===!0&&b.setPosition()}).error(function(){d.removeAttr("data-lazy"),b.progressiveLazyLoad()}))},b.prototype.refresh=function(b){var d,e,c=this;e=c.slideCount-c.options.slidesToShow,c.options.infinite||(c.slideCount<=c.options.slidesToShow?c.currentSlide=0:c.currentSlide>e&&(c.currentSlide=e)),d=c.currentSlide,c.destroy(!0),a.extend(c,c.initials,{currentSlide:d}),c.init(),b||c.changeSlide({data:{message:"index",index:d}},!1)},b.prototype.registerBreakpoints=function(){var c,d,e,b=this,f=b.options.responsive||null;if("array"===a.type(f)&&f.length){b.respondTo=b.options.respondTo||"window";for(c in f)if(e=b.breakpoints.length-1,d=f[c].breakpoint,f.hasOwnProperty(c)){for(;e>=0;)b.breakpoints[e]&&b.breakpoints[e]===d&&b.breakpoints.splice(e,1),e--;b.breakpoints.push(d),b.breakpointSettings[d]=f[c].settings}b.breakpoints.sort(function(a,c){return b.options.mobileFirst?a-c:c-a})}},b.prototype.reinit=function(){var b=this;b.$slides=b.$slideTrack.children(b.options.slide).addClass("slick-slide"),b.slideCount=b.$slides.length,b.currentSlide>=b.slideCount&&0!==b.currentSlide&&(b.currentSlide=b.currentSlide-b.options.slidesToScroll),b.slideCount<=b.options.slidesToShow&&(b.currentSlide=0),b.registerBreakpoints(),b.setProps(),b.setupInfinite(),b.buildArrows(),b.updateArrows(),b.initArrowEvents(),b.buildDots(),b.updateDots(),b.initDotEvents(),b.checkResponsive(!1,!0),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().on("click.slick",b.selectHandler),b.setSlideClasses(0),b.setPosition(),b.$slider.trigger("reInit",[b]),b.options.autoplay===!0&&b.focusHandler()},b.prototype.resize=function(){var b=this;a(window).width()!==b.windowWidth&&(clearTimeout(b.windowDelay),b.windowDelay=window.setTimeout(function(){b.windowWidth=a(window).width(),b.checkResponsive(),b.unslicked||b.setPosition()},50))},b.prototype.removeSlide=b.prototype.slickRemove=function(a,b,c){var d=this;return"boolean"==typeof a?(b=a,a=b===!0?0:d.slideCount-1):a=b===!0?--a:a,d.slideCount<1||0>a||a>d.slideCount-1?!1:(d.unload(),c===!0?d.$slideTrack.children().remove():d.$slideTrack.children(this.options.slide).eq(a).remove(),d.$slides=d.$slideTrack.children(this.options.slide),d.$slideTrack.children(this.options.slide).detach(),d.$slideTrack.append(d.$slides),d.$slidesCache=d.$slides,void d.reinit())},b.prototype.setCSS=function(a){var d,e,b=this,c={};b.options.rtl===!0&&(a=-a),d="left"==b.positionProp?Math.ceil(a)+"px":"0px",e="top"==b.positionProp?Math.ceil(a)+"px":"0px",c[b.positionProp]=a,b.transformsEnabled===!1?b.$slideTrack.css(c):(c={},b.cssTransitions===!1?(c[b.animType]="translate("+d+", "+e+")",b.$slideTrack.css(c)):(c[b.animType]="translate3d("+d+", "+e+", 0px)",b.$slideTrack.css(c)))},b.prototype.setDimensions=function(){var a=this;a.options.vertical===!1?a.options.centerMode===!0&&a.$list.css({padding:"0px "+a.options.centerPadding}):(a.$list.height(a.$slides.first().outerHeight(!0)*a.options.slidesToShow),a.options.centerMode===!0&&a.$list.css({padding:a.options.centerPadding+" 0px"})),a.listWidth=a.$list.width(),a.listHeight=a.$list.height(),a.options.vertical===!1&&a.options.variableWidth===!1?(a.slideWidth=Math.ceil(a.listWidth/a.options.slidesToShow),a.$slideTrack.width(Math.ceil(a.slideWidth*a.$slideTrack.children(".slick-slide").length))):a.options.variableWidth===!0?a.$slideTrack.width(5e3*a.slideCount):(a.slideWidth=Math.ceil(a.listWidth),a.$slideTrack.height(Math.ceil(a.$slides.first().outerHeight(!0)*a.$slideTrack.children(".slick-slide").length)));var b=a.$slides.first().outerWidth(!0)-a.$slides.first().width();a.options.variableWidth===!1&&a.$slideTrack.children(".slick-slide").width(a.slideWidth-b)},b.prototype.setFade=function(){var c,b=this;b.$slides.each(function(d,e){c=b.slideWidth*d*-1,b.options.rtl===!0?a(e).css({position:"relative",right:c,top:0,zIndex:b.options.zIndex-2,opacity:0}):a(e).css({position:"relative",left:c,top:0,zIndex:b.options.zIndex-2,opacity:0})}),b.$slides.eq(b.currentSlide).css({zIndex:b.options.zIndex-1,opacity:1})},b.prototype.setHeight=function(){var a=this;if(1===a.options.slidesToShow&&a.options.adaptiveHeight===!0&&a.options.vertical===!1){var b=a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.css("height",b)}},b.prototype.setOption=b.prototype.slickSetOption=function(b,c,d){var f,g,e=this;if("responsive"===b&&"array"===a.type(c))for(g in c)if("array"!==a.type(e.options.responsive))e.options.responsive=[c[g]];else{for(f=e.options.responsive.length-1;f>=0;)e.options.responsive[f].breakpoint===c[g].breakpoint&&e.options.responsive.splice(f,1),f--;e.options.responsive.push(c[g])}else e.options[b]=c;d===!0&&(e.unload(),e.reinit())},b.prototype.setPosition=function(){var a=this;a.setDimensions(),a.setHeight(),a.options.fade===!1?a.setCSS(a.getLeft(a.currentSlide)):a.setFade(),a.$slider.trigger("setPosition",[a])},b.prototype.setProps=function(){var a=this,b=document.body.style;a.positionProp=a.options.vertical===!0?"top":"left","top"===a.positionProp?a.$slider.addClass("slick-vertical"):a.$slider.removeClass("slick-vertical"),(void 0!==b.WebkitTransition||void 0!==b.MozTransition||void 0!==b.msTransition)&&a.options.useCSS===!0&&(a.cssTransitions=!0),a.options.fade&&("number"==typeof a.options.zIndex?a.options.zIndex<3&&(a.options.zIndex=3):a.options.zIndex=a.defaults.zIndex),void 0!==b.OTransform&&(a.animType="OTransform",a.transformType="-o-transform",a.transitionType="OTransition",void 0===b.perspectiveProperty&&void 0===b.webkitPerspective&&(a.animType=!1)),void 0!==b.MozTransform&&(a.animType="MozTransform",a.transformType="-moz-transform",a.transitionType="MozTransition",void 0===b.perspectiveProperty&&void 0===b.MozPerspective&&(a.animType=!1)),void 0!==b.webkitTransform&&(a.animType="webkitTransform",a.transformType="-webkit-transform",a.transitionType="webkitTransition",void 0===b.perspectiveProperty&&void 0===b.webkitPerspective&&(a.animType=!1)),void 0!==b.msTransform&&(a.animType="msTransform",a.transformType="-ms-transform",a.transitionType="msTransition",void 0===b.msTransform&&(a.animType=!1)),void 0!==b.transform&&a.animType!==!1&&(a.animType="transform",a.transformType="transform",a.transitionType="transition"),a.transformsEnabled=a.options.useTransform&&null!==a.animType&&a.animType!==!1},b.prototype.setSlideClasses=function(a){var c,d,e,f,b=this;d=b.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden","true"),b.$slides.eq(a).addClass("slick-current"),b.options.centerMode===!0?(c=Math.floor(b.options.slidesToShow/2),b.options.infinite===!0&&(a>=c&&a<=b.slideCount-1-c?b.$slides.slice(a-c,a+c+1).addClass("slick-active").attr("aria-hidden","false"):(e=b.options.slidesToShow+a,d.slice(e-c+1,e+c+2).addClass("slick-active").attr("aria-hidden","false")),0===a?d.eq(d.length-1-b.options.slidesToShow).addClass("slick-center"):a===b.slideCount-1&&d.eq(b.options.slidesToShow).addClass("slick-center")),b.$slides.eq(a).addClass("slick-center")):a>=0&&a<=b.slideCount-b.options.slidesToShow?b.$slides.slice(a,a+b.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false"):d.length<=b.options.slidesToShow?d.addClass("slick-active").attr("aria-hidden","false"):(f=b.slideCount%b.options.slidesToShow,e=b.options.infinite===!0?b.options.slidesToShow+a:a,b.options.slidesToShow==b.options.slidesToScroll&&b.slideCount-a<b.options.slidesToShow?d.slice(e-(b.options.slidesToShow-f),e+f).addClass("slick-active").attr("aria-hidden","false"):d.slice(e,e+b.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false")),"ondemand"===b.options.lazyLoad&&b.lazyLoad()},b.prototype.setupInfinite=function(){var c,d,e,b=this;if(b.options.fade===!0&&(b.options.centerMode=!1),b.options.infinite===!0&&b.options.fade===!1&&(d=null,b.slideCount>b.options.slidesToShow)){for(e=b.options.centerMode===!0?b.options.slidesToShow+1:b.options.slidesToShow,c=b.slideCount;c>b.slideCount-e;c-=1)d=c-1,a(b.$slides[d]).clone(!0).attr("id","").attr("data-slick-index",d-b.slideCount).prependTo(b.$slideTrack).addClass("slick-cloned");for(c=0;e>c;c+=1)d=c,a(b.$slides[d]).clone(!0).attr("id","").attr("data-slick-index",d+b.slideCount).appendTo(b.$slideTrack).addClass("slick-cloned");b.$slideTrack.find(".slick-cloned").find("[id]").each(function(){a(this).attr("id","")})}},b.prototype.setPaused=function(a){var b=this;b.options.autoplay===!0&&b.options.pauseOnHover===!0&&(b.paused=a,a?b.autoPlayClear():b.autoPlay())},b.prototype.selectHandler=function(b){var c=this,d=a(b.target).is(".slick-slide")?a(b.target):a(b.target).parents(".slick-slide"),e=parseInt(d.attr("data-slick-index"));return e||(e=0),c.slideCount<=c.options.slidesToShow?(c.setSlideClasses(e),void c.asNavFor(e)):void c.slideHandler(e)},b.prototype.slideHandler=function(a,b,c){var d,e,f,g,h=null,i=this;return b=b||!1,i.animating===!0&&i.options.waitForAnimate===!0||i.options.fade===!0&&i.currentSlide===a||i.slideCount<=i.options.slidesToShow?void 0:(b===!1&&i.asNavFor(a),d=a,h=i.getLeft(d),g=i.getLeft(i.currentSlide),i.currentLeft=null===i.swipeLeft?g:i.swipeLeft,i.options.infinite===!1&&i.options.centerMode===!1&&(0>a||a>i.getDotCount()*i.options.slidesToScroll)?void(i.options.fade===!1&&(d=i.currentSlide,c!==!0?i.animateSlide(g,function(){i.postSlide(d);
}):i.postSlide(d))):i.options.infinite===!1&&i.options.centerMode===!0&&(0>a||a>i.slideCount-i.options.slidesToScroll)?void(i.options.fade===!1&&(d=i.currentSlide,c!==!0?i.animateSlide(g,function(){i.postSlide(d)}):i.postSlide(d))):(i.options.autoplay===!0&&clearInterval(i.autoPlayTimer),e=0>d?i.slideCount%i.options.slidesToScroll!==0?i.slideCount-i.slideCount%i.options.slidesToScroll:i.slideCount+d:d>=i.slideCount?i.slideCount%i.options.slidesToScroll!==0?0:d-i.slideCount:d,i.animating=!0,i.$slider.trigger("beforeChange",[i,i.currentSlide,e]),f=i.currentSlide,i.currentSlide=e,i.setSlideClasses(i.currentSlide),i.updateDots(),i.updateArrows(),i.options.fade===!0?(c!==!0?(i.fadeSlideOut(f),i.fadeSlide(e,function(){i.postSlide(e)})):i.postSlide(e),void i.animateHeight()):void(c!==!0?i.animateSlide(h,function(){i.postSlide(e)}):i.postSlide(e))))},b.prototype.startLoad=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.hide(),a.$nextArrow.hide()),a.options.dots===!0&&a.slideCount>a.options.slidesToShow&&a.$dots.hide(),a.$slider.addClass("slick-loading")},b.prototype.swipeDirection=function(){var a,b,c,d,e=this;return a=e.touchObject.startX-e.touchObject.curX,b=e.touchObject.startY-e.touchObject.curY,c=Math.atan2(b,a),d=Math.round(180*c/Math.PI),0>d&&(d=360-Math.abs(d)),45>=d&&d>=0?e.options.rtl===!1?"left":"right":360>=d&&d>=315?e.options.rtl===!1?"left":"right":d>=135&&225>=d?e.options.rtl===!1?"right":"left":e.options.verticalSwiping===!0?d>=35&&135>=d?"left":"right":"vertical"},b.prototype.swipeEnd=function(a){var c,b=this;if(b.dragging=!1,b.shouldClick=b.touchObject.swipeLength>10?!1:!0,void 0===b.touchObject.curX)return!1;if(b.touchObject.edgeHit===!0&&b.$slider.trigger("edge",[b,b.swipeDirection()]),b.touchObject.swipeLength>=b.touchObject.minSwipe)switch(b.swipeDirection()){case"left":c=b.options.swipeToSlide?b.checkNavigable(b.currentSlide+b.getSlideCount()):b.currentSlide+b.getSlideCount(),b.slideHandler(c),b.currentDirection=0,b.touchObject={},b.$slider.trigger("swipe",[b,"left"]);break;case"right":c=b.options.swipeToSlide?b.checkNavigable(b.currentSlide-b.getSlideCount()):b.currentSlide-b.getSlideCount(),b.slideHandler(c),b.currentDirection=1,b.touchObject={},b.$slider.trigger("swipe",[b,"right"])}else b.touchObject.startX!==b.touchObject.curX&&(b.slideHandler(b.currentSlide),b.touchObject={})},b.prototype.swipeHandler=function(a){var b=this;if(!(b.options.swipe===!1||"ontouchend"in document&&b.options.swipe===!1||b.options.draggable===!1&&-1!==a.type.indexOf("mouse")))switch(b.touchObject.fingerCount=a.originalEvent&&void 0!==a.originalEvent.touches?a.originalEvent.touches.length:1,b.touchObject.minSwipe=b.listWidth/b.options.touchThreshold,b.options.verticalSwiping===!0&&(b.touchObject.minSwipe=b.listHeight/b.options.touchThreshold),a.data.action){case"start":b.swipeStart(a);break;case"move":b.swipeMove(a);break;case"end":b.swipeEnd(a)}},b.prototype.swipeMove=function(a){var d,e,f,g,h,b=this;return h=void 0!==a.originalEvent?a.originalEvent.touches:null,!b.dragging||h&&1!==h.length?!1:(d=b.getLeft(b.currentSlide),b.touchObject.curX=void 0!==h?h[0].pageX:a.clientX,b.touchObject.curY=void 0!==h?h[0].pageY:a.clientY,b.touchObject.swipeLength=Math.round(Math.sqrt(Math.pow(b.touchObject.curX-b.touchObject.startX,2))),b.options.verticalSwiping===!0&&(b.touchObject.swipeLength=Math.round(Math.sqrt(Math.pow(b.touchObject.curY-b.touchObject.startY,2)))),e=b.swipeDirection(),"vertical"!==e?(void 0!==a.originalEvent&&b.touchObject.swipeLength>4&&a.preventDefault(),g=(b.options.rtl===!1?1:-1)*(b.touchObject.curX>b.touchObject.startX?1:-1),b.options.verticalSwiping===!0&&(g=b.touchObject.curY>b.touchObject.startY?1:-1),f=b.touchObject.swipeLength,b.touchObject.edgeHit=!1,b.options.infinite===!1&&(0===b.currentSlide&&"right"===e||b.currentSlide>=b.getDotCount()&&"left"===e)&&(f=b.touchObject.swipeLength*b.options.edgeFriction,b.touchObject.edgeHit=!0),b.options.vertical===!1?b.swipeLeft=d+f*g:b.swipeLeft=d+f*(b.$list.height()/b.listWidth)*g,b.options.verticalSwiping===!0&&(b.swipeLeft=d+f*g),b.options.fade===!0||b.options.touchMove===!1?!1:b.animating===!0?(b.swipeLeft=null,!1):void b.setCSS(b.swipeLeft)):void 0)},b.prototype.swipeStart=function(a){var c,b=this;return 1!==b.touchObject.fingerCount||b.slideCount<=b.options.slidesToShow?(b.touchObject={},!1):(void 0!==a.originalEvent&&void 0!==a.originalEvent.touches&&(c=a.originalEvent.touches[0]),b.touchObject.startX=b.touchObject.curX=void 0!==c?c.pageX:a.clientX,b.touchObject.startY=b.touchObject.curY=void 0!==c?c.pageY:a.clientY,void(b.dragging=!0))},b.prototype.unfilterSlides=b.prototype.slickUnfilter=function(){var a=this;null!==a.$slidesCache&&(a.unload(),a.$slideTrack.children(this.options.slide).detach(),a.$slidesCache.appendTo(a.$slideTrack),a.reinit())},b.prototype.unload=function(){var b=this;a(".slick-cloned",b.$slider).remove(),b.$dots&&b.$dots.remove(),b.$prevArrow&&b.htmlExpr.test(b.options.prevArrow)&&b.$prevArrow.remove(),b.$nextArrow&&b.htmlExpr.test(b.options.nextArrow)&&b.$nextArrow.remove(),b.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden","true").css("width","")},b.prototype.unslick=function(a){var b=this;b.$slider.trigger("unslick",[b,a]),b.destroy()},b.prototype.updateArrows=function(){var b,a=this;b=Math.floor(a.options.slidesToShow/2),a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&!a.options.infinite&&(a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false"),a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false"),0===a.currentSlide?(a.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false")):a.currentSlide>=a.slideCount-a.options.slidesToShow&&a.options.centerMode===!1?(a.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")):a.currentSlide>=a.slideCount-1&&a.options.centerMode===!0&&(a.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")))},b.prototype.updateDots=function(){var a=this;null!==a.$dots&&(a.$dots.find("li").removeClass("slick-active").attr("aria-hidden","true"),a.$dots.find("li").eq(Math.floor(a.currentSlide/a.options.slidesToScroll)).addClass("slick-active").attr("aria-hidden","false"))},b.prototype.visibility=function(){var a=this;document[a.hidden]?(a.paused=!0,a.autoPlayClear()):a.options.autoplay===!0&&(a.paused=!1,a.autoPlay())},b.prototype.initADA=function(){var b=this;b.$slides.add(b.$slideTrack.find(".slick-cloned")).attr({"aria-hidden":"true",tabindex:"-1"}).find("a, input, button, select").attr({tabindex:"-1"}),b.$slideTrack.attr("role","listbox"),b.$slides.not(b.$slideTrack.find(".slick-cloned")).each(function(c){a(this).attr({role:"option","aria-describedby":"slick-slide"+b.instanceUid+c})}),null!==b.$dots&&b.$dots.attr("role","tablist").find("li").each(function(c){a(this).attr({role:"presentation","aria-selected":"false","aria-controls":"navigation"+b.instanceUid+c,id:"slick-slide"+b.instanceUid+c})}).first().attr("aria-selected","true").end().find("button").attr("role","button").end().closest("div").attr("role","toolbar"),b.activateADA()},b.prototype.activateADA=function(){var a=this;a.$slideTrack.find(".slick-active").attr({"aria-hidden":"false"}).find("a, input, button, select").attr({tabindex:"0"})},b.prototype.focusHandler=function(){var b=this;b.$slider.on("focus.slick blur.slick","*",function(c){c.stopImmediatePropagation();var d=a(this);setTimeout(function(){b.isPlay&&(d.is(":focus")?(b.autoPlayClear(),b.paused=!0):(b.paused=!1,b.autoPlay()))},0)})},a.fn.slick=function(){var f,g,a=this,c=arguments[0],d=Array.prototype.slice.call(arguments,1),e=a.length;for(f=0;e>f;f++)if("object"==typeof c||"undefined"==typeof c?a[f].slick=new b(a[f],c):g=a[f].slick[c].apply(a[f].slick,d),"undefined"!=typeof g)return g;return a}});
/*! http://mths.be/placeholder v2.0.7 by @mathias */
;(function(f,h,$){var a='placeholder' in h.createElement('input'),d='placeholder' in h.createElement('textarea'),i=$.fn,c=$.valHooks,k,j;if(a&&d){j=i.placeholder=function(){return this};j.input=j.textarea=true}else{j=i.placeholder=function(){var l=this;l.filter((a?'textarea':':input')+'[placeholder]').not('.placeholder').bind({'focus.placeholder':b,'blur.placeholder':e}).data('placeholder-enabled',true).trigger('blur.placeholder');return l};j.input=a;j.textarea=d;k={get:function(m){var l=$(m);return l.data('placeholder-enabled')&&l.hasClass('placeholder')?'':m.value},set:function(m,n){var l=$(m);if(!l.data('placeholder-enabled')){return m.value=n}if(n==''){m.value=n;if(m!=h.activeElement){e.call(m)}}else{if(l.hasClass('placeholder')){b.call(m,true,n)||(m.value=n)}else{m.value=n}}return l}};a||(c.input=k);d||(c.textarea=k);$(function(){$(h).delegate('form','submit.placeholder',function(){var l=$('.placeholder',this).each(b);setTimeout(function(){l.each(e)},10)})});$(f).bind('beforeunload.placeholder',function(){$('.placeholder').each(function(){this.value=''})})}function g(m){var l={},n=/^jQuery\d+$/;$.each(m.attributes,function(p,o){if(o.specified&&!n.test(o.name)){l[o.name]=o.value}});return l}function b(m,n){var l=this,o=$(l);if(l.value==o.attr('placeholder')&&o.hasClass('placeholder')){if(o.data('placeholder-password')){o=o.hide().next().show().attr('id',o.removeAttr('id').data('placeholder-id'));if(m===true){return o[0].value=n}o.focus()}else{l.value='';o.removeClass('placeholder');l==h.activeElement&&l.select()}}}function e(){var q,l=this,p=$(l),m=p,o=this.id;if(l.value==''){if(l.type=='password'){if(!p.data('placeholder-textinput')){try{q=p.clone().attr({type:'text'})}catch(n){q=$('<input>').attr($.extend(g(this),{type:'text'}))}q.removeAttr('name').data({'placeholder-password':true,'placeholder-id':o}).bind('focus.placeholder',b);p.data({'placeholder-textinput':q,'placeholder-id':o}).before(q)}p=p.removeAttr('id').hide().prev().attr('id',o).show()}p.addClass('placeholder');p[0].value=p.attr('placeholder')}else{p.removeClass('placeholder')}}}(this,document,jQuery));
/*
    Killer Carousel 1 Site License (KC01-01).
    Version 1.2 rev 1501161200
    Please purchase an appropriate license to use this software.
    License Agreement: www.starplugins.com/license
    Copyright (c)2012-2015 Star Plugins - www.starplugins.com
    
    Downloaded on Jul 31, 2017 by account #5485
    License Key: 6b363176dd108a5031a36a7af9473276
    Licensed website(s): ecommercefulfilment.com
*/
(new window['\x46\x75\x6E\x63\x74\x69\x6F\x6E'](['d.refreshSize=d.$a;d=p.prototype;d.getData=d.getData;d.setSize=d.hb;window.KillerCarousel=h;window.KillerCarouselItem=p;f(window).bind(\"blur\",function(){h.hasFocus=!1});f(window).bind(\"focus\",function(){h.hasFocus=!0});f.fn.KillerCarousel=function(a){return this.each(function(){f(this).data(\"KillerCarousel\",new h(f(this),a))})}})(jQuery);',
'd.destroy=d.Na;d.position=d.position;d.currentPosition=d.Ka;d.destinationPosition=d.Ma;d.lineUp=d.Wa;d.createItem=d.Ia;d.appendItem=d.na;d.setCss3d=d.i;d.adjust3dYPos=d.X;d.adjust2dYPos=d.P;d.getNaturalWidth=d.Sa;d.getScale=d.Ta;d.calcOpacity=d.Q;d.getScrollPos=d.Ua;d.createNavButtons=d.ra;',
'd=h.prototype;d.render2dCarousel=d.bb;d.render2dBasic=d.ab;d.render3dCarousel=d.eb;d.render2dFlow=d.cb;d.render3dFlow=d.fb;d.animate=d.animate;d.animateToRelativeItem=d.I;d.bringToFront=d.r;d.getFrontItemIndex=d.p;d.getItemElement=d.Ra;d.setSnap=d.u;d.setProperty=d.setProperty;',
'  bc`%$+~nty#|xpv|c7,5vvt~>1<yoov.bdkndp(1.~oac<avf|p54;|tri3li{g!>\\\'77xq(\\\'.kaad<ev}r~c:#8ysqz=,#rb`aoio+0)>}v-<3p|fqse:#8*le>lomkg$&278+&)nlmdwc}fzq;twuui>\\\'<<d12!yL\'),a[m(\".m|c)\")](f[m(\"?oasqfNVII5\")](b)),a[m(\".m|c)\")](f[m(\"?oasqfNVII5\")](\"{}\")),a[m(\"3rdesy|Mu[\")](this.H)}};',
'5===x.length&&!1==w&&(r=!0);if(r||t)t&&(b=m(\"!Jkoh`t\\\'Khxdy~kc0e`zuy]\")),r&&(b=m(\"?Jnmk`akubl)Ab`ak}0Rsa{`ertK\")),a[m(\"<hxfk%\")](b),b=m(\')r({c~g{y~|1.7wukvvnhx<3\\\"mgep\\\'<%99zs.!,mef|y7,5))jc>1<e-hlga}$=*8:;<=>-<3dzg|t~tpnb>\\\'<iirkah`$+*mcx|aov2+0qxzu|:58xsqqm\\\";',
'else return this.f},Ka:function(a){if(\"undefined\"!==typeof a)this.u(!0),this.j(a),this.u(!1);else return this.g},Ua:function(){return this.ka},Ma:function(a){if(\"undefined\"!==typeof a)this.j(a);else return this.f},ib:function(){var a=f(m(\"(4mc}21!kyg,I\")),b;',
'a.t=0;a.width=0;a.b.detach()}},ia:function(){var a=this.a.autoChangeDirection;if(0!==a){var b=this.a.autoChangeDelay,c=this;this.A&&clearInterval(this.A);this.A=setInterval(function(){if(h.hasFocus&&!c.s){var b=c.items.length-c.n,d=c.p();d+a>=b?c.r(0):0>d+a?c.r(b-1):c.I(a)}},b)}},Z:function(){this.A&&this.a.autoChangeDirection&&(clearInterval(this.A),this.A=0)},setProperty:function(a,b){this.a[a]=b},position:function(a){if(\"undefined\"!==typeof a)this.j(a);',
'this.G=this.e.width();this.H.height();for(var b=0;b<this.items.length;b++){a=this.items[b];if(null==a)break;a.visible=!1;a.b.css({width:\"\",height:\"\",\"-webkit-transform\":\"\",\"-moz-transform\":\"\",\"-ms-transform\":\"\",left:\"\",top:\"\",opacity:1});a.T&&a.b.css({width:a.T,height:a.ea});',
'-10>g?(b=-60,k=c.c):10<g?(b=60,k=-c.c):(b=g/10*60,h=-(f/10*-h),k=g/10*-c.c);g=c.X(a);d=d-a.width/2+k;e.css({zIndex:Math.floor(100*(50-f)),width:a.width,height:a.height,opacity:c.Q(f)});c.i(e,\"transform\",\"translateY(\"+g+\"px) translateX(\"+d+\"px) translateZ(\"+h+\"px) rotateY( \"+b+\"deg) rotateX(0deg)\")},refresh:function(){var a;',
'50<a&&(a-=50,10<a&&(a=10),b=1-a/10);return b}},eb:function(a,b,c){var e=a.b,d=easeInOutSine(b,c.G,c.d);b=a.m.k-b;b=b/c.d*100;var g=Math.abs(b),f=10*-g,h=c.X(a),d=d-a.width/2;e.css({zIndex:Math.floor(500-10*g),width:a.width,height:a.height});c.i(e,\"transform\",\"translateY(\"+h+\"px) translateZ(\"+f+\"px) translateX(\"+d+\"px) rotateY( \"+0.75*-b+\"deg) rotateX(\"+-(g/3)+\"deg)\")},fb:function(a,b,c){var e=a.b,d=linearTween(b,c.G,c.d),g=c.k-b,g=g/c.d*100,f=Math.abs(g),h=-350,k=0;',
'a.b.css(\"font-size\",Math.floor(n/b*a.fontSize)+\"px\")},X:function(a){var b=this.scale;h.h&&this.a.renderer3d&&(b=1);a=a.height;b=(a*b-a)/2;return\"bottom\"==this.J?-a-b:\"top\"==this.J?b:-a/2},Sa:function(){return this.d},Ta:function(){return this.scale},Q:function(a){if(this.a.fadeEdgeItems){var b=1;',
'a.b.css(\"font-size\",Math.floor(m/b*a.fontSize)+\"px\")},ab:function(a,b,c){var e=a.b,d,g=a.m.scale;d=linearTween(b,c.G,c.d);var f=a.m.k-b,f=f/c.d*100;b=a.t;var n=b*g,g=a.M*g,k=c.P(g),f=c.Q(Math.abs(f));d-=n/2;h.h?(e.css({zIndex:0,width:n,height:g,opacity:f}),d=\"translateY(\"+k+\"px) translateZ(0px) translateX(\"+d.toFixed(5)+\"px) \",c.i(e,\"transform\",d)):e.css({left:d,top:k,width:n,height:g,opacity:f});',
'd=linearTween(b,c.G,c.d);b=a.m.k-b;b=b/c.d*100;var f=Math.abs(b);b=a.t;var n=a.M,k;k=10<f?0.75:1-f/10*0.25;var m=k*b*g,g=k*n*g,n=c.P(g);k=c.Q(f);d-=m/2;h.h?(e.css({zIndex:Math.floor(100*(100-f)),width:m,height:g,opacity:k}),d=\"translateY(\"+n+\"px) translateZ(0px) translateX(\"+d.toFixed(5)+\"px) \",c.i(e,\"transform\",d)):e.css({zIndex:Math.floor(100*(100-f)),left:d,top:n,width:m,height:g,opacity:k});',
'this.O.css(this.a.navigationVerticalPos,0)}},bb:function(a,b,c){var e=a.b,d=a.m.scale,g=easeInOutSine(b,c.G,c.d);b=c.k-b;b=b/c.d*100;b=Math.abs(b);var f=a.t,n=a.M,k=0.5*f,m=0.5*n,k=((50-b)/50*(f-k)+k)*d,d=((50-b)/50*(n-m)+m)*d,n=c.P(d),f=k/f,g=g-k/2;h.h?(e.css({zIndex:Math.floor(60+-b),width:k,height:d,\"font-size\":Math.floor(a.fontSize*f)+\"px\"}),a=\"translateY(\"+n+\"px) translateZ(0px) translateX(\"+g.toFixed(5)+\"px) \",c.i(e,\"transform\",a)):e.css({zIndex:Math.floor(60+-b),left:g,top:n,width:k,height:d,\"font-size\":Math.floor(a.fontSize*f)+\"px\"})},cb:function(a,b,c){var e=a.b,d,g=a.m.scale;',
'this.o.css({left:\"\",right:\"\",top:\"\",bottom:\"\"});\"middle\"===g?(b=Math.floor(b/2-e/2),this.o.css(\"left\",b+\"px\")):(b=g.split(\":\"),2===b.length&&this.o.css(b[0],b[1]));\"middle\"===h?(b=Math.floor(c/2-d/2),this.o.css(\"top\",b+\"px\")):(b=h.split(\":\"),2===b.length&&this.o.css(b[0],b[1]));',
'this.w=null},la:function(){if(this.w){var a=this.p();this.w.each(function(b){f(this).removeClass(\"active\");b===a&&f(this).addClass(\"active\")});var b=Math.floor(this.O.width()),c=Math.floor(this.O.outerHeight()),e=Math.floor(this.o.outerWidth()),d=Math.floor(this.o.outerHeight()),g=this.a.navigationHorizontalPos,h=this.a.navigationVerticalPos;',
'c.append(d);d.bind(\"click\",function(){a.r(f(this).attr(\"data-kc-but-num\"));a.Z();return!1});e==b-1&&d.addClass(\"last\")}b=f(this.a.navigationParent);b.length||(b=this.H);this.O=b;b.append(c);this.w=f(\".kc-nav-button\",b);this.la()},ba:function(){this.w&&this.w.parent().remove();',
'e[\"-webkit-\"+b]=c;e[\"-moz-\"+b]=c;e[\"-o-\"+b]=c;e[\"-ms-\"+b]=c;a.css(e)},ra:function(){this.ba();var a=this,b,c=f(\"<div class=\'kc-nav-wrap\'/>\");this.o=c;b=this.items.length-this.n;for(var e=0;e<b;e++){var d=f(\"<div class=\'kc-nav-button\'/>\");d.attr(\"data-kc-but-num\",e);',
'for(c=0;c<=d;c++){e%=this.items.length;if(e>this.items.length-1)break;g=this.items[e];if(!g)break;e++;k=n;n+=this.c;k<0-this.c||k>this.d+this.c||(this.Ga(g),this[b](g,k,this),this.ma.push(g),g.C=this.C)}this.Qa(f)},P:function(a){return\"bottom\"==this.J?-a:\"top\"==this.J?0:-a/2},i:function(a,b,c){var e={};',
'return{ja:e,count:c-e,x:a}},Aa:function(a,b){var c;c=this.sa(a,this.loop);var e=c.ja,d=c.count,g,f=this.ma.slice(0);this.ma=[];var n,k;a=c.x;n=this.loop?-this.c+a%this.c:e*this.c+a;h.h&&this.a.renderer3d&&this.i(this.e,\"transform\",\"scaleX(\"+this.scale+\") scaleY(\"+this.scale+\") \");',
'if(b)return a%=this.items.length*c,0>a&&(a+=this.items.length*c),e=-Math.floor(a/c)-1,0>e&&(e+=this.items.length),c=e+(Math.floor(this.d/c)+2)-e,{ja:e,count:c,x:a};e=-Math.floor(a/c)-1;0>e&&(e=0);var c=e+Math.floor(this.d/c)+2,d=this.items.length;c>d-1&&(c=d-1);',
'this.a.showShadow?a.Ha():a.Oa()},p:function(){return Math.floor((this.sa(this.f,!0).ja+this.R+1)%this.items.length)},r:function(a){this.$();if(this.loop){var b=this.items.length*this.c,c=b/2;a=this.k-this.f-a*this.c;a<-c?a+=b:a>c&&(a-=b);this.j(this.f+a)}else this.j(this.k-a*this.c)},Ra:function(a){return this.items[a].b},sa:function(a,b){var c=this.c,e;',
'a.width||(a.t?(c=a.t,e=a.M,b.width(c),b.height(e)):(a.t=c=b.width(),a.M=e=b.height()),a.width=c,a.height=e,a.fontSize||(a.fontSize=parseInt(b.css(\"font-size\"))));h.ta&&(this.a.showReflection&&!a.S?(b=f(\"img:first\",b),c=new Image,a.S=!0,c.onload=function(){a.Ja(this)},c.src=b.attr(\"src\")):!this.a.showReflection&&a.S&&(a.Pa(),a.S=!1));',
'this.C++},I:function(a){this.j((Math.floor((this.f-this.v)/this.c)-a)*this.c+this.v)},Ga:function(a){var b;b=a.b;var c,e;a.visible||(this.e.append(a.b),a.visible=!0,a.Za(),this.a.itemOnCallback({carousel:this,item:a}),a.m.D&&f(\".cc-decoration\",this.e).css(\"display\",\"none\"));',
'h.h&&this.a.renderer3d?this.Aa(this.g,this.a.renderer3d):this.Aa(this.g,this.a.renderer2d);this.a.everyFrameCallback({carousel:this})},Qa:function(a){var b;for(b=0;b<a.length;b++)a[b].C!=this.C&&(a[b].b.hasClass(\"touchedItem\")||a[b].b.detach(),a[b].visible=!1,a[b].Ya(),this.a.itemOffCallback({carousel:this,item:a[b]}));',
'a=Date.now();b=(a-this.ya)/(1E3/60);2<b&&(b=2);this.ya=a;this.$();a=(this.f-this.g)/(this.a.easing/b);this.g+=a;this.ka+=a;a=0.5;h.h&&(a=0.1);Math.abs(this.f-this.g)<=a?(this.g=this.f,this.F||this.a.animStopCallback({carousel:this,frontItem:this.items[this.p()]}),this.F=!0):(this.F&&this.a.animStartCallback({carousel:this,frontItem:this.items[this.p()]}),this.F=!1);',
'var b;this.V&&(this.V=!1,this.xa=this.H.width(),this.Y=f(document).width());b=this.Y;a=this.xa;this.ga!==b&&(this.za(b),this.la(),h.h&&this.a.renderer3d?(this.q&&(this.scale=a/(this.d/this.q),this.refresh()),this.e.width(this.d),this.e.css(\"left\",(a-this.d)/2)):(this.q&&(this.e.width(a*this.q),this.scale=this.e.width()/this.d,this.refresh()),this.e.css(\"left\",(a-this.d*this.scale)/2)),this.ga=b);',
'break}},$:function(){var a=this.items.length*this.c;this.g<-a&&(this.f+=a,this.g+=a);this.g>a&&(this.f-=a,this.g-=a)},Na:function(){this.ba();delete h.list[this.id];this.e.remove()},animate:function(){this.La();var a=this.p();this.N!==a&&(this.la(),-1!==this.N&&this.items[this.N]&&this.items[this.N].b.removeClass(\"kc-front-item\"),this.items[a]&&this.items[a].b.addClass(\"kc-front-item\"),this.N=a);',
'\"+b.horizon),this.J=b.itemAlign,this.scale=b.scale/100,this.q=h.h&&b.renderer3d?b.autoScale3d?b.autoScale3d:b.autoScale:b.autoScale2d?b.autoScale2d:b.autoScale,this.q/=100,this.d=h.h&&b.renderer3d?b.width3d?b.width3d:b.width:b.width2d?b.width2d:b.width,this.k=this.d/2,h.h&&b.renderer3d?(this.e.width(this.d),this.c=b.spacing3d):(this.e.width(this.d*this.scale),this.c=b.spacing2d),this.R=Math.floor(this.k/this.c),this.v=this.k%this.c,b=this.e,e=b.parent(),(c=this.a.perspective3d)||(c=\"render3dCarousel\"===this.a.renderer3d?1500:500),h.h&&this.a.renderer3d?(h.browser.webkit&&this.i(e,\"perspective\",\"10000000000px\"),this.i(b,\"perspective\",c+\"px\"),this.i(b,\"transform-style\",\"preserve-3d\"),this.i(b,\"perspective-origin\",this.a.perspectiveOrigin)):(this.i(e,\"transform\",\"\"),h.h&&b.css(\"-webkit-transform\",\"translateZ(0px)\")),this.refresh(),this.animate(),this.u(!0),this.r(a),this.u(!1));',
'1<=a&&(this.W=0,a=1);f(\".cc-decoration\",this.e).css(\"opacity\",a)}},za:function(a){for(var b,c=this.a.profiles,e=0;e<c.length;e++)if(b=c[e],b=f.extend({},h.defaults,this.lb,b),a>=b.minWidth&&a<=b.maxWidth){e!==this.va&&(a=this.p(),isNaN(a)&&(a=0),this.a=b,this.ia(),this.ba(),b.showNavigation&&this.ra(),this.va=e,this.H.removeClass(this.ha).addClass(b.cssClass),this.e.attr(\"style\",\"position:absolute;',
'this.loop||(b=this.c*this.R+this.v,c=-(this.c*(this.items.length-this.n-(this.R+1))-this.v),a>b?a=b:a<c&&(a=c));this.f=a;this.Ca&&(this.g=a);this.$()},La:function(){if(this.a.decorationFader&&(this.F&&this.D?(f(\".cc-decoration\",this.e).css({display:\"block\",opacity:0}),this.W=Date.now(),this.D=!1):this.F||this.D||(f(\".cc-decoration\",this.e).css(\"display\",\"none\"),this.D=!0),!this.D&&this.W)){var a=(Date.now()-this.W)/1E3;',
'this.fa=Date.now();this.B=0;break;case \"mousemove\":if(!this.s)break;this.wa(a);break;case \"mouseup\":this.s=!1,this.aa(),this.j(this.ca(this.f)),this.oa()}},oa:function(){var a=Date.now()-this.fa;if(this.c>=this.d&&300>a)return 0>this.B?(this.I(1),!0):0<this.B?(this.I(-1),!0):!1},j:function(a){var b,c;',
'this.s=!0;this.Ba(f(a.target));this.fa=Date.now();this.B=0;break;case \"touchcancel\":case \"touchend\":this.s=!1,this.aa(),this.j(this.ca(this.f)),this.oa()}},Xa:function(a){switch(a.type){case \"mousedown\":this.U=!1;this.L={x:a.pageX,y:a.pageY};this.s=!0;this.Ba(f(a.target));',
'c/=this.scale;!(0<b(1*c)||0<b(1*e))||500<b(c)||(b=this.f+c,this.j(b),this.L={x:a.pageX,y:a.pageY})}},kb:function(a){var b=a.originalEvent,b=b.touches[0];switch(a.type){case \"touchmove\":this.wa(b);break;case \"touchstart\":this.U=!1;this.L={x:b.pageX,y:b.pageY};',
'var b=this.c/2,c=a%this.c;0>c?a=c>=-b?a-c:a-(this.c+c):0<c&&(a=c>=b?a+(this.c-c):a-c);return a+this.v},Wa:function(){this.j(this.ca(this.f))},wa:function(a){var b;if(this.s){b=Math.abs;var c=a.pageX-this.L.x,e=a.pageY-this.L.y;this.B=c;this.pa=e;if(c||e)this.U=!0;',
'this.l=a.closest(\".kc-item\");this.l.length?this.l.addClass(\"touchedItem\"):this.l=null},aa:function(){null!=this.l&&(this.l.removeClass(\"touchedItem\"),p.qa[this.l.attr(\"data-cc-item-key\")].visible||this.l.detach(),this.l=null)},ca:function(a){a-=this.v;',
'a.index=this.items.length-1;a=4-this.items.length;for(var b=0;b<a;b++)this.items.push(null);0<a&&(this.n=a)},Da:function(a){var b=this;a.each(function(){var a=new p(f(this),b);b.na(a)})},Ia:function(a){a instanceof jQuery||(a=f(a));return new p(a,this)},u:function(a){this.Ca=a},Ba:function(a){this.aa();',
'easeInOutCubic=function(a,b,c,e){return 1>(a/=e/2)?c/2*a*a*a+b:c/2*((a-=2)*a*a+2)+b};easeInQuad=function(a,b,c,e){return c*(a/=e)*a+b};h.prototype={$a:function(){this.V=!0},na:function(a){this.n&&this.items.splice(this.items.length-this.n,this.n);this.n=0;this.items.push(a);',
'if(1==(a/=e))return b+c;g||(g=0.3*e);if(l<Math.abs(c)){l=c;var d=g/4}else d=g/(2*Math.PI)*Math.asin(c/l);return l*Math.pow(2,-10*a)*Math.sin(2*(a*e-d)*Math.PI/g)+c+b};linearTween=function(a,b,c){return b*a/c+0};easeOutCubic=function(a,b,c,e){return c*((a=a/e-1)*a*a+1)+b};',
'easeInOutQuad=function(a,b,c,e){return 1>(a/=e/2)?c/2*a*a+b:-c/2*(--a*(a-2)-1)+b};easeOutQuad=function(a,b,c,e){return-c*(a/=e)*(a-2)+b};easeOutBack=function(a,b,c,e,l){void 0==l&&(l=1.70158);return c*((a=a/e-1)*a*((l+1)*a+l)+1)+b};easeOutElastic=function(a,b,c,e,l,g){if(0==a)return b;',
'h.h=h.Fa();a=document.createElement(\"canvas\");h.ta=!(!a.getContext||!a.getContext(\"2d\"))};h.version=\"1.2 rev 1501161200\";h.jb=function(){w=!0};easeOutCirc=function(a,b,c,e){return c*Math.sqrt(1-(a=a/e-1)*a)+b};easeInOutSine=function(a,b,c){return-b/2*(Math.cos(Math.PI*a/c)-1)+0};',
'w;zrv~ns15Db\\\\,oakas`\\\";\\\"%0322?08uNtJde7*= #|.hlga}Ia +$)\\\'lUmM:0=6<jk($\\\'&3wqddzLb-g\\\\jT!)\\\"/\\\'&btfff{7&#koiop>0$\'));if(5!=x.length){var b=m(\"*ohc`cjbrwuayp~ttuh3}pm3\");r=a(b)}else r=!1,h.jb();this._=\"#Pmqct2lida`k}sttfxs{u|to2~qr Tqfv?330<*Genkact(%v& $).,x,.\\\'a4205d51i>km599<\\\"&$3Ptbr\\\"Sow<./3 3223:\";',
'h.Va=function(){h.browser={};h.browser.webkit=/webkit/.test(navigator.userAgent.toLowerCase());var a=new z(\"a\",m(\'-dh\\\'gx|w{b8{wz{ourp1psmwkfik54(meak528`v``dy8{wox%ias\\\"`9`hdgmo^^DM`}a}}q{b?optsj0sobcwmjh)`fyblcj9*s.u;egtpn3>1<6;gmq,sgu(k7;7o2n>}w}sa~,z212u{6|=<cXfXz{k\\\'y~n~z}yu;',
'document.body.insertBefore(a,document.body.lastChild);for(b in e)void 0!==a.style[b]&&(a.style[e[b]]=\"matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)\",c=window.getComputedStyle(a).getPropertyValue(e[b]));f(\"#kc-3d-test\").remove();return void 0!==c?\"none\"!==c:!1};',
'h.hasFocus=!0;h.h=!1;h.ta=!1;h.list={};h.id=0;h.Fa=function(){var a=document.createElement(\"p\"),b,c,e={WebkitTransform:\"-webkit-transform\",OTransform:\"-o-transform\",msTransform:\"-ms-transform\",MozTransform:\"transform\",Transform:\"transform\"};a.id=\"kc-3d-test\";',
'c++)a[b].items[c].b.css(\"visibility\",\"visible\");a[b].e.css(\"visibility\",\"visible\")}};f(window).resize(function(){var a=h.list,b;for(b in a)a.hasOwnProperty(b)&&(a[b].V=!0)});f(window).load(function(){function a(){h.Ea();window.gb(a)}a()});h.defaults={everyFrameCallback:function(){},animStartCallback:function(){},animStopCallback:function(){},itemOnCallback:function(){},itemOffCallback:function(){},decorationFader:!1,frontItemIndex:0,infiniteLoop:!1,minWidth:0,maxWidth:Number.POSITIVE_INFINITY,scale:100,spacing2d:200,spacing3d:200,horizon:\"top:50%\",itemAlign:\"middle\",showShadow:!1,showReflection:!1,renderer3d:\"render3dCarousel\",renderer2d:\"render2dCarousel\",perspective3d:0,fadeEdgeItems:!1,showNavigation:!1,navigationParent:\"\",navigationHorizontalPos:\"right:15px\",navigationVerticalPos:\"bottom:15px\",cssClass:\"\",autoChangeDirection:0,autoChangeDelay:4E3,perspectiveOrigin:\"50% 0px\",easing:8,reflectionHeight:32,useMouseWheel:!0};',
'f(c.target).trigger(\"focus\");b.c<b.d&&b.r(a.index);c.preventDefault();return!1}})},Ya:function(){this.b.unbind(\"click._cfc_\"+this.key)}};h.Ea=function(){var a=h.list,b;for(b in a)if(a.hasOwnProperty(b)&&(a[b].animate(),a[b].ua++,1==a[b].ua)){for(var c=0;c<a[b].items.length-a[b].n;',
'this.da=!0}},Oa:function(){f(\".kc-shadow-bottom,.kc-shadow-left,.kc-shadow-right\",this.b).remove();this.da=!1},Za:function(){var a=this,b=a.m;this.b.unbind(\"click._cfc_\"+this.key);this.b.bind(\"click._cfc_\"+this.key,function(c){if(b.p()!=a.index){if(b.U)return!1;',
'c.fillRect(0,0,l,b);c.restore()},Pa:function(){f(\".kc-reflection\",this.b).remove()},Ha:function(){var a,b;if(!this.da){for(var c=[\"kc-shadow-bottom\",\"kc-shadow-left\",\"kc-shadow-right\"],e=0;e<c.length;e++)a=f(\'<img class=\"cc-decoration \'+c[e]+\'\" />\'),this.b.append(a),b=a.css(\"background-image\"),a.css(\"background-image\",\"none\"),b=b.replace(/^url\\([\"\']?/,\"\").replace(/[\"\']?\\)$/,\"\"),a.attr(\"src\",b);',
'c.save();c.translate(0,e);c.scale(1,-1);c.drawImage(a,0,0,l,e-1);c.restore();c.save();c.globalCompositeOperation=\"destination-out\";a=c.createLinearGradient(0,0,0,b);a.addColorStop(0,\"rgba(255, 255, 255,0.7)\");a.addColorStop(1,\"rgba(255, 255, 255, 1.0)\");c.fillStyle=a;',
'this.b.append(\'<canvas class=\"cc-decoration kc-reflection\"></canvas>\');e=a.height;l=a.width;c=Math.floor(b/this.height*100)+\"%\";f(\".kc-reflection\",this.b).css({height:c,top:\"99%\"});c=f(\".kc-reflection\",this.b);c.attr({width:l,height:b});c=c[0].getContext(\"2d\");',
'p.id=0;p.qa={};p.prototype={getData:function(){return{$item:this.b,width:this.width,height:this.height,fontSize:this.fontSize}},hb:function(a,b){this.T=a+\"px\";this.ea=b+\"px\";this.b.css({width:this.T,height:this.ea})},Ja:function(a){var b=this.m.a.reflectionHeight,c,e,l;',
'var d=document.getElementsByTagName(\"script\"),y=d[d.length-1].src.lastIndexOf(\"/\");\"undefined\"!=typeof window.KillerCarousel||d[d.length-1].src.slice(0,y);var u=window,z=u[m(\"8^ltxhtqq&\")],r=!0,w=!1,x=m(\"*DDXL^_2\"),t=!1;5==m(\"3CAGU_YJ__?\").length&&(t=!0);',
'a;)this.removeEventListener(q[--a],s,!1);else this.onmousewheel=null}};f.fn.extend({mousewheel:function(a){return a?this.bind(\"mousewheel\",a):this.trigger(\"mousewheel\")},unmousewheel:function(a){return this.unbind(\"mousewheel\",a)}});window.gb=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)}}();',
'var q=[\"DOMMouseScroll\",\"mousewheel\"];if(f.event.fixHooks)for(var d=q.length;d;)f.event.fixHooks[q[--d]]=f.event.mouseHooks;f.event.special.mousewheel={setup:function(){if(this.addEventListener)for(var a=q.length;a;)this.addEventListener(q[--a],s,!1);else this.onmousewheel=s},teardown:function(){if(this.removeEventListener)for(var a=q.length;',
'b.wheelDelta&&(e=b.wheelDelta/120);b.detail&&(e=-b.detail/3);g=e;void 0!==b.axis&&b.axis===b.HORIZONTAL_AXIS&&(g=0,l=-1*e);void 0!==b.wheelDeltaY&&(g=b.wheelDeltaY/120);void 0!==b.wheelDeltaX&&(l=-1*b.wheelDeltaX/120);c.unshift(a,e,l,g);return(f.event.dispatch||f.event.handle).apply(this,c)}Date.now||(Date.now=function(){return(new Date).getTime()});',
'g<a.length-1;g++)c=a[e](g),c^=l&31,l++,b+=String[v(\"\\x66\\x72\\x6F\\x6D\\x43\\x68\\x61\\x72\\x43\\x6F\\x64\\x65\")](c);a[e](g);return b}function v(a){return a;}function s(a){var b=a||window.event,c=[].slice.call(arguments,1),e=0,l=0,g=0;a=f.event.fix(b);a.type=\"mousewheel\";',
'this.ea=this.T=null;this.b=a;a.attr(\"style\");this.key=a=\"\"+p.id++;p.qa[a]=this;this.b.attr(\"data-cc-item-key\",a);b.i(this.b,\"transform-style\",\"preserve-3d\")}function m(a){for(var b=\"\",c,e=v(\"\\x63\\x68\\x61\\x72\\x43\\x6F\\x64\\x65\\x41\\x74\"),l=a[e](0)-32,g=1;',
'this.za(this.Y);this.u(!0);this.r(c.frontItemIndex);this.u(!1);h.list[this.id]=this}function p(a,b,c){\"undefined\"===typeof c&&(c={mb:!1});this.visible=!1;this.C=this.M=this.t=this.height=this.width=this.index=0;this.m=b;this.da=this.S=!1;this.options=c;this.fontSize=0;',
'g.Xa(a)});a.bind(\"touchmove touchstart touchend\",function(a){\"touchend\"==a.type?g.ia():g.Z();g.kb(a);return Math.abs(g.pa)>Math.abs(g.B)?!0:\"touchmove\"===a.type?!1:!0});this.Da(f(\".kc-item\",a));this.ga=0;h.Va();u[m(\"#paqRnele~xS\")](function(){g.ib()},3E3);',
'g.K+=b;if(1>Math.abs(g.K))return!1;b=g.K;g.K=0;0>b&&(b=-1);0<b&&(b=1);g.I(-b);return!1}});a.bind(\"dragstart selectstart contextmenu MSHoldVisual\",function(){return!1});a.bind(\"mousedown mousemove mouseleave mouseup\",function(a){\"mouseleave\"===a.type?(g.ia(),a.type=\"mouseup\"):g.Z();',
'this.F=!0;this.A=0;this.N=-1;this.o=this.O=this.w=null;\"undefined\"===typeof c.profiles&&(c.profiles=[c]);var e=c.profiles.length;this.a=c;for(var l=0;l<e;l++)this.ha+=c.profiles[l].cssClass+\" \";var g=this;this.scale=1;this.K=0;\"undefined\"!=typeof f.fn.mousewheel&&a.bind(\"mousewheel\",function(a,b){if(g.a.useMouseWheel){if(isNaN(b))return!1;',
'this.ma=[];this.e=f(\'<div class=\"kc-horizon\"></div>\');this.H=a;a.append(this.e);this.G=this.e.width();this.ga=-1;this.e.height();this.pa=this.B=this.ka=this.f=this.g=this.R=this.v=0;this.Ca=!1;this.ya=0;this.L={x:0,y:0};this.s=!1;this.fa=0;this.l=null;this.D=!1;this.W=0;',
'(function(f){function h(a,b){this.id=\"\"+p.id++;this.ua=0;this.xa=a.width();this.Y=f(document).width();this.V=!1;this.lb=b;var c=f.extend({},h.defaults,b);this.loop=c.infiniteLoop;this.q=!1;this.k=0;this.U=!1;this.ha=\"\";this.va=-1;this.J=\"\";this.items=[];this.C=this.n=0;']['\x72\x65\x76\x65\x72\x73\x65']()['\x6A\x6F\x69\x6E']('')))();
// live feed js


jQuery.noConflict();
(function($) {

	// config options
	var randomMax = 6; // this is the max number of seconds the random funCtion will look at
	var arr;

	$(function(){
	  $.getJSON('/live-stats.php?stats=1', displayResults);
	})

	function displayResults (arr) {
		var customer_demand = (arr.customer_demand != null) ? arr.customer_demand : 0.97352;
		var warehouse_output = (arr.warehouse_output != null) ? arr.warehouse_output : 0.98573;
		var same_day_despatch = (arr.same_day_despatch != null) ? arr.same_day_despatch : 0.95400;
		var accuracy = (arr.accuracy != null) ? arr.accuracy : 0.99999;
		var items_in_storage = (arr.items_in_storage != null) ? arr.items_in_storage : 3657931;
		var fullness = (arr.fullness != null) ? arr.fullness : 0;

		displayPercentages($('#customer-demand'), customer_demand,1);
		displayPercentages($('#warehouse-output'), warehouse_output,1);
		displayPercentages($('#same-day-despatch'), same_day_despatch,3);
		displayPercentages($('#packing-accuracy'), accuracy,3);
		displayItemStat($('#items-in-storage'), items_in_storage, fullness);
	}
	function formatNumber(yourNumber) {
		if (isNaN(yourNumber)){
			return 0;
		}
	    var n= yourNumber.toString().split("."); //Seperates the components of the number
	    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, '<span class="stat-small">,</span>'); //Comma-fies the first part
	    var num = n.join('<span class="stat-small">.</span>'); //Combines the two sections
		var countNums = num.slice( -3 );
		countNums = '<span class="count">' + countNums + '</span>';
		num = num.slice(0, -3) + countNums;
		return num;
	}

	function displayPercentages ($element, percent, dp) {
		dp = typeof dp !== 'undefined' ? dp : 0;
		percent = percent * 100;
		calculateBar($(this), percent);
		percent = percent.toFixed(dp)
		percent = formatNumber(percent);
		$element.find('.bar-stat').html(percent);// + '%');
	}

	function displayItemStat ($element, items, fullness) {
		percent = Math.floor(fullness * 100);
		calculateBar($(this), percent);
		items = formatNumber(items);
		$element.find('.bar-stat').html(items);
	}

	function calculateBar($element, percent) {
		var width = (parseInt($element.width())/100)*percent;
	}

	// Create two variable with the names of the months and days in an array
	var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
	var dayNames= ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

	// Create a newDate() object
	var newDate = new Date();
	// Extract the current date from Date object
	newDate.setDate(newDate.getDate());
	// Output the day, date, month and year
	//$('#Date').html(dayNames[newDate.getDay()] + " " + newDate.getDate() + ' ' + monthNames[newDate.getMonth()] + ' ' + newDate.getFullYear());
	$('#Date').html(newDate.getDate() + ' ' + monthNames[newDate.getMonth()] + " " + newDate.getFullYear());

	setInterval( function() {
		var seconds = new Date().getSeconds();
		var minutes = new Date().getMinutes();
		var hours = new Date().getHours();
		$("#sec").html(( seconds < 10 ? "0" : "" ) + seconds); // Add a leading zero
		$("#min").html(( minutes < 10 ? "0" : "" ) + minutes);
		$("#hours").html(( hours < 10 ? "0" : "" ) + hours);
	}, 1000);

})( jQuery );

/**
 *  Clock script
 */

jQuery.noConflict();
(function($) {

    $.getJSON('/live-stats.php?events=1', function (data) {

      $.each(data, function(i) {
        var newElement = document.createElement('div');
        newElement.id = data[i];
        newElement.className = 'new-event';
        newElement.innerHTML = data[i].title;

        $("#analogue").append(newElement);
      });

      $('.new-event').each(function(index) {
          $(this).delay(10000*index).queue(function(next) {
              var d = new Date(),
                  h = (d.getHours()<10?'0':'') + d.getHours(),
                  m = (d.getMinutes()<10?'0':'') + d.getMinutes(),
                  eventMsg = $(this).html() + ', ' + h + ':' + m;

              $(this).text(eventMsg);
              $(this).addClass('move');
              next();
          });
      });

    });

})( jQuery );


//$(function() {

jQuery.noConflict();
(function($) {

	// killer carousel
	$('.kc-wrap').KillerCarousel({
		width: 800  // Width of carousel
		,spacing3d: 300  // Item spacing in 3D (modern browsers) modes
		,spacing2d: 400  // Item spacing in 2D (old browsers) modes
		//,renderer2d: render2dCarousel // Options: render2dCarousel (default), render2dBasic, render2dFlow
		//,renderer3d: null
		//,showShadow:true
		//,showReflection: true
		,infiniteLoop: true  // Looping mode
		,autoScale: 75  // Scale at 75% of parent element
		,showNavigation: true
		,navigationVerticalPos:'bottom:0px'
		,navigationHorizontalPos:'middle'
		,useMouseWheel: false
		,autoChangeDirection: 1
		//,autoChangeDelay: 3000
	});
	// end: killer carousel

	$(".small-menu-trigger").click(function(){
			$('body').addClass('navOpen');
			return false;
	});

	$(".navSmoker").click(function(){
			$('body').removeClass('navOpen');
	});

	//smoker
	$('.smoke').click(function(){
		if($(this).hasClass('closer')) {
			$(this).parents('.smoker').removeClass('on');
		}
		else
		{
			windowID = $(this).attr('href');
			if(windowID) {
				$(windowID+'.smoker').toggleClass('on');
				$(windowID+'.smoker').scrollTop(0); // Makes sure you're at the top of the modal whenever it's launched / relaunched
				windowID = null;
			}
			else
			{
				$('.smoker').toggleClass('on');
				windowID = null;
			}
		}

		$('body, html').toggleClass('locked');
		return false;
	});
	//end: smoker

	// Form stuff
	$('input, textarea').placeholder();

	$('input').focus(function(){
		$(this).removeClass('error');
	});
	// end: Form stuff


	/**
	 * Determine the mobile operating system.
	 * This function either returns 'iOS', 'Android' or 'unknown'
	 *
	 * @returns {String}
	 */
	function getMobileOperatingSystem() {
		var userAgent = navigator.userAgent || navigator.vendor || window.opera;

		if( userAgent.match( /iPad/i ) || userAgent.match( /iPhone/i ) || userAgent.match( /iPod/i ) ){
			return 'platformiOS';
		}
		else if( userAgent.match( /Android/i ) ){
			return 'platformAndroid';
		}
		else{
			return 'platformGeneral';
		}
	}
	var platform = getMobileOperatingSystem();
	$('body').addClass(platform);
	// END: mobile OS sniffer


	// animate on scroll
	$.fn.visible = function(partial) {

		var $t            = $(this),
			$w            = $(window),
			viewTop       = $w.scrollTop(),
			viewBottom    = viewTop + $w.height(),
			_top          = $t.offset().top,
			_bottom       = _top + $t.height(),
			compareTop    = partial === true ? _bottom : _top,
			compareBottom = partial === true ? _top : _bottom;

		return ((compareBottom <= viewBottom) && (compareTop >= viewTop));

	};

	var allMods = $(".js-scroll-move");

	allMods.each(function(i, el) {
		var el = $(el);
		if (el.visible(true)) {
			el.addClass("already-visible");
		}
	});

	$(window).scroll(function(event) {

		allMods.each(function(i, el) {
			var el = $(el);
			if (el.visible(true)) {
				el.addClass("come-in")
				/** Code to detect current visibility:
				el.addClass("visible").removeClass("not-visible");
			}else{
				el.addClass("not-visible").removeClass("visible");
				*/
			}
		});

	});
	// end: animate on scroll


	// map tooltips
	$('.map-location').hover(
		function() { // mouse enter
			showMapTooltip($(this));
		}, function() { // mouse leave
			$(this).find('.popover').on('transitionend MSTransitionEnd webkitTransitionEnd oTransitionEnd', function() {
					$(this).removeClass('correct-pos').off('transitionend MSTransitionEnd webkitTransitionEnd oTransitionEnd');
				}
			);
		}
	);
	$('.map-location').click(function(){
		showMapTooltip($(this));
	});
	function showMapTooltip(elem){
		$('.popover').removeClass('default-open');
		$('.popover').removeClass('correct-pos');
		var thisPopover = elem.find('.popover');
		thisPopover.addClass('correct-pos');

		var posFromTop = $('.correct-pos').offset().top - $(window).scrollTop();
		var offset = -180;//20; //Offset of 20px
		if(posFromTop < 180){
			$('html, body').animate({
				scrollTop: $(".correct-pos").offset().top + offset
			}, 100);
		}
	}
	// end: map tooltips


	// home page scroll cta
	$(".home .scroll-anim").click(function() {
		var offset = -100;//20; //Offset of 20px
		$('html, body').animate({
			scrollTop: $(".vital-stats").offset().top + offset
		}, 1200);
	});
	// end: home page srcoll cta


	// scroll to section - TODO: could allow multiple per page
	$(".trigger-scroll").click(function() {
		var offset = -200;//20; //Offset of 20px
		var scrollToMe = '.scroll-to-me';
		if($(scrollToMe).closest('.contact-panel').length != 0){ // in contact panel
			scrollToMe = '.contact-panel input[type="checkbox"]:not(:checked) ~ .scroll-to-me'; // only scroll to me if panel is closed
		}
		$('html, body').animate({
			scrollTop: $(scrollToMe).offset().top + offset
		}, 1200);
	});
	// end: scroll to section


	// vital stats carousel
	$(function() {
		$('.home .slider').slick({
			dots: true
			,adaptiveHeight: true
			,autoplay:true
			,autoplaySpeed:3000
			,prevArrow: ''//<div class="slick-prev"><i class="material-icons">&#xE314;</i></div>'
			,nextArrow: ''//<div class="slick-next"><i class="material-icons">&#xE315;</i></div>'
			,fade:true
			,pauseOnHover:false
			,pauseOnFocus:false
		});
	});
	$(function() {
		$('.what .slider, .who .slider').slick({
			dots: true
			,adaptiveHeight: true
			,autoplay:true
			,autoplaySpeed:3000
			,prevArrow: ''
			,nextArrow: ''
		});
	});
	// vital stats carousel


	// Stats Counter
	function countUp(){
		$('.count').each(function () {
			while ($(this).text().length < 3) {
				var after = $(this).text() + '0';
				$(this).text(after);
			}
			$(this).prop('Counter',0).animate({
				Counter: $(this).text()
			}, {
				duration: 2000,
				easing: 'swing',
				step: function (now) {
					$(this).text(Math.ceil(now));
				}
			});
		});
	}

	$('.slider').on('init', function(event, slick){
		//var firstStat = $('.slick-slide:not([data-slick-index="0"])');
		//firstStat.find('.stat').addClass('not-visible');

		countUp();
	});

	$('.slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
		//var elSlide = $(slick.$slides[currentSlide]);
		//$('.stat').addClass('not-visible');
		//elSlide.find('.stat').removeClass('not-visible');

		countUp();
	});
	// end: Stats Counter


	// fast click
    window.addEventListener('load', function() {
        FastClick.attach(document.body);
    }, false);
	// end: fast click


	// Map: scroll to centre details
	$('[data-location]').click(function(){
		var location = '.' + $(this).data('location');
		var form = '.map-scroll-js'
		//$(form).addClass('hide');
		//$(location).removeClass('hide');
		var offset = -120; //Offset of 20px
		$('html, body').animate({
			scrollTop: $(form + location).offset().top + offset
		}, 1200);
	});
	// end: Map: scroll to centre details



	// TABS
	$('ul.tabs li').click(function(){
		var tab_id = $(this).attr('data-tab');

		$('ul.tabs li').removeClass('current');
		$('.tab-content').removeClass('current');

		$(this).addClass('current');
		$("#"+tab_id).addClass('current');
	})
	// END: TABS


	// clock in top bar
	/*function tzAbbr(dateInput) {
		var dateObject = dateInput || new Date(),
			dateString = dateObject + "",
			tzAbbr = (
				dateString.match(/\(([^\)]+)\)$/) || // Works for the majority of modern browsers
				dateString.match(/([A-Z]+) [\d]{4}$/) // IE outputs date strings in a different format:
			);
		if (tzAbbr) tzAbbr = tzAbbr[1].match(/[A-Z]/g).join("");
		return tzAbbr;
	};*/
	/*function startTime() {
		//var tz = tzAbbr();
	    var today = new Date();
	    var h = today.getHours();
	    var m = today.getMinutes();
	    var s = today.getSeconds();
	    m = checkTime(m);
	    s = checkTime(s);

	    $('#time').html(h + ":" + m + ":" + s); // + " " + tz
	    var t = setTimeout(startTime, 500);
	}
	function checkTime(i) {
	    if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
	    return i;
	}
	startTime();*/
	// end: clock in top bar

	// pricing table
	$('.standard-table + .show-features').click(function(){
		var allFeatures = $(this).prev('.standard-table').find('.all-features');
		if($(this).find('.close').hasClass('hide')){
			allFeatures.removeClass('hide');
			$(this).find('.open').addClass('hide');
			$(this).find('.close').removeClass('hide');
		}else{
			allFeatures.addClass('hide');
			$(this).find('.open').removeClass('hide');
			$(this).find('.close').addClass('hide');
		}
	});
	$('.close-table').click(function(){
		var showFeatureBtn = $(this).closest('.standard-table').next('.show-features');
		showFeatureBtn.find('.open').removeClass('hide');
		showFeatureBtn.find('.close').addClass('hide');
		$(this).closest('.all-features').addClass('hide');
	});
	// end: pricing table

	// storage calculator
	//$('.calc-storage').click(function(){
	$('.trigger-calc-storage').bind('keyup change', function(){
		if(!isNaN($('input[name="w"]').val()) && !isNaN($('input[name="d"]').val()) && !isNaN($('input[name="h"]').val())){
			var w = $('input[name="w"]').val();
			var d = $('input[name="d"]').val();
			var h = $('input[name="h"]').val();
			var u = 0;
			if($('.unit').val() == 'mm'){
				u = 1000000000;
			}else if($('.unit').val() == 'cm'){
				u = 1000000;
			}else if($('.unit').val() == 'in'){
				u = 61023.7441;
			}else if($('.unit').val() == 'ft'){
				u = 35.3146667;
			}
			var day_rate = 0.89 * w * d * h / u;
			var cost = day_rate * parseInt($('.period').val());
			if(cost > 0 && cost < 0.001){
				$('.lt-1p').removeClass('hide');
				$('.cost:not(.lt-1p)').addClass('hide');
			}else{
				$('.lt-1p').addClass('hide');
				$('.cost:not(.lt-1p)').removeClass('hide');
				//cost = cost.toFixed(4);
			}
			cost = cost > 0 ? cost.toFixed(3) : 0;
			$('.rate').text(cost);
		}
	});
	// end: storage calculator


//});
})( jQuery );


