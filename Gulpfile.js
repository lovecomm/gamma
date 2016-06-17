"use strict";

let gulp = require('gulp'),
	_ = require('./.strategist/helpers.js'),
	fs = require('fs-extra'),
	plugins = require('gulp-load-plugins')(),
	path = require("path"),
	colors = require('colors'),
	del = require('del'),
	runSequence = require("run-sequence"),
	browserSync	= require('browser-sync').create(),
	tasksPath = './.strategist/tasks.json',
	tasks = require('./.strategist/tasks.json'),
	globalImgPath = '../../../assets/images/',
	globalScriptsPath = '../../../assets/scripts/',
	viewScript = '<script src="../../../.strategist/jquery.min.js"></script><script src="../../../.strategist/view.js"></script>',
	jsDependencies = [],
	config = require('./.strategist/config/config.json');


// START CLEANING TASK
gulp.task('clean', function() {
	return gulp.src('./.strategist/banner.lodash')
		.pipe(plugins.prompt.prompt({
			type: 'confirm',
			name: 'clean',
			message: colors.red('\nAre you sure you want to clean your project? This includes removing the following:\n1. Files within the banners dir.\n2. The preview dirs.\n3. The handoff dir. and .zip\n4. The generated config.\n5. The generated task arrays.\n6. The generated root index.html file.\n')
		}, function(res) {
			if(res.clean === true) {
				del('./banners/*');
				del('./preview');
				del('./preview-static');
				del('./' + config.client + '-handoff');
				del('./' + config.client + '-handoff.zip');
				del('./index.html');
				let emptyObject = {};

				fs.writeFile('.strategist/config/config.json', JSON.stringify(emptyObject, null, '  '), (err) => {
					if (err) throw err;
				});

				fs.writeFile('.strategist/tasks.json', JSON.stringify(emptyObject, null, '  '), (err) => {
					if (err) throw err;
				});
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



//START BUILD GLOBAL JSFILES ARRAY
gulp.task('get-js-files', function() {
	return _.getFiles('./assets/scripts', 'js').then(function(data) {
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

			_.getImages(concept, config.sizes[0].name,  './banners/' + concept + config.sizes[0].name, false).then(function(imgArray) {
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
							imgDependencies: imgArray,
							imgPath: globalImgPath,
							scriptsPath: globalScriptsPath,
							bannerWidth: config.sizes[0].width,
							bannerHeight: config.sizes[0].height,
							viewScript: viewScript
						}))
						.pipe(plugins.rename('index.html'))
						.pipe(gulp.dest('./banners/' + concept + '/' + config.sizes[0].name));
				});
			});
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
				firstConfigSize = config.sizes[0].name;

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
						.pipe(plugins.replace('300x600', size))
						.pipe(plugins.replace('width=' + config.sizes[0].width, 'width=' + width))
						.pipe(plugins.replace('height=' + config.sizes[0].height, 'height=' + height))
						.pipe(plugins.replace(config.sizes[0].width + 'px', width + 'px'))
						.pipe(plugins.replace(config.sizes[0].height + 'px', height + 'px'))
						.pipe(plugins.replace('var w = ' + config.sizes[0].width, 'var w = ' + width))
						.pipe(plugins.replace('var h = ' + config.sizes[0].height, 'var h = ' + height))
						.pipe(plugins.rename('index.html'))
						.pipe(gulp.dest(destination));

				});
			} else {
				gulp.task(conceptSize, function() {
					console.log(colors.yellow('\nGenerating other sizes of ' + concept + ' concept based on the original animated size, ' + firstConfigSize + '\n'));
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

			_.getImages(concept, size, destination, true).then(function() {
				// get vendor specific details to add to banner
				config.vendors.forEach(function(vendorFromConfig) {
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
							.pipe(plugins.replace('<!-- DO NOT REMOVE THIS COMMENT: vendorScriptHeader -->', scriptHeader))
							.pipe(plugins.replace('<!-- DO NOT REMOVE THIS COMMENT: vendorScriptFooter -->', scriptFooter))
							.pipe(plugins.replace('#DO_NOT_REMOVE:vendorLink', link))

							.pipe(plugins.replace('../../../assets/images/', ''))
							.pipe(plugins.replace('../../../assets/scripts/', ''))
							.pipe(plugins.replace(viewScript, ''))
							.pipe(gulp.dest("./"));
					});
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


// START GENERATE PREVIEW TASKS
function registerPreviewTasks() {
	return new Promise(function(resolve, reject) {
		tasks.preview.forEach(function(conceptSizePreview) { //preview-CONCEPT-300x600
			let concept = conceptSizePreview.match(/preview-(.*)-/)[1],
				size = conceptSizePreview.match(/preview-.*-(.*)/)[1];

			gulp.task(conceptSizePreview, function() {
				return gulp.src('./preview/banners/' + concept + '/' + size + '/index.html', {base: './'} )
				.pipe(plugins.plumber(function(error) {
						plugins.util.log(
							plugins.util.colors.red(error.message),
							plugins.util.colors.yellow('\r\nOn line: '+error.line),
							plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
							);
						this.emit('end');
					}))
				.pipe(plugins.replace(viewScript, ''))
				.pipe(gulp.dest('./'));
			});
		});
		return resolve(true);
	});
}
// END GENERATE PREVIEW TASKS


// START GENERATE CHECK FILE SIZE TASKS
function registerCheckfilesizeTasks() {
	return new Promise(function(resolve, reject) {
		tasks.checkfilesize.forEach(function(conceptSizeCheck) {
			let concept = conceptSizeCheck.match(/\$(.*)-/)[1],
				size = conceptSizeCheck.match(/\$.*-(.*)/)[1],
				bannerName = concept + '-' + size,
				bannerPath = './banners/' + concept + '/' + size,
				tempPath = './.strategist/temp/checkfilesize/' + concept + '/' + size + '/',
				zipPath = './.strategist/temp/zipcheck/';

			gulp.task(conceptSizeCheck, function() {

				return _.isGenerated(bannerPath, 'index.html').then(function(generated) {
					if(generated) {
						return _.copyDir(bannerPath, tempPath).then(function() {
							return _.getImages(concept, size, tempPath, true).then(function() {
								return _.copyDir('./assets/scripts', tempPath).then(function() {
									return _.zipDirs(tempPath + '*', zipPath, bannerName + '.zip').then(function() {
										return _.checkFileSize(zipPath, bannerName + '.zip');
									});
								});
							});
						});
					}
				});
			});
		});
		return resolve(true);
	});
}
// END GENERATE CHECK FILE SIZE TASKS


// START GENERATE CONFIG AND TASK ARRAYS
gulp.task('build-strategist', function() {
	return _.buildUserConfig().then(function(generatedConfig) {
		config = generatedConfig;
		return _.getTasksArray(config.concepts, undefined, 'master-').then(function(masterData) {
			return _.getTasksArray(config.concepts, config.sizes, '-').then(function(sizeData) {
				return _.getTasksArray(config.vendors, config.concepts, '_').then(function(vendorConceptsData) {
					return _.getTasksArray(vendorConceptsData, config.sizes, '@').then(function(vendor) {
						return _.getTasksArray(vendor, undefined, 'handoff-').then(function(handoff) {
							return _.getTasksArray(sizeData, undefined, '$').then(function(checkfilesize) {
								return _.getTasksArray(sizeData, undefined, 'preview-').then(function(previewTasks) {
									// remove any tasks currently in the tasks.json file
									delete tasks['master'];
									delete tasks['resize'];
									delete tasks['vendor'];
									delete tasks['handoff'];
									delete tasks['checkfilesize'];
									delete tasks['preview'];

									// Add generated task names to the tasks.json file
									tasks.master = masterData;
									tasks.resize = sizeData;
									tasks.vendor = vendor;
									tasks.handoff = handoff;
									tasks.checkfilesize = checkfilesize;
									tasks.preview = previewTasks;

									fs.writeFile(tasksPath, JSON.stringify(tasks), (err) => {
										if (err) throw err;
									});
								}).catch(function(e) { console.log(e); });
							}).catch(function(e) { console.log(e); });
						}).catch(function(e) { console.log(e); });
					}).catch(function(e) { console.log(e); });
				}).catch(function(e) { console.log(e); });
			}).catch(function(e) { console.log(e); });
		}).catch(function(e) { console.log(e); });
	}).catch(function(e) { console.log(e); });
});
// END GENERATE CONFIG AND TASK ARRAYS


// START GENERATE INDEX–MASTER FILE
gulp.task('index-master', function() {
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
			task: 'master',
			client: config.client,
			sizes: config.sizes,
			vendors: config.vendors,
			concepts: config.concepts,
		}))
		.pipe(plugins.rename("index.html"))
		.pipe(gulp.dest("./"));
});
// END GENERATE INDEX–MASTER FILE


// START GENERATE INDEX–RESIZE FILE
gulp.task('index-resize', function() {
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
			task: 'resize',
			client: config.client,
			sizes: config.sizes,
			vendors: config.vendors,
			concepts: config.concepts,
		}))
		.pipe(plugins.rename("index.html"))
		.pipe(gulp.dest("./"));
});
// END GENERATE INDEX–RESIZE FILE


gulp.task('default', ['build-strategist'], function() {
	return registerMasterTasks().then(function() {
		return runSequence(
			'index-master',
			['get-js-files', 'image-min'],
			tasks.master,
			'watch');
	});
});


gulp.task('resize', ['get-js-files'], function() {
	return registerResizeTasks().then(function() {
		return runSequence(
			'index-resize',
			tasks.resize,
			'watch');
	});
});


gulp.task('vendor', function() {
	registerVendorTasks().then(function() {
		return runSequence(tasks.vendor);
	});
});


// COPIES STATIC BANNERS INTO HANDOFF FOLDER
gulp.task('copy-static', function() {
	return gulp.src('./assets/static-banners/*')
		.pipe(gulp.dest('./.strategist/temp/handoff/static-backups/'));
});


gulp.task('handoff', ['vendor', 'copy-static'], function() {
	registerHandoffTasks().then(function() {
		return _.runTasks(tasks.handoff).then(function() {
			return gulp.src('./.strategist/temp/handoff/**')
				.pipe(plugins.zip(config.client + '-' + 'handoff.zip'))
				.pipe(gulp.dest('./'))
				.on('end', function() {
					return runSequence('clean-temp');
				});
		});
	});
});


// START PREVIEW TASK
gulp.task('preview', function() {
	return _.copyDir('./.strategist/preview', './preview').then(function() {
		return _.copyDir('./banners/', './preview/banners').then(function() {
			return _.copyDir('./assets/', './preview/assets').then(function() {
				return _.getFiles('./assets/static-banners', undefined).then(function(staticBannerFiles) {
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
							client: config.client,
							sizes: config.sizes,
							concepts: config.concepts,
							staticBannerFiles: staticBannerFiles,
							staticOnly: false
						}))
						.pipe(plugins.rename("index.html"))
						.pipe(gulp.dest("./preview"))
						.on('end', function() {
							registerPreviewTasks().then(function() {
								return runSequence(tasks.preview);
							});
						});
				});
			});
		});
	});
});
// END PREVIEW TASK


