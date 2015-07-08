var Elasticsearch = require('elasticsearch')
var natural = require('natural')
var split = require('split')
var Benchmark = require('./benchmark')
var lancasterStemmer = require('lancaster-stemmer')
var snowballStemmer = new (require('snowball'))('English')
var porterStemmer = require('stemmer')
var STM = require('stm')
var NLPToolkit = require('nlp-toolkit')

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
	index: 'stemmer-comparison',
	body: "" + text
    }, function(err, result) {
	if (err) return cb(err)
        
	cb(null, (result.tokens || []).map(function(token) {
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
        result = simpleTokenize(text).map(lancasterStemmer)
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

function porter(text, cb) {
    var err, result
    try {
        result = simpleTokenize(text).map(porterStemmer)
    } catch (e) {
        err = e
    }
    cb(err, result)
}

function stm(text, cb) {
    var err, result
    try {
        result = STM.stem(text)
    } catch (e) {
        err = e
    }
    cb(err, result)
}

function nlpToolkit(tokenizer) {
    return function(text, cb) {
        var err, result
        try {
            result = tokenizer.tokenize(text)
            if (typeof result === 'string') result = [result]
        } catch (e) {
            err = e
        }
        cb(err, result)
    }
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
bm.addStemmer('porter', porter)
bm.addStemmer('stm', stm)
bm.addStemmer('nlp.porter', nlpToolkit(new NLPToolkit.tokenizer({ stopwords: 'english', porter: true })))

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
        bm.reportFull()
        process.exit()
    })
