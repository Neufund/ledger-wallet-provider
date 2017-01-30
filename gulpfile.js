var gulp         = require('gulp');
var del          = require('del');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var plumber      = require('gulp-plumber');
var browserify   = require('browserify');
var babelify     = require('babelify');
var uglify       = require('gulp-uglify');
var sourcemaps   = require('gulp-sourcemaps');

gulp.task('clean', function() {
    del.sync('./dist/**/*');
});

gulp.task('bundle', function () {
    return browserify({entries: './src/index.js', debug: true})
        .transform("babelify", { presets: ["es2015"] })
        .bundle()
        .on('error', function(err) {
            console.error(err.message);
            this.emit('end');
        })
        .pipe(plumber())
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        //.pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        // .pipe(zopfli())
        .pipe(gulp.dest('./dist'))
});

gulp.task('watch', ['bundle'], function () {
    gulp.watch('./src/**/*.js', ['bundle']);
});

gulp.task('default', ['clean', 'bundle', 'watch',]);
