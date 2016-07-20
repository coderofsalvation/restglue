var apimapper = require('./../')
var apiurl    = "http://api.foo.com/v1"
var errors    = []
var ok    = 0
console._log  = console.log
console.log   = function(str){ console._log("  > "+str)  }

// example: on the fly
var myapi = new apimapper()
myapi.addEndpoint("pizza")
myapi.addEndpoint("cook")
myapi.headers['Content-Type'] = 'application/json'

// sandbox every url
myapi.sandboxUrl( '/pizza', { data: {cook:{id:123}} })
myapi.sandboxUrl( '/cook',  { data: {name:"Mario"} })

// setup global pre & post hooks 
myapi.beforeRequest( function(config){
  console.log("beforeRequest(): patching payload before doing request")
  config.payload = { type: "payload", payload:config.payload }
  ok++
})

myapi.afterRequest( function(config, res, err){
  console.log("afterRequest(): patch response after doing request")
  res.foo = {result:res.foo}
  ok++
})

myapi.pizza.getCookNameLastPizza = myapi.compose([
  function(){    return myapi.pizza.getAll({"sort":"-date_create"}) },
  function(res){ return myapi.cook.get(res.cook.id)                 },
  function(res){ return res.name                                    }
])

// do a chained request
myapi.pizza.getCookNameLastPizza().then( function(res){
  if( res == 'Mario' ) ok++
  else throw new Exception("didn't get mario name")
})
.catch( function(err){
  errors.push(err)
  cleanup()
})

// do simple request
myapi.pizza.getAll({"foo":true})
.then( function(res){
  if( res.foo == "bar" ) ok++
}).then( function(res){
  cleanup()
})
.catch( function(err){
  errors.push("could not get pizza")
})


setTimeout( cleanup, 5000 ) // if tests dont finish within 5sec

function cleanup(){
  console._log("\ntests ok   : "+ok)
  console._log("tests error: "+errors.length)
  if( errors.length || ok != 3 ){
    console.dir(errors)
    process.exit(1)
  }
}
