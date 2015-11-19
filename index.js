var Promise         = require('bluebird');
var express         = require('express');
var multer          = require('multer');
var bodyParser      = require('body-parser');
var fileType        = require('file-type');
var readChunkAsync  = Promise.promisify(require('read-chunk'));
var fs              = Promise.promisifyAll(require('fs'));
var fileHash        = require('./lib/file-hash');

var imageDir = __dirname + '/images';
var passcode = process.env.IMG_SERVICE_PASSCODE || 'ayy lmao';
var port = process.env.IMG_SERVICE_PORT || 8000;
var forceHTTPS = true;

function fail(res, err) {
    console.error(err);
    console.trace();

    res.writeHead(500);
    res.end("Error: " + err.message);
}

var app = express();

app.use('/i', express.static(imageDir));
app.use(bodyParser.urlencoded({ extended: true }));

var upload = multer({ dest: imageDir });

app.get('/', function(req, res) {
    res.send('img-service is running');
});

app.post('/upload', upload.single('image'), function(req, res) {
    Promise.resolve()
        .then(function() {
            if (req.body.passcode !== passcode) {
                return Promise.reject(new Error("Invalid passcode"));
            }

            if (!req.file) {
                return Promise.reject(new Error("No file was uploaded"));
            }

            if (req.file.size < 262) {
                return Promise.reject(new Error("File too small"));
            }

            return readChunkAsync(req.file.path, 0, 262);
        })
        .then(function(buffer) {
            return Promise.resolve(fileType(buffer));
        })
        .then(function(type) {
            var validExts = ['gif', 'jpg', 'png', 'webm', 'mp4'];

            if (!~validExts.indexOf(type.ext)) {
                return Promise.reject(
                    new Error("Invalid file type: " + type.mime + " (" + type.ext + ")")
                );
            }

            return fileHash(fs.createReadStream(req.file.path))
                .then(function(hash) {
                    var uploadedFilename = hash + '.' + type.ext;
                    var destFilename = imageDir + '/' + uploadedFilename;
                    if (!fs.existsSync(destFilename)) {
                        fs.createReadStream(req.file.path).pipe(fs.createWriteStream(destFilename));
                    }
                    return Promise.resolve(uploadedFilename);
                });
        })
        .then(function(uploadedFilename) {
            console.log(uploadedFilename + " successfully uploaded");
            res.send(
                (forceHTTPS ? 'https' : req.protocol) + '://' + req.get('host') + '/i/' + uploadedFilename
            );
        })
        .catch(function(err) {
            fail(res, err);
        })
        .finally(function() {
            fs.unlinkAsync(req.file.path)
                .catch(function() {
                    console.error("Failed to unlink file: " + req.file.path);
                });
        });
});

app.post('/delete', function(req, res) {
    var filename = imageDir + '/' + req.body.filename;

    Promise.resolve()
        .then(function() {
            if (req.body.passcode !== passcode) {
                return Promise.reject(new Error("Invalid passcode"));
            }

            if (!fs.existsSync(filename)) {
                return Promise.reject(new Error("This file doesn't exist"));
            }

            return fs.unlinkAsync(filename);
        })
        .then(function() {
            var msg = filename + " successfully deleted";
            console.log(msg);
            res.send(msg);
        })
        .catch(function(err) {
            fail(res, err);
        });
});

var server = app.listen(port, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('img-service listening at http://%s:%s', host, port);
});
