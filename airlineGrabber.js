var fs = require('fs')

var request = require('request')
var cheerio = require('cheerio')
var async = require('async')
var _ = new require('lodash')

var tableParser = require('./tableParser')

var url = 'http://www.flightstats.com/go/Airline/airlinesOfTheWorld.do?query='
var alphabet = []
for (var i = 65; i <= 90; i++)
  alphabet.push(String.fromCharCode(i))

var resultFile = fs.openSync('public/airlines.csv', 'w')
async.eachSeries(alphabet, function (letter, callback) {
  console.log('process page', letter)
  var pageUrl = url + letter
  request(pageUrl, function (e, r, b) {
    if (e)
      return callback('can`t load page with airlines', e.message)
    var $ = cheerio.load(b)
    var airlineTable = $('table[class=tableListingTable]')
    var tableHeaders = tableParser.getHeaders(airlineTable)
    var lines = tableParser.getLines(airlineTable)
    var codes = _.pluck(lines, tableHeaders.indexOf('Flight Stats Code'))
    if (validateCodes(codes))
      return callback('airlines codes grab failure. Probably layout of ' + pageUrl + ' has been changed')
    fs.writeSync(resultFile, codes + ',')
    callback()
  })
})

function validateCodes (codes) {
  return codes.length == 0 || codes.some(function (code) {
    return !code || code.length > 3
  })
}