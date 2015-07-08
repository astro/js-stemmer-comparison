var Elasticsearch = require('elasticsearch')
var natural = require('natural')
var through = require('through2')

process.on('uncaughtException', function(err) {
      console.error(err.stack)
      process.exit(1)
})

var es = new Elasticsearch.Client({
      hosts: ['127.0.0.1:9200']
})
function esGetTokens(text, cb) {
      es.indices.analyze({
	    analyzer: 'html_english_analyzer',
	    index: 'cave',
	    body: text
      }, function(err, result) {
	       if (err) return cb(err)
               
	       cb(null, result.tokens.map(function(token) {
			      return token.token
		        }))
	 })
}

function naturalStemmer(stemmer) {
      return function(s, cb) {
            var err, result
            try {
                  result = stemmer.tokenizeAndStem(s)
            } catch (e) {
                  err = e
            }
            cb(err, result)
      }
}

var baselineStemmer = 0
var stemmers = [esGetTokens,
                naturalStemmer(natural.PorterStemmer),
                naturalStemmer(natural.LancasterStemmer)
               ]

var times = []
var distances = []
var processed = []
for(var i = 0; i < stemmers.length; i++) {
      times[i] = 0
      distances[i] = 0
      processed[i] = 0
}
setInterval(function() {
      var baseline = times[baselineStemmer]
      var shares = times.map(function(time) {
                         return Math.floor(100 * time / baseline) + "%"
                   })
      console.log("Times: " + shares.join(" "))

      var s = ""
      for(var i = 0; i < stemmers.length; i++) {
            s += " " + (Math.round(100 * distances[i] / processed[i]) / 100)
      }
      console.log("Avg distances:" + s)
}, 1000)

var lineBuffer = ""
process.stdin.
      setEncoding('utf8')
process.stdin.
      pipe(through({
            decodeStrings: false
      }, function(data, enc, cb) {
               lineBuffer += data
               var splitted
               while((splitted = lineBuffer.split(/\n/)).length > 1) {
                     splitted.slice(0, splitted.length - 1).forEach(function(s) {
                                                                          this.push(s)
                                                                    }.bind(this))
                     lineBuffer = splitted[splitted.length - 1]
               }
               cb()
         }, function(cb) {
                  this.push(lineBuffer)
                  this.push(null)
            })).setEncoding('utf8').
      pipe(through({ decodeStrings: false }, function(line, enc, cb) {
                 var stemmerResults = []
                 function done() {
                       var ds = stemmerResults.map(function(s) {
                                      return natural.LevenshteinDistance(stemmerResults[baselineStemmer], s)
                                })
                       for(var i = 0; i < stemmers.length; i++) {
                             distances[i] += ds[i]
                             processed[i] += line.length
                       }
                       
                       cb()
                 }
                 var pending = stemmers
                 var i = 0
                 function run() {
                       if (pending.length < 1) return done()
                       var stemmer = pending[0]
                       pending = pending.slice(1)

                       var t1 = Date.now()
                       stemmer(line, function(err, tokens) {
                             var t2 = Date.now()
                             if (err) return cb(err)

                             times[i] += t2 - t1
                             stemmerResults[i] = tokens.join(" ")

                             i++
                             run()
                       })
                 }
                 run()
           })).
      on('error', function(err) {
      console.log(err.stack)
})
