const express = require(“express”);
const https   = require(“https”);

const app = express();
app.use(express.json());

// ── HTTPS helper (geen node-fetch nodig) ─────────────────────────────────────
function req(host, path, method, headers, body){
return new Promise(function(resolve, reject){
var opts = { hostname: host, path: path, method: method||“GET”, headers: Object.assign({“Content-Type”:“application/json”}, headers) };
var r = https.request(opts, function(res){
var d=””;
res.on(“data”, function(c){ d+=c; });
res.on(“end”,  function(){
try{ resolve({status:res.statusCode, body:JSON.parse(d)}); }
catch(e){ resolve({status:res.statusCode, body:{raw:d}}); }
});
});
r.on(“error”, reject);
if(body) r.write(JSON.stringify(body));
r.end();
});
}

// ── Test verbinding ───────────────────────────────────────────────────────────
app.get(”/api/test”, async function(rq, rs){
var key=rq.headers[“key_id”], sec=rq.headers[“secret_key”];
if(!key||!sec) return rs.json({ok:false, error:“Geen keys”});
try{
var r = await req(“paper-api.alpaca.markets”,”/v2/account”,“GET”,{“APCA-API-KEY-ID”:key,“APCA-API-SECRET-KEY”:sec},null);
if(r.body && r.body.equity) rs.json({ok:true, equity:r.body.equity});
else rs.json({ok:false, error: r.body.message || “Ongeldige keys”});
}catch(e){ rs.json({ok:false, error:e.message}); }
});

