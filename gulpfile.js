const browserSync = require('browser-sync');
const gulp = require('gulp');
const clean = require('gulp-clean');
const copy = require('gulp-copy');
const modRewrite = require('connect-modrewrite');
const sourcemaps = require('gulp-sourcemaps');
const superstatic = require('superstatic');
const tsc = require('gulp-typescript');
const tslint = require('gulp-tslint');
const vulcanize = require('gulp-vulcanize');

const componentsProject = tsc.createProject('src/components/tsconfig.json');
const webWorkersProject = tsc.createProject('src/webworkers/tsconfig.json');

gulp.task('compile_components', () => {
	return componentsProject.src()
		.pipe(componentsProject())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('build'));
});

gulp.task('compile_webworkers', () => {
	return webWorkersProject.src()
		.pipe(webWorkersProject())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('build/src/webworkers'));
});

gulp.task('compile', ['compile_components', 'compile_webworkers']);

gulp.task('vulcanize', ['compile_components'], () => {
	return gulp.src('src/index.html')
		.pipe(vulcanize({
			inlineScripts: true,
			inlineCss: true
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('copy_webworkers', ['compile_webworkers'], () => {
	return gulp.src(['build/src/webworkers/*'])
		.pipe(copy('dist/webworkers', {prefix: 3}));
});

gulp.task('dist', ['vulcanize', 'copy_webworkers']);

gulp.task('clean', () => {
	return gulp.src(['build', 'dist'], {read: false})
		.pipe(clean());
});

gulp.task('watch', () => {
	return gulp.watch(['src/**/*.ts'], ['lint', 'compile']);
});

gulp.task('serve', ['compile', 'watch'], () => {
  process.stdout.write('Starting browserSync and superstatic...\n');
  return browserSync({
    port: 3000,
    files: [
			'src/**',
			'bower_components/**'
		],
    injectChanges: true,
    logFileChanges: false,
    notify: true,
    reloadDelay: 0,
    server: {
			baseDir: 'src',
      middleware: [
				modRewrite([
					'^/webworkers/(.*) /build/src/webworkers/$1 [L]'
				]),
				superstatic({ debug: false})
			]
    }
  });
});

gulp.task('default', ['compile']);