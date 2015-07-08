# node.js stemmer comparison

Compare performance and results of various english stemmers:
* [ElasticSearch](http://elasticsearch.org) (for reference)
* [natural](http://npmjs.com/package/natural)
* [lancaster-stemmer](http://npmjs.com/package/lancaster-stemmer)
* [snowball](http://npmjs.com/package/snowball)
* [stemmer](http://npmjs.com/package/stemmer)
* [stm](http://npmjs.com/package/stm)
* [nlp-toolkit](http://npmjs.com/package/nlp-toolkit)

**TODO:** make stopword expectations uniform.


## Instructions

Install various stemming dependencies:

```shell
npm i
```

Create ElasticSearch index with analysis configuration:

```shell
./create_es_index.sh
```

If you don't want to run ElasticSearch remove it from `index.js`.

Pipe your text data source into the script line by line:

```shell
.../my_data_source | node index.js
```

When piping usage of [pv](http://www.ivarch.com/programs/pv.shtml) is recommended.


## Sample output

From uniform english news text:

```
176878 lines processed:
Times: ES=100% natural.Porter=36.86% natural.Lancaster=16.31% lancaster=6.14% snowball=7.54% porter=6.43% stm=54.09% nlp.porter=44.89%
Avg distances: ES=0 natural.Porter=0.11 natural.Lancaster=0.177 lancaster=0.242 snowball=0.227 porter=0.188 stm=0.178 nlp.porter=0.194
```

From random Web content:

```
33829 lines processed:
Times: ES=100% natural.Porter=38.58% natural.Lancaster=17.94% lancaster=5.51% snowball=7.12% porter=6.23% stm=53.95% nlp.porter=44.51%
Avg distances: ES=0 natural.Porter=0.078 natural.Lancaster=0.132 lancaster=0.162 snowball=0.225 porter=0.109 stm=0.12 nlp.porter=0.217
```

The first stemmer (ES) is used as the reference. Times are
accumulated run time relative to the reference. Avg distances are
Levenshtein distance of the tokens per input char.
