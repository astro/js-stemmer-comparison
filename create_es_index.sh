#!/bin/sh

curl -XDELETE 'http://localhost:9200/stemmer-comparison/'
curl -XPUT 'http://localhost:9200/stemmer-comparison/' -d '{
  "settings" : {
    "index" : {
      "number_of_shards" : 1,
      "number_of_replicas" : 1
    },
    "analysis": {
      "filter": {
        "english_stop": {
          "type": "stop",
          "stopwords": "_english_"
        },
        "english_stemmer": {
          "type": "stemmer",
          "language": "english"
        },
        "english_possessive_stemmer": {
          "type": "stemmer",
          "language": "possessive_english"
        }
      },
      "analyzer": {
        "html_english_analyzer": {
          "filter": [
          "english_possessive_stemmer",
          "lowercase",
          "asciifolding",
          "english_stop",
          "english_stemmer"
          ],
          "tokenizer": "standard"
        }
      }
    }
  }
}'