// ── Trading API proxy ─────────────────────────────────────────────────────────
app.all(”/api/alpaca/*”, async function(rq, rs){
var key=rq.headers[“key_id”], sec=rq.headers[“secret_key”];
var path = “/v2/” + rq.params[0];
var qs   = rq.url.indexOf(”?”)>-1 ? rq.url.slice(rq.url.indexOf(”?”)) : “”;
var hdrs = {“APCA-API-KEY-ID”:key,“APCA-API-SECRET-KEY”:sec};
try{
var body = [“POST”,“PUT”,“PATCH”].includes(rq.method) ? rq.body : null;
var r = await req(“paper-api.alpaca.markets”, path+qs, rq.method, hdrs, body);
rs.status(r.status).json(r.body);
}catch(e){ rs.status(500).json({error:e.message}); }
});

// ── Data API proxy ────────────────────────────────────────────────────────────
app.all(”/api/data/*”, async function(rq, rs){
var key=rq.headers[“key_id”], sec=rq.headers[“secret_key”];
var path = “/v2/” + rq.params[0];
var qs   = rq.url.indexOf(”?”)>-1 ? rq.url.slice(rq.url.indexOf(”?”)) : “”;
var hdrs = {“APCA-API-KEY-ID”:key,“APCA-API-SECRET-KEY”:sec};
try{
var r = await req(“data.alpaca.markets”, path+qs, “GET”, hdrs, null);
rs.status(r.status).json(r.body);
}catch(e){ rs.status(500).json({error:e.message}); }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get(”/”, function(rq, rs){
rs.send(`<!DOCTYPE html>

<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Alpha Desk</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{--bg:#070b14;--bg2:#0d1424;--brd:rgba(167,139,250,.15);--pu:#a78bfa;--gr:#00e5a0;--re:#ff4d6d;--ye:#fbbf24;--tx:#e2e8f0;--mu:#64748b;--mo:'Courier New',monospace}
body{background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding-bottom:90px}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(167,139,250,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,.04) 1px,transparent 1px);background-size:32px 32px;pointer-events:none;z-index:0}
.hidden{display:none!important}
.green{color:var(--gr)}.red{color:var(--re)}.yellow{color:var(--ye)}.purple{color:var(--pu)}

/* Setup */
#setup{position:fixed;inset:0;background:var(–bg);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px}
.si{font-size:52px;margin-bottom:16px}
.st{font-size:22px;font-weight:900;color:var(–pu);font-family:var(–mo);letter-spacing:3px;margin-bottom:8px}
.ss{font-size:13px;color:var(–mu);text-align:center;line-height:1.7;margin-bottom:28px}
.sinp{width:100%;background:var(–bg2);border:1px solid var(–brd);border-radius:12px;padding:14px 16px;color:var(–tx);font-size:14px;font-family:var(–mo);margin-bottom:12px;outline:none;-webkit-appearance:none}
.sbtn{width:100%;background:var(–pu);border:none;border-radius:12px;padding:16px;color:var(–bg);font-size:16px;font-weight:900;cursor:pointer}
.serr{color:var(–re);font-size:13px;margin-top:12px;text-align:center;line-height:1.5;min-height:18px}

/* Header */
header{position:sticky;top:0;z-index:100;background:rgba(7,11,20,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(–brd);padding:13px 16px 9px}
.ht{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
.logo{display:flex;align-items:center;gap:8px}
.li{font-size:17px;color:var(–pu)}
.lt{font-size:16px;font-weight:900;letter-spacing:3px;font-family:var(–mo)}
.ld{display:inline-block;width:7px;height:7px;background:var(–gr);border-radius:50%;margin-left:6px;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
.rb{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);color:var(–pu);border-radius:20px;padding:5px 13px;font-size:12px;font-weight:600;cursor:pointer}
.ut{font-size:10px;color:var(–mu);font-family:var(–mo)}

/* KPIs */
.ks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:rgba(167,139,250,.06);border-bottom:1px solid var(–brd)}
.kpi{background:var(–bg2);padding:11px 13px}
.kpi:first-child{background:rgba(167,139,250,.05)}
.kl{font-size:9px;color:var(–mu);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.kv{font-size:15px;font-weight:800;font-family:var(–mo);line-height:1}
.ksub{font-size:10px;color:var(–mu);margin-top:2px}

.ebar{background:rgba(255,77,109,.1);border-bottom:1px solid rgba(255,77,109,.3);color:var(–re);padding:9px 16px;font-size:12px}
.con{padding:14px;position:relative;z-index:1}
.sec{font-size:13px;font-weight:700;color:var(–pu);letter-spacing:.5px;margin-bottom:11px}

/* Cards */
.card{background:var(–bg2);border:1px solid var(–brd);border-radius:15px;padding:15px;margin-bottom:11px}
.ch{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:11px}
.tk{font-size:21px;font-weight:900;font-family:var(–mo);letter-spacing:1px}
.sn{font-size:11px;color:var(–mu);margin-top:2px}
.bgs{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.badge{border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700}
.bl{color:var(–gr);background:rgba(0,229,160,.12)}
.bs{color:var(–re);background:rgba(255,77,109,.12)}
.bf{color:var(–gr);background:rgba(0,229,160,.12)}
.bn,.ba,.bp{color:var(–ye);background:rgba(251,191,36,.12)}
.bc,.be{color:var(–mu);background:rgba(100,116,139,.12)}

.pg{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:5px;margin-bottom:11px}
.pb{background:var(–bg);border-radius:8px;padding:6px 5px;text-align:center}
.pbl{font-size:9px;color:var(–mu);text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
.pbv{font-size:12px;font-weight:700;font-family:var(–mo)}
.sug{display:flex;justify-content:space-between;background:rgba(167,139,250,.05);border-radius:8px;padding:8px 11px;margin-bottom:11px;font-size:12px}
.bcl{width:100%;background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.4);color:var(–re);border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer}

/* Form */
.fg{margin-bottom:13px}
.fl{font-size:11px;color:var(–mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block}
.fi{width:100%;background:var(–bg);border:1px solid var(–brd);border-radius:10px;padding:12px 13px;color:var(–tx);font-size:15px;font-family:var(–mo);outline:none;-webkit-appearance:none}
.tgl{display:flex;background:var(–bg);border-radius:10px;overflow:hidden;border:1px solid var(–brd)}
.to{flex:1;background:none;border:none;color:var(–mu);padding:10px 6px;font-size:13px;font-weight:700;cursor:pointer}
.ob{background:rgba(0,229,160,.2);color:var(–gr)}
.os{background:rgba(255,77,109,.2);color:var(–re)}
.ot{background:rgba(167,139,250,.2);color:var(–pu)}
.pbtn{width:100%;border:2px solid;border-radius:13px;padding:15px;font-size:14px;font-weight:900;font-family:var(–mo);letter-spacing:1px;cursor:pointer;margin-top:5px}
.pbb{background:rgba(0,229,160,.15);border-color:var(–gr);color:var(–gr)}
.pbs{background:rgba(255,77,109,.15);border-color:var(–re);color:var(–re)}
.ook{margin-top:11px;padding:11px 14px;border-radius:10px;border:1px solid var(–gr);color:var(–gr);background:rgba(0,229,160,.06);font-size:13px;line-height:1.5}
.oer{margin-top:11px;padding:11px 14px;border-radius:10px;border:1px solid var(–re);color:var(–re);background:rgba(255,77,109,.06);font-size:13px}
.rrow{display:flex;justify-content:space-between;padding:8px 11px;background:var(–bg);border-radius:8px;margin-bottom:5px}
.rl{font-size:13px;color:var(–mu)}
.rv{font-size:13px;font-weight:700;font-family:var(–mo)}

/* Watchlist */
.wc{background:var(–bg2);border:1px solid var(–brd);border-radius:14px;padding:13px;margin-bottom:9px}
.wh{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
.wp{font-size:19px;font-weight:800;font-family:var(–mo)}
.wg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:9px}
.wb{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.wbt{border-radius:8px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid}

/* Orders */
.oc{background:var(–bg2);border:1px solid var(–brd);border-radius:12px;padding:11px 13px;display:grid;grid-template-columns:1fr auto;gap:3px;margin-bottom:7px}
.os2{font-size:15px;font-weight:800;font-family:var(–mo)}
.om{font-size:11px;color:var(–mu);margin-top:2px}
.op{font-size:14px;font-weight:700;font-family:var(–mo);text-align:right}
.oti{font-size:11px;color:var(–mu);text-align:right;margin-top:2px}

.empty{text-align:center;padding:48px 20px;color:var(–mu)}
.ei{font-size:38px;margin-bottom:9px}

/* Nav */
.bnav{position:fixed;bottom:0;left:0;right:0;background:rgba(7,11,20,.97);border-top:1px solid var(–brd);display:flex;padding-bottom:env(safe-area-inset-bottom);z-index:100}
.nb{flex:1;background:none;border:none;color:var(–mu);padding:9px 4px 7px;font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
.nb.active{color:var(–pu)}
.ni{font-size:19px}
.qs{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.2);color:var(–pu);border-radius:8px;padding:6px 13px;font-size:13px;font-weight:700;cursor:pointer;margin:0 5px 7px 0}
</style>

</head>
<body>

<div id="setup">
  <div class="si">◈</div>
  <div class="st">ALPHA DESK</div>
  <div class="ss">Vul je Alpaca Paper Trading<br>API keys in om te verbinden</div>
  <input class="sinp" id="ik" placeholder="API Key ID (begint met PK...)" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
  <input class="sinp" id="is" type="password" placeholder="Secret Key" autocomplete="off" spellcheck="false">
  <button class="sbtn" id="cbtn" onclick="connect()">◈ &nbsp;Verbinden</button>
  <div class="serr" id="serr"></div>
</div>

<div id="app" class="hidden">
  <header>
    <div class="ht">
      <div class="logo"><div class="li">◈</div><div class="lt">ALPHA DESK<span class="ld"></span></div></div>
      <button class="rb" onclick="fetchAll()">↻ Refresh</button>
    </div>
    <div class="ut" id="ut">Verbinden...</div>
  </header>
  <div id="eb" class="ebar hidden"></div>
  <div class="ks">
    <div class="kpi"><div class="kl">Portfolio</div><div class="kv" id="keq">—</div></div>
    <div class="kpi"><div class="kl">Dag P&L</div><div class="kv" id="kpnl">—</div><div class="ksub" id="kpct">—</div></div>
    <div class="kpi"><div class="kl">Posities</div><div class="kv" id="kpos">—</div><div class="ksub" id="kca">—</div></div>
  </div>
  <div id="tp" class="con"></div>
  <div id="to" class="con hidden"></div>
  <div id="tw" class="con hidden"></div>
  <div id="th" class="con hidden"></div>
  <nav class="bnav">
    <button class="nb active" onclick="gt('p')" id="np"><span class="ni">💼</span>Portfolio</button>
    <button class="nb"        onclick="gt('o')" id="no"><span class="ni">📝</span>Order</button>
    <button class="nb"        onclick="gt('w')" id="nw"><span class="ni">👁</span>Watchlist</button>
    <button class="nb"        onclick="gt('h')" id="nh"><span class="ni">📋</span>Historie</button>
  </nav>
</div>

<script>
var K='',S='',acc=null,pos=[],ord=[],qt={},tab='p';
var WL=['NVDA','META','MSFT','AAPL','TSM','NFLX','AMD','AMZN'];
var OS={t:'NVDA',s:'buy',tp:'market',q:1,lp:''};

async function connect(){
  K=document.getElementById('ik').value.trim();
  S=document.getElementById('is').value.trim();
  var err=document.getElementById('serr'), btn=document.getElementById('cbtn');
  err.textContent='';
  if(!K||!S){err.textContent='Vul beide velden in';return;}
  btn.textContent='⏳ Verbinden...'; btn.disabled=true;
  try{
    var r=await fetch('/api/test',{headers:{'key_id':K,'secret_key':S}});
    var d=await r.json();
    if(d.ok){
      document.getElementById('setup').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      fetchAll();
      setInterval(fetchAll,30000);
    }else{
      err.textContent='❌ '+(d.error||'Ongeldige keys');
      btn.textContent='◈  Verbinden'; btn.disabled=false;
    }
  }catch(e){
    err.textContent='❌ Serverfout: '+e.message;
    btn.textContent='◈  Verbinden'; btn.disabled=false;
  }
}

async function af(path,opts){
  opts=opts||{};
  var r=await fetch('/api/alpaca/'+path,{
    method:opts.method||'GET',
    headers:{'key_id':K,'secret_key':S,'Content-Type':'application/json'},
    body:opts.body?JSON.stringify(opts.body):undefined
  });
  return r.json();
}
async function df(path){
  var r=await fetch('/api/data/'+path,{headers:{'key_id':K,'secret_key':S}});
  return r.json();
}

async function fetchAll(){
  try{
    se(null);
    var a=await af('account');
    if(a.code)throw new Error(a.message||'API fout');
    acc=a;
    pos=await af('positions');
    ord=await af('orders?status=all&limit=30');
    pos=Array.isArray(pos)?pos:[]; ord=Array.isArray(ord)?ord:[];
    var sy=Array.from(new Set(WL.concat(pos.map(function(p){return p.symbol})))).join(',');
    try{var q=await df('stocks/quotes/latest?symbols='+sy);qt=q.quotes||{};}catch(e){}
    updKPI(); rdr();
    document.getElementById('ut').textContent='Bijgewerkt: '+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch(e){se(e.message);}
}

function updKPI(){
  if(!acc)return;
  var eq=parseFloat(acc.equity),le=parseFloat(acc.last_equity),pnl=eq-le,pct=(pnl/le)*100,ca=parseFloat(acc.cash);
  sv('keq','$'+eq.toFixed(2));
  sv('kpnl',fu(pnl),pnl>=0?'green':'red');
  sv('kpct',fp(pct),pnl>=0?'green':'red');
  sv('kpos',pos.length+' open');
  sv('kca','cash $'+ca.toFixed(0));
}

function gt(t){
  tab=t;
  [{id:'p',el:'tp'},{id:'o',el:'to'},{id:'w',el:'tw'},{id:'h',el:'th'}].forEach(function(x){
    document.getElementById(x.el).classList.toggle('hidden',x.id!==t);
    document.getElementById('n'+x.id).classList.toggle('active',x.id===t);
  });
  rdr();
}

function rdr(){
  if(tab==='p')rPort();
  else if(tab==='o')rOrd();
  else if(tab==='w')rWatch();
  else if(tab==='h')rHist();
}

function rPort(){
  var el=document.getElementById('tp');
  if(!pos.length){el.innerHTML='<div class="sec">💼 Open Posities</div><div class="empty"><div class="ei">📭</div>Geen open posities<br><small>Ga naar Order om te starten</small></div>';return;}
  var tp=pos.reduce(function(s,p){return s+parseFloat(p.unrealized_pl||0)},0);
  el.innerHTML='<div class="sec">💼 Posities · <span class="'+(tp>=0?'green':'red')+'">'+fu(tp)+'</span></div>'+pos.map(pc).join('');
}

function pc(p){
  var pl=parseFloat(p.unrealized_pl),plp=parseFloat(p.unrealized_plpc)*100,il=p.side==='long';
  var en=parseFloat(p.avg_entry_price),cu=parseFloat(p.current_price),mv=parseFloat(p.market_value);
  var tg=il?en*1.02:en*0.98,st=il?en*0.99:en*1.01;
  return '<div class="card" style="border-color:'+(pl>=0?'rgba(0,229,160,.25)':'rgba(255,77,109,.2)')+'">'+
    '<div class="ch"><div><div class="tk">'+p.symbol+'</div><div class="sn">'+p.qty+' aandelen</div></div>'+
    '<div class="bgs"><span class="badge '+(il?'bl':'bs')+'">'+(il?'▲ LONG':'▼ SHORT')+'</span>'+
    '<span class="'+(pl>=0?'green':'red')+'" style="font-size:17px;font-weight:800;font-family:var(--mo)">'+fu(pl)+'</span></div></div>'+
    '<div class="pg">'+
      '<div class="pb"><div class="pbl">Entry</div><div class="pbv" style="color:#94a3b8">$'+en.toFixed(2)+'</div></div>'+
      '<div class="pb"><div class="pbl">Huidig</div><div class="pbv" style="color:#e2e8f0">$'+cu.toFixed(2)+'</div></div>'+
      '<div class="pb"><div class="pbl">Mkt Wrd</div><div class="pbv purple">$'+mv.toFixed(0)+'</div></div>'+
      '<div class="pb"><div class="pbl">P&L %</div><div class="pbv '+(pl>=0?'green':'red')+'">'+plp.toFixed(2)+'%</div></div>'+
    '</div>'+
    '<div class="sug"><span class="green">🎯 $'+tg.toFixed(2)+'</span><span class="red">🛑 $'+st.toFixed(2)+'</span></div>'+
    '<button class="bcl" onclick="cp(\''+p.symbol+'\')">Positie Sluiten</button></div>';
}

async function cp(sym){
  if(!confirm(sym+' sluiten?'))return;
  await fetch('/api/alpaca/positions/'+sym,{method:'DELETE',headers:{'key_id':K,'secret_key':S}});
  setTimeout(fetchAll,1500);
}

function rOrd(){
  var el=document.getElementById('to');
  var q=qt[OS.t],mid=q?(parseFloat(q.ap)+parseFloat(q.bp))/2:null;
  var il=OS.s==='buy',en=mid||100;
  var tg=il?en*1.02:en*0.98,st=il?en*0.99:en*1.01;
  var rw=Math.abs((tg-en)*OS.q),ri=Math.abs((st-en)*OS.q);
  el.innerHTML=
    '<div class="sec">📝 Order Plaatsen</div><div class="card">'+
    '<div class="fg"><label class="fl">Ticker</label><input class="fi" id="ot" value="'+OS.t+'" oninput="OS.t=this.value.toUpperCase();this.value=OS.t;rOrd()" autocorrect="off" autocapitalize="characters"></div>'+
    '<div class="fg"><label class="fl">Richting</label><div class="tgl">'+
      '<button class="to '+(OS.s==='buy'?'ob':'')+'" onclick="OS.s=\'buy\';rOrd()">▲ LONG</button>'+
      '<button class="to '+(OS.s==='sell'?'os':'')+'" onclick="OS.s=\'sell\';rOrd()">▼ SHORT</button></div></div>'+
    '<div class="fg"><label class="fl">Aantal</label><input class="fi" type="number" min="1" value="'+OS.q+'" oninput="OS.q=parseInt(this.value)||1;rOrd()" inputmode="numeric"></div>'+
    '<div class="fg"><label class="fl">Type</label><div class="tgl">'+
      '<button class="to '+(OS.tp==='market'?'ot':'')+'" onclick="OS.tp=\'market\';rOrd()">Market</button>'+
      '<button class="to '+(OS.tp==='limit'?'ot':'')+'" onclick="OS.tp=\'limit\';rOrd()">Limit</button></div></div>'+
    (OS.tp==='limit'?'<div class="fg"><label class="fl">Limietprijs ($)</label><input class="fi" type="number" step="0.01" value="'+OS.lp+'" oninput="OS.lp=this.value" inputmode="decimal"></div>':'')+
    '<button class="pbtn '+(il?'pbb':'pbs')+'" onclick="po()">'+(il?'▲ LONG':'▼ SHORT')+' '+OS.t+' · '+OS.q+' · '+OS.tp.toUpperCase()+'</button>'+
    '<div id="or"></div></div>'+
    '<div class="sec" style="margin-top:14px">📐 Risico</div><div class="card">'+
    '<div class="rrow"><span class="rl">Koers</span><span class="rv">'+(mid?'$'+mid.toFixed(2):'geen quote')+'</span></div>'+
    '<div class="rrow"><span class="rl">Target +2%</span><span class="rv green">$'+tg.toFixed(2)+'</span></div>'+
    '<div class="rrow"><span class="rl">Stop -1%</span><span class="rv red">$'+st.toFixed(2)+'</span></div>'+
    '<div class="rrow"><span class="rl">Max winst</span><span class="rv green">$'+rw.toFixed(2)+'</span></div>'+
    '<div class="rrow"><span class="rl">Max verlies</span><span class="rv red">$'+ri.toFixed(2)+'</span></div>'+
    '<div class="rrow"><span class="rl">R/R Ratio</span><span class="rv purple">2 : 1</span></div></div>'+
    '<div class="sec" style="margin-top:14px">⚡ Snelle selectie</div>'+
    '<div style="display:flex;flex-wrap:wrap;padding-bottom:10px">'+WL.map(function(s){return '<button class="qs" onclick="OS.t=\''+s+'\';rOrd()">'+s+'</button>'}).join('')+'</div>';
}

async function po(){
  var r=document.getElementById('or');
  if(r)r.innerHTML='<div class="ook">⏳ Verwerken...</div>';
  try{
    var b={symbol:OS.t,qty:String(OS.q),side:OS.s,type:OS.tp,time_in_force:'day'};
    if(OS.tp==='limit')b.limit_price=OS.lp;
    var res=await fetch('/api/alpaca/orders',{method:'POST',headers:{'key_id':K,'secret_key':S,'Content-Type':'application/json'},body:JSON.stringify(b)});
    var d=await res.json();
    if(d.id){
      if(r)r.innerHTML='<div class="ook">✅ Order geplaatst!<br>'+d.symbol+' '+d.side.toUpperCase()+' '+d.qty+' aandelen</div>';
      setTimeout(fetchAll,2000);
    }else throw new Error(d.message||JSON.stringify(d));
  }catch(e){if(r)r.innerHTML='<div class="oer">❌ '+e.message+'</div>';}
}

function rWatch(){
  var el=document.getElementById('tw');
  var hq=Object.keys(qt).length>0;
  el.innerHTML='<div class="sec">👁 Watchlist</div>'+
    (!hq?'<div class="empty"><div class="ei">📡</div>Quotes niet beschikbaar<br><small>Markt opent 15:30 NL · Tik Refresh</small></div>':'')+
    WL.map(function(s){
      var q=qt[s],a=q?parseFloat(q.ap):null,b=q?parseFloat(q.bp):null;
      var m=a&&b?(a+b)/2:null,sp=a&&b?((a-b)/a*100).toFixed(3):null;
      return '<div class="wc">'+
        '<div class="wh"><div class="tk">'+s+'</div><div class="wp">'+(m?'$'+m.toFixed(2):'—')+'</div></div>'+
        (q?'<div class="wg"><div class="pb"><div class="pbl">Bid</div><div class="pbv red">$'+b.toFixed(2)+'</div></div><div class="pb"><div class="pbl">Ask</div><div class="pbv green">$'+a.toFixed(2)+'</div></div><div class="pb"><div class="pbl">Spread</div><div class="pbv yellow">'+sp+'%</div></div></div>':'<div style="color:var(--mu);font-size:12px;text-align:center;margin-bottom:9px">Geen quote</div>')+
        '<div class="wb">'+
          '<button class="wbt" style="color:var(--gr);border-color:var(--gr);background:rgba(0,229,160,.08)" onclick="OS.t=\''+s+'\';OS.s=\'buy\';gt(\'o\')">▲ Long</button>'+
          '<button class="wbt" style="color:var(--re);border-color:var(--re);background:rgba(255,77,109,.08)" onclick="OS.t=\''+s+'\';OS.s=\'sell\';gt(\'o\')">▼ Short</button>'+
        '</div></div>';
    }).join('');
}

function rHist(){
  var el=document.getElementById('th');
  if(!ord.length){el.innerHTML='<div class="sec">📋 Historie</div><div class="empty"><div class="ei">📭</div>Nog geen orders</div>';return;}
  el.innerHTML='<div class="sec">📋 Geschiedenis ('+ord.length+')</div>'+
    ord.map(function(o){
      var il=o.side==='buy';
      var sc='b'+(o.status==='filled'?'f':o.status==='new'||o.status==='accepted'?'n':o.status==='canceled'||o.status==='expired'?'c':'n');
      var pr=o.filled_avg_price?'$'+parseFloat(o.filled_avg_price).toFixed(2):o.limit_price?'lmt $'+parseFloat(o.limit_price).toFixed(2):'market';
      var ti=new Date(o.created_at).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
      return '<div class="oc">'+
        '<div><div class="os2">'+o.symbol+' <span class="badge '+(il?'bl':'bs')+'" style="font-size:10px;vertical-align:middle">'+(il?'▲':'▼')+' '+o.side.toUpperCase()+'</span></div>'+
        '<div class="om">'+o.qty+' stuk · '+o.type+' · <span class="badge '+sc+'">'+o.status+'</span></div></div>'+
        '<div><div class="op">'+pr+'</div><div class="oti">'+ti+'</div></div></div>';
    }).join('');
}

function fu(v){return(v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2);}
function fp(v){return(v>=0?'+':'')+v.toFixed(2)+'%';}
function sv(id,t,c){var e=document.getElementById(id);if(!e)return;e.textContent=t;if(c)e.className='kv '+c;}
function se(m){var e=document.getElementById('eb');if(!e)return;if(m){e.textContent='⚠️ '+m;e.classList.remove('hidden');}else e.classList.add('hidden');}
</script>

</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(“Alpha Desk op poort “ + PORT));
