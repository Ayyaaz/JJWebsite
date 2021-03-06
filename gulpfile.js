// npm install -g browser-sync - a global install for browser-sync

// Set-up your package.json
// $ npm init

// Then Gulp & Packages
// $ npm install gulp gulp-sass gulp-postcss autoprefixer cssnano gulp-notify gulp-rename del browser-sync --save-dev

var gulp = require('gulp'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    rename = require('gulp-rename'),
    notify = require('gulp-notify'),
    del = require('del'),
    browserSync = require('browser-sync').create(),
    imagemin = require('gulp-imagemin'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify');


// SCSS Compiling Magic
gulp.task('styles', function () {

    // Auto Prefixer and CSS minification
    var processors = [
        autoprefixer('last 2 version'),
        cssnano
    ];

    return gulp.src('scss/style.scss') // only reference the central .scss file
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss(processors))
        .pipe(gulp.dest('css'))
        .pipe(browserSync.stream()) // Exclude if you don't want to use Browser Sync
        .pipe(notify({ message: 'Styles task complete' }));
});


gulp.task('clean', function() {
    return del(['css']);
});

gulp.task('watch', ['scripts'], function() {

    // Create Browser Sync Server
    browserSync.init({
        server: "./"
    });
    // Create Browser Sync Server

    // Watch .scss files and reload via Browser Sync
    gulp.watch('**/*.scss', ['styles']);
    gulp.watch("./*.html").on('change', browserSync.reload);  // Exclude if you don't want to use Browser Sync (looks at html file changes)

});

gulp.task('images', () =>
    gulp.src('pre-img/**/*')
        .pipe(imagemin())
        .pipe(gulp.dest('css/assets/img'))
);

// concat and minify js
var //jsFiles = 'js/**/*.js',
    jsDest = 'dist/scripts';

var jsFiles = [
  'js/vendor/fastclick.js',
  'js/vendor/slick.js',
  'js/vendor/placeholder.js',
  'js/vendor/killercarousel.js',
  'js/live-feed.js',
  'js/clock2.js',//?1492702292',
  'js/script.js'
];

gulp.task('scripts', function() {
    return gulp.src(jsFiles)
        .pipe(concat('scripts.js'))
        .pipe(gulp.dest(jsDest))
        .pipe(rename('scripts.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(jsDest));
});
// end: concat and minify js
