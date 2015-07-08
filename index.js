var Elasticsearch = require('elasticsearch')
var natural = require('natural')
var split = require('split')
var Benchmark = require('./benchmark')
var lancasterStemmer = require('lancaster-stemmer')
var snowballStemmer = new (require('snowball'))('English')

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

function lancaster(text, cb) {
    var err, result
    try {
        result = simpleTokenize(text).map(function(token) {
            return lancasterStemmer(token)
        })
    } catch (e) {
        err = e
    }
    cb(err, result)
}

function snowball(text, cb) {
    var err, result
    try {
        result = simpleTokenize(text).map(function(token) {
            snowballStemmer.setCurrent(token);
            snowballStemmer.stem();
            return snowballStemmer.getCurrent();
        })
    } catch (e) {
        err = e
    }
    cb(err, result)
}

function simpleTokenize(text) {
    return text.split(/\W+/)
}

var bm = new Benchmark()
bm.addStemmer('ES', esGetTokens)
bm.addStemmer('natural.Porter', naturalStemmer(natural.PorterStemmer))
bm.addStemmer('natural.Lancaster', naturalStemmer(natural.LancasterStemmer))
bm.addStemmer('lancaster', lancaster)
bm.addStemmer('snowball', snowball)

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
