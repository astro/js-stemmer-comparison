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
        line = ("" + line).replace(/^\s+/, "").replace(/\s+$/, "")
        if (!line) return cb()

        var i = 0
        var baseStr  // for distance
        var next = function() {
            if (i >= this.stemmers.length) {
                // all stemmers done
                this.linesProcessed++
                return setImmediate(cb)
            }

            var stemmer = this.stemmers[i]
            var t1 = Date.now()
            stemmer.func(line, function(err, tokens) {
                var t2 = Date.now()
                if (err) {
                    console.error(err.stack)
                    tokens = []
                }

                stemmer.time += t2 - t1

                var str = tokens.join(" ")
                if (!baseStr) baseStr = str
                var distance = natural.LevenshteinDistance(baseStr, str) / line.length
                stemmer.distance += distance
                if (!stemmer.worst || stemmer.worst.distance < distance) {
                    stemmer.worst = {
                        distance: distance,
                        line: line,
                        baseStr: baseStr,
                        str: str
                    }
                }

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
        }).join(" ")
    }.bind(this)

    var baseTime = this.stemmers[0].time
    console.log("Times: " + labelize(function(stemmer) {
        return (Math.floor(10000 * stemmer.time / baseTime) / 100) + "%"
    }))

    console.log("Avg distances: " + labelize(function(stemmer) {
        return Math.round(1000 * stemmer.distance / this.linesProcessed) / 1000
    }.bind(this)))
}

Benchmark.prototype.reportFull = function() {
    this.report()

    this.stemmers.forEach(function(stemmer) {
        var worst = stemmer.worst
        if (worst && worst.distance > 0) {
            console.log("*** Worst for " + stemmer.name + " with distance=" + worst.distance + " ***")
            console.log("   Input: " + worst.line)
            console.log("    Base: " + worst.baseStr)
            console.log("  Result: " + worst.str)
            console.log()
        }
    })
}
