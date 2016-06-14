'use strict';
(function($) {
	$(document).ready(function() {
		var strategistView = {
			self: $('body'),
			height: $(window).innerHeight(),
			init: function() {
				this.setStyles();
				this.adjustHeight();
				this.strategistBar();
			},
			setStyles: function() {
				$(this.self).css({
					'display' : 'flex',
					'justify-content' : 'center',
					'align-items' : 'center',
					'flex-direction' : 'column',
					'position' : 'relative'
				});
				$(this.self).find('#bannerLink').css({
					'box-shadow' : '0px 0px 109px #888'
				});
			},
			adjustHeight: function() {
				$(this.self).height(this.height);
			},
			strategistBar: function() {
				let bar = '<div style="background-color: #00529C; padding: 10px 15px; text-align: right; position: absolute; bottom: 0; right: 0; width: 100%;"><span style="font-size: 12px; text-transform: uppercase; color: white; font-family: sans-serif; text-align: right;">Powered by Strategist</span></div>'
				$(this.self).append(bar);
			}
		};
		strategistView.init();
	});
})(jQuery);
