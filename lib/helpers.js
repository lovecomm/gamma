"use strict";


let fs = require('fs-extra'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	camel = require('to-camel-case'),
	htmlparser = require("htmlparser");

module.exports = {
	isGenerated: function(dir, filename) {
		var dircontents = fs.readdirSync(dir);
		for (var i = 0; i < dircontents.length; i++) {
			if(dircontents[i] == filename) { return true; }
		}
		return false;
	},
	getImages: function(concept, size, destination, copy) {
			var imgArray = []
			var dircontents = fs.readdirSync("./assets/images/");

			for (var i = 0; i < dircontents.length; i++) {
				var filename = dircontents[i];
				var conceptAndSize = concept + "-" + size;
				var id = camel(filename.split('.')[0]);
				var splithyphen = filename.split("-");
				var layerName = splithyphen[splithyphen.length - 1].split(".")[0];


				if( filename.indexOf( conceptAndSize ) > -1 ) {
					imgArray.push({'fileName' : filename, 'id' : id, "layerName" : layerName});

					if(copy) {
						//copy images to banner specific folder
						gulp.src("assets/images/" + filename)
							.pipe(gulp.dest(destination));
					}
				}
			}
			return imgArray;
	},
	getJSFiles: function() {
		return new Promise(function(resolve, reject) {
			fs.readdir('./assets/scripts', function(err, files) {

				if(err) { return reject(err); }

				let paths	= [];

				paths = files.filter(function(file) {
            return file.split('.').pop() == 'js';
        });

				return resolve(paths);
			});
		});
	},
	getTasksArray: function(parentArray, childArray, divider) {
		if(childArray === undefined) {
			return new Promise(function(resolve, reject) {
				let tasks = parentArray.map(function(item) {
					return divider + item;
				})
				return resolve(tasks);
			});
		} else {
			return new Promise(function(resolve, reject) {
				let tasks = [],
				tasksNested = parentArray.map(function(item) {
					return childArray.map(function(childItem) {
						let first = item.name? item.name : item,
							second = childItem.name? childItem.name : childItem;
						return first + divider + second;
					});
				});
				tasksNested.forEach(function(arr) {
					tasks = tasks.concat(arr);
				});
				return resolve(tasks);
			});
		}
	},
	copyDir: function(target, destination) {
		return new Promise(function(resolve, reject) {
			fs.copy(target, destination, function (err) {
			  if (err) return reject(err)
				return resolve(true);
			})
		});
	},
	zipDirs: function(target, destination, name) {
		return new Promise(function(resolve, reject) {
			gulp.src(target)
				.pipe(plugins.zip(name))
				.pipe(gulp.dest(destination))

			return resolve(true);
		});
	},
	getResizeIncludes: function(fullFilePath) {
		return new Promise(function(resolve, reject) {

			// fs.readFile(fullFilePath, (err, data) => {
			//   if (err) throw err;
			//
			// 	let handler = new htmlparser.DefaultHandler(function (error, dom) {
			// 		if (err) throw err;
			// 	}, {
			// 		verbose: true,
			// 		ignoreWhitespace: false
			// 	});
			//
			// 	parser = new htmlparser.Parser(handler);
			// 	parser.parseComplete(data);
			// 	sys.puts(sys.inspect(handler.dom, false, null));
			// 	return resolve(true);
			// });
			console.log('in function');
			return resolve(true)
		});
	}
};
