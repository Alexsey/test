var fs = require('fs')

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')
var _ = require('lodash')

//console.log(moment().add(12,'h').day(1).format())

var a = ['a', 'b', 'c']
var b = [1, 2, 3]
;[].push.apply(a, b)
console.log(a)