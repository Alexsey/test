var fs = require('fs');

var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var _ = new require('lodash');

var tableParser = require('./tableParser');

var textOnPageOfCountryWithNoAirports =
  'Sorry. We do not currently have any airports for this location.';

var countriesUrl =
  'http://www.flightstats.com/go/Airport/airportsOfTheWorld.do';
var countryUrl =
  'http://www.flightstats.com/go/Airport/airportsOfTheWorld.do?countryCode=';

var result = [];
var resultFile = fs.openSync('public/airports.csv', 'w');

request(countriesUrl, function (e, r, airportsCountryList) {
  if (e)
    return console.log('can`t get page with countries with airports:', e);
  var countryCodes = getCountryCodes(airportsCountryList);
  var urlsOfPagesWithAirports = countryCodes.map(function (countryCode) {
    return countryUrl + countryCode
  });
  async.eachSeries(urlsOfPagesWithAirports,
    function(airportsPageUrl, callback) {
      var countryCode = getCountryCodeFromUrl(airportsPageUrl).join(' ');
      console.log('process page ' + countryCode);
      request(airportsPageUrl, function(e, r, airportsPage) {
        if(e)
          return callback(Error('can`t load airport page: ' + e.message));
        if (PageIsListOfPagesWithAirports(airportsPage)) {
          var urls = getUrlsOfPagesWithAirports(airportsPage);
          [].push.apply(urlsOfPagesWithAirports, urls);
          return callback()
        }
        processPageWithAirports(airportsPage, result, airportsPageUrl, callback)
      })
  }, function (e) {
    if (e)
      console.log(e);
    result = result.join('');
    result = result.slice(0, -1);
    console.log(result.split(',').length + ' airports has been grabbed');
    fs.writeSync(resultFile, result)
  })
});

function getCountryCodes (airportsCountryList) {
  var $ = cheerio.load(airportsCountryList);
  var links = $('a');
  var hrefs = links.map(function () {return this.attribs.href}).toArray();
  var countriesHrefs = hrefs.filter(function (href) {
      return href.indexOf('countryCode=') != -1}
  );
  return countriesHrefs.map(function (href) {return href.slice(-2)})
}

function PageIsListOfPagesWithAirports (page) {
  var $ = cheerio.load(page);
  return $('a').filter(function () {
    return $(this).attr('href').indexOf('countryCode=') != -1
  }).length
}

function getUrlsOfPagesWithAirports (page) {
  var $ = cheerio.load(page);
  var links = $('a');
  var hrefs = links.map(function () {return this.attribs.href}).toArray();
  var localUnescapedUrlsOfPagesWithAirports = hrefs.filter(function (url) {
    return ~url.indexOf('countryCode=');
  });
  return localUnescapedUrlsOfPagesWithAirports.map(function (url) {
    url = url.replace(/&amp;/g, '&');
    var countryCodeIndex = url.indexOf('countryCode=')  + 'countryCode='.length;
    return countryUrl + url.slice(countryCodeIndex)
  })
}

function processPageWithAirports (page, result, url, callback) {
  if (~page.indexOf(textOnPageOfCountryWithNoAirports))
    return callback();
  var IATAs = getIATAs(page);
  if (validateIATAs(IATAs))
    return callback(Error('airport IATAs grab failure. ' +
      'Probably layout of ' + url + ' has been changed'));
  result.push(IATAs, ',');
  callback()
}

function getIATAs (countryAirports) {
  var $ = cheerio.load(countryAirports);
  var airportsTables = $('table[class=tableListingTable]');
  var tablesHeaders = tableParser.getHeaders($(airportsTables[0]));
  var allTablesLines = [];
  airportsTables.each(function () {
    [].push.apply(allTablesLines, tableParser.getLines(this))
  });
  return _(allTablesLines).pluck(tablesHeaders.indexOf('IATA Code')).compact()
    .value()
}

function validateIATAs (IATAs) {
  return IATAs.length == 0 || IATAs.some(function (IATA) {
    return IATA.length != 3 || IATA.match(/[^A-Z0-9]/)
  })
}

function getCountryCodeFromUrl (url) {
  var match = url.match(/=../g);
  return match.map(function (v) {
    return v.slice(1)
  });
}