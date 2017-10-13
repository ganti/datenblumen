var util = require('util');
var URL = require('url');

exports.makeBubbles = function (data) {
	var resources = data.resources.map(function (r) {
		if (!r.size) return false;
		if (r.statusCode == 301) return false;

		var url = URL.parse(r.newUrl);
		r.protocol = url.protocol.split(':').shift();
		r.host = url.hostname;
		r.hostPath = r.host.split('.').reverse();
		r.hostPathGroup = r.hostPath.map(function (entry, index) {
			return {id:entry, title:'...'+r.hostPath.slice(0,index+1).reverse().join('.')}
		})
		r.hostPathGroup.push({id:r.protocol, title:r.protocol+'://'+r.host});
		r.hostGroup = [r.hostPathGroup[1], r.hostPathGroup[2]];

		r.duration = r.endTime - r.startTime;
		
		r.secure = false;
		switch (r.protocol) {
			case 'https': r.secure = true;  break;
			case 'http':  r.secure = false; break;
			case 'chrome-extension':
			case 'data':
				return false;
			default: log('Unknown protocol "'+r.protocol+'"')
		}

		r.type = false;

		if (!r.type) {
			var file = r.newUrl;
			file = file.split('?').shift();
			file = file.split('#').shift();
			file = file.split('.').pop();
			file = file.toLowerCase();
			switch (file) {
				case 'gif':  r.type = 'image/gif'; break;
				case 'png':  r.type = 'image/png'; break;
				case 'webp': r.type = 'image/webp'; break;
				case 'jpg':
				case 'jpeg': r.type = 'image/jpg'; break;
				case 'js':   r.type = 'code/javascript'; break;
				case 'css':  r.type = 'style/css'; break;
				case 'ttf':
				case 'woff': r.type = 'style/font'; break;
				case 'htm':
				case 'php':
				case 'aspx':
				case 'html': r.type = 'html'; break;
				case 'cgi': break;
			}
		}

		if (!r.type && r.contentType) {
			var mimeType = r.contentType.split(';').shift().toLowerCase();
			switch (mimeType) {

				case 'text/x-js':
				case 'application/json':
				case 'text/x-json':
				case 'text/js':
				case 'application/javascript':
				case 'application/x-javascript':
				case 'text/javascript':
				case 'application/vnd.maxmind.com-country+json':
					r.type = 'code/javascript'; break;

				case 'image/jpeg':
				case 'image/jpg':
					r.type = 'image/jpg'; break;

				case 'image/gif':
					r.type = 'image/gif'; break;

				case 'image/png':
					r.type = 'image/png'; break;

				case 'image/webp':
					r.type = 'image/webp'; break;

				case 'image/bmp':
				case 'image/svg+xml':
				case 'image/x-icon':
					r.type = 'image'; break;
			
				case 'text/css':
					r.type = 'style/css'; break;

				case 'application/xml':
				case 'text/plain':
				case 'text/xml':
				case 'text':
				case 'text/html':
					r.type = 'html'; break;

				case 'application/x-woff':
				case 'application/vnd.ms-fontobject':
				case 'font/woff':
				case 'font/ttf':
				case 'font/opentype':
				case 'application/font-woff':
				case 'application/x-font-ttf':
				case 'application/x-font-woff':
					r.type = 'style/font'; break;
			
				case '':
				case 'application/x-httpd-cgi':
				case 'application/octet-stream':
				break;

				default:
					log('Unknown mimeType "'+mimeType+'"');
					log(r);

			}
		}

		return r;
	}).filter(function (r) { return r });

	data.resources = resources;

	resources.forEach(function (r, index) { r.index = index })
	
	data.bubbles = {
		hostDeep: calcBubbles(resources, 'hostPathGroup'),
		host: calcBubbles(resources, 'hostGroup')
	}
	
	return;
}

