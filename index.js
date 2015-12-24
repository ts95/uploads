'use strict';

var Promise         = require('bluebird');
var express         = require('express');
var multer          = require('multer');
var bodyParser      = require('body-parser');
var filetype        = require('file-type');
var path            = require('path');
var session         = require('express-session');
var FileStore       = require('session-file-store')(session);
var mysql           = require('promise-mysql');

var fs              = Promise.promisifyAll(require('fs'));
var DB              = require('./db/db');

var uploadsDir = path.join(__dirname, 'files');
var publicDir = path.join(__dirname, 'public');
var passcode = process.env.UPLOADS_PASSCODE || 'ayy lmao';
var port = process.env.UPLOADS_PORT || 8000;
var forceHTTPS = false;

function fail(res, err) {
    console.error(err);
    console.trace();

    res.writeHead(200);
    res.end(JSON.stringify({
        error: (err.message || err),
    }));
}

var connectionOptions = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'uploads',
};

mysql.createConnection(connectionOptions).then(function(conn) {
    var db = new DB(conn);

    var app = express();

    app.use('/u', express.static(uploadsDir));
    app.use('/public', express.static(publicDir));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(session({
        store: new FileStore(),
        secret: 'a78hjp0koainsbvaohu9p8',
        resave: false,
        saveUninitialized: true,
    }));

    var upload = multer({ dest: uploadsDir });

    app.post('/api/upload', upload.single('file'), function(req, res) {
        if (!req.session.auth) return fail(res, new Error("Not logged in"));

        db.addFile(req.file, req.session.auth.username)
            .then(function(uploadedFilename) {
                console.log(uploadedFilename + " successfully uploaded");
                var protocol = forceHTTPS ? 'https' : req.protocol;
                var host = req.get('host');
                res.send({ success: `${protocol}://${host}/u/${uploadedFilename}` });
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

    app.post('/api/delete', function(req, res) {
        if (!req.session.auth) return fail(res, new Error("Not logged in"));

        db.deleteFile(req.body.fhash, req.session.auth.username)
            .then(function() {
                var msg = `File successfully deleted`;
                console.log(msg);
                res.send({
                    success: msg,
                });
            })
            .catch(function(err) {
                fail(res, err);
            });
    });

    app.post('/api/login', function(req, res) {
        var sess = req.session;

        var username = req.body.username;
        var password = req.body.password;

        if (sess.auth) {
            res.send({ success: { username: username } });
        } else {
            db.validateUser(username, password)
                .then(function(isValid) {
                    if (isValid) {
                        sess.auth = { username: username };
                        res.send({ success: { username: username  } });
                    } else {
                        res.send({ error: 'Invalid credentials' });
                    }
                })
                .catch(function(err) {
                    fail(res, err);
                });
        }
    });

    app.get('/api/logout', function(req, res) {
        var sess = req.session;

        if (sess.auth) {
            sess.auth = undefined;
        }

        res.send({ success: 'Logged out' });
    });

    app.get('/api/auth', function(req, res) {
        res.send({ success: req.session.auth || null  });
    });

    app.get('/api/history', function(req, res) {
        if (!req.session.auth) return fail(res, new Error("Not logged in"));
        db.getLastFiles(req.session.auth.username)
            .then(files => {
                res.send({ success: files });
            })
            .catch(err => {
                fail(res, err);
            });
    });

    app.get('*', function(req, res) {
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    });

    var server = app.listen(port, function() {
        var host = server.address().address;
        var port = server.address().port;

        console.log('uploader listening at http://%s:%s', host, port);
    });
});
