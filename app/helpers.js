"use strict";

let fs = require('fs');

module.exports = {
	isGenerated: function(dir, filename) {
		var dircontents = fs.readdirSync(dir);
		for (var i = 0; i < dircontents.length; i++) {
			if(dircontents[i] == filename) { return true; }
		}
		return false;
	},
	bannerSpecificImageDependencies: function(concept, size, destination, copy) {
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
	}
}
