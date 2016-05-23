"use strict";

let fs = require('fs'),
	path = require("path"),
	camel = require('to-camel-case');

module.exports = {
	isGenerated: function(dir, filename) {
		var dircontents = fs.readdirSync(dir);
		for (var i = 0; i < dircontents.length; i++) {
			if(dircontents[i] == filename) { return true; }
		}
		return false;
	},
	getImagesObject: function(concept, size, destination, copy) {
		var imgArray = []
		var dircontents = fs.readdirSync("./assets/images/");

		for (var i = 0; i < dircontents.length; i++) {
			var filename = dircontents[i];
			var conceptAndSize = concept + "-" + size.name;
			var id = camel(filename.split('.')[0]);
			var splithyphen = filename.split("-");
			var layerName = splithyphen[splithyphen.length - 1].split(".")[0];

			if( filename.indexOf( conceptAndSize ) > -1 ) {
				imgArray.push({'fileName' : filename, 'id' : id, "layerName" : layerName});

				if(copy) {
					//copy images to banner specific folder
					gulp.src("assets/images/" + filename)
						.pipe(plugins.imagemin({
							progressive: true,
							interlaced: true,
							svgoPlugins: [{removeUnknownsAndDefaults: false}, {cleanupIDs: false}]
						}))
						.pipe(gulp.dest(destination));
				}
			}
		}
		return imgArray;
	},
	createJSDependenciesArray: function() {
		return new Promise(function(resolve, reject) {
			fs.readdir('./assets/scripts', function(err, files) {

				if(err) {
					reject(err);
				}

				let jsDependencies	= [];

				jsDependencies = files.filter(function(file) {
            return file.split('.').pop() == 'js';
        });

				return resolve(jsDependencies);
			});
		});
	},
	createImgAssetsArray: function() {
		let imgDependencies = [];
		fs.readdir('./assets/images', function(err, files) {
			for (var i = 0; i < files.length; i++) {
				var fileExtension = files[i].split('.').pop();
				if (fileExtension == 'jpg' || fileExtension == 'png' || fileExtension == "gif") {
					var fileName = files[i];
					var id = camel(files[i].split('.')[0]);
					imgDependencies.push({'fileName' : fileName, 'id' : id});
				}
			}
		});
		console.log(imgDependencies);
		return imgDependencies;
	}
};
