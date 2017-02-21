$(function() {

	// vital stats carousel
	$(function() {
		$('.slider').slick({
			dots: true
			,adaptiveHeight: true
			,autoplay:true
			,autoplaySpeed:3000
			,prevArrow: ''//<div class="slick-prev"><i class="material-icons">&#xE314;</i></div>'
			,nextArrow: ''//<div class="slick-next"><i class="material-icons">&#xE315;</i></div>'
			,fade:true
		});
	});
	// vital stats carousel


	// killer carousel
    $('.kc-wrap').KillerCarousel({
        width: 800  // Width of carousel
        ,spacing3d: 300  // Item spacing in 3D (modern browsers) modes
        ,spacing2d: 400  // Item spacing in 2D (old browsers) modes
        //,showShadow:true
        //,showReflection: true
		,infiniteLoop: true  // Looping mode
		,autoScale: 75  // Scale at 75% of parent element
		,showNavigation: true
		,navigationVerticalPos:'bottom:0px'
		,navigationHorizontalPos:'middle'
		//,renderer3d: null
    });


	// killer carousel

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
			$(this).find('.popover').addClass('correct-pos');
		}, function() { // mouse leave
			$(this).find('.popover').on('transitionend MSTransitionEnd webkitTransitionEnd oTransitionEnd', function() {
					$(this).removeClass('correct-pos').off('transitionend MSTransitionEnd webkitTransitionEnd oTransitionEnd');
				}
			);
		}
	);
	// end: map tooltips


	// home page scoll cta
	$(".scroll-anim").click(function() {
		var offset = -100;//20; //Offset of 20px
		$('html, body').animate({
			scrollTop: $(".vital-stats").offset().top + offset
		}, 1200);
	});
	// end: home page scoll cta




	// Stats Counter
	$('.slider').on('init', function(event, slick){
		var firstStat = $('.slick-slide:not([data-slick-index="0"])');
		//$('.slick-slide:not([data-slick-index="0"])').find('.stat').addClass('not-visible');

		$('.count').each(function () {
			$(this).prop('Counter',0).animate({
				Counter: $(this).text()
			}, {
				duration: 3500,
				easing: 'swing',
				step: function (now) {
					$(this).text(Math.ceil(now));
				}
			});
		});
	});

	$('.slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
		var elSlide = $(slick.$slides[currentSlide]);
		var prevSlide = $(slick.$slides[currentSlide -1]);
		var nxtSlide = $(slick.$slides[nextSlide]);

		//$('.stat').addClass('not-visible');
		//elSlide.find('.stat').removeClass('not-visible');

		$('.count').each(function () {
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
	});
	// end: Stats Counter





});


