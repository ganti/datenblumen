var child_process = require('child_process');
var path = require('path');
var async = require('async');
var util = require('util');
var request = require('request');


var script = path.normalize(__dirname+'/../phantomjs/download.js');

exports.get = function (url, filename, callback) {
	
	request({
		url: url,
		strictSSL: false
	}, function (error, response, body) {
		if (error) return callback(false)

		runPhantom();
	})

	function runPhantom() {
		var text = JSON.stringify({url:url, filename:filename});
		var args = [];
		for (var i = 0; i < text.length; i++) args[i] = text.charCodeAt(i);
		args = JSON.stringify(args);

		var command = path.resolve(__dirname, "../node_modules/phantomjs/bin/phantomjs")+' --ignore-ssl-errors=true --web-security=false '+script+' "'+args+'"';
		child_process.exec(command, {timeout:30000, maxBuffer:64*1024*1024}, function (error, stdout, stderr) {
			if (error) {
				console.log(error);
				callback(false);
				return;
			}

			if (stderr) console.log(stderr);

			try {
				var data = stdout.toString();
				data = data.replace(/[\r\n]*/gm, '');
				data = data.replace(/^.*#BEGIN#|#END#.*$/g, '');
				data = JSON.parse(data);
				//console.log(util.inspect(data, {depth: 5, colors:true}));
			} catch (err) {
				console.log(err);
				return callback(false);
			}

			processResult(data);

		})
	}

	function processResult(data) {
		
		var resources = [];
		var todos = [];
		var knownUrls = {};

		data.forEach(function (res) {
			if (!res) return;

			if (!res.response) return;
			if (res.response.redirectURL) return;

			var newRes = {};
			if (res.request) {
				newRes.url = res.request.url;
				newRes.startTime = (new Date(res.request.time)).getTime();
			}
			if (res.response) {
				newRes.newUrl = res.response.redirectURL || res.response.url;
				newRes.statusCode = res.response.status;
				newRes.contentType = res.response.contentType;
				newRes.setCookie = false;
				newRes.endTime = (new Date(res.response.time)).getTime();
				newRes.size = 0;
				res.response.headers.forEach(function (header) {
					var name = header.name.toLowerCase();
					if (name == 'content-length') newRes.size = parseInt(header.value, 10);
					if (name == 'set-cookie') newRes.setCookie = header.value;
				})
				if (!newRes.size) {
					todos.push(function (cb) {
						request({
							url: newRes.newUrl,
							strictSSL: false,
							maxRedirects: 3
						}, function (error, response, body) {
							if (error) console.log(error);
							if (body && body.length) newRes.size = body.length;
							cb();
						})
					})
				}
			};

			if (knownUrls[newRes.newUrl]) return;
			knownUrls[newRes.newUrl] = true;

			resources.push(newRes);
		})

		async.eachLimit(
			todos,
			4,
			function (entry, callback) { entry(callback) },
			function () {
				callback(resources);
			}
		)
	}

}