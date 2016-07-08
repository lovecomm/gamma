"use strict";

let fs = require('fs-extra'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	colors = require('colors'),
	config = require('./config/config.json'),
	del = require('del'),
	runSequence = require("run-sequence"),
	inquirer = require('inquirer'),
	sizeOptions = require('./config/options/sizes.json'),
	vendorOptions = require('./config/options/vendors.json'),
	currentFileSizeDefaultMessage = '<em>Save to get current file size in</em>',
	camel = require('to-camel-case');

module.exports = {
	isGenerated: function(dir, filename) {

		if(filename) {
			return new Promise(function(resolve, reject) {
				let generated;
				fs.readdir(dir, function(err, files) {
					if (err) {
						generated = false;
					} else {
						for( let i = 0; i < files.length; i++ ) {
							if( files[i] == filename ) {
								generated = true;
							} else {
								generated = false;
							}
						}
					}
					return resolve(generated);
				});
			});
		} else {
			return new Promise(function(resolve, reject) {
				let generated;
				fs.stat(dir, function(err, stats) {
					if (err) {
						generated = false;
					} else {
						generated = true;
					}
					return resolve(generated);
				});
			});
		}
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

							fs.writeFile('.gamma/config/config.json', JSON.stringify(config, null, '  '), (err) => {
								if (err) throw err;
								console.log(colors.magenta(JSON.stringify(config, null, '  ')), colors.yellow('\n\nYour project config is listed above.\n\nIf this is inaccurate simply run `gulp clean` and then `gulp default` to regenerate it. Or, you can edit the file directly in `.gamma/config/config.json`.\n'));
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
		return new Promise(function(resolve, reject) {
			let imgArray = []
			fs.readdir("./assets/images/", function(err, files) {
				if (err) console.log(err);
				for (let i = 0; i < files.length; i++) {
					let filename = files[i],
						conceptAndSize = concept + "-" + size,
						id = camel(filename.split('.')[0]),
						splithyphen = filename.split("-"),
						layerName = splithyphen[splithyphen.length - 1].split(".")[0];


					if( filename.indexOf( conceptAndSize ) > -1 ) {
						imgArray.push({'fileName' : filename, 'id' : id, "layerName" : layerName});

						if(copy) {
							//copy images to banner specific folder
							gulp.src("assets/images/" + filename)
								.pipe(gulp.dest(destination));
						}
					}
				}
			});
			return resolve(imgArray);
		});
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
	runTasks: function(arrOfTasks) {
		return new Promise(function(resolve, reject) {
			return runSequence(arrOfTasks, function() {
				return resolve(true);
			});
		});
	},
	checkFileSize: function(path, file) {
		const that = this;
		return new Promise(function(resolve, reject) {
			fs.stat(path + file, function(err, stat) {
				if(err) console.log(err)
				let sizeInKb = stat.size / 1000.0,
					bannerName = file.match(/(.*).zip/)[1];
				if ( sizeInKb > config.maxFileSize ) {
					console.log(colors.red('\n\tWARNING!!!') + ' Max file size allowed is ' + colors.green(config.maxFileSize + 'kb') + ', but ' + colors.yellow.underline(bannerName) + ' is ' + colors.red(sizeInKb  + 'kb') + '.\n');
				}
				resolve({bannerName: bannerName, currentSize: sizeInKb});
			});
		});
	},
	removeResized: function() {
		return new Promise(function(resolve, reject) {
			config.concepts.forEach(function(concept) {
				config.sizes.forEach(function(size) {
					if(size.name !== config.sizes[0].name) {
						del('./banners/' + concept + '/' + size.name);
					}
				});
			});
			resolve(true);
		});
	},
	devBody: function (concept, currentSize, width, height) {
		currentSize === undefined ? currentSize = currentFileSizeDefaultMessage : '';
		return '<div id="gammaBar"><span>Powered by Gamma</span></div>'
			+ '<ul id="info-panel">'
			+ '<li>Client: ' + config.client + '</li>'
			+ '<li>Concept: ' + concept + '</li>'
			+ '<li>Width: ' + width + '  px </li>'
			+ '<li>Height: ' + height + '  px </li>'
			+ '<li>Max File Size: ' + config.maxFileSize + ' kb</li>'
			+ '<li>Current File Size:  <span id="currentFileSize">' + currentSize + ' kb</span></li>'
			+ '</ul>';
	}
};
