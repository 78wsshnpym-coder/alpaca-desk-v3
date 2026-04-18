const express = require("express");
const https   = require("https");

const app = express();
app.use(express.json());

function req(host, path, method, headers, body){
  return new Promise(function(resolve, reject){
    var opts = { hostname: host, path: path, method: method||"GET", headers: Object.assign({"Content-Type":"application/json"}, headers) };
    var r = https.request(opts, function(res){
      var d="";
      res.on("data", function(c){ d+=c; });
      res.on("end",  function(){
        try{ resolve({status:res.statusCode, body:JSON.parse(d)}); }
        catch(e){ resolve({status:res.statusCode, body:{raw:d}}); }
      });
    });
    r.on("error", reject);
    if(body) r.write(JSON.stringify(body));
    r.end();
  });
}

app.get("/api/test", async function(rq, rs){
  var key=rq.headers["key_id"], sec=rq.headers["secret_key"];
  if(!key||!sec) return rs.json({ok:false, error:"Geen keys"});
  try{
    var r = await req("paper-api.alpaca.markets","/v2/account","GET",{"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":sec},null);
    if(r.body && r.body.equity) rs.json({ok:true, equity:r.body.equity});
    else rs.json({ok:false, error: r.body.message || "Ongeldige keys"});
  }catch(e){ rs.json({ok:false, error:e.message}); }
});

app.all("/api/alpaca/*", async function(rq, rs){
  var key=rq.headers["key_id"], sec=rq.headers["secret_key"];
  var path = "/v2/" + rq.params[0];
  var qs   = rq.url.indexOf("?")>-1 ? rq.url.slice(rq.url.indexOf("?")) : "";
  var hdrs = {"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":sec};
  try{
    var body = ["POST","PUT","PATCH"].includes(rq.method) ? rq.body : null;
    var r = await req("paper-api.alpaca.markets", path+qs, rq.method, hdrs, body);
    rs.status(r.status).json(r.body);
  }catch(e){ rs.status(500).json({error:e.message}); }
});

app.all("/api/data/*", async function(rq, rs){
  var key=rq.headers["key_id"], sec=rq.headers["secret_key"];
  var path = "/v2/" + rq.params[0];
  var qs   = rq.url.indexOf("?")>-1 ? rq.url.slice(rq.url.indexOf("?")) : "";
  var hdrs = {"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":sec};
  try{
    var r = await req("data.alpaca.markets", path+qs, "GET", hdrs, null);
    rs.status(r.status).json(r.body);
  }catch(e){ rs.status(500).json({error:e.message}); }
});

app.get("/", function(rq, rs){ rs.send("OK - Alpha Desk draait!"); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Alpha Desk op poort " + PORT));
