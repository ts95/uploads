var Promise 	= require('bluebird');
var express 	= require('express');
var multer 		= require('multer')
var fs 			= Promise.promisifyAll(require('fs'));
var fileHash 	= require('./lib/file-hash');

var imageDir = __dirname + '/images';
var passcode = '[some unique code]';

var app = express();

app.use('/i', express.static(imageDir));

var upload = multer({ dest: imageDir });

app.get('/', function(req, res) {
	res.send('img-service is running. More info at https://github.com/ts95/img-service');
});

app.post('/upload', upload.single('image'), function(req, res) {
	if (req.body.passcode !== passcode) {
		res.writeHead(500);
		res.end("Error: Invalid passcode");
		return;	
	}

	var validTypes = ['image/gif', 'image/jpeg', 'image/png', 'video/webm'];

	if (!~validTypes.indexOf(req.file.mimetype)) {
		res.writeHead(500);
		res.end("Error: Invalid MIME-type");
		return;
	}

	var ext = '.' + req.file.mimetype.split('/')[1];

	var filename = imageDir + '/' + req.file.filename;

	fileHash(fs.createReadStream(filename))
		.then(function(hash) {
			var uploadedFilename = hash + ext;
			var destFilename = imageDir + '/' + uploadedFilename;
			if (!fs.existsSync(destFilename)) {
				fs.createReadStream(filename).pipe(fs.createWriteStream(destFilename));
			}
			return fs.unlinkAsync(filename)
				.then(function() {
					return Promise.resolve(uploadedFilename);
				});
		})
		.then(function(uploadedFilename) {
			res.send(req.protocol + '://' + req.get('host') + '/i/' + uploadedFilename);
		})
		.catch(function(err) {
			console.error(err);
			res.writeHead(500);
			res.end('Error: ' + err.message);
		});
});

var server = app.listen(8000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('img-service listening at http://%s:%s', host, port);
});
