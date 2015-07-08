var through = require('through2')
var natural = require('natural')

function Benchmark() {
    this.stemmers = []
    this.linesProcessed = 0
}
module.exports = Benchmark

Benchmark.prototype.addStemmer = function(name, func) {
    this.stemmers.push({
        name: name,
        func: func,
        time: 0,
        distance: 0
    })
}

Benchmark.prototype.getTarget = function() {
    return through({ decodeStrings: false, objectMode: true, allowHalfOpen: false }, function(line, enc, cb) {
        if (!line) return cb()

        var i = 0
        var baseStr  // for distance
        var next = function() {
            if (i >= this.stemmers.length) {
                // all stemmers done
                this.linesProcessed++
                return cb()
            }

            var stemmer = this.stemmers[i]
            var t1 = Date.now()
            stemmer.func(line, function(err, tokens) {
                var t2 = Date.now()
                if (err) return cb(err)

                stemmer.time += t2 - t1

                var str = tokens.join(" ")
                if (!baseStr) baseStr = str
                var distance = natural.LevenshteinDistance(baseStr, str)
                stemmer.distance += distance / line.length

                i++
                next()
            })
        }.bind(this)
        next()
    }.bind(this), function(cb) {
        cb()
        this.emit('end')
    })
}

Benchmark.prototype.report = function() {
    console.log(this.linesProcessed + " lines processed:")

    var labelize = function (fun) {
        return this.stemmers.map(function(stemmer) {
            return stemmer.name + "=" + fun(stemmer)
        }).join("\t")
    }.bind(this)

    var baseTime = this.stemmers[0].time
    console.log("Times: " + labelize(function(stemmer) {
        return (Math.floor(10000 * stemmer.time / baseTime) / 100) + "%"
    }))

    console.log("Avg distances: " + labelize(function(stemmer) {
        return Math.round(1000 * stemmer.distance / this.linesProcessed) / 1000
    }.bind(this)))
}