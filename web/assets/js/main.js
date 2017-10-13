$(function () {
	var canvas = new Draw($('#bubbles'));

	var currentUrl = false;

	$('#btnsubmit').click(function () {
		requestFlower($('#texturl').val());
	})

	$('#texturl').keypress(function (e) {
		if (e.which == 13) {
			$('#btnsubmit').click();
			return false;  
		}
	});
	
	$('#downloadform').prop('action', config.flowershop);
	$('#btnDownload').click(function () {
		// Get the d3js SVG element
		var bubbles = document.getElementById('bubbles');
		var svg = bubbles.getElementsByTagName('svg')[0];
		// Extract the data as SVG text string
		var svg_xml = (new XMLSerializer).serializeToString(svg);

		var data = JSON.stringify({
			action: 'download',
			filename: currentUrl.replace(/[^a-zA-Z0-9\.\-]+/g,'_')+'.svg',
			data: svg_xml
		})

		// Submit the <FORM> to the server.
		// The result will be an attachment file to download.
		var form = document.getElementById('downloadform');
		form['data'].value = data;
		form.submit();
	})

	function requestFlower(url) {
		if (url) {
			currentUrl = url
		} else {
			url = currentUrl;
		}

		$.ajax({
			data: JSON.stringify({ url:url, action:'bubbles' }),
			dataType: 'text',
			error: undefined,
			success: parseResponse,
			timeout: 5000,
			type: 'POST',
			url: config.flowershop
		})
	}

	function parseResponse(response) {
		response = JSON.parse(response);

		switch (response.status) {
			case 'queued':
				showMessage('... Warteschleife ...');
				setTimeout(requestFlower, config.waitBetweenRequest)
			break;
			case 'processing':
				showMessage('... Webseite wird analysiert ... bitte warten ...');
				setTimeout(requestFlower, config.waitBetweenRequest)
			break;
			case 'error':
				showMessage('Webseite konnte nicht geladen werden. :(');
			break;
			case 'finished':
				showResult(response);
			break;
			default:
				console.error('Unknown response status "'+response.status+'"');
		}
	}

	function showMessage(text) {
		$('#title').text(text);
		canvas.clear();
		$('#screenshot').empty();
		$('#btnDownload').prop('disabled', true);
	}

	function showResult(response) {
		$('#title').text(response.data.url);
		setBubbles(canvas, response.data);
		$('#screenshot').empty();
		$('#screenshot').append($('<img src="assets/screenshots/'+response.data.screenshot+'" width="128">'));
		$('#btnDownload').prop('disabled', false);
		//console.info(response);
	}
})