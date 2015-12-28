var fs = require('fs');

module.exports = fs.existsSync('./custom.json') ? require('./custom.json') : require('./default.json');
