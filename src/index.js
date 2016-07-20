var api = module.exports = function(apiurl){
  this.url = apiurl || ""
  this.sandbox = {}
  this.headers = {}
  this.requestPre  = []
  this.requestPost = []
}

api.prototype.beforeRequest = function (cb) {
  this.requestPre.push(cb)
}

api.prototype.afterRequest = function (cb) {
  this.requestPost.push(cb)
}

api.prototype.request = function(method, url, payload, query, headers) {
  var me = this
  var config = {method:method, url:url, query:query, payload:payload, headers:headers, api:this }
  if( query && typeof query == "string" ) url+= ( config.queryString = query )
  if( query && typeof query != "string" ) url+= ( config.queryString = "?"+me.toQueryString(query) )
  for( var i in this.requestPre ) this.requestPre[i](config)
  var sandbox = this.getSandboxedUrl(method,url)
  if( sandbox && typeof sandbox != "string" ) return sandbox // return sandboxed promise
  url = sandbox ? sandbox : url                              // set sandboxed url
  var req = superagent[method]( url )
  for( i in this.headers ) req.set( i,  this.headers[i] )
  for( i in headers ) req.set( i,  headers[i] )
  if( method != "get" ) req.send(payload)
  return new Promise(function(resolve, reject){
    req.end( function(err, res){
      spadmin.bus.publish(method+"."+url.replace(/\?.*/g,"").replace(/\/[0-9]+$/,"/:id"), arguments )
      for( i in me.requestPost ) me.requestPost[i](config, res, err)
      if( !err ) resolve(res.body)
      else reject(err, res)
    })
  }).catch(function(err){
    throw err
  })
}

api.prototype.toQueryString = function(data){
  var args = []
  for( var i in data ) args.push( i +"="+ encodeURI(data[i]) )
  return args.join("&")
}

api.prototype.addEndpoint = function ( resourcename ){
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
  var methods = ['post', 'put', 'options', 'patch']
  methods.map( function(method){
    endpoint.prototype[method] = function(id, payload, query, headers){
      var url = this.api.url + "/"+resourcename + "/" + id
      return this.api.request( method, url, payload, query, headers)
    }
  })
  this[resourcename] = new endpoint(resourcename, this)
}

api.prototype.sandboxUrl = function(url,destination){ // configure sandboxdata for url(pattern)
  this.sandbox[url] = destination
}

api.prototype.getSandboxedUrl = function(method,url){
  var config = {method:method, url:url, payload:{}, headers: this.headers, api:this }
  for ( var regex in this.sandbox ) {
    var item = this.sandbox[regex]
    var method = method.toUpperCase()
    if( url.match( new RegExp(regex, "g") ) != null ){
      if( item.path ){
        var url_sandboxed = url.replace(/\/?\?.*/,'').replace( this.url, item.path ) + "/" + method.toLowerCase() + ".json"
        console.log("sandboxed url: "+method+" "+url+" => "+url_sandboxed)
        return url_sandboxed
      }
      if( item.data ){
        console.log("sandboxed url: "+method+" "+url+" => {}")
        var res = {body:item.data}
        for( i in this.requestPost ) this.requestPost[i](config, res)
        return new Promise(function(resolve, reject){ resolve(res.body) })
      }
    }
  }
  return false
}

api.prototype.compose = function(chain){
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

mapAsync = function(arr, done, cb) {
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
//mapAsync = function(arr, done, cb) {
//  var f, funcs, i, k, v; funcs = []; i = 0;
//  for (k in arr) {
//    v = arr[k];
//    f = function(i, v) {
//      return function() {
//        var e, error;
//        try {
//          if (funcs[i + 1] != null) {
//            return cb(v, i, funcs[i + 1]);
//          } else {
//            return cb(v, i, done )
//          }
//        } catch (error) {
//          e = error;
//          return done(new Error(e));
//        }
//      };
//    };
//    funcs.push(f(i++, v));
//  }
//  return funcs[0]();
//}