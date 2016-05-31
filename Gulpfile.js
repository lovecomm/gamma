"use strict";

let gulp = require('gulp'),
	_ = require('./app/helpers.js'),
	fs = require('fs-extra'),
	plugins = require('gulp-load-plugins')(),
	path = require("path"),
	del = require('del'),
	date 	= new Date(),
	runSequence = require("run-sequence"),
	config = require("./config.json"),
	client = config["client"],
	project = config["project"],
	concepts = config["concepts"],
	tasksPath = './app/tasks.json',
	tasks = require('./app/tasks.json'),
	sizes = config["sizes"],
	vendors = config["vendors"],
	hasStatics = config["hasStatics"],
	staticExtension = config["staticExtension"],
	globalImgPath = "../../assets/images/",
	globalScriptsPath = "../../assets/scripts/",
	jsDependencies = [];



// START CLEANING TASK
gulp.task("clean", function() {
	return gulp.src("./templates/banner-general.lodash")
		.pipe(plugins.prompt.prompt({
			type: "confirm",
			name: 'clean',
			message: "\nAre you sure you want to clean your project? This includes removing the following:\n\n1. Files within the 1-masters/master-concepts dir.\n2. Files within the 2-resize dir.\n3. Files within the 3-preview dir.\n4. Files within the 4-vendor dir.\n5. Files within the 5-handoff dir.\n6. All generated *.lodash templates.\n\n"
		}, function(res) {
			if(res.clean === true) {
				del("1-masters/master-concepts/*");
				del("2-resize/*");
				del("3-preview/banners/*");
				del("4-vendor/*");
				del("5-handoff/*");

				for( var c = 0; c <= concepts.length; c++ ) {
					var concept = concepts[c]
					if(concept) {
						del("./templates/banner-" + concept + ".lodash");
					}
				}
			}
		}));
});



//START LOSELESS IMAGE MINIFICATION
gulp.task("image-min", function() {
	return gulp.src( ["./assets/images/**", "./assets/static-banners/**"], {base: "./"} )
		.pipe(plugins.imagemin({
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
		}))
		.pipe(gulp.dest("./"));
});
//END LOSELESS IMAGE MINIFICATION



//START CUSTOM DEPENDENCY RELOCATION
gulp.task("dep", function() {
	return gulp.src("./node_modules/jquery/dist/jquery.min.js").pipe(gulp.dest("./assets/scripts/"));
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



// START GENERATE MASTER TASKS
function registerMasterTasks() {
	tasks.master.forEach(function(masterconcept) {
		let concept = masterconcept.match(/master-(.+)/)[1];

		if( !_.isGenerated('./1-masters/master-concepts/', masterconcept) ) {

			// Create individual templates for each concept. These will be used on resizes
			gulp.src("./templates/banner-general.lodash")
				.pipe(plugins.rename("./templates/banner-" + concept + ".lodash"))
				.pipe(gulp.dest("./"));

			gulp.task(masterconcept, function() {
			 	return gulp.src('./templates/banner-general.lodash')
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
						imgDependencies: _.getImages(concept, sizes[0].name,  './1-masters/master-concepts/' +  masterconcept, false),
						imgPath: globalImgPath,
						scriptsPath: globalScriptsPath,
						bannerWidth: sizes[0].width,
						bannerHeight: sizes[0].height,
						vendorScript: '<%= vendorScript %>',
						vendorLink: '<%= vendorLink %>'
					}))
					.pipe(plugins.rename('index.html'))
					.pipe(gulp.dest('./1-masters/master-concepts/' + masterconcept));
			});
		}
	});
}
// END GENERATE MASTER TASKS

