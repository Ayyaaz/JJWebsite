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
		displayPercentages($('#customer-demand'), arr.customer_demand,1);
		displayPercentages($('#warehouse-output'), arr.warehouse_output,1);
		displayPercentages($('#same-day-despatch'), arr.same_day_despatch,3);
		displayPercentages($('#packing-accuracy'), arr.accuracy,3);
		displayItemStat($('#items-in-storage'), arr.items_in_storage, arr.fullness);
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
