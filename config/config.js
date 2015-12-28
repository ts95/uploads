var fs      = require('fs');
var path    = require('path');

module.exports = fs.existsSync(path.join(__dirname, 'custom.json')) ?
    require(path.join(__dirname, 'custom.json')) : require(path.join(__dirname, 'default.json'));
