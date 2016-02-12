'use strict';

var Promise         = require('bluebird');
var express         = require('express');
var multer          = require('multer');
var bodyParser      = require('body-parser');
var path            = require('path');
var session         = require('express-session');
var sessions        = require("client-sessions");
var mysql           = require('promise-mysql');
var locale          = require('locale');
var favicon         = require('serve-favicon');

var fs              = Promise.promisifyAll(require('fs'));
var DB              = require('./db/db');
var localize        = require('./localization/localize').server;
var supportedLangs  = require('./localization/localize').supported;
var config          = require('./config/config');

var uploadsDir = path.join(__dirname, 'files');
var publicDir = path.join(__dirname, 'public');

function fail(res, err, httpErrorCode) {
    console.error(err);
    console.trace();

    res.writeHead(httpErrorCode || 200);
    res.end(JSON.stringify({
        error: (err.message || err),
    }));
}

mysql.createConnection(config.db).then(function(conn) {
    var db = new DB(conn);

    // Delete old files
    setInterval(function() {
        db.getOutdatedFiles()
            .then(files => {
                return Promise.all(Promise.map(files, file => db.deleteFile(file.fhash)));
            })
            .catch(err => console.error(err));
    }, 1000 * 60 * 60 * 24);

    var app = express();

    app.use('/!', express.static(uploadsDir));
    app.use('/public', express.static(publicDir));
    app.use(favicon(path.join(publicDir, 'favicon.ico')));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(session({
        cookieName: 'session',
        secret: config.secret,
        duration: 31556926000 /* 1 year in ms */,
        resave: false,
        saveUninitialized: false,
    }));
    app.use(locale(supportedLangs));
    app.use(function(req, res, next) {
        localize.setLocale(req.locale);
        next();
    });

    var upload = multer({ dest: uploadsDir });

    app.post('/api/upload', upload.single('file'), function(req, res) {
        var username = req.body.usr;
        var password = req.body.pwd;

        var authFuture = username ?
            db.validateUser(username, password) :
            Promise.resolve(!!req.session.auth);

        authFuture
            .then(isAuthorized => {
                if (!isAuthorized) {
                    return Promise.reject(new Error(localize.translate("Not logged in")));
                }
                return Promise.resolve();
            })
            .then(() => {
                return db.addFile(req.file, username || req.session.auth.username);
            })
            .then(uploadedFilename => {
                var protocol = config.forceHTTPS ? 'https' : req.protocol;
                var host = req.get('host');
                res.send({ success: `${protocol}://${host}/!/${uploadedFilename}` });
            })
            .catch(err => {
                fail(res, err);
            })
            .finally(() => {
                fs.unlinkAsync(req.file.path)
                    .catch(() => {
                        console.error("Failed to unlink file: " + req.file.path);
                    });
            });
    });

    app.post('/api/delete', function(req, res) {
        if (!req.session.auth) return fail(res, new Error(localize.translate("Not logged in")));

        db.verifyFileOwner(req.body.fhash, req.session.auth.username)
            .then(isOwner => {
                if (isOwner) {
                    return db.deleteFile(req.body.fhash)
                        .then(() => res.send({ success: localize.translate("File successfully deleted") }));
                } else {
                    return Promise.reject(new Error(localize.translate("You are not the owner of this file")));
                }
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
            res.send({ success: sess.auth });
        } else {
            db.validateUser(username, password)
                .then(function(isValid) {
                    if (isValid) {
                        sess.auth = { username: username };
                        res.send({ success: sess.auth });
                    } else {
                        res.send({ error: localize.translate("Invalid credentials") });
                    }
                })
                .catch(function(err) {
                    if (err === "This user does not exist") {
                        fail(res, new Error(localize.translate("This user does not exist")));
                    } else {
                        fail(res, err);
                    }
                });
        }
    });

    app.get('/api/logout', function(req, res) {
        var sess = req.session;

        if (sess.auth)
            sess.auth = undefined;

        res.send({ success: localize.translate("Logged out") });
    });

    app.get('/api/history/:count?', function(req, res) {
        if (!req.session.auth) return fail(res, new Error(localize.translate("Not logged in")));

        db.getLastFiles(req.session.auth.username, req.params.count)
            .then(files => {
                res.send({ success: files });
            })
            .catch(err => {
                fail(res, err);
            });
    });

    app.get('/api/auth', function(req, res) {
        var auth = req.session.auth;
        res.send({ success: auth || null });
    });

    app.get('*', function(req, res) {
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    });

    var server = app.listen(config.port, function() {
        var host = server.address().address;
        var port = server.address().port;

        console.log('uploader listening at http://%s:%s', host, port);
    });
});
