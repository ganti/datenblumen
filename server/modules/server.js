var fs = require('fs');
var http = require('http');
var path = require('path');
var ticketModule = require('./tickets.js');

exports.Server = function (config, callback) {

	var Tickets = ticketModule.TicketSystem(config);

	var headers = {'Content-Type':'application/json; charset=utf-8'};
	if (config.headers) Object.keys(config.headers).forEach(function (key) { headers[key] = config.headers[key] });

	if (config.socket){
		// set umask to a+rwx
		var umask = process.umask(0000);
		var socketpath = path.resolve(path.dirname(module.parent.filename), config.socket);
		// unlink leftover socket
		if (fs.existsSync(socketpath)) fs.unlinkSync(socketpath);
	}; 

	http.createServer(function (req, res) {
		var body = '';
		req.on('data', function (data) { body += data })
		req.on('end', function () {
			if (body.substr(0, 5) == 'data=') {
				body = body.substr(5);
				body = body.replace(/\+/g, ' ');
				body = unescape(body);
			}
			
			try {
				body = JSON.parse(body);
			} catch (e) {
				sendResponse({result:'error'});
			}

			switch (body.action) {
				case 'bubbles':
					var url = body.url;
					var cleanUrl = fixUrl(url);

					var ticket;

					ticket = Tickets.getTicket(cleanUrl);
					if (ticket) {
						ticket.respond(sendResponse);
					} else {
						ticket = Tickets.getNewTicket(cleanUrl);
						ticket.data.url = url;
						ticket.data.cleanUrl = cleanUrl;
						ticket.callback = sendResponse;

						callback(ticket);
					}
				break;
				case 'download':
					res.setHeader('Content-Type', 'image/svg+xml');
					res.setHeader('Content-Disposition', 'attachment; filename='+body.filename);
					res.end(body.data);
				break;
				default:
					console.error('Unknown Action: "'+body.action+'"');
			}

		})

		function sendResponse(data) {
			Object.keys(headers).forEach(function (key) {
				res.setHeader(key, headers[key]);
			})
			res.end(JSON.stringify(data));
		}

	}).listen(config.port||socketpath);
	
	// restore umask
	if (config.socket) process.umask(umask);
	
}


function fixUrl(url) {
	url = url.trim();
	if (!(/^https?\:\/\//i).test(url)) url = 'http://'+url;
	return url;
}