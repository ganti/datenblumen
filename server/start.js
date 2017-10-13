var fs = require('fs');
var path = require('path');
var server = require('./modules/server.js');
var zombie = require('./modules/zombie.js');
var phantom = require('./modules/phantom.js');
var queue = new (require('./modules/queue.js')).Queue();
var makeBubbles = require('./modules/bubbles.js').makeBubbles;

var config = require('./config.js');

config.cacheFolder = path.resolve(config.cacheFolder);
config.screenshotFolder = path.resolve(config.screenshotFolder);

// create cache folder on demand
if (!fs.existsSync(config.cacheFolder)) fs.mkdirSync(config.cacheFolder);
if (!fs.existsSync(config.screenshotFolder)) fs.mkdirSync(config.screenshotFolder);

server.Server(config, function (ticket) {
	var hash = getUrlHash(ticket.data.url);

	var cacheFile  =      config.cacheFolder + '/' + hash + '.json';
	var screenFile = config.screenshotFolder + '/' + hash + '.png';
	ticket.data.screenshot = hash + '.png';
	
	ticket.updateStatus('queued');
	queue.add(
		ticket,
		function (callback) {
			ticket.updateStatus('processing');
			if (config.offline) {
				ticket.data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
				ticket.updateStatus('finished');
				callback();
				return;
			}

			phantom.get(ticket.data.cleanUrl, screenFile, function (data) {
				if (!data) {
					ticket.updateStatus('error');
					callback()
					return
				}
				
				ticket.data.resources = data;
				makeBubbles(ticket.data);
				fs.writeFileSync(cacheFile, JSON.stringify(ticket.data, null, 3), 'utf8');
				ticket.updateStatus('finished');
				callback();
			})
		}
	);
});

function getUrlHash(url) {
	url = url.toLowerCase();
	url = url.replace(/:\/\//, '_');
	url = url.replace(/[^a-z0-9_]+/g, '_');
	return url;
}