$(document).ready(function () {
  var loadAnimation = $('#load_animation');
  var errDivTpl = _.template('' +
    '<div id="error" class="error_box center">' +
      '<%= text %>' +
    '</div>');

  $('#input_form').submit(function (form) {
    $('#error').remove();
    var input = parseForm(form);
    var inputError = validateInput(input);
    if (inputError) {
      showError(inputError.message);
    } else {
      loadAnimation.fadeIn();
      sendToServer(input)
    }
    return false;

    function parseForm (form) {
      var fields = [].slice.call(form.target);
      var scheduleTypeRadio = _.find(fields, function (v) {
        return v.name == 'schedule_type' && v.checked
      });
      return {
        scheduleType: scheduleTypeRadio && scheduleTypeRadio.value,
        airport: _.find(fields, function (v) {
          return v.name == 'airport'
        }).value,
        airline: _.find(fields, function (v) {
          return v.name == 'airline'
        }).value
      }
    }

    function validateInput (input) {
      if (!input.airport)
        return Error('Airport must be set');
      if (!input.scheduleType)
        return Error('Schedule type must be set')
    }

    function sendToServer (input) {
      var url = '/submit?';
      _.forOwn(input, function (v, k) {
        url += k + '=' + v + '&'
      });
      url = url.slice(0, -1);
      url = encodeURI(url);
      $.get(url, function (res) {
        res = JSON.parse(res);
        switch (res.status) {
          case 'show':
            showError(res.data);
            break;
          case 'wait-by-url':
            var pingInterval = window.setInterval(function () {
              $.get(res.data, function (res) {
                res = res && JSON.parse(res);
                switch (res.status) {
                  case 'show':
                    showError(res.data);
                    break;
                  case 'process':
                    window.clearInterval(pingInterval);
                    loadAnimation.hide();
                    $('#table').remove();
                    $('#error').remove();
                    createTable(res.data);
                    break
                }
              })
            }, 2000);
            break
        }
      })
    }
  });

  $.get('/airlines.csv', function (airlines) {
    addAutocomplete($('#airline-field'), airlines.split(','))
  });

  $.get('/airports.csv', function (airports) {
    addAutocomplete($('#airport-field'), airports.split(','))
  });

  function showError (text) {
    loadAnimation.hide();
    $('#table').remove();
    $('#center_content').append(errDivTpl({text: text}))
  }

  function addAutocomplete (jqElement, source) {
    jqElement.autocomplete({source: function (req, callback) {
      var input = req.term;
      var autocomplete = source.filter(function (v) {
        return !v.indexOf(input.toUpperCase())
      });
      autocomplete = autocomplete.slice(0, Math.min(7, autocomplete.length));
      callback(autocomplete)
    }})
  }

  var tableHeadersTemplate = _.template('<tr><% ' +
    '_.forEach(headers, function(h) { ' +
      '%><th><%- h %></th><% ' +
    '})%></tr>');
  var tableLineTemplate = _.template('<tr><% ' +
    '_.forEach(line, function(v) { ' +
      '%><td><%- v %></td><% ' +
    '})%></tr>');
  function createTable (data) {
    var headers = data.headers;
    var flights = data.flights;

    var toRemoveIndex = data.request.airline
      ? headers.indexOf('airline')
      : headers.indexOf('date');

    headers.splice(toRemoveIndex, 1);
    headers = headers.map(function (header) {
      return capitalizeFirstLetter(header)
    });

    var placeIndex = ~headers.indexOf('Destination')
      ? headers.indexOf('Destination')
      : headers.indexOf('Origin');
    flights.forEach(function (flight) {
      flight.splice(toRemoveIndex, 1);
      var place = flight[placeIndex];
      var placeCode = place.slice(0, place.indexOf(' '));
      flight[placeIndex] = placeCode
    });

    var table = ['<div class="center"><table border="1" id="table">'];
    var tableHeader = tableHeadersTemplate({headers: headers});
    var tableLines = flights.map(function (line) {
      return tableLineTemplate({line: line})
    });

    table.push(tableHeader);
    [].push.apply(table, tableLines);
    table.push('</table></div>');
    table = table.join('');

    $('#center_content').append(table);

    function capitalizeFirstLetter (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
  }
});