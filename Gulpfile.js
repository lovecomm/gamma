"use strict";

let _ = require('./app/helpers.js');

let gulp 					 	= require('gulp'),
		plugins 			 	= require('gulp-load-plugins')(),
		path 						= require("path"),
		del 						= require('del'),
		date 					 	= new Date(),
		runSequence			= require("run-sequence"),
 		config 					= require("./config.json"),
		client 					= config["client"],
		project 				= config["project"],
		concepts				= config["concepts"],
		conceptKeys = Object.keys(concepts),
		sizes						= config["sizes"],
		vendors					= config["vendors"],
		hasStatics 			= config["hasStatics"],
		staticExtension = config["staticExtension"],
		globalImgPath   = "/assets/images/",
		globalScriptsPath = "/assets/scripts/",
		jsDependencies = [],
		bannerList = [];

gulp.task("clean", function() {
	return gulp.src("./templates/banner-general.lodash")
		.pipe(plugins.prompt.prompt({
			type: "confirm",
			name: 'clean',
			message: "\nAre you sure you want to clean your project? This includes removing the following:\n\n1. Files within the 1-first-size dir.\n2. Files within the 2-resize dir.\n3. Files within the 3-vendor dir.\n4. Files within the 4-handoff dir.\n5. All generated *.lodash templates.\n5. All files within the .dependencies dir.\n\n"
		}, function(res) {
			if(res.clean === true) {
				del("1-first-size/*");
				del("2-resize/*");
				del("3-vendor/*");
				del("4-handoff/*");
				del(".dependencies/*");

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

gulp.task('image-layers-min', function (){
	return gulp.src("./assets/images/**" )
		.pipe(plugins.imagemin({
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
		}))
		.pipe(gulp.dest("./assets/images/"));
})

gulp.task('static-banners-min', function (){
	return 	gulp.src("./assets/static-banners/**" )
			.pipe(plugins.imagemin({
				progressive: true,
				interlaced: true,
				svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
			}))
			.pipe(gulp.dest("./assets/static-banners/"));
})

gulp.task("image-min", ['image-layers-min', 'static-banners-min']);

// Move any custom dependencies to correct locations
gulp.task("dep", function() {
	return gulp.src("./node_modules/jquery/dist/jquery.min.js").pipe(gulp.dest("./assets/scripts/"));
});

gulp.task('get-js-files', function() {
	return _.getJSFiles().then(function(data) {
		jsDependencies = data;
	}).catch(function(e) {
		console.log(e);
	});
});

conceptKeys.forEach(function(concept) {
	if( !_.isGenerated("./1-first-size/", "master-" + concepts[concept]) ) {

		gulp.task(concept, function() {
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
					imgDependencies: _.getImages(concepts[concept], sizes[0],  "./1-first-size/master-" + concepts[concept], false),
					imgPath: globalImgPath,
					scriptsPath: globalScriptsPath,
					bannerWidth: sizes[0].width,
					bannerHeight: sizes[0].height,
					vendorScript: "<%= vendorScript %>",
					vendorLink: "<%= vendorLink %>"
				}))
				.pipe(plugins.rename("index.html"))
				.pipe(gulp.dest("./1-first-size/master-" + concepts[concept]));
		});

	} else {
		console.log("Slow down there! You need to delete the concept folders before you can regenerate them!");
	}
});

conceptKeys.forEach(function(concept) {
	return gulp.src("./templates/banner-general.lodash")
		.pipe(plugins.rename("./templates/banner-" + concepts[concept] + ".lodash"))
		.pipe(gulp.dest("./"));
});

gulp.task('masters', conceptKeys);



gulp.task('first-size', function(callback) {
	if( !_.isGenerated('./1-first-size', 'master-banner') ) {
		runSequence('dep',
							'get-js-files',
              ['masters', 'image-min'],
              callback);
		console.log("\n\nNext steps: \nAnimate the first size of each of your concepts. Then, \n1. Copy your CUSTOM STYLES, CUSTOM DOM NODES, CUSTOM VARS, and TIMELINE from the first-size of each master banner to it's corresponding lodash template. \n\tAlso note, You may have used the height and width for various other styles or values in your timeline. To turn those into variables that will get converted into their correct sizes for each banner, change them to the lodash code, `<%= bannerWidth %>` and `<%= bannerHeight %>`.\n2.Run gulp resize. This takes everything you've done for each concept and copies it into each of the sizes you listed out in setup.json.\n\n")
	} else {
		console.log("\n\nYour master banner has already been generated. Proceed with animations there, then copy them into the banner-general.lodash file, and then run the `gulp generate-sizes` task\n\n");
	}
});
gulp.task("default", ["first-size"]);

gulp.task("resize", ["gather-script-assets"], function(callback) {
	for( var c = 0; c < concepts.length; c++ ) {
		if( !_.isGenerated("./2-resize/", "concept-" + concepts[c]) ) {
			for (var i = 0; i < sizes.length; i++) {
				var bannerName = client + "-" + project + "-" + concepts[c] + "-" + sizes[i].name;
				var bannerDirectory = "2-resize/concept-" + concepts[c] + "/";
				var destination = bannerDirectory + bannerName;
				var bannerSpecificImgDep = _.bannerSpecificImageDependencies(concepts[c], sizes[i], destination, false);

				gulp.src("./templates/banner-" + concepts[c] + ".lodash")
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
						imgDependencies: bannerSpecificImgDep,
						imgPath: globalImgPath,
						scriptsPath: globalScriptsPath,
						bannerWidth: sizes[i].width,
						bannerHeight: sizes[i].height,
						vendorScript: "<%= vendorScript %>",
						vendorLink: "<%= vendorLink %>"
					}))
					.pipe(plugins.rename("index.html"))
					.pipe(gulp.dest(destination));
			}
		} else {
			console.log("\n\nYou've already generated the " + concepts[c] + " concept in all sizes. To re-generate, simply delete the 2-resize/" + concepts[c] + " directory, and re-run this task.\n\n");
		}
	}
	console.log("\n\nNext steps: \n1. Update your animations, clean up your DOM (if needed) for each size of each concept.\n2. Run `gulp vendor-copy`. This copies all of the banners you've animated already into vendor folders, for each vendor listed in setup.json. \n\n");
});


