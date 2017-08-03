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
