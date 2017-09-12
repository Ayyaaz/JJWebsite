
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
			var cost = (window.location.href.indexOf('en-us') > -1) ? 0.8 : 0.89;
			var day_rate = cost * w * d * h / u;
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


