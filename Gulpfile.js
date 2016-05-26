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
	globalImgPath = "/assets/images/",
	globalScriptsPath = "/assets/scripts/",
	jsDependencies = [];

// START CLEANING TASK
gulp.task("clean", function() {
	return gulp.src("./templates/banner-general.lodash")
		.pipe(plugins.prompt.prompt({
			type: "confirm",
			name: 'clean',
			message: "\nAre you sure you want to clean your project? This includes removing the following:\n\n1. Files within the 1-first-size dir.\n2. Files within the 2-resize dir.\n3. Files within the 3-vendor dir.\n4. Files within the 4-handoff dir.\n5. All generated *.lodash templates.\n\n"
		}, function(res) {
			if(res.clean === true) {
				del("1-first-size/*");
				del("2-resize/*");
				del("3-vendor/*");
				del("4-handoff/*");

				for( var c = 0; c <= concepts.length; c++ ) {
					var concept = concepts[c]
					if(concept) {
						del("./templates/banner-" + concept + ".lodash");
					}
				}
			}
		}));
});

gulp.task("purge", ["clean"], function() { console.log("\n\ngulp purge is not a task. Ran gulp clean instead.\n\n")});
// END CLEANING TASK



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



// START GENERATE MASTER AND RESIZE TASKS
function registerTasks() {
	tasks.master.forEach(function(masterconcept) {
		let concept = masterconcept.match(/master-(.+)/)[1];

		if( !_.isGenerated('./1-first-size/', masterconcept) ) {

			// Create individual templates for each concept. These will be used on resizes
			gulp.src("./templates/banner-general.lodash")
				.pipe(plugins.rename("./templates/banner-" + concept + ".lodash"))
				.pipe(gulp.dest("./"));

			// START GENERATE MASTER TASKS
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
						imgDependencies: _.getImages(concept, sizes[0].name,  './1-first-size/' +  masterconcept, false),
						imgPath: globalImgPath,
						scriptsPath: globalScriptsPath,
						bannerWidth: sizes[0].width,
						bannerHeight: sizes[0].height,
						vendorScript: '<%= vendorScript %>',
						vendorLink: '<%= vendorLink %>'
					}))
					.pipe(plugins.rename('index.html'))
					.pipe(gulp.dest('./1-first-size/' + masterconcept));
			});
			// END GENERATE MASTER TASKS
		}

		tasks.resize.forEach(function(conceptSize) {
			let size = conceptSize.match(/.*-(\d*x\d*)/)[1],
				concept = conceptSize.match(/(.*)-/)[1],
				height = /(\d*)x/.exec(size)[1],
				width = /x(\d*)/.exec(size)[1],
				bannerName = concept + '-' + size,
				bannerDirectory = '2-resize/concept-' + concept + '/',
				destination = bannerDirectory + bannerName;

			if (!_.isGenerated('./2-resize/', 'concept-' + concept)) {

				// START GENERATE RESIZE TASKS
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
				// END GENERATE RESIZE TASKS
			}

			// START GENERATE VENDOR TASKS
			tasks.vendor.forEach(function(vendorConceptSize) {
				let vendor = vendorConceptSize.match(/(.*)_/)[1],
					concept = vendorConceptSize.match(/.*_(.*)@/)[1],
					size = vendorConceptSize.match(/.*@(.*)/)[1],
					target = './2-resize/concept-' + concept + '/' + concept + '-' + size,
					destination = './3-vendor/vendor-' + vendor + '/' + concept + '-' + size,
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
							// .pipe(plugins.replace('/assets/images/', ''))
							// .pipe(plugins.replace('/assets/scripts/', ''))
							.pipe(gulp.dest("./"));
					});
				});
			});
			// END GENERATE VENDOR TASKS
		});
	});
}

gulp.task('default', function() {
	return _.getTasksArray(concepts, undefined, 'master-').then(function(masterData) {
		return _.getTasksArray(concepts, sizes, '-').then(function(sizeData) {
			return _.getTasksArray(vendors, concepts, '_').then(function(vendorConceptsData) {
				return _.getTasksArray(vendorConceptsData, sizes, '@').then(function(vendor) {

					// remove any tasks currently in the tasks.json file
					delete tasks['master'];
					delete tasks['resize'];
					delete tasks['vendor'];

					// Add generated task names to the tasks.json file
					tasks.master = masterData;
					tasks.resize = sizeData;
					tasks.vendor = vendor;
					// tasks.vendor2 = vendor2;
					fs.writeFileSync(tasksPath, JSON.stringify(tasks));

					registerTasks();
					return runSequence('dep',
				    ['get-js-files', 'image-min'],
						tasks.master);
				}).catch(function(e) { console.log(e); });
			}).catch(function(e) { console.log(e); });
		}).catch(function(e) { console.log(e); });
	}).catch(function(e) { console.log(e); });
});

gulp.task('resize', ['get-js-files'], function() {
	registerTasks();
	return gulp.start(tasks.resize);
});

gulp.task('vendor', function() {
	registerTasks();
	return gulp.start(tasks.vendor);
});
