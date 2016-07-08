# Gamma

Gamma is a CLI application to make generating HTML5 banners simple. It's built with Node & Gulp. Some of the things it does includes:
* Inline all of your DOM elements and JS vars based upon the images and scripts you have within the **assets/** folder.
* Allow you to put all your images into one **assets/images** directory, and script into one **assets/scripts** directory for development. When the time comes to package the banners, it will copy all images & scripts for each banner into it's respective banner directory.
* It will create versions of your banners for each concept and each size. It will also version these for each vendor (with it's accompanying script and links) when generating the handoff.
* It will package/zip all the HTML5 banners. Then it will copy all your static failovers/backups and package those with the HTML5 zipped banners for a single final handoff.

## Getting Started
1. Run `npm install` in your Terminal
2. **Setting up your failover (static) banners**
..1. Name your failover (static) banners in the following format (File extension doesn't matter): **client-concept-bannerWidthxbannerHeight.fileExtension**. Example: **google-fiber-300x600.jpg**
..2. Put all of your failover (static) banners in the **assets/static-banners/** directory.
3. **Setting up your image slices for the HTML5 banners**
..1. Name your image slices in the following format (While file extension doesn't matter, the Client and Concept names cannot start with numbers. They need to be CSS-ID safe and JS variable safe): **concept-bannerWidthxbannerHeight-layerName.fileExtension**. Example: **Example: fiber-300x600-logo.png**
..2. Put all of your image slices in the **assets/images/** directory.
4. **Javscript libraries**
..1. Right now this project by default is set up to use GSAP's greensock animation library (CDN)(Which is allowed for both DoubleClick and Adwords vendors. You can remove this from within your `./.gamma/banner.lodash` template file). To add other JS libraries, simply add the files to the `assets/scripts` directory.
5. **Gulp Default**
..1. Run `gulp` or `gulp default` and answer the questions to generate the config for your project.
..2. This is where you will input the client associated with the project, each of the banner concepts and sizes and vendors, as well as the max file size for the HTML5 banners.
..3. When it comes to naming the client and concepts, be sure to use the exact same spellings for this process, the images, and the static backups.
..4. If you need different/additional vendors or sizes, add them to the `sizes.json` and `vendors.json` files before running `gulp default` or `gulp`. You can find these in `.gamma/config/*.json`.
6. **Animation**
..1. Animate the first size of each of your concepts.
..2. Run `gulp resize`. This takes everything you've done for the first size of each concept and copies it to the rest of the sizes you selected during the `gulp default` task. Keep in mind that during this task all instances of the height and width in the original size, will be replaced with the new height and width for each size.
..3. Update your animations for each of the new sizes.
7. **Preview**
..1. Run `gulp preview` to generate the preview. This generates a preview folder at the root directory of your Gamma project. Simply copy this folder to whatever server you'd like it to be reviewed on. It's index.html contains links for each of the static and  HTML5 banners. The links will open in a lightbox.
..2. At times it may be useful to have a preview with just the static banners. To generate a static/failover-only preview, run `gulp preview-static`. Before running this, be sure that your static banners are in the `assets/static-banners` directory.
8. **Handoff**
..1. Once you're ready to send the packaged banners to your Vendor/Network, run `gulp handoff`. This copies all of the banners you've animated already into `.gamma/temp/`, then updates each of the banners to match the link and script dependencies for each vendor you put in **config.json**. A zipped handoff is generated and put in the root dir of this project.

## Gulp Watch (Live-Reload)
The `gulp watch` task starts automatically when you run `gulp default` and `gulp resize`. However, you will need to stop it (ctrl + c) before you can run the other tasks. To continue live-reloading your banners, simply run this task again.

##Compiling preview/index Sass
While `gulp watch` is running, it watch sass files and then runs the `gulp sass` task whenever those files change. The `gulp sass` task compiles the sass files that are used for both './index.html' and './preview/index.html'. Please note that if `gulp preview` has already been run (and `./preview` exists), then gulp sass will compile the sass within './preview'. If not, then it will compile the sass within `./.gamma/preview`, preparatory for `./preview` being generated.

## CSS Helper Classes
In the template you will see a few css classes that you can add to your DOM elements to help with aligning. These include:
* .valign - Align a DOM element vertically
* .halign -	top: 0;	bottom: 0; margin: auto; - Align a DOM element horizontally

## Checking file size
The `gulp check-file-size` task automatically runs whenever a banner is saved and `gulp watch` is running. If you are over the max file size allotted for the banners, it will display a console warning with the size of banner (including html, js libs, and images–all compressed). For the best accuracy, this task copies HTML, JS, and image files associated with each banner, compresses them, and then checks the file size.
