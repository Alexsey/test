var fs = require('fs')

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')
var _ = new require('lodash')

var tableParser = require('./tableParser')

//console.log(moment().add(12,'h').format('YYYY-DD-MM'))
//var table = fs.readFileSync('table.html', 'utf-8')
//console.log(tds.map(function () {return cheerio(this).text().trim()}).toArray())
//var tds = $('td')

var url = 'http://www.flightstats.com/go/FlightStatus/flightStatusByAirport.do?airport=YYC&airportQueryDate=2014-02-10&airportQueryTime=4&airlineToFilter=&airportQueryType=0'
request(url, function (e, r, b) {
  var $ = cheerio.load(b)
  var timeSelectorEl = $('select[id=airportQueryTime]').last()
  console.log('selector', timeSelectorEl)
  var timeSelectorOptionsEls = timeSelectorEl.children('option')
  console.log('options', timeSelectorOptionsEls)
  var timeSelectorValues = timeSelectorOptionsEls.map(function () {return $(this).attr('value')}).toArray()
  console.log('values', timeSelectorValues)
})

