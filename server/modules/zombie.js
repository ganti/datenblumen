var Zombie = require('zombie');
var path = require('path');

var minAge = 1000; // in ms

exports.get = function (url, callback) {
	var browser = Zombie.create({
		waitDuration:10000,
		duration:10000,
		headers:{
			'Cache-Control':'no-cache',
			'Pragma':'no-cache'
		},
		debug: false,
		waitFor: 10000,
		silent: true,
		userAgent: 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
	});


	browser.visit(url);

	var interval = setInterval(function () {
		if (browser.resources.length <= 0) return;

		var lastResource = browser.resources[browser.resources.length-1];
		if (!lastResource) return;

		if (!lastResource.response) return;

		if (lastResource.response.time > (new Date()).getTime() - minAge) return;

		clearInterval(interval);

		fetchResources();

	}, 500)

	function fetchResources() {
		var resources = [];

		for (var i = 0; i < browser.resources.length; i++) {
			var res = browser.resources[i];
			//console.log( res);
			newRes = {};
			if (res.request) {
				newRes.url = res.request.url;
				newRes.startTime = res.request.time;
			}
			if (res.response) {
				newRes.newUrl = res.response.url;
				newRes.statusCode = res.response.statusCode;
				newRes.contentType = res.response.headers['content-type'];
				newRes.setCookie = res.response.headers['set-cookie'];
				newRes.size = res.response.body.length;
				newRes.endTime = res.response.time;
			};
			resources.push(newRes);
		}

		callback(resources);
	}
}