function calcBubbles(resources, groupByKey) {
	var tree = calcBubbleGroups(resources, 0);
	calcBubbleLayout(tree);
	return tree;

	//log(util.inspect(tree, {depth:10, colors:true}));

	function calcBubbleGroups(entries, groupDepth) {
		var groups = {};

		// In Gruppen einsortieren
		entries.forEach(function (entry, index) {
			var group = entry[groupByKey][groupDepth];
			var id = group ? group.id : index;
			var title = group ? group.title : false;
			if (!groups[id]) groups[id] = {id:id, title:title, children:[]};
			groups[id].children.push(entry);
		})

		// Einzelne Gruppen prüfen ggf untergruppieren
		Object.keys(groups).forEach(function (id) {
			var group = groups[id];
			if (group.children.length <= 1) {
				group.isLeaf = true;
			} else {
				group.children = calcBubbleGroups(group.children, groupDepth+1);
			}
		})

		groups = Object.keys(groups).map(function (key) { return groups[key] });

		if (groupDepth == 0) {
			return {
				title: 'Gesamt',
				children: groups
			}
		}

		return groups;
	}

	function calcBubbleLayout(node) {
		if (node.isLeaf) {
			node.index = node.children[0].index;
			node.radius = Math.sqrt(node.children[0].size)+1;
			node.point = [0, 0];
			delete node.children;
			return;
		}

		if (node.children.length == 1) {
			calcBubbleLayout(node.children[0])
			node.radius = node.children[0].radius;
			node.point = [0, 0];
			return;
		}

		var circles = node.children;
		circles.forEach(function (node) {
			calcBubbleLayout(node)
		})
		circles.sort(function (a,b) {
			return b.radius - a.radius;
		})


		circles[0].point = [-circles[1].radius, 0];
		circles[1].point = [+circles[0].radius, 0];

		var touching = [[circles[0], circles[1]]];

		for (var i = 2; i < circles.length; i++) {
			var radius = circles[i].radius;
			var best = {
				point: null,
				radius: radius,
				distance: 1e10,
				touch1: null,
				touch2: null
			};
			for (var j = 0; j < touching.length; j++) {
				var cs = touching[j];
				var points = calcTouches(cs[0].point, cs[0].radius+radius, cs[1].point, cs[1].radius+radius);
				points.forEach(function (point) {
					if (distance(point) < best.distance) {
						var ok = true;
						var c = {point:point, radius:radius};
						for (var k = 0; k < i; k++) {
							if (collision(circles[k], c)) {
								ok = false;
							}
						}

						if (ok) {
							best.distance = distance(point);
							best.point = point;
							best.touch1 = cs[0];
							best.touch2 = cs[1];
						}
					}
				});
			}
			if (!best.touch1 || !best.touch2) console.log(best);

			circles[i].point = best.point;

			for (var j = 0; j < i; j++) {
				touching.push([circles[i], circles[j]]);
			}
		}


		var point = [0,0];
		var rMin = getMinRadius([0,0]);
		var scaleFactor = 0.5;

		for (var i = 0; i < 20; i++) {
			for (var dx = -1; dx <= 1; dx++) {
				for (var dy = -1; dy <= 1; dy++) {
					step = rMin*scaleFactor;
					var newPoint = [point[0]+dx*step, point[1]+dy*step];
					var r = getMinRadius(newPoint);
					if (r < rMin) {
						rMin = r;
						point = newPoint;
					}
				}
			}
			scaleFactor *= 0.7;
		}

		node.radius = rMin;
		node.point = [0,0];
		node.children.forEach(function (child) {
			child.point[0] -= point[0];
			child.point[1] -= point[1];
		})

		function getMinRadius(point) {
			var rmax = 0;
			node.children.forEach(function (child) {
				var r = Math.sqrt(distance2(point, child.point)) + child.radius;
				if (rmax < r) rmax = r;
			});
			return rmax;
		}

		function calcTouches (p1, r1, p2, r2) {

			var dx = p2[0] - p1[0];
			var dy = p2[1] - p1[1];

			var d = dx*dx + dy*dy;
			var K = ((r1+r2)*(r1+r2)-d)*(d-(r1-r2)*(r1-r2));

			if (K < 0) return [];

			K = 0.25*Math.sqrt(K);

			return [
				[
					0.5*(p2[0] + p1[0]) + 0.5*dx*(r1*r1 - r2*r2)/d + 2*dy*K/d,
					0.5*(p2[1] + p1[1]) + 0.5*dy*(r1*r1 - r2*r2)/d - 2*dx*K/d
				],
				[
					0.5*(p2[0] + p1[0]) + 0.5*dx*(r1*r1 - r2*r2)/d - 2*dy*K/d,
					0.5*(p2[1] + p1[1]) + 0.5*dy*(r1*r1 - r2*r2)/d + 2*dx*K/d
				]
			];
		}

		function distance (p) {
			return sqr(p[0]) + sqr(p[1]);
		}

		function distance2 (p1, p2) {
			return sqr(p1[0]-p2[0]) + sqr(p1[1]-p2[1]);
		}

		function sqr(x) {
			return x*x
		}

		function collision(c1, c2) {

			var dx = c2.point[0] - c1.point[0];
			var dy = c2.point[1] - c1.point[1];
			var dist1 = Math.sqrt(dx*dx + dy*dy);
			var dist2 = (c1.radius + c2.radius - 1e-6);

			return dist1 < dist2;
		}

	}
}







function log(msg) {
	console.log(msg);
}

