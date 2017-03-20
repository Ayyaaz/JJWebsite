<?php

$img_uri = get_stylesheet_directory_uri() . '/assets/img';

get_header(); ?>

    <!-- content -->
    <div>

        <?php
        $s=get_search_query();
        $args = array(
                        's' =>$s
                    );
            // The Query
        $the_query = new WP_Query( $args );
        if ( $the_query->have_posts() ) {
                _e("<h2>Search Results for: ".get_query_var('s')."</h2>");
                while ( $the_query->have_posts() ) {
                   $the_query->the_post();
                         ?>
                            <li>
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </li>
                         <?php
                }
            }else{
        ?>
                <h2>Nothing Found</h2>
                <div>
                  <p>Sorry, but nothing matched your search criteria. Please try again with some different keywords.</p>
                </div>
        <?php } ?>

        <section class="contact-panel">
            <div class="wrapper">
                <h2>
                    Interested? Of course you are!
                </h2>
                <div class="counter center-elem"></div>
                <p>
                    Thinking about outsourcing your eCommerce fulfilment? Our expert team can help find a package that’s right for you.
                </p>
                <div class="contact-form">
                    <input type="eamil" class="email" />
                    <button class="btn">Submit Email</button>
                </div>
            </div>
        </section>

    </div>
    <!-- end: content -->

<?php get_footer(); ?>