// START GENERATE STATIC-ONLY CLIENT PREVIEW
gulp.task("preview-static", function() {
	return _.copyDir('./.strategist/preview', './preview-static').then(function() {
		return _.copyDir('./assets/', './preview-static/assets').then(function() {
			return _.getFiles('./assets/static-banners', undefined).then(function(staticBannerFiles) {
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
						client: config.client,
						staticBannerFiles: staticBannerFiles,
						staticOnly: true
					}))
					.pipe(plugins.rename("index.html"))
					.pipe(gulp.dest("./preview-static"));
			});
		});
	});
});
// START GENERATE STATIC-ONLY CLIENT PREVIEW


// START CLEAN TEMP DIR
gulp.task('clean-temp', function() {
	return del(".strategist/temp/**");
});
// END CLEAN TEMP DIR


// START WATCH TASK
gulp.task('watch', function() {

	// Serve files from this project's virtual host that has been configured with the server rendering this site
	browserSync.init({
		server: {
        baseDir: './'
    },
		logPrefix: config.client + '-banners',
		reloadOnRestart: true,
		notify: true
	});

	gulp.watch( ['./banners/**/**/index.html', './index.html', './preview/index.html'] ).on('change', browserSync.reload);
	gulp.watch( './banners/**/**/index.html', ['check-file-size']);
	gulp.watch( './.strategist/preview/preview-assets/sass/**', ['sass'] );
	gulp.watch( './preview/preview-assets/sass/**', ['sass'] );
});
// END WATCH TASK