// COPIES ALL COMPLETED BANNERS INTO VENDOR SPECIFIC FOLDERS
gulp.task("vendor-copy", function() {
	for( var v = 0; v <= vendors.length; v++ ) {
		if( vendors[v] !== undefined ) {
			var vendorDir = "./3-vendor/vendor-" + vendors[v].name + "/"

			for( var c = 0; c < concepts.length; c++ ) {
				var concept = concepts[c];
				gulp.src("2-resize/concept-" + concept + "/**/*.html")
					.pipe(gulp.dest(vendorDir))
			}
		}
	}
	console.log("\n\nNext step: \nRun `gulp vendor-code`. This updates each of the banners to match the link and script dependencies for each vendor, also what you put in setup.json.\n\n");
});


// ADDS VENDOR SPECIFIC CODE TO EACH BANNER, COPIES SCRIPTS AND CORRESPONDING IMAGES TO EACH BANNER
gulp.task("vendor-code", function() {
	for( var v = 0; v <= vendors.length; v++ ) {
		if( vendors[v] !== undefined ) {
			var vendorDir = "./3-vendor/vendor-" + vendors[v].name + "/"

			for( var c = 0; c < concepts.length; c++ ) {

				for( var s = 0; s < sizes.length; s++ ) {
					var bannerName =  client + "-" + project + "-" + concepts[c] + "-" + sizes[s].width + "x" + sizes[s].height
					var bannerDir = vendorDir + bannerName + "/";

					// Copy banner specific images into their respective directories
					var bannerSpecificImgDep = _.bannerSpecificImageDependencies(	concepts[c], sizes[s], bannerDir, true );

					// Add vendor specific info to each banner
					gulp.src(bannerDir + "index.html", {base: "./"})
						.pipe(plugins.plumber(function(error) {
								plugins.util.log(
									plugins.util.colors.red(error.message),
									plugins.util.colors.yellow('\r\nOn line: '+error.line),
									plugins.util.colors.yellow('\r\nCode Extract: '+error.extract)
									);
								this.emit('end');
							}))
						.pipe(plugins.consolidate('lodash', {
							vendorScript: vendors[v].script,
							vendorLink: vendors[v].link
						}))
						.pipe(plugins.replace('/assets/images/', ''))
						.pipe(plugins.replace('/assets/scripts/', ''))
						.pipe(gulp.dest("./"));

					// Copy JS files to each banner directory
					gulp.src("assets/scripts/*.js")
					.pipe(gulp.dest(bannerDir))
				}
			}
		}
	}
	console.log("\n\nNext step: \n1.Now's a good time to SEND OUT PREVIEW URLs.\nRun `gulp preview`. This generates an index.html file for your project that automatically inlines a link for each of the static and each of the HTML5 banners. If you copy this to somewhere else for someone to preview it, be sure to grab the **assets/preview-assets/** folder as well as the **assets/static-banners** and the **3-vendor** folders.\n\n");
});


// Generate index.html file for Client Preview
gulp.task("preview", function() {
	gulp.src("./templates/preview.lodash", {base: "./"})
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
		.pipe(gulp.dest("./"));

	console.log("\n\nNext step: \n1.All approved? AWESOME! Go ahead and run `gulp zip-banners`. This will zip up each of the individual HTML5 banners.\n\n");
});


// COPIES STATIC BANNERS INTO HANDOFF FOLDER (CREATES HANDOFF FOLDER HERE)
gulp.task("copy-static", function() {
	return gulp.src("./assets/static-banners/*")
		.pipe(plugins.imagemin({
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
		}))
		.pipe(gulp.dest("./4-handoff/static-backups/"));
});


// ZIPS UP EACH INDIVIDUAL BANNER
gulp.task("zip-banners", ["copy-static"], function() {
	// Copy all sizes of each concepts into vendor folder
	// add to bannerList Array
	for( var v = 0; v <= vendors.length; v++ ) {
		if( vendors[v] !== undefined ) {
			var vendorDir = "3-vendor/vendor-" + vendors[v].name + "/"

			for( var c = 0; c < concepts.length; c++ ) {
				var concept = concepts[c];

				for( var s = 0; s < sizes.length; s++ ) {
					// concept, size, destination, copy
					var bannerName =  client + "-" + project + "-" + concepts[c] + "-" + sizes[s].width + "x" + sizes[s].height
					var bannerDir = vendorDir + bannerName + "/";

					// Zip every HTML5 banner with containing files
					gulp.src(bannerDir + "*")
						.pipe(plugins.zip("./" + vendors[v].name + "/" + bannerName + ".zip"))
						.pipe(gulp.dest("./4-handoff"))
				}
			}
		}
	}
	console.log("\n\nNext step: \n1.Run `gulp zip-handoff`. This will zip up all your zipped HTML5 banners as well as your static failovers/backups into one zipped file... mail that sucker. You win. You're Half-(wo)man, Half-amazing.\n\n");
});

// ZIP ENTIRE HANDOFF, READY TO EMAIL
gulp.task("zip-handoff", function() {
	return gulp.src("./4-handoff/**")
		.pipe(plugins.zip("./" + client + "-" + project + "-" + "handoff.zip"))
		.pipe(gulp.dest("./"))
});
