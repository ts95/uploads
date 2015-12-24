var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');
var reactify = require('reactify'); 
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var streamify = require('gulp-streamify');
 
gulp.task('browserify', function() {
    var bundler = browserify({
        entries: ['client/app.jsx'], // Only need initial file, browserify finds the deps
        transform: [reactify], // We want to convert JSX to normal javascript
        debug: true, // Gives us sourcemapping
        cache: {}, packageCache: {}, fullPaths: true // Requirement of watchify
    });

    function onError(err) {
        console.log(err);
    }

    var watcher = watchify(bundler);

    return watcher
        .on('update', function() { // When any files update
            console.log('Updating...');
            var updateStart = Date.now();
            watcher
                .bundle() // Create new bundle that uses the cache for high performance
                .on('error', onError)
                .pipe(source('main.js'))
                .pipe(streamify(uglify()))
                .pipe(gulp.dest('public/js/'));
            console.log('Updated.', (Date.now() - updateStart) + 'ms');
        })
        .bundle() // Create the initial bundle when starting the task
        .on('error', onError)
        .pipe(source('main.js'))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest('public/js/'));
});

gulp.task('default', ['browserify']);
