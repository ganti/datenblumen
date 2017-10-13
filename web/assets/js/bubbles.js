function setBubbles(canvas, data) {
	canvas.reset();

	var dataTypes = {
		'html':  { color: [  0,174,239] }, // blau
		'style': { color: [  0,242,  0] }, // grün
		'image': { color: [255,221,  0] }, // gelb
		'code':  { color: [236,  0,140] }  // rot
	}

	var circles = [];
	var timeMin =  1e100;
	var timeMax = -1e100;

	drawBubbles(data.bubbles.host);

	var time = timeMin-10;

	updateCircles();
	canvas.draw();

	var interval = setInterval(function () {
		time += 10;
		updateCircles();
		canvas.draw();
		if (time > timeMax) clearInterval(interval);
	}, 10);


	function drawBubbles(tree) {
		var projection = getProjection(tree.point, tree.radius);
		var tabindex = 1;
		drawRecursive(tree, projection, 0);

		function drawRecursive(node, projection, level) {
			var circle = projection.project(node.point, node.radius);
			circle = addProps(circle, {strokeWeight:10, type:'circle', a:1, p:1, node:node});

			if (node.isLeaf) {
				if (!node.resource) node.resource = data.resources[node.index];

				node.startTime = node.resource.startTime;
				node.endTime   = node.resource.endTime;
				node.duration  = node.resource.duration;

				var r = node.resource;
				
				var dataType;
				dataType = dataTypes[r.type];
				if (!dataType && r.type) dataType = dataTypes[r.type.split('/').shift()];

				var color = dataType ? dataType.color : [127,127,127];
				var stroke = darkerColor(color);

				addCircle(circle, color, stroke);

				/*
				tabindex++;
				var host = parseUri(r.newUrl).host;
				host = host.split('.');
				host = host.slice(host.length-2)
				var whois = 
					(host[1] == 'de') ?
					'https://www.secure.denic.de/webwhois/?lang=de&domain='+host[0]+'&tld=de' : 
					'http://who.is/whois/' + host.join('.');
				host = host.join('.');;

				var html = [
					'<p><b>url:</b> <a href="' + r.newUrl + '" target="_blank">' + shorten(r.newUrl,50) + '</a></p>',
					'<p><b>host:</b> <a href="' + whois + '" target="_blank">' + host + '</a></p>',
					'<p><b>type:</b> ' + r.type + '</p>',
					'<p><b>size:</b> ' + formatSize(r.size) + '</p>',
					'<p><b>duration:</b> ' + r.duration + ' ms</p>'
				].join('\n');
				$(circleNode).popover({
					container: 'body',
					content: html,
					html:true,
					trigger:'focus'
				});
				*/

			} else {

				if (level == 1) addCircle(circle, [238,238,238], '#ddd');

				if (level == 2) addCircle(circle, [247,247,247], '#ddd');

				var subProjection = projection.getSubProjection(node.point);
				var startTime =  1e100;
				var endTime   = -1e100;

				node.children.forEach(function (subNode) {
					drawRecursive(subNode, subProjection, level+1);
					if (startTime > subNode.startTime) startTime = subNode.startTime;
					if (  endTime > subNode.endTime  ) endTime   = subNode.endTime;
				})

				node.startTime = startTime;
				node.endTime   = endTime;
				node.duration  = 0;//endTime - startTime;
			}
		}

		function addCircle(circle, fill, stroke) {
			if (circle.node) {
				var n = circle.node;
				if (timeMin > n.startTime) timeMin = n.startTime;
				if (timeMax < n.endTime  ) timeMax = n.endTime;
			}

			var circle = addProps(circle, {
				fillColor:fill,
				strokeColor:stroke
			})
			canvas.addElement(circle);
			circles.push(circle)
		}
	}

	function updateCircles() {
		circles.forEach(function (circle) {
			var n = circle.node;
			circle.p = Math.min(1, Math.max(0, (time - n.startTime)/10 + 1));
			if (n.duration) {
				circle.a = Math.min(1, Math.max(0, (time - n.startTime)/n.duration));
			} else {
				circle.a = 1;
			}
		})
	}
}

function getProjection(point, radius) {

	return _getProjection(-point[0], -point[1]);

	function _getProjection(cx, cy) {
		return {
			project: function (point, radius) {
				return {
					x:point[0] + cx,
					y:point[1] + cy,
					r:radius
				}
			},
			getSubProjection: function (point) {
				return _getProjection(cx + point[0], cy + point[1])
			}
		}
	}

}

function darkerColor(color) {
	f = 0.9;
	var r = Math.round(color[0]*f).toString(16);
	var g = Math.round(color[1]*f).toString(16);
	var b = Math.round(color[2]*f).toString(16);
	while (r.length < 2) r = '0'+r;
	while (g.length < 2) g = '0'+g;
	while (b.length < 2) b = '0'+b;
	return '#'+r+g+b;
}

function shorten(text, maxLength) {
	if (text.length < maxLength) return text;
	return text.substr(0, maxLength*0.7) + ' &hellip; ' + text.substr(text.length-(maxLength*0.3));
}

function formatSize(value) {
	var sizeFormats = ['B', 'KB', 'MB', 'GB'];
	var exponent = Math.floor(Math.log(value)/Math.log(1000));
	value = value / Math.pow(1000, exponent);
	var digits = 2-Math.floor(Math.log(value)/Math.log(10));
	if (exponent == 0) digits = 0;

	return value.toFixed(digits)+' '+sizeFormats[exponent];
}

function parseUri (str) {
	var
		o   = {
			strictMode: false,
			key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
			q:   {
				name:   "queryKey",
				parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
			parser: {
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		},
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

function addProps(obj, props) {
	var newObj = {};
	Object.keys(obj  ).forEach(function (key) { newObj[key] = obj[key]   })
	Object.keys(props).forEach(function (key) { newObj[key] = props[key] })
	return newObj;
}
