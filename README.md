<img src="logo.png" style="width:80px; max-width:80px" width="80"/>
![Build Status](https://travis-ci.org/coderofsalvation/restglue.svg?branch=master)
RESTGLUE: multi-api restful client using superagent & promises 

## Usage 

    <script type="text/javascript" src="https://cdn.jsdelivr.net/es6-promise/3.1.2/es6-promise.min.js"></script> <!-- older browsers -->
    <script type="text/javascript" src="dist/restglue.min.js"></script>

> or in nodejs just do `npm install restglue superagent` and then:

    var restglue = require('restglue')

## Example: single api 

    var myapi = new restglue()
    myapi.headers['Content-Type'] = 'application/json'
    myapi.addEndpoint("pizza")

Not really exciting yet, but now you can do calls like so:

    myapi.pizza.getAll()
    .then( function(json){  // json-result of GET /pizza
                            // call json.getResponse() for raw response (headers etc)
    })
    .catch( function(err){
      console.log("could not get pizza")
    })

> NOTE: use `new restglue("http://api.foo.com/v1")` to automatically prepend an external apiurl to all endpoints,  and make 
sure you got CORS setup on your server when doing requests from the browser.

## Restful endpoint function reference

    getAll(query, headers)                - will do GET     /pizza
    post(payload, query, headers)         - will do POST    /pizza      {..}
    get(id, query, headers)               - will do GET     /pizza/{id}
    put(id, payload, query, headers)      - will do PUT     /pizza/{id} {..}
    delete(id, payload, query, headers)   - will do DELETE  /pizza/{id} {..}
    patch(id, payload, query, headers)    - will do PATCH   /pizza/{id} {..}
    options(id, payload, querym headers)  - will do OPTIONS /pizza/{id} {..}

> NOTE: `query` and `headers` are optional and are used only for that request.

## Custom endpoints + monkeypatch

    myapi.pizza.customPost = restglue.prototype.request.bind( this, "post",  '/foo/bar',  {payload:true}, {queryfoo:1, querybar:2}, {X-HEADER-FOO:12} )
    myapi.pizza.customGet  = restglue.prototype.request.bind( this, "get",  '/foo/bar' )

Also, you can monkeypatch these function to alter restglue's behaviour:

    restglue.prototype.addEndpointg( resourcename  )
    restglue.prototype.afterRequestg(cb)
    restglue.prototype.beforeRequestg(cb)
    restglue.prototype.composeg(chain)
    restglue.prototype.constructorg(apiurl)
    restglue.prototype.getSandboxedUrlg(method,url)
    restglue.prototype.requestg(method, url, payload, query, headers)
    restglue.prototype.sandboxUrlg(url,destination)
    restglue.prototype.toQueryStringg(data)

## Offline sandbox 

You can fake responses (for offline development etc) in 2 ways, like so:

    myapi.addEndpoint("foobar")
    myapi.addEndpoint("foo")

    myapi.sandboxUrl('/foobar',       {'data':{"foo":true}}  ) 
    myapi.sandboxUrl('/myapi',        {'path':"/js/sandbox"} )
    myapi.sandboxUrl( /some.*regex/,  "/js/foo" )

    myapi.foobar.getAll().then(function(data){    
      // data = {"foo":true}
    })

    myapi.foo.getAll().then(function(data){    
      // data = /js/sandbox/foo/get.json instead of GET {apiurl}/myapi/foo 
    })

> NOTE: {apiurl} is passed using `new restglue({apiurl:"http://foo.com/v1"})`    


## Chained endpoints, multiple api's

> Byebye async spaghetti, welcome clean code.

Combine multiple endpoints into one call:

    myapi.pizza.getCookPageRanking = myapi.compose([
      function(i)  { return myapi.pizza.getAll({"sort":"-date_create"})    },
      function(res){ return otherapi.getRanking(res.cook.profile_url)      },
      function(res){ return res.score                                      }
    ])("foo")

    myapi.pizza.getCookPageRanking().then( function(res){
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

## Example: response headers

    myapi.pizza.getAll()
    .then( function(res){
      var headers = res.getResponse().headers
    })

> NOTE: Make sure you have CORS configured properly on your server, otherwise certain headers won't be accessible in javascript.

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
