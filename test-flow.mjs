import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const nodes=new Map(), sent=[], saved=new Map();
class Element {
 constructor(){this.style={};this.value='';this.checked=false;this.disabled=false;this.textContent='';this.innerHTML='';this.children=[];this.attrs={};this.events={};const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
 setAttribute(k,v){this.attrs[k]=String(v)} removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,fn){this.events[k]=fn} focus(){this.focused=true}
 appendChild(el){this.children.push(el);el.parentNode=this} remove(){}
 querySelectorAll(){return this.children}
 submit(){sent.push(this.children.map(x=>[x.name,x.value]))}
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
run("sit.k_now='매일 한다';backToEstimate();finish()");assert.match(nodes.get('sit').innerHTML,/aria-pressed="true"/,'revisit must show retained choices');
const first=new Element(), second=new Element(), parent=new Element();parent.appendChild(first);parent.appendChild(second);context.first=first;context.second=second;
run("pickSit(first,'k_now','매일 한다');pickSit(second,'k_now','주 2~3회')");assert.equal(run('sit.k_now'),'주 2~3회');assert.equal(first.classList.contains('sel'),false);
run("$('mail').value='bad';submitMail()");assert.equal(sent.length,0);assert.ok(nodes.get('mailerror').textContent);
run("$('mail').value='test@example.com';submitMail()");assert.equal(sent.length,0);assert.ok(nodes.get('consenterror').textContent);
run("$('consent').checked=true;submitMail();submitMail()");assert.equal(sent.length,1,'double submission guarded; only mocked transmission');assert.ok(nodes.get('s-done').classList.contains('on'));
run('start()');assert.equal(run('R'),null);assert.deepEqual(state('ans'),[]);assert.deepEqual(state('sit'),{});assert.equal(nodes.get('consent').checked,false);assert.equal(nodes.get('mail').value,'');assert.equal(nodes.get('submitbtn').disabled,false);assert.equal(run('estimateSelected'),false);assert.equal(saved.has('matbak_now'),false);
run('submitMail()');assert.equal(sent.length,1,'cannot submit without a completed result');
for(const value of [1,3,5]){run(`ans=Q.map(q=>q.r?6-${value}:${value});finish(true)`);assert.equal(run('R.tot'),(value-1)*25);assert.equal(run('R.lows.length'),4);assert.match(nodes.get('r-type').textContent,/같은/)}
run('ans=Q.map(q=>q.r?5:1);ans[6]=3;finish(true)');assert.equal(run('R.lows.length'),3);assert.match(nodes.get('r-type').textContent,/공동/);
run("$('mail').value='test@example.com';$('consent').checked=true;submitMail()");
const payload=Object.fromEntries(sent.at(-1));assert.equal(payload['fields[inside]'],'');assert.equal(payload['fields[gap]'],'');assert.ok(Object.hasOwn(payload,'fields[type]'));
assert.match(html,/임상/);assert.match(html,/검증된/);assert.match(html,/확인할 수 없/);assert.doesNotMatch(html,/실측/);
console.log('flow checks passed: navigation, optional estimate, reset, ties/extremes, email guards, mocked submission');
// Exercise the actual registered slider handler and failure/retry route.
run('returnToResult();backToEstimate()');nodes.get('est').value='0';nodes.get('est').events.input();run('finish()');assert.equal(run('R.est'),0);assert.equal(run('R.gap'),run('R.tot'));
nodes.get('est').value='100';nodes.get('est').events.input();run('finish()');assert.equal(run('R.est'),100);assert.equal(run('R.gap'),100-run('R.tot'));
const originalSubmit=Element.prototype.submit;Element.prototype.submit=function(){throw new Error('mock blocked submission')};
run("$('mail').value='test@example.com';$('consent').checked=true;submitMail()");assert.match(nodes.get('mailerror').textContent,/보내지 못/);assert.equal(nodes.get('submitbtn').disabled,false);assert.ok(nodes.get('s-result').classList.contains('on'));
Element.prototype.submit=originalSubmit;
run("pickSit(second,'k_now','주 2~3회');pickSit(second,'k_now','주 2~3회')");assert.equal(run('sit.k_now'),undefined,'selected optional situation can be cleared');
for(const invalid of [0,6,NaN]){context.invalid=invalid;run('start();pick(invalid)');assert.equal(run('ans.length'),0)}
console.log('additional checks passed: slider endpoints, local failure/retry, deselection, invalid answer guards');
