"use strict";

let fs = require('fs-extra'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	colors = require('colors'),
	config = require("../config.json"),
	maxFileSize = config['maxFileSize'],
	camel = require('to-camel-case');

module.exports = {
	isGenerated: function(dir, filename) {
		let dircontents;
		try {
			dircontents = fs.readdirSync(dir);
		} catch(err) {
			return false
		}

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
	getFiles: function(path, ext) {
		return new Promise(function(resolve, reject) {
			fs.readdir(path, function(err, files) {

				if(err) { return reject(err); }

				let paths	= [];

				// Allows us to only return an array of files with a certain file extension
				if(ext) {
					paths = files.filter(function(file) {
	            return file.split('.').pop() == ext;
	        });
				} else {
					paths = files;
				}

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
			});
		});
	},
	zipDirs: function(target, destination, name) {
		return new Promise(function(resolve, reject) {

		 return	gulp.src(target)
				.pipe(plugins.zip(name))
				.pipe(gulp.dest(destination))
				.on('end', function() {
					return resolve(true);
				})
		});
	},
	checkFileSize: function(path, file) {
		return new Promise(function(resolve, reject) {
			fs.stat(path + file, function(err, stat) {
				if(err) console.log(err)
				let sizeInKb = stat.size / 100,
					bannerName = file.match(/(.*).zip/)[1];

				if ( sizeInKb > maxFileSize ) {
					console.log(colors.red('\n\tWARNING!!!') + ' Max file size allowed is ' + colors.green(maxFileSize + 'kb') + ', but ' + colors.yellow.underline(bannerName) + ' is ' + colors.red(sizeInKb  + 'kb') + '.\n');
				}

				resolve(true);
			});
		});
	}
};
