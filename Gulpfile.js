"use strict";

let gulp = require('gulp'),
	_ = require('./app/helpers.js'),
	plugins = require('gulp-load-plugins')(),
	path = require("path"),
	del = require('del'),
	date 	= new Date(),
	runSequence = require("run-sequence"),
		config = require("./config.json"),
	client = config["client"],
	project = config["project"],
	concepts = config["concepts"],
	masterTasks = concepts.map(function(concept) {
		return 'master-' + concept;
	}),
	sizes = config["sizes"],
	resizeTasksNested = concepts.map(function(concept) {
		return sizes.map(function(size) {
			return concept + '-' + size.name;
		});
	}),
	resizeTasks = [],
	vendors = config["vendors"],
	hasStatics = config["hasStatics"],
	staticExtension = config["staticExtension"],
	globalImgPath = "/assets/images/",
	globalScriptsPath = "/assets/scripts/",
	jsDependencies = [];

resizeTasksNested.forEach(function(arr) {
	resizeTasks = resizeTasks.concat(arr);
});



// gulp.task('test', function() {
// 	console.log(resizes);
// });



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
masterTasks.forEach(function(masterconcept) {
	let concept = masterconcepts.match(/master-(.+)/)[1];

	if( !_.isGenerated('./1-first-size/', masterconcepts) ) {

		// START GENERATE MASTER TASKS
		gulp.task(masterconcepts, function() {
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
					imgDependencies: _.getImages(concept, sizes[0],  './1-first-size/' +  masterconcepts, false),
					imgPath: globalImgPath,
					scriptsPath: globalScriptsPath,
					bannerWidth: sizes[0].width,
					bannerHeight: sizes[0].height,
					vendorScript: '<%= vendorScript %>',
					vendorLink: '<%= vendorLink %>'
				}))
				.pipe(plugins.rename('index.html'))
				.pipe(gulp.dest('./1-first-size/' + masterconcepts));
		});
		// END GENERATE MASTER TASKS
	}

	resizeTasks.forEach(function(conceptSize) {
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
				console.log(concept);

				return gulp.src("./templates/banner-" + concept + ".lodash")
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
	});

	// Create individual templates for each concept. These will be used on resizes
	gulp.src("./templates/banner-general.lodash")
		.pipe(plugins.rename("./templates/banner-" + concept + ".lodash"))
		.pipe(gulp.dest("./"));

});

gulp.task('masters', masterTasks);
gulp.task('resize', resizeTasks);
gulp.task('first-size', function(callback) {
	if( !_.isGenerated('./1-first-size', 'master-banner') ) {
		return runSequence('dep',
							'get-js-files',
              ['masters', 'image-min'],
              callback);
		console.log("\n\nNext steps: \nAnimate the first size of each of your concepts. Then, \n1. Copy your CUSTOM STYLES, CUSTOM DOM NODES, CUSTOM VARS, and TIMELINE from the first-size of each master banner to it's corresponding lodash template. \n\tAlso note, You may have used the height and width for various other styles or values in your timeline. To turn those into variables that will get converted into their correct sizes for each banner, change them to the lodash code, `<%= bannerWidth %>` and `<%= bannerHeight %>`.\n2.Run gulp resize. This takes everything you've done for each concept and copies it into each of the sizes you listed out in setup.json.\n\n")
	} else {
		console.log("\n\nYour master banner has already been generated. Proceed with animations there, then copy them into the banner-general.lodash file, and then run the `gulp generate-sizes` task\n\n");
	}
});
gulp.task("default", ["first-size"]);
