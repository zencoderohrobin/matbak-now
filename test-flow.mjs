import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const nodes=new Map(), saved=new Map();
class Element {
 constructor(){this.style={};this.value='';this.checked=false;this.disabled=false;this.textContent='';this.innerHTML='';this.children=[];this.attrs={};this.events={};const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
 setAttribute(k,v){this.attrs[k]=String(v)} removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,fn){this.events[k]=fn} focus(){this.focused=true}
 appendChild(el){this.children.push(el);el.parentNode=this} remove(){}
 querySelectorAll(){return this.children}
}
for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],new Element());
nodes.get('est').value='50';
const screens=[...nodes].filter(([k])=>k.startsWith('s-')).map(([,v])=>v);
const context=vm.createContext({console,URLSearchParams,location:{search:''},localStorage:{setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},document:{getElementById:id=>{assert.ok(nodes.has(id),id);return nodes.get(id)},querySelectorAll:()=>screens,createElement:()=>new Element(),body:new Element(),referrer:''},window:{scrollTo(){},addEventListener:(event,fn)=>fn()},setTimeout:fn=>fn()});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const run=s=>vm.runInContext(s,context);
const state=s=>JSON.parse(JSON.stringify(run(s)));
run('start();pick(2)');
assert.equal(run('i'),0,'selecting must not auto-advance');
assert.equal(nodes.get('nextbtn').disabled,false);
run('next()');assert.equal(run('i'),1);
run('next()');assert.equal(run('i'),1,'cannot proceed unanswered');
run('back()');assert.equal(run('ans[0]'),2);
run('pick(4);next();for(let n=1;n<12;n++){pick(3);next()}');
assert.ok(nodes.get('s-est').classList.contains('on'));
run('backFromEstimate()');assert.equal(run('i'),11);
run('next();finish()');assert.equal(run('R'),null,'unconfirmed default is not an estimate');
run('finish(true)');assert.equal(run('R.est'),null);assert.equal(run('R.gap'),null);
assert.equal(nodes.get('r-in').textContent,'선택 안 함');
run('backToEstimate();confirmEstimate();finish()');assert.equal(run('R.est'),50,'50 must be explicitly selectable without moving slider');
assert.equal(run('R.gap'),Math.abs(50-run('R.tot')));
run('backToEstimate();finish()');assert.match(nodes.get('detail-link').href,/^result\.html\?t=(rel|self|sense|focus)$/);
assert.match(html,/https:\/\/page\.stibee\.com\/subscriptions\/519833/);
assert.doesNotMatch(html,/app\.kit\.com\/forms|submitMail\(|id="mail"|name="kitsink"/);
run('start()');assert.equal(run('R'),null);assert.deepEqual(state('ans'),[]);assert.equal(run('estimateSelected'),false);assert.equal(saved.has('matbak_now'),false);
for(const value of [1,3,5]){run(`ans=Q.map(q=>q.r?6-${value}:${value});finish(true)`);assert.equal(run('R.tot'),(value-1)*25);assert.equal(run('R.lows.length'),4);assert.match(nodes.get('r-type').textContent,/같은/)}
run('ans=Q.map(q=>q.r?5:1);ans[6]=3;finish(true)');assert.equal(run('R.lows.length'),3);assert.match(nodes.get('r-type').textContent,/공동/);
assert.match(html,/임상/);assert.match(html,/검증된/);assert.doesNotMatch(html,/실측/);
console.log('flow checks passed: navigation, optional estimate, reset, ties/extremes, detailed result and waitlist links');
// Exercise the actual registered slider handler.
run('backToEstimate()');nodes.get('est').value='0';nodes.get('est').events.input();run('finish()');assert.equal(run('R.est'),0);assert.equal(run('R.gap'),run('R.tot'));
nodes.get('est').value='100';nodes.get('est').events.input();run('finish()');assert.equal(run('R.est'),100);assert.equal(run('R.gap'),100-run('R.tot'));
for(const invalid of [0,6,NaN]){context.invalid=invalid;run('start();pick(invalid)');assert.equal(run('ans.length'),0)}
console.log('additional checks passed: slider endpoints and invalid answer guards');
