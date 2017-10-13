function Draw(node) {
	var width, height, canvas, ctx;
	var zoom = 0.2;
	var elements = [];
	var retina = 2;

	init();
	setSize();
	draw();

	function init() {
		node.css('overflow', 'hidden');

		canvas = $('<canvas></canvas>');
		node.append(canvas);

		ctx = canvas.get(0).getContext('2d');

		reset();
	}

	function setSize() {
		width  = node.innerWidth();
		height = node.innerHeight();
		canvas.css({ width: width, height:height });
		width  *= retina;
		height *= retina;
		canvas.prop({ width: width, height:height });
	}

	function reset() {
		elements = [];
	}

	function clear() {
		reset();
		draw();
	}

	function addElement(element) {
		elements.push(element);
	}

	function draw() {
		ctx.clearRect(0, 0, width, height);

		elements.forEach(function (e) {


			switch (e.type) {
				case 'circle':
					if (e.fillColor) {
						drawCircle(e);
					}
					if (e.strokeColor) {
						drawCircle(e, true);
					}
				break;
			}

		})

		function drawCircle(e, outline) {
			if (e.p <= 0) return;

			var z = zoom;
			e.px = e.x*z+width/2;
			e.py = e.y*z+height/2;

			if (outline) {
				ctx.beginPath();
				ctx.strokeStyle = e.strokeColor;
				var lineWidth   = e.p*e.strokeWeight;
				if (lineWidth > e.r) lineWidth = e.r;
				ctx.lineWidth   = z*lineWidth;
				ctx.arc(e.px, e.py, e.r*z - z*lineWidth/2, 0, 2*Math.PI, false);
				ctx.stroke();
			} else {
				if (e.a < 1) {
					ctx.beginPath();
					ctx.fillStyle = 'rgba('+e.fillColor.join(',')+','+e.p*0.1+')';
					ctx.arc(e.px, e.py, e.r*z, 0, 2*Math.PI, false);
					ctx.fill();
				}

				if (e.a > 0) {
					ctx.beginPath();
					ctx.fillStyle = 'rgba('+e.fillColor.join(',')+','+e.p+')';
					ctx.arc(e.px, e.py, e.r*z, -0.25*2*Math.PI, (e.a-0.25)*2*Math.PI, false);
					ctx.lineTo(e.px, e.py);
					ctx.closePath();
					ctx.fill();
				}
			}
		}
	}

	return {
		reset:reset,
		addElement:addElement,
		draw:draw
	}
}