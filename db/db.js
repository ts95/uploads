'use strict';

var Promise         = require('bluebird');
var filetype        = require('file-type');
var path            = require('path');
var bcrypt          = Promise.promisifyAll(require('bcryptjs'));
var fs              = Promise.promisifyAll(require('fs'));
var readChunkAsync  = Promise.promisify(require('read-chunk'));
var fileHash        = require('../lib/file-hash');

var DB = function(conn) {
    this.conn = conn;
};

DB.prototype.createUser = function(username, password) {
    return bcrypt.hashAsync(password, 10)
        .then(hashedPassword => {
            return this.conn
                .query('INSERT INTO user SET ?', {
                    username: username,
                    password: hashedPassword,
                });
        })
        .then(() => Promise.resolve());
};

DB.prototype.validateUser = function(username, password) {
    return this.conn.query('SELECT password FROM user WHERE username = ?', [username])
        .then(rows => {
            if (rows.length === 0)
                return Promise.reject("This user does not exist");
            return Promise.resolve(rows[0]);
        })
        .then(user => {
            return bcrypt.compareAsync(password, user.password);
        });
};

DB.prototype.getUser = function(username) {
    return this.conn.query('SELECT username FROM user WHERE username = ?', [username])
        .then(rows => {
            if (rows.length === 0)
                return Promise.reject("This user does not exist");
            return Promise.resolve(rows[0]);
        });
};

DB.prototype.addFile = function(file, username) {
    return Promise.resolve()
        .then(() => {
            if (!file) {
                return Promise.reject(new Error("No file was provided"));
            }

            return readChunkAsync(file.path, 0, 262);
        })
        .then(buffer => {
            return Promise.resolve(filetype(buffer));
        })
        .then(type => {
            var invalidExts = ['exe'];

            if (!!~invalidExts.indexOf(type.ext)) {
                return Promise.reject(new Error(`Invalid file type: ${type.mime} (${type.ext})`));
            }

            return fileHash(fs.createReadStream(file.path))
                .then(hash => {
                    return this.conn.query('SELECT fname FROM file WHERE fhash = ?', [hash])
                        .then(files => {
                            var uploadedFilename = `${hash}.${type.ext}`;
                            if (files.length === 0) {
                                var destFilename = path.join(__dirname, '../files', uploadedFilename);
                                if (!fs.existsSync(destFilename)) {
                                    fs.createReadStream(file.path).pipe(fs.createWriteStream(destFilename));
                                }
                                var set = {
                                    fhash: hash,
                                    fsize: file.size,
                                    fname: uploadedFilename,
                                    fname_orig: file.originalname,
                                    uploaded_by: username,
                                };
                                return this.conn.query('INSERT INTO file SET ?', set)
                                    .then(() => {
                                        return Promise.resolve(uploadedFilename);
                                    });
                            } else {
                                return this.conn.query('UPDATE file SET uploaded_at = NOW() WHERE fhash = ?', [hash])
                                    .then(() => uploadedFilename);
                            }
                        });
                });
        });
};

DB.prototype.verifyFileOwner = function(fhash, username) {
    return this.conn.query('SELECT fhash FROM file WHERE fhash = ? AND uploaded_by = ?', [fhash, username])
        .then(files => {
            return Promise.resolve(files.length > 0);
        });
};

DB.prototype.deleteFile = function(fhash) {
    return this.conn.query('SELECT fname FROM file WHERE fhash = ?', [fhash])
        .then(files => {
            if (files.length === 0)
                return Promise.reject(new Error("This file does not exist"));

            var file = files[0];
            var filename = path.join(__dirname, '../files', file.fname);

            return fs.unlinkAsync(filename);
        })
        .then(() => {
            return this.conn.query('DELETE FROM file WHERE fhash = ?', [fhash]);
        });
};

DB.prototype.getLastFiles = function(username, count) {
    count = (count|0) || 100;
    if (count < 1 || count > 100)
        return Promise.reject(new Error('Invalid count ' + count));
    return this.conn.query('SELECT * FROM file WHERE uploaded_by = ? ORDER BY uploaded_at DESC LIMIT ?', [username, count]);
};

DB.prototype.getOutdatedFiles = function() {
    return this.conn.query('SELECT * FROM file WHERE uploaded_at < NOW() - INTERVAL 1 MONTH');
};

module.exports = DB;
