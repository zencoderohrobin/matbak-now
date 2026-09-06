import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const script=fs.readFileSync('result.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({window:{addEventListener(){}}});vm.runInContext(script,ctx);
function resolve(t,r){ctx.requested=t;ctx.stored=r;return JSON.parse(vm.runInContext('JSON.stringify(resolveResult(requested,stored))',ctx));}
const r={ax:{rel:67,self:75,sense:58,focus:83},tot:71,est:50,gap:0,type:'sense'};
assert.equal(resolve('sense',r).data.tot,71);
assert.equal(resolve('rel',r).data,null);
assert.equal(resolve('',r).topics[0],'sense');
assert.equal(resolve('',null).topics.length,0);
assert.equal(resolve('unknown',r).data,null);
assert.equal(resolve('sense',{...r,est:null}).data.est,null);
assert.equal(resolve('sense',{...r,tot:'71'}).data,null);
assert.equal(resolve('sense',{...r,ax:{...r.ax,sense:101}}).data,null);
const equal={ax:{rel:100,self:100,sense:100,focus:100},tot:100,est:50,type:'rel'};
assert.equal(resolve('',equal).topics.length,4);
console.log('result matching, missing data, ties, optional estimate: passed');
