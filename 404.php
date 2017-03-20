<?php

$img_uri = get_stylesheet_directory_uri() . '/assets/img';

get_header(); ?>

    <!-- content -->
    <article id="post-0" <?php post_class( 'et_pb_post not_found' ); ?>>
        <h1><?php esc_html_e('Sorry. Page Not Found','Divi'); ?></h1>
        <p><?php esc_html_e('Whoops. Looks like the page you were looking for doesn\'t exit. Maybe try searching for something else using the search bar above', 'Divi'); ?></p>
    </article>
    <!-- end: content -->

<?php get_footer(); ?>
