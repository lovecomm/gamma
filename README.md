# Strategist

Strategist is a CLI application to make generating HTML5 banners simple. It's built with Node & Gulp. Predicated upon the project information you put into **config.json**, it can do some of these things:
* Inline all of your DOM elements and JS vars based upon the images and scripts you have within the **assets/** folder.

* Allow you to put all your images and script into their respective **assets/*** directory, and when the time comes to package the banners, it will copy all images for each banner into it's corresponding directory.

* It will create versions of your banners for each concept and each size. It will also version these for each vendor when the time comes for that.
* When it versions your banners for each vendor, it will add the corresponding link and scripts for each vendor

* It will package/zip all the HTML5 banners. Then it will copy all your static failovers/backups and backage those with the HTML5 zipped banners for a final handoff

## config.json
* This file is your new best friend. You will put all of your project information here. Such as...
* The `client`, `project`, and `concepts`. Make sure these are all web safe names — **no underscores, starting with numbers, no spaces**. You may only have one concept for a specific project and feel like leaving one of these blank — DON'T.
* The `hasStatics` variable is used in the preview generator portion. Knowing this, helps it to know if it should print a list of static banners on the preview - index.html page.
* List all your `sizes` here, make sure they all have a `name`, `width`, and `height`.
* Vendors is where things get awesome. The project is setup with vendor info from both DoubleClick and Adwords by default. These two vary by what href the wrapping <a> tag uses, as well as a script tag that needs to be placed in the head for DoubleClick. You can extend this array of vendors, just know where the `link` and `script` properties are going to be placed within each banner.

## Getting Started
1. Run `npm install` in your Terminal

2. Add all of your project information to your **config.json** file.

3. Put all of your static failovers/backups in the **assets/static-banners/** directory. You **MUST** name your image files in the following format:
	`client-project-concept-bannerWidthxbannerHeight.fileExtension`
	**`Example: google-fiber-nowinslc-300x600.jpg`**

4. Put all of your HTML5 banner image assets in the **assets/images/** directory. **PLEASE NOTE:** The Client, Project, and Concept names cannot start with numbers. They need to be CSS-ID safe and JS variable save. Also, You **MUST** name your image files in the following format:
	`concept-bannerWidthxbannerHeight-layerName.fileExtension`
	**`Example: nowinslc-300x600-logo.png`**

5. Now onto your JS files. Right now this project by default is set up to use GSAP's greensock animation library, as well as jQuery (Both via CDN — which is allowed for both DoubleClick and Adwords vendors). If you want something different or in addition, just run `bower install -S name-of-library`. Then locate the **dep** task within the **Gulpfile.js**. There you can follow what's already being done to make sure your library get's sent to the **assets/scripts/** directory. Also, if you decide to not use jQuery or GSAP, make sure you remove the CDN from within your `template-general.lodash` file.

6. Dependencies all setup. Check! Moving on... Run `gulp default` or just `gulp`. This will generate the first size for each concept. As well as a new lodash template for each concept (you'll use this later).

7. Animate the first size of each of your concepts.

8. Now you'll need to copy your CUSTOM STYLES, CUSTOM DOM NODES, CUSTOM VARS, and TIMELINE from the animated-masters of each master banner to it's corresponding lodash template. (Wait?! What?! - Hey, it's job security) Moving on...

	*. You may have used the height and width for various other styles or values in your timeline. To turn those into variables that will get converted into their correct sizes for each banner, change them to the lodash code, `<%= bannerWidth %>` and `<%= bannerHeight %>`.

9. Run `gulp resize`. This takes everything you've done for each concept and copies it into each of the sizes you listed out in **config.json**, with the code being updated for you to match the correct size and width for each banner.

10. Update your animations, clean up your DOM (if needed) for each size of each concept.

11. Now you're ready to send the files out for a **preview**. Run `gulp preview` to generate it. This generates an index.html file for your project that automatically inlines a link for each of the static and each of the HTML5 banners. The links will open a lightbox. then copy the generated preview folder to whatever server you'll be using to publicly preview the banners. Send the URL.

12. All approved? AWESOME! Go ahead and run `gulp handoff`. This copies all of the banners you've animated already into `lib/temp/`, then updates each of the banners to match the link and script dependencies for each vendor you put in **config.json**. A zipped handoff is generated and put in the root dir of this project. 

## Setting up your Image files for Strategist
* Already outlined above, just make sure your image layers are all namespaced correctly in the following format: `concept-bannerWidthxbannerHeight-layerName.fileExtension`
*	**`Example: google-300x600-logo.png`**

## CSS Helper Classes
In the template you will see a few css classes that you can add to your DOM elements to help with aligning. These include:
* .valign - Align a DOM element vertically
* .halign -	top: 0;	bottom: 0; margin: auto; - Align a DOM element horizontally
