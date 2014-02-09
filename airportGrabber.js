var fs = require('fs')

var request = require('request')
var cheerio = require('cheerio')
var async = require('async')
var _ = new require('lodash')

var tableParser = require('./tableParser')

var textOnPageOfCountryWithNoAirports = 'Sorry. We do not currently have any airports for this location.'

var countriesUrl = 'http://www.flightstats.com/go/Airport/airportsOfTheWorld.do'
var countryUrl = 'http://www.flightstats.com/go/Airport/airportsOfTheWorld.do?countryCode='
request(countriesUrl, function (e, r, airportsCountryList) {
  if (e)
    return console.log('can`t get page with countries with airports:', e)
  var resultFile = fs.openSync('public/airports.csv', 'w')
  var countryCodes = getCountryCodes(airportsCountryList)
  var urlsOfPagesWithAirports = countryCodes.map(function (countryCode) {return countryUrl + countryCode})
  async.eachSeries(urlsOfPagesWithAirports, function(airportsPageUrl, callback) {
    console.log('process page ' + airportsPageUrl.slice(airportsPageUrl.indexOf('countryCode=') + 'countryCode='.length))
    request(airportsPageUrl, function(e, r, airportsPage) {
      if(e)
        return callback(Error('can`t load airport page: ' + e.message))
      if (PageIsListOfPagesWithAirports(airportsPage)) {
        [].push.apply(urlsOfPagesWithAirports, getUrlsOfPagesWithAirports(airportsPage))
        return callback()
      }
      processPageWithAirports(airportsPage, resultFile, airportsPageUrl, callback)
    })
  }, function (e) {
    e && console.log(e)
  })
})

function getCountryCodes (airportsCountryList) {
  var $ = cheerio.load(airportsCountryList)
  var links = $('a')
  var hrefs = links.map(function () {return this.attribs.href}).toArray()
  var countriesHrefs = hrefs.filter(function (href) {
      return href.indexOf('countryCode=') != -1}
  )
  return countriesHrefs.map(function (href) {return href.slice(-2)})
}

function PageIsListOfPagesWithAirports (page) {
  var $ = cheerio.load(page)
  return $('a').filter(function () {
    return $(this).attr('href').indexOf('countryCode=') != -1
  }).length
}

function getUrlsOfPagesWithAirports (page) {
  var $ = cheerio.load(page)
  var links = $('a')
  var hrefs = links.map(function () {return this.attribs.href}).toArray()
  var localUnescapedUrlsOfPagesWithAirports = hrefs.filter(function (url) {
    var countryCodeSubStrIndex = url.indexOf('countryCode=')
    return countryCodeSubStrIndex != -1 && url[countryCodeSubStrIndex + 'countryCode='.length + 2] == '&'
  })
  return localUnescapedUrlsOfPagesWithAirports.map(function (url) {
    url = url.replace(/&amp;/g, '&')
    var countryCodeSubStrIndex = url.indexOf('countryCode=')
    return countryUrl + url.slice(countryCodeSubStrIndex + 'countryCode='.length)
  })
}

function processPageWithAirports (page, resultFile, url, callback) {
  if (~page.indexOf(textOnPageOfCountryWithNoAirports))
    return callback()
  var IATAs = getIATAs(page)
  if (validateIATAs(IATAs))
    return callback(Error('airport IATAs grab failure. Probably layout of ' + url + ' has been changed'))
  fs.writeSync(resultFile, IATAs + ',')
  callback()
}

function getIATAs (countryAirports) {
  var $ = cheerio.load(countryAirports)
  var airportsTables = $('table[class=tableListingTable]')
  var tablesHeaders = tableParser.getHeaders($(airportsTables[0]))
  var allTablesLines = []
  airportsTables.each(function () {
    [].push.apply(allTablesLines, tableParser.getLines(this))
  })
  return _(allTablesLines).pluck(tablesHeaders.indexOf('IATA Code')).compact().value()
}

function validateIATAs (IATAs) {
  return IATAs.length == 0 || IATAs.some(function (IATA) {
    return IATA.length != 3 || IATA.match(/[^A-Z0-9]/)
  })
}