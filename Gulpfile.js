"use strict";

let gulp = require('gulp'),
	_ = require('./.strategist/helpers.js'),
	fs = require('fs-extra'),
	plugins = require('gulp-load-plugins')(),
	path = require("path"),
	del = require('del'),
	runSequence = require("run-sequence"),
	browserSync	= require('browser-sync').create(),
	config = require("./config.json"),
	client = config["client"],
	project = config["project"],
	concepts = config["concepts"],
	tasksPath = './.strategist/tasks.json',
	tasks = require('./.strategist/tasks.json'),
	sizes = config["sizes"],
	vendors = config["vendors"],
	hasStatics = config["hasStatics"],
	staticExtension = config["staticExtension"],
	globalImgPath = "../../../assets/images/",
	globalScriptsPath = "../../../assets/scripts/",
	jsDependencies = [];



// START CLEANING TASK
gulp.task('clean', function() {
	return gulp.src('./.strategist/banner.lodash')
		.pipe(plugins.prompt.prompt({
			type: 'confirm',
			name: 'clean',
			message: '\nAre you sure you want to clean your project? This includes removing the following:\n\n1. Files within the banners dir.\n\n2. The preview dir.\n\n3. The handoff dir and .zip'
		}, function(res) {
			if(res.clean === true) {
				del('./banners/*');
				del('./preview');
				del('./' + client + '-' + project + '-handoff');
				del('./' + client + '-' + project + '-handoff.zip');
			}
		}));
});



//START LOSELESS IMAGE MINIFICATION
gulp.task('image-min', function() {
	return gulp.src( ['./assets/images/**', './assets/static-banners/**'], {base: './'} )
		.pipe(plugins.imagemin({
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
		}))
		.pipe(gulp.dest('./'));
});
//END LOSELESS IMAGE MINIFICATION



//START CUSTOM DEPENDENCY RELOCATION
gulp.task('dep', function() {
	return gulp.src('./node_modules/jquery/dist/jquery.min.js').pipe(gulp.dest('./assets/scripts/'));
});
//END CUSTOM DEPENDENCY RELOCATION



//START BUILD GLOBAL JSFILES ARRAY
gulp.task('get-js-files', function() {
	return _.getJSFiles().then(function(data) {
		jsDependencies = data;
	}).catch(function(e) {
		console.log(e);
	});
});
//END BUILD GLOBAL JSFILES ARRAY



// START GENERATE MASTER BANNER TASKS
function registerMasterTasks() {
	return new Promise(function(resolve, reject) {
		tasks.master.forEach(function(masterconcept) {
			let concept = masterconcept.match(/master-(.+)/)[1];

			if( !_.isGenerated('./banners/', concept) ) {

				gulp.task(masterconcept, function() {
				 	return gulp.src('./.strategist/banner.lodash')
						.pipe(plugins.plumber(function(error) {
								plugins.util.log(
									plugins.util.colors.red(error.message),
									plugins.util.colors.yellow('\r\nOn line: '+error.line),
									plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
								);
								this.emit('end');
							}))
						.pipe(plugins.consolidate('lodash', {
							jsDependencies: jsDependencies,
							imgDependencies: _.getImages(concept, sizes[0].name,  './banners/' + concept + sizes[0].name, false),
							imgPath: globalImgPath,
							scriptsPath: globalScriptsPath,
							bannerWidth: sizes[0].width,
							bannerHeight: sizes[0].height,
							vendorScriptHeader: '<%= vendorScriptHeader %>',
							vendorScriptFooter: '<%= vendorScriptFooter %>',
							vendorLink: '<%= vendorLink %>'
						}))
						.pipe(plugins.rename('index.html'))
						.pipe(gulp.dest('./banners/' + concept + '/' + sizes[0].name));
				});
			}
		});
		return resolve(true);
	});
}
// END GENERATE MASTER TASKS

