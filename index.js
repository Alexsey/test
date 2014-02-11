var http = require('http');
var fs = require('fs');

var _ = require('lodash');
var express = require('express');
var app = express();
var cheerio = require('cheerio');
var request = require('request');
var moment = require('moment');
var async = require('async');

var tableParser = require('./tableParser');

var airlinesCodes = fs.readFileSync('public/airlines.csv', 'utf-8');
airlinesCodes = airlinesCodes.split(',');

var airportsIATAs = fs.readFileSync('public/airports.csv', 'utf-8');
airportsIATAs = airportsIATAs.split(',');

var scheduleUrlTemplate = _.template(
  'http://www.flightstats.com/go/FlightStatus/flightStatusByAirport.do' + '?' +
    'airport=' + '<%= airport %>' + '&' +
    'airportQueryDate=' + '<%= date %>' + '&' +
    'airportQueryTime=' + '<%= startHour %>' + '&' +
    'airlineToFilter=' + '<%= airline %>' + '&' +
    'airportQueryType=' + '<%= scheduleType == "departures" ? 0 : 1 %>'
);

var timeRangeWithAirlines = 4;
var timeRangeWithoutAirlines = 12;

var serviceIsBusy = false;

var base = {};

setInterval(function () {
  _.forOwn(function (record, id, base) {
    record.checked
      ? delete base[id]
      : record.checked = true
  })
}, 10000);

app.use(express.static(__dirname + '/public'));
app.get('/result', function (req, res) {
  var id = req.query.id;
  res.end(base[id] && base[id].data);
  delete base[id]
});
app.get('/submit', function (req, res) {
  if (serviceIsBusy)
    return res.end(createResponse('show', 'Service is busy'));
  var input = req.query;
  preprocessInput(input);
  var inputError = validateInput(input);
  if (inputError)
    return res.end(createResponse('show', inputError.message));
  var timeRange = input.airline
    ? timeRangeWithAirlines
    : timeRangeWithoutAirlines;
  var now = moment();
  var start = now.clone().subtract(timeRange, 'hours');
  var end = now.clone().add(timeRange, 'hours');
  var interval = {start: start.clone(), end: start.clone()};

  var dataToGrab = ['flight', 'airline', 'sched', 'actual', 'gate', 'status'];
  input.scheduleType == 'departures'
    ? dataToGrab.unshift('destination')
    : dataToGrab.unshift('origin');
  var resultHeaders = ['date'].concat(dataToGrab);

  var resultId = _.uniqueId();
  res.end(createResponse('wait-by-url', '/result?id=' + resultId));

  var flights = [];
  serviceIsBusy = true;
  async.whilst(
    function () {
      return end.isAfter(interval.start)
    },
    function (callback) {
      var scheduleUrl = scheduleUrlTemplate({
        airport: input.airport,
        date: interval.start.format('YYYY-MM-DD'),
        startHour: interval.start.hour(),
        airline: input.airline,
        scheduleType: input.scheduleType
      });
      request(scheduleUrl, function (e, r, b) {
        if (e)
          return callback(e);
        [].push.apply(flights, parseFlights(b, interval));
        interval = getNextInterval(b, interval);
        callback()
      })
    },
    function (e) {
      serviceIsBusy = false;
      if (e) {
        console.log(e);
        return base[resultId] = {
          data: createResponse('show', 'Must be some problems with flightstats')
        }
      }
      flights = filterFlightsOutOfRange(flights, start, end);
      flights = _.uniq(flights, function (v) {return v.toString()});
      if (!flights.length)
        return base[resultId] = {
          data: createResponse('show', 'No results for such input')
        };
      base[resultId] = {
        data: createResponse('process', {
          headers: resultHeaders, flights: flights, request: input
        })
      }
    }
  );

  function preprocessInput (input) {
    input.airport = input.airport.toUpperCase();
    input.airline = input.airline.toUpperCase()
  }

  function validateInput (input) {
    if (!input.airport)
      return Error('Airport must be set');
    if (input.airline !== '' && !~airlinesCodes.indexOf(input.airline))
      return Error('No such airline code');
    if (input.airport !== '' && !~airportsIATAs.indexOf(input.airport))
      return Error('No such airport IATA')
  }

  function parseFlights (page, interval) {
    var $ = cheerio.load(page);
    var table = $('table[class=tableListingTable]');
    var flights = tableParser.getLines(table);
    var headers = _.invoke(tableParser.getHeaders(table), 'toLowerCase');
    var indexesToGrab = dataToGrab.map(function (dataName) {
      return headers.indexOf(dataName)
    });
    return flights.map(function (flight) {
      return [interval.start.format('YYYY-MM-DD')]
        .concat(_.at(flight, indexesToGrab))
    })
  }

  function getNextInterval (page, interval) {
    var $ = cheerio.load(page);
    var timeSelectorEl = $('select[id=airportQueryTime]').last();
    if (timeSelectorEl.attr('onchange')) {
      var timeSelectorOptionsEls = timeSelectorEl.children('option');
      var timeSelectorValues = timeSelectorOptionsEls.map(function () {
        return $(this).attr('value')
      }).toArray();
      var valuesAfterCurrentInterval = timeSelectorValues.filter(function (v) {
        return +v > interval.start.hour()
      });
      return{
        start: valuesAfterCurrentInterval[0]
          ? interval.start.clone().hour(valuesAfterCurrentInterval[0])
          : startOfNextDay(),
        end: valuesAfterCurrentInterval[1]
          ? interval.start.clone().hour(valuesAfterCurrentInterval[1])
          : startOfNextDay()
      }
    }
    return {
      start: startOfNextDay(),
      end: startOfNextDay()
    };

    function startOfNextDay () {
      return interval.start.clone().add(1, 'day').startOf('day')
    }
  }

  function filterFlightsOutOfRange (flights, start, end) {
    return flights.filter(function (flight) {
      var sched = resultHeaders.indexOf('sched');
      var semicolon = flight[sched].indexOf(':');
      var space = flight[sched].indexOf(' ');
      var schedH = flight[sched].slice(0, semicolon);
      var schedM = flight[sched].slice(semicolon + 1, space);
      if (~flight[sched].indexOf('PM') && !~flight[sched].indexOf('12'))
        schedH = +schedH + 12;
      if (schedH == 12 && ~flight[sched].indexOf('AM'))
        schedH = 0;
      var date = flight[resultHeaders.indexOf('date')];
      var flightSched = moment(date + ' ' + schedH + ':' + schedM,
        'YYYY-MM-DD hh:mm');
      return flightSched.isAfter(start) && flightSched.isBefore(end)
    })
  }
});

app.listen(8000);

function createResponse (status, data) {
  return JSON.stringify({
    status: status,
    data: data
  })
}