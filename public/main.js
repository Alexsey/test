$(document).ready(function () {
  $('#input_form').submit(function (form) {
    var input = parseForm(form)
    sendToServer(input)
    return false

    function parseForm (form) {
      var fields = Array.prototype.slice.call(form.target)
      return {
        scheduleType: _.find(fields, function (v) {return v.name == 'schedule_type' && v.checked}).value,
        airport: _.find(fields, function (v) {return v.name == 'airport'}).value,
        airline: _.find(fields, function (v) {return v.name == 'airline'}).value
      }
    }

    function sendToServer(input) {
      var url = '/submit?'
      _.forOwn(input, function (v, k) {
        url += k + '=' + v + '&'
      })
      url = url.slice(0, -1)
      url = encodeURI(url)
      $.get(url, function (res) {
        console.log(res)
      })
    }
  })

  $.get('/airlines.csv', function (airlines) {
    addAutocomplete($('#airline-field'), airlines.split(','))
  })

  $.get('/airports.csv', function (airports) {
    addAutocomplete($('#airport-field'), airports.split(','))
  })

  function addAutocomplete (jqElement, source) {
    jqElement.autocomplete({source: function (req, callback) {
      var input = req.term
      var autocomplete = source.filter(function (v) {
        return !v.indexOf(input.toUpperCase())
      })
      autocomplete = autocomplete.slice(0, Math.min(7, autocomplete.length))
      callback(autocomplete)
    }})
  }
})