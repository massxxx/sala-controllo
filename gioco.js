const W=1280,H=800,cv=document.getElementById('gioco'),c=cv.getContext('2d'),$=s=>document.querySelector(s);
const UI="'SC Saira','Arial Narrow',sans-serif",MO="'SC Mono',ui-monospace,monospace";
const COL={met:'#46524c',met2:'#3a453f',lin:'#232c28',eti:'#e4e8df',lcd:'#0c1512',ver:'#7ef0a4',amb:'#ffb648',ros:'#ef4b3a',ott:'#c9a35a',qua:'#ece6d5'};
let sc=1,ox=0,oy=0,dpr=1,vert=false;
let S=null,due=false,inPausa=true,guida=null,giocoAvviato=false,tempoReale=0,buio=0,tocchi=new Map();
let salva={stelle:{},rec:0};try{salva=JSON.parse(localStorage.getItem('sala-controllo-v1'))||salva}catch(e){}
function scrivi(){try{localStorage.setItem('sala-controllo-v1',JSON.stringify(salva))}catch(e){}}
function ridim(){dpr=Math.min(devicePixelRatio||1,2.5);const w=innerWidth,h=innerHeight;cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';sc=Math.min(w/W,h/H);ox=(w-W*sc)/2;oy=(h-H*sc)/2;const n=$('#ruota');if(n)n.hidden=w>=h;}
addEventListener('resize',ridim);
/* ---- widget ---- */
const WID=[
 {id:'freq',p:'r',x:20,y:18,w:262,h:364},{id:'trend',p:'r',x:296,y:22,w:410,h:212},
 {id:'alarm',p:'r',x:718,y:22,w:346,h:296},{id:'feed',p:'r',x:1076,y:22,w:190,h:190},{id:'lines',p:'r',x:1076,y:222,w:190,h:164},
 {id:'pausa',p:'r',t:'btn',x:980,y:332,w:84,h:52,fn:pausa},{id:'audio',p:'r',t:'btn',x:890,y:332,w:84,h:52,fn:()=>{Aud.muto=!Aud.muto;Aud.agg()}},
 {id:'valve',p:'m',t:'lev',k:'valve',x:34,y:60,w:84,h:320,need:null},
 {id:'fuel',p:'m',t:'knob',k:'fuel',cx:196,cy:276,r:62},
 {id:'sens',p:'m',t:'btn',x:292,y:206,w:112,h:58,fn:()=>comando(S,'sensB'),need:null},
 {id:'riarmo',p:'m',t:'btn',x:292,y:292,w:112,h:58,fn:()=>comando(S,'riarmo')},
 {id:'pumps',p:'m',x:424,y:196,w:136,h:172,need:'cond'},
 {id:'pumpA',p:'m',t:'sw',k:'pumpA',x:428,y:224,w:60,h:120,need:'cond'},{id:'pumpB',p:'m',t:'sw',k:'pumpB',x:496,y:224,w:60,h:120,need:'cond'},
 {id:'gate',p:'m',t:'lev',k:'gate',x:592,y:60,w:84,h:320,need:'idro'},
 {id:'tg',p:'m',t:'lev',k:'tg',x:784,y:60,w:84,h:320,need:'tg'},
 {id:'tgstart',p:'m',t:'btn',x:882,y:264,w:92,h:84,fn:()=>comando(S,'tgstart'),need:'tg'},
 {id:'exc',p:'m',t:'knob',k:'ecc',cx:1062,cy:276,r:62,need:'ecc'},
 ...FEEDERS.map((f,i)=>({id:'f'+f.id,p:'r',t:'btn',x:1082,y:50+i*40,w:178,h:36,fn:()=>{comando(S,'feed',f.id);Aud.clic()},need:'carichi',fd:f})),
 {id:'l0',p:'r',t:'btn',x:1082,y:252,w:178,h:60,fn:()=>{comando(S,'line',0);Aud.clic()},need:'linee'},
 {id:'l1',p:'r',t:'btn',x:1082,y:318,w:178,h:60,fn:()=>{comando(S,'line',1);Aud.clic()},need:'linee'},
];
WID.forEach(w=>{if(w.t=='knob'){w.x=w.cx-w.r;w.y=w.cy-w.r;w.w=w.h=w.r*2}});
const wid=id=>WID.find(w=>w.id==id);
function dentro(w,x,y,m=10){return x>=w.x-m&&x<=w.x+w.w+m&&y>=w.y-m&&y<=w.y+w.h+m}
function logica(e){let x=(e.clientX-ox)/sc,y=(e.clientY-oy)/sc,p;if(y<400){p='r';if(due){x=W-x;y=400-y}}else{p='m';y-=400}return{x,y,p}}
const attivo=w=>!w.need||!S||S.on[w.need];
cv.addEventListener('pointerdown',e=>{Aud.via();if(!S||inPausa||guida)return;e.preventDefault();cv.setPointerCapture(e.pointerId);const q=logica(e);
 let best=null;for(const w of WID)if(w.t&&w.p==q.p&&attivo(w)&&dentro(w,q.x,q.y,w.t=='lev'?22:6)){best=w;if(w.t!='lev')break}
 if(!best)return;
 if(best.t=='btn'){best.fn();Aud.clic();best.prem=.15;return}
 if(best.t=='sw'){comando(S,best.k,S[best.k]?0:1);Aud.clac();return}
 tocchi.set(e.pointerId,{w:best,y:q.y,x:q.x,a:Math.atan2(q.y-best.cy,q.x-best.cx),v:S[best.k]});});
cv.addEventListener('pointermove',e=>{const t=tocchi.get(e.pointerId);if(!t||!S)return;e.preventDefault();const q=logica(e);
 if(q.p!=t.w.p){if(due)return}
 const w=t.w;if(w.t=='lev'){S[w.k]=clamp(t.v+(t.y-q.y)/(w.h-70)*100,0,100)}
 else{const a=Math.atan2(q.y-w.cy,q.x-w.cx);let d=a-t.a;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;t.a=a;t.v=clamp(t.v+d/(Math.PI*1.5)*100,0,100);S[w.k]=t.v}});
const fineT=e=>tocchi.delete(e.pointerId);cv.addEventListener('pointerup',fineT);cv.addEventListener('pointercancel',fineT);
/* ---- disegno statico ---- */
function rr(g,x,y,w,h,r=4){g.beginPath();g.roundRect(x,y,w,h,r)}
function testo(g,t,x,y,s=14,col=COL.eti,al='center',f=UI,pes=700){g.font=`${pes} ${s}px ${f}`;g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(t,x,y)}
function vite(g,x,y){const q=g.createRadialGradient(x-1,y-1,0,x,y,6);q.addColorStop(0,'#aab3ab');q.addColorStop(1,'#4a544e');g.fillStyle=q;g.beginPath();g.arc(x,y,5,0,7);g.fill();g.strokeStyle='#222a';g.lineWidth=1.4;g.beginPath();g.moveTo(x-3,y-2);g.lineTo(x+3,y+2);g.stroke()}
function pannello(g,x,y,w,h,tit){g.fillStyle=COL.met2;rr(g,x,y,w,h,5);g.fill();g.strokeStyle='#5c6a62';g.lineWidth=1.5;g.stroke();g.fillStyle='#ffffff10';g.fillRect(x+2,y+2,w-4,1);
 if(tit){g.fillStyle='#1b2320';rr(g,x+w/2-tit.length*5.2-14,y+7,tit.length*10.4+28,22,2);g.fill();testo(g,tit,x+w/2,y+18.5,14,COL.qua);}
 [[x+9,y+9],[x+w-9,y+9],[x+9,y+h-9],[x+w-9,y+h-9]].forEach(p=>vite(g,...p))}
function piano(p){const o=document.createElement('canvas');o.width=W*2;o.height=800;const g=o.getContext('2d');g.scale(2,2);const q=g.createLinearGradient(0,0,0,400);q.addColorStop(0,'#4c5952');q.addColorStop(1,'#414d47');g.fillStyle=q;g.fillRect(0,0,W,400);
 for(let i=0;i<5000;i++){g.fillStyle=`rgba(${i%2?255:0},${i%2?255:0},${i%2?255:0},.018)`;g.fillRect(Math.random()*W,Math.random()*400,2,1)}
 if(p=='r'){pannello(g,10,10,282,380,'RETE 400 kV');pannello(g,1068,14,206,202,'UTENZE');pannello(g,1068,216,206,174,'LINEE');}
 else{pannello(g,10,10,556,380,'GRUPPO 1 · VAPORE');pannello(g,574,10,184,380,'DIGA');pannello(g,766,10,214,380,'TURBOGAS');pannello(g,988,10,282,380,'ALTERNATORE');}
 return o}
let bgR,bgM;
function dial(g,cx,cy,r,min,max,tick,lab,unit,zone,dec=0,sw=1.5*Math.PI,cifre){const a0=Math.PI/2+(2*Math.PI-sw)/2;
 const ott=g.createLinearGradient(cx-r,cy-r,cx+r,cy+r);ott.addColorStop(0,'#e7cb88');ott.addColorStop(.5,'#8a6c33');ott.addColorStop(1,'#d7b56e');g.fillStyle=ott;g.beginPath();g.arc(cx,cy,r+6,0,7);g.fill();
 g.fillStyle=COL.qua;g.beginPath();g.arc(cx,cy,r,0,7);g.fill();
 const ang=v=>a0+(v-min)/(max-min)*sw;
 for(const[z0,z1,col]of zone||[]){g.strokeStyle=col;g.lineWidth=r*.07;g.beginPath();g.arc(cx,cy,r*.86,ang(z0),ang(z1));g.stroke()}
 g.strokeStyle='#1c1c16';for(let v=min,i=0;v<=max+1e-6;v+=tick,i++){const a=ang(v),big=i%2==0;g.lineWidth=big?2:1;g.beginPath();g.moveTo(cx+Math.cos(a)*r*(big?.76:.8),cy+Math.sin(a)*r*(big?.76:.8));g.lineTo(cx+Math.cos(a)*r*.9,cy+Math.sin(a)*r*.9);g.stroke();
  if(big&&r>55)testo(g,(+v.toFixed(dec)).toString().replace('.',','),cx+Math.cos(a)*r*.62,cy+Math.sin(a)*r*.62,r*.15,'#1c1c16',"center",UI,500)}
 testo(g,lab,cx,cy-r*.3,r*.15,'#1c1c16');testo(g,unit,cx,cy+r*.34,r*.14,'#55503f',"center",UI,500)}
function lancetta(g,cx,cy,r,min,max,v,sw=1.5*Math.PI){const a=Math.PI/2+(2*Math.PI-sw)/2+clamp((v-min)/(max-min),-.03,1.03)*sw;g.save();g.translate(cx,cy);g.rotate(a);g.fillStyle='#b5271c';g.beginPath();g.moveTo(-r*.14,-3);g.lineTo(r*.9,-.6);g.lineTo(r*.9,.6);g.lineTo(-r*.14,3);g.fill();g.restore();g.fillStyle='#2b2b24';g.beginPath();g.arc(cx,cy,r*.09,0,7);g.fill()}
const GA={};function gauge(g,id,cx,cy,r,min,max,tick,lab,unit,zone,dec,v){if(!GA[id]){const o=document.createElement('canvas');o.width=o.height=(r+10)*4;const q=o.getContext('2d');q.scale(2,2);dial(q,r+10,r+10,r,min,max,tick,lab,unit,zone,dec);GA[id]=o}
 g.drawImage(GA[id],cx-r-10,cy-r-10,(r+10)*2,(r+10)*2);lancetta(g,cx,cy,r,min,max,v)}
function lcd(g,x,y,w,h){g.fillStyle='#090f0d';rr(g,x-3,y-3,w+6,h+6,4);g.fill();g.fillStyle=COL.lcd;rr(g,x,y,w,h,2);g.fill()}
function fmt(v,d=0){return v.toFixed(d).replace('.',',')}
function lampada(g,x,y,col,on,r=7){g.fillStyle='#111';g.beginPath();g.arc(x,y,r+2,0,7);g.fill();g.fillStyle=on?col:'#2a2f2c';if(on){g.shadowColor=col;g.shadowBlur=14}g.beginPath();g.arc(x,y,r,0,7);g.fill();g.shadowBlur=0}
function tasto(g,w,lab,col='#d8d2c0',ink='#1b1b15',s=15){const dn=w.prem>0;g.fillStyle='#10160f';rr(g,w.x,w.y,w.w,w.h,4);g.fill();g.fillStyle=col;rr(g,w.x+2,w.y+2+(dn?2:0),w.w-4,w.h-7+(dn?3:0),3);g.fill();const r=lab.split('\n');r.forEach((t,i)=>testo(g,t,w.x+w.w/2,w.y+w.h/2-2+(i-(r.length-1)/2)*(s+2),s,ink))}
function leva(g,w,v,lab,lim){const x=w.x+w.w/2;g.fillStyle='#14191700';testo(g,lab,x,w.y-8,14,COL.eti);g.fillStyle='#10160f';rr(g,x-9,w.y+10,18,w.h-20,6);g.fill();
 for(let i=0;i<=10;i++){const y=w.y+w.h-35-i/10*(w.h-70);g.fillStyle=COL.eti;g.fillRect(x+(i%5?16:14),y-.5,i%5?10:14,1.5);if(i%5==0)testo(g,String(i*10),x+36,y,12,COL.eti,'left',UI,500)}
 if(lim){const y=w.y+w.h-35-lim/100*(w.h-70);g.fillStyle=COL.amb;g.fillRect(x-22,y-1,10,2)}
 const y=w.y+w.h-35-v/100*(w.h-70);const q=g.createLinearGradient(x-34,0,x+34,0);q.addColorStop(0,'#2f2a26');q.addColorStop(.5,'#8d8678');q.addColorStop(1,'#24201d');g.fillStyle=q;rr(g,x-30,y-20,60,40,5);g.fill();g.fillStyle=COL.ros;g.fillRect(x-30,y-2,60,4)}
function manopola(g,w,v,lab){const{cx,cy,r}=w;testo(g,lab,cx,cy-r-14,14,COL.eti);
 const a0=.75*Math.PI;for(let i=0;i<=10;i++){const a=a0+i/10*1.5*Math.PI;g.strokeStyle=COL.eti;g.lineWidth=i%5?1:2.2;g.beginPath();g.moveTo(cx+Math.cos(a)*(r+3),cy+Math.sin(a)*(r+3));g.lineTo(cx+Math.cos(a)*(r+9),cy+Math.sin(a)*(r+9));g.stroke()}
 const a=a0+v/100*1.5*Math.PI;const q=g.createRadialGradient(cx-r*.3,cy-r*.3,2,cx,cy,r);q.addColorStop(0,'#59544c');q.addColorStop(1,'#15130f');g.fillStyle=q;g.beginPath();g.arc(cx,cy,r-6,0,7);g.fill();
 g.strokeStyle='#0008';g.lineWidth=2;for(let i=0;i<24;i++){const b=i/24*2*Math.PI;g.beginPath();g.moveTo(cx+Math.cos(b)*(r-11),cy+Math.sin(b)*(r-11));g.lineTo(cx+Math.cos(b)*(r-6),cy+Math.sin(b)*(r-6));g.stroke()}
 g.strokeStyle=COL.qua;g.lineWidth=4;g.beginPath();g.moveTo(cx+Math.cos(a)*r*.25,cy+Math.sin(a)*r*.25);g.lineTo(cx+Math.cos(a)*(r-14),cy+Math.sin(a)*(r-14));g.stroke();testo(g,fmt(v)+'%',cx,cy+r+18,13,COL.ver,'center',MO,400)}
function chiuso(g,x,y,w,h,t){g.fillStyle='#2c3531';rr(g,x,y,w,h,4);g.fill();g.strokeStyle='#ffb64844';g.setLineDash([10,8]);g.lineWidth=2;g.strokeRect(x+8,y+8,w-16,h-16);g.setLineDash([]);testo(g,'FUORI SERVIZIO',x+w/2,y+h/2-10,16,'#c9d0c8');testo(g,t,x+w/2,y+h/2+12,13,'#9aa79f','center',UI,500)}
function pannelloRete(g){g.drawImage(bgR,0,0,W,400);const s=S;const f=s.f;
 gauge(g,'f',151,178,118,48,52,.5,'FREQUENZA','Hz',[[48,48.5,COL.ros],[48.5,49.8,COL.amb],[49.8,50.2,'#2f9a58'],[50.2,51.5,COL.amb],[51.5,52,COL.ros]],1,f);
 lcd(g,56,316,190,54);testo(g,fmt(f,2)+' Hz',151,344,34,Math.abs(f-50)<=.2?COL.ver:Math.abs(f-50)<=.5?COL.amb:COL.ros,'center',MO,400);
 const T=wid('trend');lcd(g,T.x,T.y,T.w,T.h);g.strokeStyle='#1d3a2c';g.lineWidth=1;for(let i=1;i<6;i++){const y=T.y+i*T.h/6;g.beginPath();g.moveTo(T.x,y);g.lineTo(T.x+T.w,y);g.stroke()}
 const hs=s.hist,mx=Math.max(1100,...hs.map(h=>h[1]+60));const yv=v=>T.y+T.h-8-v/mx*(T.h-16);
 for(const[i,col]of[[1,COL.amb],[0,COL.ver]]){g.strokeStyle=col;g.lineWidth=2.4;g.beginPath();hs.forEach((h,n)=>{const x=T.x+T.w-(hs.length-1-n)/119*T.w;n?g.lineTo(x,yv(h[i])):g.moveTo(x,yv(h[i]))});g.stroke()}
 testo(g,'PRODUZIONE',T.x+10,T.y+14,13,COL.ver,'left',MO,400);testo(g,'CONSUMO',T.x+112,T.y+14,13,COL.amb,'left',MO,400);testo(g,'ultimi 60 s',T.x+T.w-10,T.y+14,13,'#5f8a72','right',MO,400);
 const ro=[['PROD. MW',fmt(s.Pg),COL.ver],['CONS. MW',fmt(s.L),COL.amb],['SCARTO',(s.Pg-s.L>0?'+':'')+fmt(s.Pg-s.L),Math.abs(s.Pg-s.L)<25?COL.ver:COL.ros]];
 ro.forEach((r,i)=>{const x=296+i*139;lcd(g,x,246,132,60);testo(g,r[0],x+8,258,12,'#7f9a8a','left',MO,400);testo(g,r[1],x+124,284,30,r[2],'right',MO,400)});
 // ora e avanzamento
 const h=Math.floor(s.ora%24),m=Math.floor((s.ora%1)*60);lcd(g,296,322,132,62);testo(g,String(h).padStart(2,'0')+(s.t%1<.5?':':' ')+String(m).padStart(2,'0'),362,353,36,COL.amb,'center',MO,400);
 lcd(g,442,322,264,62);if(s.l.c){testo(g,s.l.nome.toUpperCase().slice(0,27),452,338,14,'#9fd6b4','left',MO,400);g.fillStyle='#1d3a2c';g.fillRect(452,356,244,14);g.fillStyle=COL.ver;g.fillRect(452,356,244*Math.min(1,s.t/s.l.dur),14)}else{testo(g,'RESISTI: '+Math.floor(s.t/60)+' min '+Math.floor(s.t%60)+' s',452,340,16,'#9fd6b4','left',MO,400);testo(g,'RECORD '+Math.floor(salva.rec/60)+' min',452,364,14,'#5f8a72','left',MO,400)}
 // allarmi
 const A=wid('alarm');lcd(g,A.x,A.y,A.w,A.h);testo(g,'ALLARMI',A.x+10,A.y+14,13,'#5f8a72','left',MO,400);
 const lst=s.allarmi.map(k=>ALL[k]).sort((a,b)=>b.lv-a.lv).slice(0,3);if(!lst.length)testo(g,'Nessun allarme. Impianto regolare.',A.x+A.w/2,A.y+A.h/2,16,COL.ver,'center',MO,400);
 lst.forEach((a,i)=>{const y=A.y+28+i*88,col=a.lv>=2?COL.ros:a.lv==1?COL.amb:'#9fd6b4';if(a.lv>=2&&tempoReale%1<.5){g.fillStyle='#ef4b3a24';g.fillRect(A.x+4,y-2,A.w-8,84)}testo(g,a.t,A.x+10,y+12,18,col,'left',UI);wrap(g,a.a,A.x+10,y+36,A.w-20,21,15,'#dbe6dc')});
 if(s.nota){testo(g,s.nota.x.slice(0,48),A.x+A.w/2,A.y+A.h-14,14,COL.amb,'center',UI,500)}
 tasto(g,wid('audio'),Aud.muto?'AUDIO\nOFF':'AUDIO\nON','#3c4943','#e4e8df',14);tasto(g,wid('pausa'),'PAUSA','#d8d2c0');
 // utenze
 if(s.on.carichi)for(const f of FEEDERS){const w=wid('f'+f.id),on=s.feed[f.id];tasto(g,w,f.n,on?'#d8d2c0':'#2a312d',on?'#1b1b15':'#c9d0c8',15);lampada(g,w.x+16,w.y+17,'#55e38a',on,5)}else chiuso(g,1078,44,186,162,'Dal turno 8');
 if(s.on.linee)s.lines.forEach((L,i)=>{const w=wid('l'+i);const pr=!L.on&&L.wait<=0;tasto(g,w,L.on?'':(pr?'RICHIUDI':'ATTESA '+Math.ceil(L.wait)+' s'),L.on?'#2a312d':pr?COL.amb:'#5a2f2a',pr?'#201400':'#fff',16);if(L.on){testo(g,(i?'SUD':'NORD'),w.x+10,w.y+16,15,'#e4e8df','left');lampada(g,w.x+w.w-16,w.y+16,L.T>30?COL.ros:'#55e38a',1,5);g.fillStyle='#10160f';g.fillRect(w.x+10,w.y+34,w.w-20,12);g.fillStyle=L.T>60?COL.ros:L.T>30?COL.amb:COL.ver;g.fillRect(w.x+10,w.y+34,(w.w-20)*Math.min(1,L.T/100),12)}});
 else chiuso(g,1078,246,186,134,'Dal turno 7');
}
function wrap(g,t,x,y,w,lh,s,col){g.font=`500 ${s}px ${UI}`;g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';let r='',n=0;for(const p of t.split(' ')){if(g.measureText(r+p).width>w){g.fillText(r,x,y+n++*lh);r=''}r+=p+' '}g.fillText(r,x,y+n*lh)}
function pannelloMacchine(g){g.drawImage(bgM,0,0,W,400);const s=S,on=s.on;
 leva(g,wid('valve'),s.valve,'VAPORE',on.cond&&s.pumpA+s.pumpB<2?75:0);if(s.pvBlocco>0){lampada(g,76,380,COL.ros,1,5)}
 gauge(g,'pv',200,116,64,0,700,100,'POTENZA','MW',[[600,700,COL.amb]],0,s.pv);
 gauge(g,'pr',346,116,64,100,220,20,'CALDAIA','bar',[[100,150,COL.amb],[150,188,'#2f9a58'],[188,205,COL.amb],[205,220,COL.ros]],0,s.Pshow);
 tasto(g,wid('sens'),'SENSORE B',s.sensKO?COL.amb:'#2a312d',s.sensKO?'#201400':'#c9d0c8',15);
 manopola(g,wid('fuel'),s.fuel,'BRUCIATORI');
 const pr=!s.turboOK&&s.riarmo<=0;tasto(g,wid('riarmo'),s.turboOK?'RIARMO':pr?'RIARMO':'ATTESA '+Math.ceil(s.riarmo),pr?COL.ros:'#2a312d',pr?'#fff':'#c9d0c8',15);
 if(on.cond){gauge(g,'t',492,112,54,20,100,20,'CONDENS.','°C',[[20,62,'#2f9a58'],[62,85,COL.amb],[85,100,COL.ros]],0,s.T);
  for(const[k,fail,lab]of[['pumpA',s.failA,'A'],['pumpB',s.failB,'B']]){const w=wid(k),x=w.x+w.w/2,su=s[k];testo(g,'POMPA '+lab,x,w.y-12,13);g.fillStyle='#10160f';rr(g,x-20,w.y+10,40,w.h-20,5);g.fill();g.fillStyle=su?'#d8d2c0':'#807b6e';rr(g,x-15,su?w.y+14:w.y+w.h/2,30,w.h/2-14,4);g.fill();lampada(g,x,w.y+w.h+13,fail>0?COL.ros:'#55e38a',fail>0?tempoReale%.6<.3:su,6)}}
 else chiuso(g,424,48,136,332,'Dal turno 3');
 if(on.idro){leva(g,wid('gate'),s.gate,'PORTATA');lcd(g,688,58,60,54);testo(g,'MW',718,70,12,'#7f9a8a','center',MO,400);testo(g,fmt(s.pi),718,94,24,COL.ver,'center',MO,400);
  testo(g,'LAGO',718,134,14);lcd(g,698,150,40,202);g.fillStyle=s.lake<15?COL.ros:'#3aa0e0';g.fillRect(700,350-1.98*s.lake,36,1.98*s.lake);testo(g,fmt(s.lake)+'%',718,370,13,COL.ver,'center',MO,400)}else chiuso(g,582,44,168,336,'Dal turno 2');
 if(on.tg){leva(g,wid('tg'),s.tg,'POTENZA');gauge(g,'pt',928,92,40,0,200,50,'','MW',null,0,s.pt);testo(g,fmt(s.pt),928,160,18,COL.ver,'center',MO,400);
  const st=s.tgKO>0?'GUASTO':s.tgState==1?'GIRI '+Math.ceil(s.tgTimer)+' s':s.tgState==2?'IN RETE':'FERMO';lcd(g,882,190,92,52);testo(g,st,928,216,17,s.tgState==2?COL.ver:s.tgKO>0?COL.ros:COL.amb,'center',MO,400);tasto(g,wid('tgstart'),s.tgState==2?'FERMA':'AVVIO',s.tgState==0&&s.tgKO<=0?COL.ver:'#2a312d',s.tgState==0&&s.tgKO<=0?'#0d2015':'#c9d0c8',19)}else chiuso(g,774,44,198,336,'Dal turno 4');
 if(on.ecc){manopola(g,wid('exc'),s.ecc,'ECCITAZIONE')}else chiuso(g,992,190,136,190,'Dal turno 5');
 gauge(g,'v',1062,112,64,340,460,20,'TENSIONE','kV',[[340,370,COL.ros],[370,388,COL.amb],[388,412,'#2f9a58'],[412,430,COL.amb],[430,460,COL.ros]],0,s.V);
 if(on.eolico){gauge(g,'w',1200,112,54,0,200,50,'EOLICO','MW',null,0,s.wind);}
 else chiuso(g,1140,48,120,120,'Dal turno 6');
 lcd(g,1140,200,120,170);const r=s.turboOK?590:0,c=r+(on.idro?150:0)+(s.tgState==2?200:0)+(on.eolico?s.wind:0),ris=c-s.Lreq;testo(g,'CAPACITÀ',1200,222,12,'#7f9a8a','center',MO,400);testo(g,fmt(c),1200,248,26,COL.ver,'center',MO,400);testo(g,'RISERVA',1200,292,12,'#7f9a8a','center',MO,400);testo(g,fmt(ris),1200,320,26,ris<40?COL.ros:ris<100?COL.amb:COL.ver,'center',MO,400);
}
function evid(g,p){if(!guida||!guida.w)return;const w=wid(guida.w);if(!w||w.p!=p)return;g.strokeStyle=COL.amb;g.lineWidth=4+Math.sin(tempoReale*6)*1.5;g.setLineDash([12,8]);g.lineDashOffset=-tempoReale*40;rr(g,w.x-8,w.y-8,w.w+16,w.h+16,8);g.stroke();g.setLineDash([])}
function disegna(){c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#10160f';c.fillRect(0,0,innerWidth,innerHeight);c.setTransform(dpr*sc,0,0,dpr*sc,dpr*ox,dpr*oy);
 if(!S)return;c.save();if(due){c.translate(W,400);c.rotate(Math.PI)}pannelloRete(c);evid(c,'r');c.restore();
 c.save();c.translate(0,400);pannelloMacchine(c);evid(c,'m');c.restore();
 if(due){c.fillStyle=COL.amb;c.fillRect(0,398,W,4)}
 if(S.lampo>0){c.fillStyle=`rgba(230,235,255,${S.lampo*.55})`;c.fillRect(0,0,W,H)}
 if(buio>0){c.fillStyle=`rgba(0,0,0,${Math.min(.9,buio)})`;c.fillRect(0,0,W,H)}}
/* ---- ciclo ---- */
let ultimo=0,acc=0;function ciclo(ts){const dt=Math.min(.05,(ts-ultimo)/1000||0);ultimo=ts;tempoReale+=dt;
 if(S&&!inPausa&&!guida){acc+=dt;while(acc>=1/30){acc-=1/30;passo(S,1/30)}if(S.nota){S.nota.t-=dt;if(S.nota.t<0)S.nota=null}
  if(S.lampo>0){if(S.lampo==1)Aud.tuono();S.lampo=Math.max(0,S.lampo-dt*3)}
  controllaGuida();Aud.tick(S,dt);if(S.over&&!buio){buio=.01;Aud.spegni()}if(S.fine)chiudiTurno()}
 for(const w of WID)if(w.prem>0)w.prem-=dt;
 if(buio>0&&S&&S.over){buio+=dt*.8;if(buio>1.2&&!$('#esito')){mostraBlackout()}}
 disegna();requestAnimationFrame(ciclo)}
function controllaGuida(){const g=S.l.guida;S.gi=S.gi||0;if(S.gi<g.length&&g[S.gi].t<=S.t&&!guidaFatta){apriGuida(g[S.gi]);S.gi++}}
let guidaFatta=false;
function apriGuida(g){guida=g;const w=g.w&&wid(g.w),alto=w&&w.p=='m';scena(`<div class="ov chiaro ${alto?'alto':''}"><div class="scat"><span class="eti">Guida</span><p>${g.x}</p><div class="righe"><button id="okg">Ho capito</button></div></div></div>`);$('#okg').onclick=()=>{guida=null;scena('')}}
/* ---- schermate ---- */
function scena(h){$('#sc').innerHTML=h}
function menu(){inPausa=true;if(!S)S=nuovoSim({...LIVELLI[9],ev:[],guida:[]});Aud.silenzio();scena(`<div class="ov"><div class="scat"><span class="eti">Centrale di Sant'Ilario · sala quadri</span><h1>Sala controllo</h1><p>Tieni in piedi una centrale elettrica: 50 Hz, 400 kV e nessuna città al buio. Leve e manopole si muovono con più dita insieme.</p><div class="righe"><button id="m1">Gioca da solo</button><button id="m2">In due sullo stesso tablet</button><button id="m3" class="sec">Schede tecniche</button></div>${due2()}</div></div>`);
 $('#m1').onclick=()=>{due=false;scegli()};$('#m2').onclick=()=>{due=true;scegli()};$('#m3').onclick=()=>schede()}
function due2(){return '<p class="mut">In due: il capo turno sta in alto e vede rete e allarmi. L\'operatore sta in basso e muove le macchine. Parlatevi: nessuno dei due vede tutto.</p>'}
function scegli(){let h='';let sblocc=1;LIVELLI.forEach((l,i)=>{const st=salva.stelle[l.id]||0;const ok=i==0||salva.stelle[LIVELLI[i-1].id];h+=`<button class="liv" data-l="${i}" ${ok?'':'disabled'}><b>${l.id}. ${l.nome}</b><small>${l.sub}</small><span class="st">${'★'.repeat(st)+'☆'.repeat(3-st)}</span></button>`});
 const ok10=salva.stelle[5];scena(`<div class="ov"><div class="scat"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2>${due?'In due':'Da solo'}: scegli il turno</h2><button id="ind" class="sec">Indietro</button></div><button class="liv" id="inf" style="width:100%;min-height:60px;margin-top:6px" ${ok10?'':'disabled'}><b>Turno senza fine</b><small>${ok10?'Record '+Math.floor(salva.rec/60)+' min '+Math.floor(salva.rec%60)+' s':'Si apre dopo il turno 5'}</small></button><div class="griglia">${h}</div></div></div>`);
 $('#ind').onclick=menu;$('#inf').onclick=()=>avvia(INFINITO);document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>avvia(LIVELLI[+b.dataset.l]))}
function avvia(l){S=nuovoSim(l,(Date.now()%100000)+7);GA;buio=0;tocchi.clear();guida=null;inPausa=false;scena('');Aud.via();Aud.avvia();sveglia()}
function pausa(){inPausa=true;Aud.silenzio();scena(`<div class="ov"><div class="scat"><h2>Pausa</h2><p class="mut">${S.l.nome}. ${S.l.sub}.</p><div class="righe"><button id="p1">Riprendi</button><button id="p2" class="sec">Rifai il turno</button><button id="p3" class="sec">Schede tecniche</button><button id="p4" class="sec">Esci</button></div></div></div>`);$('#p1').onclick=()=>{inPausa=false;scena('');Aud.avvia()};$('#p2').onclick=()=>avvia(S.l);$('#p3').onclick=()=>schede(pausa);$('#p4').onclick=()=>{S=null;menu()}}
function chiudiTurno(){inPausa=true;Aud.silenzio();const e=esito(S),l=S.l;if(e.stelle>(salva.stelle[l.id]||0))salva.stelle[l.id]=e.stelle;scrivi();const i=LIVELLI.indexOf(l),next=LIVELLI[i+1];
 scena(`<div class="ov"><div class="scat"><span class="eti">Turno finito · ${l.nome}</span><h2>${e.stelle==3?'Passaggio di consegne perfetto':e.stelle==2?'Turno tenuto bene':S.ospBuio>2?'Hai tenuto la rete, ma gli ospedali sono rimasti al buio':'Turno finito, con qualche sbandata'}</h2><div class="num" style="color:var(--amb)">${'★'.repeat(e.stelle)+'☆'.repeat(3-e.stelle)}</div><div class="dati"><div><small>Tempo in regola</small><span class="num">${fmt(e.q)}%</span></div><div><small>Energia non fornita</small><span class="num">${fmt(e.mwh,1)} MWh</span></div></div><p class="mut">Tre stelle da 88% di tempo con 50 Hz e 400 kV in regola.</p><div class="righe">${next?'<button id="r1">Turno successivo</button>':''}<button id="r2" class="sec">Rifai</button><button id="r4" class="sec">Scheda: ${SCHEDE[l.scheda][0]}</button><button id="r3" class="sec">Elenco turni</button></div></div></div>`);
 if(next)$('#r1').onclick=()=>avvia(next);$('#r2').onclick=()=>avvia(l);$('#r3').onclick=scegli;$('#r4').onclick=()=>scheda(l.scheda,chiudiDiNuovo);function chiudiDiNuovo(){scegli()}}
function mostraBlackout(){inPausa=true;const o=S.over,l=S.l;if(!l.c&&o.t>salva.rec){salva.rec=o.t;scrivi()}
 scena(`<div class="ov" id="esito"><div class="scat"><span class="eti">Blackout · ${l.c?'dopo '+Math.floor(o.t)+' s':'resistito '+Math.floor(o.t/60)+' min '+Math.floor(o.t%60)+' s'}</span><h2>${o.cause}</h2><p>${o.perche}</p><p><b>Prossima volta:</b> ${o.consiglio}</p><div class="righe"><button id="b1">Riprova</button><button id="b2" class="sec">Scheda: ${SCHEDE[o.scheda][0]}</button><button id="b3" class="sec">Elenco turni</button></div></div></div>`);
 $('#b1').onclick=()=>avvia(l);$('#b2').onclick=()=>scheda(o.scheda,()=>{mostraBlackoutDopo(l)});$('#b3').onclick=scegli}
function mostraBlackoutDopo(l){avvia(l)}
function schede(ind=menu){let h='';for(const k in SCHEDE)h+=`<button class="liv" data-s="${k}" style="min-height:58px"><b>${SCHEDE[k][0]}</b></button>`;scena(`<div class="ov"><div class="scat"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2>Schede tecniche</h2><button id="ind" class="sec">Indietro</button></div><div class="griglia">${h}</div></div></div>`);$('#ind').onclick=()=>ind();document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>scheda(b.dataset.s,()=>schede(ind)))}
function scheda(k,ind){const[t,...p]=SCHEDE[k];scena(`<div class="ov"><div class="scat"><span class="eti">Scheda tecnica</span><h2>${t}</h2>${p.map(x=>`<p>${x}</p>`).join('')}<div class="righe"><button id="ind">Va bene</button></div></div></div>`);$('#ind').onclick=ind}
/* ---- audio ---- */
const Aud={ctx:null,muto:false,via(){if(this.ctx){this.ctx.resume&&this.ctx.resume();return}try{const a=new (window.AudioContext||webkitAudioContext)();this.ctx=a;const o=a.createOscillator();o.type='sawtooth';const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=320;const g=a.createGain();g.gain.value=0;o.connect(f);f.connect(g);g.connect(a.destination);o.frequency.value=100;o.start();this.hum=o;this.humG=g}catch(e){}},
 agg(){if(this.humG)this.humG.gain.value=this.muto||!this.acceso?0:.05},avvia(){this.acceso=true;this.agg()},silenzio(){this.acceso=false;this.agg()},
 bip(fr,d,v=.08,ty='square'){if(!this.ctx||this.muto)return;const a=this.ctx,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.value=fr;g.gain.setValueAtTime(v,a.currentTime);g.gain.exponentialRampToValueAtTime(.0005,a.currentTime+d);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d)},
 clic(){this.bip(900,.04,.05)},clac(){this.bip(180,.09,.14)},t:0,
 tick(s,dt){if(this.hum)this.hum.frequency.value=s.f*2;this.t-=dt;if(s.allarmi.some(k=>ALL[k].lv>=2)&&this.t<0){this.t=1;this.bip(760,.22);}},
 tuono(){if(!this.ctx||this.muto)return;const a=this.ctx,b=a.createBuffer(1,a.sampleRate*1.2,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()-.5)*Math.pow(1-i/d.length,2);const n=a.createBufferSource();n.buffer=b;const f=a.createBiquadFilter();f.frequency.value=500;n.connect(f);f.connect(a.destination);n.start()},
 spegni(){if(this.hum&&this.ctx){const a=this.ctx;this.hum.frequency.linearRampToValueAtTime(20,a.currentTime+1.4);this.humG.gain.linearRampToValueAtTime(0,a.currentTime+1.5);this.acceso=false}}};
let wake=null;async function sveglia(){try{wake=await navigator.wakeLock.request('screen')}catch(e){}}
/* ---- avvio ---- */
(document.fonts&&document.fonts.ready||Promise.resolve()).then(()=>{bgR=piano('r');bgM=piano('m');ridim();menu();requestAnimationFrame(ciclo)});
if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App)Capacitor.Plugins.App.addListener('backButton',()=>{if(S&&!inPausa)pausa();else scegli()});
window.__sala={get S(){return S},avvia,LIVELLI,mostraBlackout};
