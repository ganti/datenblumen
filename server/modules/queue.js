exports.Queue = function () {
	var me = {};
	var queue = [];
	var callback;
	var running = 0;
	var maxRunning = 1;

	me.add = function (entry, callback) {
		queue.push({data:entry, callback:callback});
		check();
	}

	function next() {
		if (queue.length == 0) return;
		running++;
		var entry = queue.shift();
		entry.callback(function () {
			running--;
			check();
		});
	}

	function check() {
		while ((queue.length > 0) && (running < maxRunning)) next();
	}

	return me;
}