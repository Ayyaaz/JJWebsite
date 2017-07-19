/**
 *  Clock script
 */

jQuery.noConflict();
(function($) {

  var canvas,
    od = 200,
    center_bottom = 200,
    center_right = 150,
    blank,
    activity, act_time = 57, act_dur = 4,
    swell_dur = 5,
    events = [], event_tweets = [],
    uxt, duxt,
    make_current = false, speed_up = 1;

  function clock( jcanvas, options, show_events ){
    if(typeof options.bottom != 'undefined') center_bottom = options.bottom;
    if(typeof options.right != 'undefined') center_right = options.right;
    if(typeof options.scale != 'undefined')
    {
      od *= options.scale;
    }

    canvas = jcanvas.get(0);
    if (canvas.getContext) {
      animate();

      if(show_events){
        load_events();
      }
    }
  }

  function load_events(){
    $.getJSON('/live-stats.php?events=1',function(e){events = e;if(make_current){cur();}});
    window.setTimeout('load_events()',1000*60*5)
  }

  function cur(){ // moves all cached events to be in current time
    uxt = new Date().getTime();
    min_n = Object.keys(events)[0]
    for(n in events)
    {
      events[(n-min_n)/speed_up+uxt] = events[n];
      delete events[n];
    }
  }
  function drawClock() {

    //Fetch the current time
    var now=new Date();
    var sec=now.getSeconds();
    var ms = now.getMilliseconds();
    if(!ms){ ms = 0;}

    if((sec == act_time) || activity){
      activity = true;
      sec2 = sec;
      //sec = act_time;
    }

    // Add in relevant activities
    new_uxt = new Date().getTime();
    duxt = new_uxt-uxt;
    uxt = new_uxt;
    draw_activities();
    draw_events();
  }

  function draw_activities(){

    ms = uxt%(1000);
    sec = uxt%(60*1000);

    for(n in events)
    {
      event_sec = Math.floor(n/1000)%60;
      ms_since_event = uxt-n;
      if((n < uxt) && (ms_since_event < (act_dur*1000)))
      {
        // correct event to be between 9 and 1 on the clock face by tweaking its time
        // No longer used as full clock visible - JS May 2016
        // if((event_sec >5) && (event_sec<45)) {
          // if(event_sec < 25) event_sec = (event_sec+40)%60;
          // else event_sec = (event_sec+20)%60;
        // }


        completeness = ms_since_event/(act_dur*1000);

        if(!('ends' in events[n])){
          events[n].ends = {'x':Math.sin(Math.PI/30*event_sec)*od/2 + canvas.width - center_right  - (20*completeness+10*sec)/2,
                            'y':canvas.height - center_bottom - Math.cos(Math.PI/30*event_sec)*od/2  - (20*completeness+10*sec)/2,
                            't':n+act_dur*1000
                            }
        }

      }else if(ms_since_event > (act_dur*1000))
      { // remove old events
        if(("ends" in events[n])){
          et = eventElement(0,events[n].ends.y,n,events[n].title);
          event_tweets.push(et);
          $('#analogue').append(et);
          //et.css({'left':(Math.min(events[n].ends.x,$('#analogue').width()-et.outerWidth()-5))+'px','width':et.outerWidth()+'px'}).animate({'opacity':1},500);
          et.animate({'opacity':1},500);
        }
        delete events[n];
      }
    }
  }

  function draw_events(){
    var otp = false;
    for(var i = 0; i < event_tweets.length; ++i){
      var vspace = event_tweets[i].outerWidth()+6;
      et = event_tweets[i];
      if(et.position().left < -1*et.outerWidth()){
        event_tweets.splice(i--, 1);
        et.remove();
      }else{
        tp = et.position().left;
        tp -= (duxt*1/60)*(1+(Math.max(4,event_tweets.length)-4));
        if(otp){
          tp -= (((tp-otp-vspace/2)%vspace)-vspace/2) * 0.2;
        }
        et.css('left',tp+'px');
        otp = tp;
      }
    }
  }
  function eventElement(x,y,ts,content){
    tm = new Date(parseInt(n)).toTimeString().split(' ')[0];
    dt = new Date(parseInt(n)).toDateString().split(' ');
    dts = dt[2]+" "+dt[1]+" "+dt[3].substring(2,4);
    //return $('<div class="event" style="top:'+y+'px;left:'+x+'px;"><div class="ts">'+tm+'<br>'+dts+'</div>'+content+'</div>');
    //return $('<div class="event" style="top:'+y+'px;left:'+x+'px;"><div class="content">'+content+'</div><span class="ts">'+tm+' - '+dts+'</div></div>');
    //return $('<div class="event" style="top:'+y+'px;left:'+x+'px;">'+content+', '+tm+' - '+dts+'</div>');
    return $('<div class="event" style="left:'+x+'px;">'+content+', '+tm+' - '+dts+'</div>');
  }

  function animate() {
      var activity = false;
      requestAnimFrame( animate );
      drawClock();
  }
  // requestAnim shim layer by Paul Irish
  requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(/* function */ callback, /* DOMElement */ element){
              window.setTimeout(callback, 1000 / 60);
            };
  })();



  // live feed
  if ( typeof FLBuilder != 'undefined' ) {
    // The builder is active.
  }else{
    // The builder is not active.
    if($("#analogue").length != 0) {
      clock( $('#analogue>canvas'), {"bottom":130, "top": 0}, true);
    }
  }
  // end: live feed

})( jQuery );
