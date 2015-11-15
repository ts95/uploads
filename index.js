var Promise 	= require('bluebird');
var express 	= require('express');
var bodyParser 	= require("body-parser");
var Busboy 		= require('busboy');
var fs 			= Promise.promisifyAll(require('fs'));
var fileHash 	= require('./lib/file-hash');

var imageDir = __dirname + '/images';
var passcode = '[some unique code]';

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/i', express.static(imageDir));

app.get('/', function(req, res) {
	res.send('img-service is running. More info at https://github.com/ts95/img-service');
});

app.post('/upload', function(req, res) {
	if (req.body.passcode !== passcode) {
		res.writeHead(500);
		res.end("Error: Invalid passcode");
		return;	
	}

	var busboy = new Busboy({ headers: req.headers, limits: { files: 1 } });

	var ext = null;

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		var validTypes = ['image/gif', 'image/jpeg', 'image/png', 'video/webm'];

		if (!~validTypes.indexOf(mimetype)) {
			res.writeHead(500);
			res.end("Error: Invalid MIME-type");
			return;
		}

		ext = '.' + mimetype.split('/')[1];

		file.pipe(fs.createWriteStream('tmp_file'));
	});

	busboy.on('finish', function() {
		fileHash(fs.createReadStream('tmp_file'))
			.then(function(hash) {
				var uploadedFilename = hash + ext;
				var destFilename = imageDir + '/' + uploadedFilename;
				return fs
					.existsAsync(destFilename)
					.then(function(exists) {
						if (!exists) {
							fs.createReadStream('tmp_file').pipe(fs.createWriteStream(destFilename));
						}
						return Promise.resolve();
					})
					.then(function() {
						return fs.unlinkAsync('tmp_file');
					})
					.then(function() {
						return Promise.resolve(uploadedFilename);
					});
			})
			.then(function(filename) {
				res.send(req.protocol + '://' + req.get('host') + '/i/' + filename);
			})
			.catch(function(err) {
				console.error(err);
			});
	});

	req.pipe(busboy);
});

var server = app.listen(8000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('img-service listening at http://%s:%s', host, port);
});
