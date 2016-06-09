"use strict";

let fs = require('fs-extra'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	colors = require('colors'),
	config = require('./config/config.json'),
	inquirer = require('inquirer'),
	sizeOptions = require('./config/options/sizes.json'),
	vendorOptions = require('./config/options/vendors.json'),
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
	buildUserConfig: function() {
		let _ = this;
		return new Promise(function(resolve, reject) {
			let sizes = sizeOptions.map(function(size) {
				return size.name;
			});

			let vendors = vendorOptions.map(function(vendor) {
				return vendor.name;
			});

			inquirer.prompt([
				{
					type: 'input',
					name: 'client',
					message: 'Client Name?',
					validate: function (answer) {
			      if (answer.length < 1) {
			        return 'You must enter the Client Name';
			      }
			      return true;
			    }
				}, {
					type: 'input',
					name: 'maxFileSize',
					message: 'What is the max file size for your HTML5 banners (in kb)?',
					validate: function (answer) {

						if ( isNaN(parseInt(answer)) ) {
							return 'You must select a number.';
						}
						return true;
					},
					filter: function(answer) {
						return parseInt(answer);
					}
				}, {
					type: 'checkbox',
					message: 'Select Banner Sizes',
					name: 'sizes',
					choices: sizeOptions,
					validate: function (answer) {
						if (answer.length < 1) {
							return 'You must choose at least one size.';
						}
						return true;
					}
				}, {
					type: 'checkbox',
					message: 'Select Vendors',
					name: 'vendors',
					choices: vendorOptions,
					validate: function (answer) {
						if (answer.length < 1) {
							return 'You must choose at least one vendor.';
						}
						return true;
					}
				}
			]).then(function (answers) {

				return _.promptForConcepts(answers.conceptCount).then(function(concepts) {
					return _.findFullObject(answers.sizes, sizeOptions).then(function(sizes) {
						return _.findFullObject(answers.vendors, vendorOptions).then(function(vendors) {
							answers.concepts = concepts;
							answers.sizes = sizes;
							answers.vendors = vendors;
							config = answers;

							fs.writeFile('.strategist/config/config.json', JSON.stringify(config, null, '  '), (err) => {
								if (err) throw err;
								console.log(colors.magenta(JSON.stringify(config, null, '  ')), colors.yellow('\n\nYour project config is listed above.\n\nIf this is inaccurate simply run `gulp clean` and then `gulp default` to regenerate it. Or, you can edit the file directly in `.strategist/config/config.json`.\n'));
								resolve(config);
							});
						});
					});
				});
			});
		});
	},
	findFullObject: function(shortList, longList) {
		return new Promise(function(resolve, reject) {
			let newList = [];
			shortList.forEach(function(shortListItem) {
				longList.forEach(function(longListItem) {

					if (shortListItem == longListItem.name) {
						newList.push(longListItem);
					}
				});
			});
			return resolve(newList);
		});
	},
	promptForConcepts: function(count) {
		return new Promise(function(resolve, reject) {
			let concepts = [],
				questionStart = [{
					type: 'input',
					name: 'concept',
					message: 'What is the name of your first concept?',
					validate: function (answer) {

						if (answer.length < 1) {
							return 'You must enter a name for the concept';
						}
						return true;
					},
				}],
					questionContinue = [{
						type: 'input',
						name: 'concept',
						message: 'Have another concept? Enter the name. No more concepts? Leave blank.'
				}];

			function finalConcept() {
				return resolve(concepts.filter(function(concept) {
					return concept.length !== 0;
				}));
			}

			function askOrPerformFinalAction(answer) {
				concepts.push(answer.concept);

				if( !answer.concept ) {
					finalConcept(concepts);
					return;
				}

				return inquirer.prompt(questionContinue).then(function(answer) {
					askOrPerformFinalAction(answer);
				});
			}

			inquirer.prompt(questionStart).then(function(answer) {
				askOrPerformFinalAction(answer);
			});
		});
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

				if ( sizeInKb > config.maxFileSize ) {
					console.log(colors.red('\n\tWARNING!!!') + ' Max file size allowed is ' + colors.green(config.maxFileSize + 'kb') + ', but ' + colors.yellow.underline(bannerName) + ' is ' + colors.red(sizeInKb  + 'kb') + '.\n');
				}

				resolve(true);
			});
		});
	}
};
