var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
    tableName: 'users',
    username: null,
    password: null
});

module.exports = User;