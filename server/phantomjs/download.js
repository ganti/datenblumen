var system = require('system');
var filename = false;
var args = system.args[1];
var finished = false;

if (args[0] == '[') {
	args = JSON.parse(args);
	args = args.map(function (code) { return String.fromCharCode(code) });
	args = args.join('');
	args = JSON.parse(args);
	url = args.url;
	filename = args.filename;
} else {
	url = args;
}



var page = require('webpage').create();
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36';
page.settings.webSecurityEnabled = false;
page.settings.resourceTimeout = 3000;

page.customHeaders = {
	'cache-control': 'max-age=0'
};

page.viewportSize = { width: 1280, height: 5120 };



var requests = [];

page.onResourceRequested = function (request) {
	requests[request.id] = {request:request};
};

page.onResourceReceived = function (response) {
	requests[response.id].response = response;
};

/* surpress a bunch of messages */
page.onConsoleMessage = function(msg, lineNum, sourceId) {};
page.onError = function(msg, trace) {};
page.onResourceError = function(resourceError) {};



setTimeout(function () {
	page.stop();
	finalize();
}, 15000);

page.open(url, function (status) {
	finalize();
});



function finalize() {
	if (finished) return;
	finished = true;

	page.clipRect = { top: 0, left: 0, width: 1280, height: 5120 };
	setTimeout(function() {
		console.log('#BEGIN#'+JSON.stringify(requests)+'#END#');
		page.render(filename, 'png');
		setTimeout(function() {
			phantom.exit();
		}, 0);
	}, 3000);
}