// START GENERATE RESIZE TASKS
function registerResizeTasks() {
	return new Promise(function(resolve, reject) {
		tasks.resize.forEach(function(conceptSize) {

			let size = conceptSize.match(/.*-(\d*x\d*)/)[1],
				concept = conceptSize.match(/(.*)-/)[1],
				width = /(\d*)x/.exec(size)[1],
				height = /x(\d*)/.exec(size)[1],
				bannerName = size,
				bannerDirectory = 'banners/' + concept + '/',
				destination = bannerDirectory + bannerName,
				firstConfigSize = sizes[0].name;

			// We don't need to re-generate the first size
			if( size !== firstConfigSize ) {
				// All non-master sizes are generated through their corresponding concept lodash template.
				gulp.task(conceptSize, function() {
					 return gulp.src('./banners/' + concept + '/' + firstConfigSize + '/index.html')
						.pipe(plugins.plumber(function(error) {
								plugins.util.log(
									plugins.util.colors.red(error.message),
									plugins.util.colors.yellow('\r\nOn line: '+error.line),
									plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
									);
								this.emit('end');
							}))
						.pipe(plugins.consolidate('lodash', {
							vendorScriptHeader: '<%= vendorScriptHeader %>',
							vendorScriptFooter: '<%= vendorScriptFooter %>',
							vendorLink: '<%= vendorLink %>'
						}))
						.pipe(plugins.replace('300x600', size))
						.pipe(plugins.replace('width=' + sizes[0].width, 'width=' + width))
						.pipe(plugins.replace('height=' + sizes[0].height, 'height=' + height))
						.pipe(plugins.replace(sizes[0].width + 'px', width + 'px'))
						.pipe(plugins.replace(sizes[0].height + 'px', height + 'px'))
						.pipe(plugins.replace('var w = ' + sizes[0].width, 'var h = ' + width))
						.pipe(plugins.replace('var h = ' + sizes[0].height, 'var h = ' + height))
						.pipe(plugins.rename('index.html'))
						.pipe(gulp.dest(destination));

				});
			} else {
				gulp.task(conceptSize, function() {
					console.log('\nGenerating other sizes of ' + concept + ' concept based on the original animated size, ' + firstConfigSize + '\n');
				});
			}
		});
		resolve(true);
	});
}
// END GENERATE RESIZE TASKS

// START GENERATE VENDOR TASKS
function registerVendorTasks() {
	return new Promise(function(resolve, reject) {
		tasks.vendor.forEach(function(vendorConceptSize) {
			let vendor = vendorConceptSize.match(/(.*)_/)[1],
				concept = vendorConceptSize.match(/.*_(.*)@/)[1],
				size = vendorConceptSize.match(/.*@(.*)/)[1],
				target = './banners/' + concept + '/' + size,
				destination = './.strategist/temp/vendor/' + vendor + '/' + concept + '-' + size,
				scriptHeader,
				scriptFooter,
				link;

			// get vendor specific details to add to banner
			vendors.forEach(function(vendorFromConfig) {
				if (vendorFromConfig.name === vendor) {
					scriptHeader = vendorFromConfig.scriptHeader;
					scriptFooter = vendorFromConfig.scriptFooter;
					link = vendorFromConfig.link;
				}
			});

			gulp.task(vendorConceptSize, function() {
				return _.copyDir(target, destination).then(function() {

					return gulp.src(destination + '/index.html', {base: "./"})
						.pipe(plugins.plumber(function(error) {
								plugins.util.log(
									plugins.util.colors.red(error.message),
									plugins.util.colors.yellow('\r\nOn line: '+error.line),
									plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
									);
								this.emit('end');
							}))
						.pipe(plugins.consolidate('lodash', {
							vendorScriptHeader: scriptHeader,
							vendorScriptFooter: scriptFooter,
							vendorLink: link
						}))
						.pipe(plugins.replace('../../../assets/images/', ''))
						.pipe(plugins.replace('../../../assets/scripts/', ''))
						.pipe(gulp.dest("./"));
				});
			});
		});
		return resolve(true);
	});
}
// END GENERATE VENDOR TASKS

// START GENERATE HANDOFF TASKS
function registerHandoffTasks() {
	return new Promise(function(resolve, reject) {
		tasks.handoff.forEach(function(handoffVendorConceptSize) {
			gulp.task(handoffVendorConceptSize, function() {
				let vendor = handoffVendorConceptSize.match(/handoff-(.*)_/)[1],
					concept = handoffVendorConceptSize.match(/_(.*)@/)[1],
					size = handoffVendorConceptSize.match(/@(.*)/)[1],
					bannerName = concept + '-' + size,
					target = './.strategist/temp/vendor/' + vendor + '/' + bannerName + '/*',
					destination = './.strategist/temp/handoff/';

				return _.zipDirs(target, destination, './' + vendor + '/' + bannerName + '.zip');
			});
		});
		return resolve(true);
	});
}
// END GENERATE HANDOFF TASKS


