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