// START CHECK FILE SIZE TASK
gulp.task('check-file-size', function() {
	registerCheckfilesizeTasks().then(function() {
		return runSequence(tasks.checkfilesize, 'clean-temp');
	});
});
gulp.task('size', ['check-file-size']);
gulp.task('check-size', ['check-file-size']);
// END CHECK FILE SIZE TASK



// START STYLE DEVELOPMENT TASK
gulp.task('sass', function() {
	return _.isGenerated('./preview', 'index.html').then(function(generated) {
		console.log(generated);
		if(!generated) {
			return gulp.src( './.strategist/preview/preview-assets/sass/custom.scss' )
				.pipe(plugins.plumber(function(error) {
					plugins.util.log(
						plugins.util.colors.red(error.message),
						plugins.util.colors.yellow('\r\nOn line: '+error.line),
						plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
						);
					this.emit('end');
				}))
				.pipe(plugins.sass())
				.pipe(plugins.cssnano())
				.pipe(plugins.rename('app.min.css'))
				.pipe(gulp.dest( './.strategist/preview/preview-assets/' ))
				.pipe(browserSync.stream());
		} else {
			return gulp.src( './preview/preview-assets/sass/custom.scss' )
				.pipe(plugins.plumber(function(error) {
					plugins.util.log(
						plugins.util.colors.red(error.message),
						plugins.util.colors.yellow('\r\nOn line: '+error.line),
						plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
						);
					this.emit('end');
				}))
				.pipe(plugins.sass())
				.pipe(plugins.cssnano())
				.pipe(plugins.rename('app.min.css'))
				.pipe(gulp.dest( './preview/preview-assets/' ))
				.pipe(browserSync.stream());
		}
	});
});
// END STYLE DEVELOPMENT TASK
