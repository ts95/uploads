var Promise 	= require('bluebird');
var crypto 		= require('crypto');
var sh 			= require('shorthash');

module.exports = function(readStream) {
	return new Promise(function(resolve, reject) {
		var algo = 'sha256';
		var sum  = crypto.createHash(algo);

		readStream.on('data', function(data) {
			sum.update(data);
		});

		readStream.on('end', function() {
			resolve(sh.unique(sum.digest('hex')));
		});

		readStream.on('error', function(err) {
			reject(err);
		});
	});
};