/* Sala controllo: simulazione della centrale. Nessun accesso alla pagina: si prova anche in Node. */
const CAP={vapore:600,idro:150,tg:200};
const FEEDERS=[{id:'citta',n:'CITTÀ',q:.40},{id:'ind',n:'INDUSTRIA',q:.30},{id:'fs',n:'FERROVIE',q:.15},{id:'osp',n:'OSPEDALI',q:.15}];
const TUTTO={idro:1,cond:1,tg:1,ecc:1,eolico:1,linee:1,carichi:1};
const lerp=(a,b,k)=>a+(b-a)*k, clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function curva(c,t){for(let i=1;i<c.length;i++)if(t<=c[i][0]){const[a,x]=c[i-1],[b,y]=c[i],k=(t-a)/(b-a||1);return lerp(x,y,k*k*(3-2*k));}return c[c.length-1][1];}

const LIVELLI=[
{id:1,nome:'Primo turno',sub:'Mattina tranquilla',ora:6,dur:150,ass:.5,on:{},
 c:[[0,380],[40,390],[80,470],[115,480],[150,430]],ev:[],scheda:'frequenza',
 guida:[{t:0,w:'freq',x:'Benvenuto in sala. Questa lancetta è la frequenza della rete: deve restare a 50 Hz. Se produciamo più di quanto la gente consuma sale, se produciamo meno scende.'},
 {t:.2,w:'trend',x:'Sullo schermo: la riga verde è la produzione, quella ambra il consumo. Il tuo mestiere è tenerle sovrapposte.'},
 {t:.4,w:'valve',x:'La leva VAPORE apre la turbina: la potenza cambia subito, ma il vapore lo prendi dalla caldaia. Fra poco il consumo sale: spingila su piano piano.'},
 {t:30,w:'fuel',x:'La manopola BRUCIATORI scalda la caldaia. Lavora in ritardo, ma senza di lei la pressione crolla. Guarda la pressione: va tenuta vicino a 170 bar.'}]},
{id:2,nome:'Sveglia in città',sub:'Rampa del mattino',ora:7,dur:170,ass:.8,on:{idro:1},
 c:[[0,420],[30,430],[90,620],[130,640],[170,600]],ev:[],scheda:'idro',
 guida:[{t:0,w:'gate',x:'Hai a disposizione anche la diga. L\'IDRO risponde in un paio di secondi, perfetto per coprire le salite mentre la caldaia si scalda. Il lago però si svuota: usalo e poi restituisci il carico al vapore.'}]},
{id:3,nome:'Acqua al condensatore',sub:'Prima pompa guasta',ora:10,dur:170,ass:.7,on:{idro:1,cond:1},
 c:[[0,520],[40,560],[100,600],[170,580]],ev:[{t:70,k:'pompa'}],scheda:'condensatore',
 guida:[{t:0,w:'pumps',x:'Il vapore va ricondensato. Le pompe A e B portano acqua al condensatore. Con una sola pompa non superare il 75% di vapore, altrimenti la temperatura sale e la turbina si protegge fermandosi.'}]},
{id:4,nome:'Cena d\'inverno',sub:'Il picco delle 19',ora:17.5,dur:190,ass:.6,on:{idro:1,cond:1,tg:1},
 c:[[0,600],[50,640],[110,840],[150,860],[190,720]],ev:[{t:110,k:'punta',mw:40,d:15,x:'Forni e stufe: consumo sopra le previsioni'}],scheda:'turbogas',
 guida:[{t:0,w:'tgstart',x:'Questa sera non basterà il vapore. Il TURBOGAS va avviato con anticipo: premi AVVIO, aspetta 15 secondi che arrivi a giri, poi usa la leva.'}]},
{id:5,nome:'Tensione giusta',sub:'Aspira la potenza reattiva',ora:14,dur:170,ass:.6,on:{idro:1,cond:1,tg:1,ecc:1},
 c:[[0,500],[60,700],[110,520],[170,680]],ev:[{t:80,k:'valvola'}],scheda:'tensione',
 guida:[{t:0,w:'exc',x:'La manopola ECCITAZIONE regola il campo magnetico dell\'alternatore e quindi la tensione: 400 kV. Quando il consumo cresce la tensione cala, e devi alzare l\'eccitazione.'}]},
{id:6,nome:'Vento forte',sub:'L\'eolico arriva e se ne va',ora:12,dur:180,ass:.5,on:{idro:1,cond:1,tg:1,ecc:1,eolico:1},
 c:[[0,620],[180,680]],ev:[{t:50,k:'vento',mw:130,d:20},{t:95,k:'vento',mw:20,d:6,x:'Raffiche oltre 25 m/s: gli aerogeneratori si fermano'},{t:140,k:'vento',mw:90,d:15}],scheda:'eolico',
 guida:[{t:0,w:'freq',x:'Il parco eolico produce da solo e non lo comandi. Con troppo vento le pale si fermano per sicurezza: tieni una riserva pronta.'}]},
{id:7,nome:'Temporale sull\'Appennino',sub:'Fulmini sulle linee',ora:16,dur:190,ass:.5,on:{idro:1,cond:1,tg:1,ecc:1,eolico:1,linee:1},
 c:[[0,760],[90,800],[190,780]],ev:[{t:55,k:'fulmine',l:0},{t:120,k:'fulmine',l:1},{t:150,k:'vento',mw:10,d:8,x:'Il temporale ferma gli aerogeneratori'}],scheda:'linee',
 guida:[{t:0,w:'lines',x:'Due linee a 400 kV portano fuori l\'energia, ognuna regge 700 MW. Un fulmine apre l\'interruttore: dopo 10 secondi di attesa puoi richiuderlo. Nel frattempo l\'altra linea si scalda.'}]},
{id:8,nome:'Ondata di freddo',sub:'Non basta tutto',ora:18,dur:190,ass:.4,on:{...TUTTO},
 c:[[0,820],[70,900],[120,1010],[160,1020],[190,920]],ev:[{t:120,k:'turbogasKO'}],scheda:'distacco',
 guida:[{t:0,w:'feed',x:'Stasera la domanda può superare ciò che hai. Staccare l\'INDUSTRIA o le FERROVIE è una scelta dolorosa, ma meglio qualcuno al buio di un blackout totale. Gli OSPEDALI non si toccano.'}]},
{id:9,nome:'Finale in TV',sub:'Intervallo: tutti a far bollire l\'acqua',ora:20,dur:180,ass:.35,on:{...TUTTO},
 c:[[0,760],[60,780],[75,920],[90,920],[105,760],[150,790],[180,930]],ev:[{t:66,k:'sensore'},{t:118,k:'pompa'},{t:158,k:'fulmine',l:1}],scheda:'sensori',
 guida:[{t:0,w:'sens',x:'A volte a mentire è lo strumento. Se il sensore di pressione si blocca, l\'allarme lo segnala: passa al sensore B prima di fidarti della lancetta.'}]},
{id:10,nome:'Notte nera',sub:'L\'esame di capo turno',ora:21,dur:220,ass:.25,on:{...TUTTO},
 c:[[0,900],[50,980],[100,860],[150,1000],[220,780]],ev:[{t:30,k:'pompa'},{t:60,k:'fulmine',l:0},{t:85,k:'vento',mw:15,d:6,x:'Tempesta: l\'eolico si ferma'},{t:115,k:'valvola'},{t:140,k:'sensore'},{t:165,k:'turbogasKO'},{t:190,k:'fulmine',l:1}],scheda:'riserva',guida:[]},
];
const INFINITO={id:0,nome:'Turno senza fine',sub:'Resisti finché regge',ora:6,dur:1e9,ass:.3,on:{...TUTTO},c:null,ev:[],guida:[],scheda:'riserva'};

