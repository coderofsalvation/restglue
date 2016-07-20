multi-api restful client (javascript) with glue, using superagent & promises (lightweight, no buildchain needed) 

![Build Status](https://travis-ci.org/coderofsalvation/restglue.svg?branch=master)

## Usage 

    <script type="text/javascript" src="https://cdn.jsdelivr.net/es6-promise/3.1.2/es6-promise.min.js"></script> <!-- older browsers -->
    <script type="text/javascript" src="dist/restglue.min.js"></script>

> or in nodejs just do `npm install restglue` and then:

    var restglue = require('restglue')

## Example: single api 

    var myapi = new restglue()
    myapi.headers['Content-Type'] = 'application/json'
    myapi.addEndpoint("pizza")

Not really exciting yet, but now you can do calls like so:

    myapi.pizza.getAll()
    .then( function(res){  // json-result of GET /pizza

    })
    .catch( function(err){
      console.log("could not get pizza")
    })

> NOTE: use `new restglue("http://api.foo.com/v1")` to automatically prepend an external apiurl to all endpoints,  and make 
sure you got CORS setup on your server when doing requests from the browser.

## Endpoint function reference

    getAll(query, headers)                - will do GET     /pizza
    get(id, query, headers)               - will do GET     /pizza/{id}
    post(id, payload, query, headers)     - will do POST    /pizza/{id} {..}
    put(id, payload, query, headers)      - will do PUT     /pizza/{id} {..}
    patch(id, payload, query, headers)    - will do PATCH   /pizza/{id} {..}
    options(id, payload, querym headers)  - will do OPTIONS /pizza/{id} {..}

> NOTE: `query` and `headers` are optional and are used only for that request.

## Chained endpoints, multiple api's

> Byebye async spaghetti, welcome clean code.

Combine multiple endpoints into one call:

    myapi.pizza.getCookPageRanking = myapi.compose([
      function()   { return myapi.pizza.getAll({"sort":"-date_create"})    },
      function(res){ return ga.getRanking(res.cook.profile_url)            },
      function(res){ return res.score                                      }
    ])

    myapi.pizza.getCookNameLastPizza().then( function(res){
      // res is '4'
    }).catch( function(err){ ..  })

## Example: query args 

    myapi.pizza.getAll( {"sort":"-date_create"} )
    .then( function(res){
      // result of GET /pizza?sort=-date_create
    }
    var password = "bar"
    myapi.headers['Authorization'] = 'Basic '+btoa( login+":"+password )

    // do calls

## Example: hooks

`beforeRequest` and `afterRequest` allow you to massage the request or response

    myapi.beforeRequest( function(config){
      // format the input for an exotic api, before doing the actual request
      config.payload = { type: "payload", payload:config.payload } 
    })

Here's how to simply prevent unnecessary calls

    var cache = {get:{}}

    myapi.beforeRequest( function(config){
      if( config.method == "get" && cache.get[config.url] ) return cache.get[config.url]
    })

    myapi.afterRequest( function(config, res, err){
      if( config.method == "get" && !err ) cache.get[ config.url ] = res
    })

> NOTE: optionally you can store a `new Date().getTime()` timestamp, and bypass the cache when expired 

## Example: Multi-api and mult-versioned wrappers 

This easifies iterative, backwardscompatible development:

    function getApi(){
      var v1       = new restglue("http://api.foo.com/v1"),
      var v2       = new restglue("http://api.foo.com/v2"),
      var api      = {
        ga: new restglue("https://www.googleapis.com/analytics/v3") 
      }

      // *TODO* call addEndpoint(...) on v1,v2 and googleanalytics

      // ok, we're assuming the v1 and v2 endpoints are setup 
      // so now we set v1 endpoints as default 
      for( i in v1 ) api[i] = v1[i]

      // but upgrade the pizza endpoint to v2 
      api.pizza = v2.pizza 
    
      return api 
    }

    var myapi = getApi()

## Example: HTTP auth 

    var login          = "foo"
    var password       = "bar"

    myapi.addEndpoint("user/current")
    myapi.headers['Authorization'] = 'Basic '+btoa( login+":"+password 

    myapi.pizza.getAll()
    .then( function(res){

      // authenticated response

    })
    .catch( function(err){
      console.log(err)
    })

## Example: HTTP auth + bearer token

    var login          = "foo"
    var password       = "bar"

    myapi.addEndpoint("user/current")

    myapi['user/current'].getAll(false, { 'Authorization': 'Basic '+btoa( login+":"+password ) })
    .then( function(res){

      if( ! res.bearer_hash ) throw new Exception("AUTH_FAILED")
      myapi.headers['Authentication'] = "bearer "+res.bearer_hash 

    })
    .catch( function(err){
      console.log(err)
    })

## Why superagent and not fetch?

Eventhough I prefer fetch, this module relies on superagent and not on fetch because:

* I had some weird experiences with fetch-polyfill vs native fetch (I guess it needs a bit of time)
* XHR request seems a more robust choice before fetch really takes over
* superagent seems battletested and has a __lot__ of extensions and plugins

Also i noticed projects like [restful.js](https://github.com/marmelab/restful.js/tree/master), [frisbee](https://www.npmjs.com/package/frisbee), [superagent-defaults](https://www.npmjs.com/package/superagent-defaults), [superagent-jsonapify](https://www.npmjs.com/package/superagent-jsonapify),[superagent-ls](https://www.npmjs.com/package/superagent-ls),[superapi](https://www.npmjs.com/package/superagent-ls), [superagent-pool](https://github.com/lapwinglabs/superagent-pool), [super-res](https://www.npmjs.com/package/super-res)

but I needed a little bit more and less, in short I need:

* a drop-in solution (not all js devs have  ES6/ES7 transpilertoolchain-experience)
* easy chaining of endpoints, from multiple api's (hence async helpers included)
* promises
* requestpool cache but with TTL (hence the hooks, so the beforeRequest-hook can return a cached response)
* compose a superapi (swap around endpoint versions)
