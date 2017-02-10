$(function() {

	// Testimonial Carousel
	$(function() {
		$('.slider').slick({
			dots: true
			,adaptiveHeight: true
			,autoplay:true
			//,autoplaySpeed:4000
			,prevArrow: ''//<div class="slick-prev"><i class="material-icons">&#xE314;</i></div>'
			,nextArrow: ''//<div class="slick-next"><i class="material-icons">&#xE315;</i></div>'
		});
	});
	// Testimonial Carousel


	// killer carousel
    $('.kc-wrap').KillerCarousel({
        width: 800  // Width of carousel
        ,spacing3d: 300  // Item spacing in 3D (modern browsers) modes
        ,spacing2d: 400  // Item spacing in 2D (old browsers) modes
        ,showShadow:true
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



});