function nuovoSim(l,seed=1){
 const on=l.on, L0=l.c?l.c[0][1]:560;
 const wind=on.eolico?40:0, carico=L0-wind;
 const pv0=Math.min(carico,520),pi0=on.idro?Math.min(carico-pv0,120):0,pt0=on.tg?Math.min(carico-pv0-pi0,CAP.tg):0, v=pv0/CAP.vapore*100;
 const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 return {l,on,r,t:0,ora:l.ora,f:50,V:400,vis:{},
  valve:v,fuel:pv0/6.4,P:170,pv:pv0,pvBlocco:0,turboOK:1,riarmo:0,sensB:0,sensKO:0,Pshow:170,
  gate:pi0/CAP.idro*100,pi:pi0,lake:100,
  tg:pt0/CAP.tg*100,pt:pt0,tgState:pt0>0?2:0,tgTimer:0,tgKO:0,
  ecc:l.on.ecc?30+L0/1000*50:0,
  pumpA:1,pumpB:v>62?1:0,failA:0,failB:0,T:30+v*.45,
  wind,windT:wind,windRate:5,
  lines:[{on:1,T:0,wait:0},{on:1,T:0,wait:0}],
  feed:Object.fromEntries(FEEDERS.map(x=>[x.id,1])),
  extra:[],noise:0,noiseT:0,evi:0,nextInf:30,lv:1,
  fuori:0,Vfuori:0,okT:0,totT:0,mwhPersi:0,ospBuio:0,hist:[],hT:0,L:L0,Lreq:L0,Pg:L0,allarmi:[],over:null,fine:false,trip:null,blink:0};
}
function eventoInf(s){const k=['pompa','fulmine','vento','valvola','sensore','turbogasKO','punta','punta'][Math.floor(s.r()*8)];
 const e={k};if(k=='fulmine')e.l=s.r()<.5?0:1;if(k=='vento'){e.mw=s.r()<.5?15:60+s.r()*90;e.d=8;}if(k=='punta'){e.mw=40+s.r()*80;e.d=20;e.x='Punta di consumo imprevista';}return e;}