// START GENERATE RESIZE TASKS
function registerResizeTasks() {
	tasks.resize.forEach(function(conceptSize) {
		let size = conceptSize.match(/.*-(\d*x\d*)/)[1],
			concept = conceptSize.match(/(.*)-/)[1],
			height = /(\d*)x/.exec(size)[1],
			width = /x(\d*)/.exec(size)[1],
			bannerName = concept + '-' + size,
			bannerDirectory = '2-resize/concept-' + concept + '/',
			destination = bannerDirectory + bannerName;

		if (!_.isGenerated('./2-resize/', 'concept-' + concept)) {

			gulp.task(conceptSize, function() {

				 gulp.src("./templates/banner-" + concept + ".lodash")
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
						imgDependencies: _.getImages(concept, size, destination, false),
						imgPath: globalImgPath,
						scriptsPath: globalScriptsPath,
						bannerWidth: width,
						bannerHeight: height,
						vendorScript: "<%= vendorScript %>",
						vendorLink: "<%= vendorLink %>"
					}))
					.pipe(plugins.rename("index.html"))
					.pipe(gulp.dest(destination));
			});
		}
	});
}
// END GENERATE RESIZE TASKS

// START GENERATE VENDOR TASKS
function registerVendorTasks() {
	tasks.vendor.forEach(function(vendorConceptSize) {
		let vendor = vendorConceptSize.match(/(.*)_/)[1],
			concept = vendorConceptSize.match(/.*_(.*)@/)[1],
			size = vendorConceptSize.match(/.*@(.*)/)[1],
			target = './2-resize/concept-' + concept + '/' + concept + '-' + size,
			destination = './4-vendor/vendor-' + vendor + '/' + concept + '-' + size,
			script,
			link;

		// get vendor specific details to add to banner
		vendors.forEach(function(vendorFromConfig) {
			if (vendorFromConfig.name === vendor) {
				script = vendorFromConfig.script;
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
						vendorScript: script,
						vendorLink: link
					}))
					.pipe(plugins.replace('/assets/images/', ''))
					.pipe(plugins.replace('/assets/scripts/', ''))
					.pipe(gulp.dest("./"));
			});
		});
	});
}
// END GENERATE VENDOR TASKS

// START GENERATE HANDOFF TASKS
function registerHandoffTasks() {
	tasks.handoff.forEach(function(handoffVendorConceptSize) {
		gulp.task(handoffVendorConceptSize, function() {
			let vendor = handoffVendorConceptSize.match(/handoff-(.*)_/)[1],
				concept = handoffVendorConceptSize.match(/_(.*)@/)[1],
				size = handoffVendorConceptSize.match(/@(.*)/)[1],
				bannerName = concept + '-' + size,
				target = '4-vendor/vendor-' + vendor + '/' + bannerName + '/*',
				destination = './5-handoff';

			return _.zipDirs(target, destination, './' + vendor + '/' + bannerName + '.zip').then(function() {

				return gulp.src('./5-handoff/**')
					.pipe(plugins.zip('./' + client + '-' + project + '-' + 'handoff.zip'))
					.pipe(gulp.dest('./'))
			});
		});
	});
}
// END GENERATE HANDOFF TASKS

gulp.task('default', function() {
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

						registerMasterTasks();
						return runSequence('dep',
					    ['get-js-files', 'image-min'],
							tasks.master);
					}).catch(function(e) { console.log(e); });
				}).catch(function(e) { console.log(e); });
			}).catch(function(e) { console.log(e); });
		}).catch(function(e) { console.log(e); });
	}).catch(function(e) { console.log(e); });
});

gulp.task('resize', ['get-js-files'], function() {
	registerResizeTasks();
	return gulp.start(tasks.resize);
});

gulp.task('vendor', function() {
	registerVendorTasks();
	return gulp.start(tasks.vendor);
});

gulp.task('handoff', ['copy-static'], function() {
	registerHandoffTasks();
	return gulp.start(tasks.handoff);
});

// Generate Client Preview
gulp.task("preview", function() {

	return _.copyDir('./2-resize/', './3-preview/banners').then(function() {
		return _.copyDir('./assets/', './3-preview/banners/assets').then(function() {
			return gulp.src("./templates/preview.lodash")
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
				.pipe(gulp.dest("./3-preview"));
		});
	});
});

// COPIES STATIC BANNERS INTO HANDOFF FOLDER
gulp.task('copy-static', function() {
	return gulp.src('./assets/static-banners/*')
		.pipe(gulp.dest('./5-handoff/static-backups/'));
});
