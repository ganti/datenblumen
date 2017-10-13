var fs = require('fs');
var makeBubbles = require('./modules/bubbles.js').makeBubbles;

var data = JSON.parse(fs.readFileSync('./cache/test.json', 'utf8'));
makeBubbles(data);