function evento(s,e){switch(e.k){
 case'pompa':if(s.pumpA&&!s.failA){s.failA=22;s.pumpA=0;}else if(s.pumpB){s.failB=22;s.pumpB=0;}else{s.failA=22;s.pumpA=0;}break;
 case'fulmine':{const L=s.lines[e.l];if(L.on){L.on=0;L.wait=10;s.flash=1;s.lampo=1;}break;}
 case'vento':s.windT=e.mw;s.windRate=Math.abs(e.mw-s.wind)/(e.d||8);if(e.x)s.nota={x:e.x,t:8};break;
 case'punta':s.extra.push({mw:e.mw,left:e.d,tot:e.d});if(e.x)s.nota={x:e.x,t:8};break;
 case'valvola':s.pvBlocco=15;break;
 case'sensore':s.sensKO=1;s.sensB=0;s.Pfermo=s.P;break;
 case'turbogasKO':if(s.tgState==2){s.tgState=0;s.tgKO=20;}else s.tgKO=20;break;
}}
const ALL={
 fbassa:{lv:2,t:'FREQUENZA BASSA',a:'Serve più produzione: più leva vapore, idro o turbogas.'},
 falta:{lv:2,t:'FREQUENZA ALTA',a:'Produci troppo: abbassa le leve.'},
 pbassa:{lv:1,t:'PRESSIONE CALDAIA BASSA',a:'Alza i BRUCIATORI e chiudi un po\' il vapore.'},
 palta:{lv:1,t:'PRESSIONE CALDAIA ALTA',a:'Abbassa i BRUCIATORI o apri il vapore.'},
 tcond:{lv:2,t:'CONDENSATORE CALDO',a:'Avvia l\'altra pompa e porta il vapore sotto il 75%.'},
 pompa:{lv:2,t:'POMPA IN BLOCCO',a:'Avvia la pompa di riserva, tieni il vapore sotto il 75% e copri con idro.'},
 vbassa:{lv:1,t:'TENSIONE BASSA',a:'Alza l\'ECCITAZIONE.'},valta:{lv:1,t:'TENSIONE ALTA',a:'Abbassa l\'ECCITAZIONE.'},
 linea:{lv:2,t:'LINEA APERTA DA FULMINE',a:'Attendi il via libera e premi RICHIUDI.'},
 sovr:{lv:2,t:'LINEA IN SOVRACCARICO',a:'Richiudi l\'altra linea o stacca un carico.'},
 valv:{lv:2,t:'LEVA VAPORE BLOCCATA',a:'Compensa con idro e turbogas per 15 secondi.'},
 sens:{lv:1,t:'SENSORE PRESSIONE FERMO',a:'Premi SENSORE B.'},
 tgko:{lv:2,t:'TURBOGAS FERMO',a:'Compensa con le altre macchine: si riavvia tra poco.'},
 trip:{lv:2,t:'TURBINA FERMA',a:'Premi RIARMO appena si accende. Intanto copri il carico.'},
 lago:{lv:1,t:'LAGO QUASI VUOTO',a:'Riduci l\'idro e passa il carico al vapore.'},
 distacco:{lv:0,t:'CARICHI STACCATI',a:'Riattacca appena hai margine.'},
 stab:{lv:0,t:'OSPEDALI AL BUIO',a:'Riattacca subito gli ospedali.'},
};
function passo(s,dt){
 if(s.over||s.fine)return;const on=s.on,l=s.l;s.t+=dt;s.totT+=dt;s.ora=l.ora+(l.c?s.t/l.dur*(l.ora<7?3:3.5):s.t/60);
 // eventi
 if(l.c){while(s.evi<l.ev.length&&l.ev[s.evi].t<=s.t){evento(s,l.ev[s.evi++]);}}
 else if(s.t>s.nextInf){evento(s,eventoInf(s));s.lv=1+s.t/90;s.nextInf=s.t+clamp(32-s.lv*3,11,32)+s.r()*8;}
 // consumo
 s.noiseT-=dt;if(s.noiseT<0){s.noiseT=2+s.r()*3;s.noiseG=(s.r()-.5)*(l.c?18:30);}
 s.noise=lerp(s.noise,s.noiseG||0,dt*.6);
 let base=l.c?curva(l.c,s.t):(640+Math.sin(s.t/45)*(150+Math.min(s.t/10,120))+Math.sin(s.t/11)*30);
 s.extra=s.extra.filter(e=>(e.left-=dt)>0);for(const e of s.extra){const q=Math.min(1,(e.tot-e.left)/3,e.left/3);base+=e.mw*q;}
 base+=s.noise;s.Lreq=base;
 let fr=0;for(const x of FEEDERS)if(s.feed[x.id])fr+=x.q;
 const Lnew=base*fr;s.L=lerp(s.L,Lnew,clamp(dt*2.5,0,1));s.mwhPersi+=(base-Lnew)*dt/3600;
 if(!s.feed.osp)s.ospBuio+=dt;
 // eolico
 if(on.eolico){s.wind+=clamp(s.windT-s.wind,-s.windRate*dt,s.windRate*dt);}
 // pompe guaste
 if(s.failA>0){s.failA-=dt;s.pumpA=0;}if(s.failB>0){s.failB-=dt;s.pumpB=0;}
 const pumps=on.cond?(s.pumpA?1:0)+(s.pumpB?1:0):2;
 // vapore
 if(s.pvBlocco>0)s.pvBlocco-=dt;
 const scost=50-s.f, ass=l.ass;
 let vTarget=s.turboOK?clamp(s.valve/100*CAP.vapore*s.P/170+scost*260*ass,0,660):0;
 if(s.pvBlocco>0)vTarget=s.pv;
 s.pv=lerp(s.pv,vTarget,clamp(dt/1.6,0,1));
 const Q=s.fuel*6.4;let dump=0;if(s.P>195)dump=(s.P-195)*40;
 s.P=clamp(s.P+(Q-s.pv-dump)/70*dt,0,215);
 if(s.sensKO&&s.sensB)s.sensKO=0;
 s.Pshow=s.sensKO?s.Pfermo:s.P;
 const tt=30+s.pv/600*100*(pumps>=2?.45:pumps==1?.65:1.6);
 s.T=lerp(s.T,tt,clamp(dt/9,0,1));
 if(s.turboOK&&s.T>85){s.turboOK=0;s.trip='condensatore';s.riarmo=15;}
 if(s.turboOK&&s.P>208){s.turboOK=0;s.trip='pressione';s.riarmo=15;}
 if(!s.turboOK&&s.riarmo>0)s.riarmo-=dt;
 // idro
 const pit=on.idro&&s.lake>0?clamp(s.gate/100*CAP.idro+scost*60*ass*(s.gate>0?1:0),0,CAP.idro):0;
 s.pi=lerp(s.pi,pit,clamp(dt/.9,0,1));
 s.lake=clamp(s.lake-s.pi/150*(100/95)*dt+.25*dt,0,100);
 // turbogas
 if(s.tgKO>0)s.tgKO-=dt;
 if(s.tgState==1){s.tgTimer-=dt;if(s.tgTimer<=0)s.tgState=s.tgKO>0?0:2;}
 const ptt=s.tgState==2&&on.tg?s.tg/100*CAP.tg:0;
 s.pt=lerp(s.pt,ptt,clamp(dt/1.2,0,1));
 s.Pg=s.pv+s.pi+s.pt+(on.eolico?s.wind:0);
 // tensione
 if(on.ecc){const need=30+s.L/1000*50;s.V=lerp(s.V,400+(s.ecc-need)*1.3,clamp(dt/1.5,0,1));}else s.V=lerp(s.V,400,dt);
 // linee
 if(on.linee){const n=s.lines.filter(x=>x.on).length;const fl=n?s.L/n:0;
  for(const L of s.lines){if(L.wait>0)L.wait-=dt;
   if(L.on){const c=fl/700;L.T=clamp(L.T+(c>1?(c-1)*30+.8:-3)*dt,0,110);}else L.T=clamp(L.T-3*dt,0,110);}
  if(n==0&&s.lines.every(x=>x.wait<=0)){}
 }
 // frequenza
 s.f+=((s.Pg-s.L*(1+.015*(s.f-50)))/1600-.08*(s.f-50))*dt;
 const d=Math.abs(s.f-50);
 if(d>.5)s.fuori+=dt;else s.fuori=Math.max(0,s.fuori-dt*2);
 if(Math.abs(s.V-400)>30)s.Vfuori+=dt;else s.Vfuori=0;
 if(d<=.2&&Math.abs(s.V-400)<=12)s.okT+=dt;
 // storia
 s.hT+=dt;if(s.hT>=.5){s.hT=0;s.hist.push([s.Pg,s.L]);if(s.hist.length>120)s.hist.shift();}
 // allarmi
 const A=[];const a=(k,c)=>{if(c)A.push(k);};
 a('stab',!s.feed.osp);a('fbassa',s.f<49.8);a('falta',s.f>50.2);a('pompa',s.failA>0||s.failB>0);
 a('trip',!s.turboOK);a('tgko',s.tgKO>0);a('valv',s.pvBlocco>0);
 a('tcond',s.T>62);a('pbassa',s.P<150);a('palta',s.P>188);
 a('sens',s.sensKO);a('vbassa',s.V<388);a('valta',s.V>412);
 a('linea',s.lines.some(x=>!x.on));a('sovr',on.linee&&s.lines.some(x=>x.on&&x.T>30));a('lago',on.idro&&s.lake<15);
 a('distacco',FEEDERS.some(x=>!s.feed[x.id]&&x.id!='osp'));
 s.allarmi=A;
 // fine
 const bo=(cause,perche,consiglio,scheda)=>{s.over={cause,perche,consiglio,scheda,t:s.t};};
 const carenza=s.Pg<s.L;
 if(s.f<48.5||s.f>51.5||s.fuori>8){
  if(!s.turboOK)bo('Turbina ferma',s.trip=='condensatore'?'Il condensatore ha superato 85 °C e la protezione ha fermato la turbina. Sono mancati di colpo centinaia di MW.':'La pressione ha superato 208 bar e la turbina si è fermata. Sono mancati di colpo centinaia di MW.',s.trip=='condensatore'?'Tieni due pompe in marcia. Con una sola, resta sotto il 75% di vapore.':'Quando chiudi il vapore, abbassa anche i bruciatori.',s.trip=='condensatore'?'condensatore':'caldaia');
  else if(carenza)bo('Frequenza a '+s.f.toFixed(2).replace('.',',')+' Hz','Il consumo superava la produzione di '+Math.round(s.L-s.Pg)+' MW: gli alternatori hanno rallentato finché le protezioni non hanno staccato la rete.','Tieni una riserva pronta su idro e turbogas, o stacca un carico prima di arrivare a 49,5 Hz.','riserva');
  else bo('Frequenza a '+s.f.toFixed(2).replace('.',',')+' Hz','La produzione superava il consumo di '+Math.round(s.Pg-s.L)+' MW: gli alternatori hanno accelerato oltre il limite.','Quando il consumo scende, abbassa le leve per tempo.','frequenza');
  return;}
 if(s.Vfuori>3){bo('Tensione a '+Math.round(s.V)+' kV','La tensione è rimasta troppo lontana da 400 kV e i trasformatori si sono scollegati.','Muovi l\'ECCITAZIONE seguendo il consumo.','tensione');return;}
 if(on.linee&&s.lines.some(x=>x.T>=100)){bo('Linea fuori servizio per sovraccarico','Una sola linea portava '+Math.round(s.L)+' MW contro un limite di 700: i conduttori si sono scaldati e la protezione ha aperto anche quella.','Richiudi la linea appena possibile, oppure stacca un carico per scendere sotto 700 MW.','linee');return;}
 if(on.linee&&s.lines.every(x=>!x.on)){if((s.noLine=(s.noLine||0)+dt)>6){bo('Nessuna linea in servizio','Tutte e due le linee erano aperte: la centrale non poteva consegnare energia.','Richiudi appena l\'attesa finisce.','linee');return;}}else s.noLine=0;
 if(s.t>=l.dur)s.fine=true;
}
function esito(s){const q=s.okT/s.totT*100;let st=q>=88?3:q>=70?2:1;if(s.ospBuio>2)st=Math.min(st,1);return{q,stelle:st,mwh:s.mwhPersi};}
function comando(s,k,v){switch(k){
 case'pumpA':if(s.failA<=0)s.pumpA=v;break;case'pumpB':if(s.failB<=0)s.pumpB=v;break;
 case'tgstart':if(s.tgState==0&&s.tgKO<=0){s.tgState=1;s.tgTimer=15;}else if(s.tgState==2){s.tgState=0;}break;
 case'riarmo':if(!s.turboOK&&s.riarmo<=0){s.turboOK=1;s.trip=null;s.P=Math.min(s.P,180);s.T=Math.min(s.T,60);}break;
 case'sensB':s.sensB=1;break;
 case'feed':s.feed[v]=s.feed[v]?0:1;break;
 case'line':{const L=s.lines[v];if(!L.on&&L.wait<=0)L.on=1;break;}
}}
if(typeof module!='undefined')module.exports={LIVELLI,INFINITO,nuovoSim,passo,comando,esito,CAP,FEEDERS,ALL};
