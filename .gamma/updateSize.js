'use strict';
$( document ).ready(function() {

	var toolbar = {
		concept: $('#projectConcept'),
		width: $('#projectWidth'),
		height: $('#projectHeight'),
		maxSize: $('#projectMaxFileSize'),
		currentSize: $('#currentFileSize'),
		init: function() {
			this.bannerName = this.concept.text() + '-' + this.width.text() + 'x' + this.height.text()
		}
	}
	toolbar.init();
	$.getJSON( "../../../.gamma/currentSize.json", function(data) {
	})
	.done(function(data) {
		if( data.length > 0 ) {
			for (var i = 0; i < data.length; i++) {
				var banner = data[i];
				if(banner && banner.bannerName == toolbar.bannerName) {
					toolbar.currentSize.text(banner.currentSize)
				}
			}
		}
	})
	.fail(function(data) {
		console.log( "error" + data );
	})
});
