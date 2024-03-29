<?php

$img_uri = get_stylesheet_directory_uri() . '/assets/img';

$s=get_search_query();
$args = array('s' =>$s);
// The Query
$the_query = new WP_Query( $args );

get_header(); ?>

    <!-- content -->
    <div class="search-results">

        <section class="bg-scroll-img center-text">
            <div class="wrapper">
                <h1>
                    <?php
                        echo( ( $the_query->have_posts() ) ? 'Search Results' : 'Nothing Found');
                    ?>
                </h1>
                <?php
                    if ( $the_query->have_posts() ) {
                        _e('<h2>Showing results for &ldquo;'.get_query_var('s').'&rdquo;</h2>');
                    }
                ?>
            </div>
        </section>


        <section class="section-light">
            <article class="wrapper">

                <?php
                    if ( $the_query->have_posts() ) {
                        while ( $the_query->have_posts() ) {
                            $the_query->the_post();
                ?>
                <a href="<?php the_permalink(); ?>" class="serif"><?php the_title(); ?></a>
                <p>
                    <?php the_excerpt(); ?>
                </p>
                <?php
                        } //end while
                    }else{
                ?>
                <p class="serif center-text">
                    Sorry, but nothing matched your search. Please try again with some different keywords.
                </p>
                <?php } ?>

            </article>
        </section>


        <section class="contact-panel">
            <div class="wrapper">
                <h2 class="center-text">
                    Interested? Of course you are!
                </h2>
                <div class="counter center-elem"></div>
                <p>
                    Thinking about outsourcing your eCommerce fulfilment? Our expert team can help find a package that’s right for you.
                </p>
                <div class="contact-form">
                    <input type="eamil" class="email" />
                    <button class="primary">Submit Email</button>
                </div>
            </div>
        </section>

    </div>
    <!-- end: content -->

<?php get_footer(); ?>

