var http = require('http')

var _ = new require('lodash')
var express = require('express')
var app = express()
var cheerio = require('cheerio')

//var scheduleUrlTemplate = _.template(
//  'http://www.flightstats.com/go/FlightStatus/flightStatusByAirport.do' + '?' +
//  'airport=' + '<%= airport %>' + '&' +
//  'airportQueryDate=' + '<%=%>' + '&' +
//  'airportQueryTime=' + '<%=%>' + '&' +
//  'airlineToFilter=' + '<%= airline || "" %>' + '&' +
//  'airportQueryType=' + '<%= scheduleType == "departures" ? 0 : 1 %>' + '&'
//)

app.use(express.static(__dirname + '/public'))
app.get('/submit', function (req, res) {
  var input = req.query
  console.log(input)
  res.end('ololo')
})

app.listen(8000)