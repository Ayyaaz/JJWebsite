<?php
$events_log = 'event-log.txt';
$stats_log = 'stats-log.txt';

if($_SERVER['REQUEST_METHOD']=='POST')
{
  $events = $_POST['events'];
  $f = fopen($events_log,'w+');
  fwrite($f,$events);

  $json_stats = $_POST['stats'];
  $stats = json_decode( $json_stats, true );
  $old_stats = json_decode( file_get_contents($stats_log), true );
  if( $old_stats )
  {
    $stats['biggest_day_orders'] = max( $stats['today_orders'], $old_stats['biggest_day_orders'] );
    $stats['best_pack_rate'] = max( $stats['pack_rate'], $old_stats['best_pack_rate'] );
    $stats['max_items'] = max( $stats['items'], $old_stats['max_items'] );
  }
  $f = fopen($stats_log,'w+');
  fwrite($f,json_encode($stats));
  exit;
}
if(isset($_REQUEST['events']))
{
  $events = array();
  $events = json_decode(file_get_contents($events_log));
  $adjusted_events = array();
  foreach($events as $timestamp=>$details)
  {
    $adjusted_events[(string)(($timestamp+(15*60))*1000)] = array('title'=>$details);
  }
  echo json_encode($adjusted_events);
  exit;
}

if(isset($_REQUEST['stats']))
{
  $base_stats = array();
  $base_stats = json_decode(file_get_contents($stats_log),true);

  $stats = array(
  	"timestamp"=>time(),
		"customer_demand"=>min($base_stats['today_orders']/$base_stats['biggest_day_orders'],1),
		"warehouse_output"=>min($base_stats['pack_rate']/$base_stats['best_pack_rate'],1),
		"same_day_despatch"=> min( 1, max( 0.954, $base_stats['orders_despatched_same_day'] /$base_stats['orders_despatched'] ) ),
		"accuracy"=> 1 - $base_stats['errors_in_period']/$base_stats['orders_in_period'],
		"items_in_storage"=>$base_stats['items'],
		"fullness"=>min(0.7, $base_stats['items']/$base_stats['max_items'])
  );
  echo json_encode($stats);
  exit;
}
/* Original hard-coded values

$today_orders = 600; // all non-despathced queue orders excluding stuck,held
$biggest_day_orders = 1155; // biggest of above
$pack_rate = 72.3435; // orders put in box per hour, over last hour
$best_pack_rate = 100; // biggest of above
$orders_despatched_same_day = 600; // over a week, how many orders despatched < 24h from placed
$orders_despatched = 605; // orders packed in same period
$errors_in_period = 1; // hard coded, in 3 months
$orders_in_period = 10000; //orders despatched in last 3 months
$items = 200112; // items in wh now
$max_items = 222000; // max of above

$stats = array(
  	"timestamp"=>time(),
		"customer_demand"=>min($today_orders/$biggest_day_orders,1),
		"warehouse_output"=>min($pack_rate/$best_pack_rate,1),
		"same_day_despatch"=> min($orders_despatched_same_day /$orders_despatched,1),
		"accuracy"=> 1 - $errors_in_period/$orders_in_period,
		"items_in_storage"=>$items,
		"fullness"=>min(0.7, $items/$max_items)
  );
echo json_encode($stats);

*/
