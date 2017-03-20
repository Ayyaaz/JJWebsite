<?php

$img_uri = get_stylesheet_directory_uri() . '/assets/img';

get_header(); ?>

    <!-- content -->
    <div <?php post_class( '404-page' ); ?>>

        <section class="bg-scroll-img center-text">
            <div class="wrapper">
                <h1>
                    Whoops!
                </h1>
                <h2>
                    Sorry, Page Not Found
                </h2>
                <div class="counter center-elem"></div>
                <p>
                    Looks like the page you were looking for doesn't exit.<br>
                    Try searching for something else using the search bar in the header.
                </p>
            </div>
        </section>

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
