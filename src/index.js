var nodejs = (typeof module !== 'undefined' && typeof module.exports !== 'undefined')

var mapAsync = function(arr, done, cb) {
  var f, funcs, i, k, v; funcs = []; i = 0;
  for (k in arr) {
    v = arr[k];
    f = function(i, v) {
      return function() {
        var e, error;
        try {
          return cb(v, i, funcs[i+1] || done);
        } catch (error) {
          e = error;
          return done(new Error(e));
        }
      };
    };
    funcs.push(f(i++, v));
  }
  return funcs[0]();
};

var restglue = function(apiurl){
  this.url = apiurl || ""
  this.sandbox = {}
  this.headers = {}
  this.requestPre  = []
  this.requestPost = []
}

restglue.prototype.beforeRequest = function (cb) {
  this.requestPre.push(cb)
}

restglue.prototype.afterRequest = function (cb) {
  this.requestPost.push(cb)
}
restglue.prototype.request = function(method, url, payload, query, headers) {
  var me = this
  var config = {method:method, url:url, query:query, payload:payload, headers:headers, api:this }
  if( query && typeof query == "string" ) config.url+= ( config.queryString = query )
  if( query && typeof query != "string" ) config.url+= ( config.queryString = "?"+me.toQueryString(query) )
  for( var i in this.requestPre ) this.requestPre[i](config)
  var sandbox = this.getSandboxedUrl(config.method,config.url)
  if( sandbox && typeof sandbox != "string" ) return sandbox // return sandboxed promise
  url = sandbox ? sandbox : config.url                       // set sandboxed url
  var req = superagent[method]( url )
  for( i in this.headers ) req.set( i,  this.headers[i] )
  for( i in headers ) req.set( i,  headers[i] )
  if( method != "get" ) req.send(payload)
  return new Promise(function(resolve, reject){
    req.end( function(err, res){
      for( i in me.requestPost ) me.requestPost[i](config, res, err)
      if( !err ){
				if( !nodejs && document.location.hash == '#debug' ) console.dir(res)
				if( !res.body ) res.body = {}
				if( typeof res.body == "string" || typeof res.body == "boolean" || typeof res.body == "integer" ) res.body = {message:res.body}
				res.body.getResponse = function(){ return res }
        resolve(res.body)
      } else{
        if( !nodejs ){
          console.error(err)
          console.error(JSON.stringify({url:url, payload:payload, query:query, headers:headers}))
        }
        reject(err, res)
      } 
    })
  // older android browser (2.3.6) doesn't like this..why?
  //}).catch(function(err){
  //  throw err
  })
}

restglue.prototype.toQueryString = function(data){
  var args = []
  for( var i in data ) args.push( i +"="+ encodeURI(data[i]) )
  return args.join("&")
}

restglue.prototype.addEndpoint = function ( resourcename ){
  var endpoint = function(resourcename,api){
    this.resourcename = resourcename
    this.api = api
  }
  endpoint.prototype.getAll = function( query, headers){
    return this.get( false, query, headers )
  }
  endpoint.prototype.get = function(id, query, headers){
    var url = this.api.url + "/"+resourcename
    if( id ) url+= "/"+id
    return this.api.request( "get", url, false, query, headers)
  }
  endpoint.prototype.post = function(payload, query, headers){
    var url = this.api.url + "/"+resourcename
    return this.api.request( "post", url, payload, query, headers)
  }
  var methods = ['put', 'options', 'patch', 'delete']
  methods.map( function(method){
    endpoint.prototype[method] = function(id, payload, query, headers){
      var url = this.api.url + "/"+resourcename + "/" + id
      return this.api.request( method, url, payload, query, headers)
    }
  })
  this[resourcename] = new endpoint(resourcename, this)
}

restglue.prototype.sandboxUrl = function(url,destination){ // configure sandboxdata for url(pattern)
  this.sandbox[url] = destination
}

restglue.prototype.getSandboxedUrl = function(method,url){
  var config = {method:method, url:url, payload:{}, headers: this.headers, api:this }
  for ( var regex in this.sandbox ) {
    var item = this.sandbox[regex]
    var method = method.toUpperCase()

    if( url.match( new RegExp(regex, "g") ) != null ){
      if( item.path ){
        var slug = ''
        slug = url.replace( this.url, "")
        //slug = '/' + slug.join('/')
        slug = slug.replace(/\/?\?.*/,'')                   // remove query
        slug = slug.replace(/\/[0-9]+/, '')   // remove id-parmeters
        var url_sandboxed = item.path + slug + "/" + method.toLowerCase() + ".json"
        console.log("sandboxed url: "+method+" "+url+" => "+url_sandboxed)
        return url_sandboxed
      }
      if( item.data ){
        console.log("sandboxed url: "+method+" "+url+" => {}")
        var res = {body:item.data}
        for( var i in this.requestPost ) this.requestPost[i](config, res)
        return new Promise(function(resolve, reject){ resolve(res.body) })
      }
    }
  }
  return false
}

restglue.prototype.compose = function(chain){
  return function(){
    return new Promise( function(resolve, reject){
      var _res
      var done = function(){ resolve(_res) }
      mapAsync( chain, done, function(func, i,  next){
        var promise = func(_res)
        var output = promise 
        if( !promise.then ) promise = new Promise( function(resolve,reject){
          resolve(output)
        })
        promise.then( function(res){
          _res = res; 
          next() 
        })
      })
    })    
  }        
}

if ( nodejs ){
  var superagent = require('superagent')
  module.exports = restglue;
} else{
  window.restglue = restglue
}
