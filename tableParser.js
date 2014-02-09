var cheerio = require('cheerio')
var _ = new require('lodash')

exports.getLines = function (table) {
  var lines = []
  var lineLength = table.find('tr').first().children().length
  var i = 0
  table.children().children('td').each(function () {
    add(lines, i++ / lineLength | 0, cheerio(this).text().trim())
  })
  return lines
}

exports.getHeaders = function (table) {
  return _(table.children().children('th').map(function () {
    return cheerio(this).text().trim()
  }).toArray()).compact().value()
}

function add (container, i, item) {
  Array.isArray(container[i])
    ? container[i].push(item)
    : container[i] = [item]
}