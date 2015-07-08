var Elasticsearch = require('elasticsearch')
var natural = require('natural')
var split = require('split')
var Benchmark = require('./benchmark')

process.on('uncaughtException', function(err) {
    console.error(err.stack)
    process.exit(1)
})

var es = new Elasticsearch.Client({
    hosts: ['127.0.0.1:9200']
})
function esGetTokens(text, cb) {
    es.indices.analyze({
        // TODO: import create_es_index.sh
	analyzer: 'html_english_analyzer',
	index: 'cave',
	body: "" + text
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

var bm = new Benchmark()
bm.addStemmer('ES', esGetTokens)
bm.addStemmer('natural.Porter', naturalStemmer(natural.PorterStemmer))
bm.addStemmer('natural.Lancaster', naturalStemmer(natural.LancasterStemmer))

setInterval(bm.report.bind(bm), 1000)

process.stdin.
    setEncoding('utf8').
    pipe(split()).
    pipe(bm.getTarget()).
    on('error', function(err) {
        console.log(err.stack)
    }).
    on('end', function() {
        console.log("Done")
        bm.report()
        process.exit()
    })