gulp.task('index', function() {
	return gulp.src("./.strategist/index.lodash")
		.pipe(plugins.plumber(function(error) {
				plugins.util.log(
					plugins.util.colors.red(error.message),
					plugins.util.colors.yellow('\r\nOn line: '+error.line),
					plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
					);
				this.emit('end');
			}))
		.pipe(plugins.consolidate('lodash', {
			client: client,
			project: project,
			sizes: sizes,
			vendors: vendors,
			concepts: concepts,
		}))
		.pipe(plugins.rename("index.html"))
		.pipe(gulp.dest("./"));
});


gulp.task('default', ['index'], function() {
	return _.getTasksArray(concepts, undefined, 'master-').then(function(masterData) {
		return _.getTasksArray(concepts, sizes, '-').then(function(sizeData) {
			return _.getTasksArray(vendors, concepts, '_').then(function(vendorConceptsData) {
				return _.getTasksArray(vendorConceptsData, sizes, '@').then(function(vendor) {
					return _.getTasksArray(vendor, undefined, 'handoff-').then(function(handoff) {
						// remove any tasks currently in the tasks.json file
						delete tasks['master'];
						delete tasks['resize'];
						delete tasks['vendor'];
						delete tasks['handoff'];

						// Add generated task names to the tasks.json file
						tasks.master = masterData;
						tasks.resize = sizeData;
						tasks.vendor = vendor;
						tasks.handoff = handoff;
						fs.writeFileSync(tasksPath, JSON.stringify(tasks));

						return registerMasterTasks().then(function() {
							return runSequence('dep',
						    ['get-js-files', 'image-min'],
								tasks.master,
								'watch');
						});
					}).catch(function(e) { console.log(e); });
				}).catch(function(e) { console.log(e); });
			}).catch(function(e) { console.log(e); });
		}).catch(function(e) { console.log(e); });
	}).catch(function(e) { console.log(e); });
});

gulp.task('resize', ['get-js-files'], function() {
	return registerResizeTasks().then(function() {
		return gulp.start(tasks.resize);
	});
});

// Generate Client Preview
gulp.task("preview", function() {
	return _.copyDir('./.strategist/preview', './preview').then(function() {
		return _.copyDir('./banners/', './preview/banners').then(function() {
			return _.copyDir('./assets/', './preview/assets').then(function() {
				return gulp.src("./.strategist/preview.lodash")
					.pipe(plugins.plumber(function(error) {
							plugins.util.log(
								plugins.util.colors.red(error.message),
								plugins.util.colors.yellow('\r\nOn line: '+error.line),
								plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
								);
							this.emit('end');
						}))
					.pipe(plugins.consolidate('lodash', {
						client: client,
						project: project,
						sizes: sizes,
						vendors: vendors,
						concepts: concepts,
						hasStatics: hasStatics,
						staticExtension: staticExtension
					}))
					.pipe(plugins.rename("index.html"))
					.pipe(gulp.dest("./preview"));
			});
		});
	});
});

gulp.task('vendor', function() {
	registerVendorTasks().then(function() {
		return gulp.start(tasks.vendor);
	});
});

// COPIES STATIC BANNERS INTO HANDOFF FOLDER
gulp.task('copy-static', function() {
	return gulp.src('./assets/static-banners/*')
		.pipe(gulp.dest('./.strategist/temp/handoff/static-backups/'));
});

gulp.task('zip-banners', function() {
	registerHandoffTasks().then(function() {
		return gulp.start(tasks.handoff);
	});
});

gulp.task('zip-handoff', ['zip-banners'], function() {
	return gulp.src('./.strategist/temp/handoff/**')
		.pipe(plugins.zip(client + '-' + project + '-' + 'handoff.zip'))
		.pipe(gulp.dest('./'))
});

gulp.task('clean-temp', function() {
	return del(".strategist/temp");
});

gulp.task('handoff', function() {
	return runSequence(
		'vendor',
		['copy-static', 'zip-banners'],
		'zip-handoff',
		'clean-temp'
	);
});



gulp.task('watch', function() {

	// Serve files from this project's virtual host that has been configured with the server rendering this site
	browserSync.init({
		server: {
        baseDir: "./"
    },
		logPrefix: client + '-' + project,
		reloadOnRestart: true,
		notify: true
	});

	gulp.watch( './banners/**/**/index.html' ).on("change", browserSync.reload);
});
