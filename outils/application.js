/* =============================================================================
   Ajouts Organisateur (16/11/2026) : Application à chiffres faciles, schémas pas à pas,
   « Ta 1re action ? », variantes et « où ça tombe ».
   - Un module peut définir XAPP (exos d'application : tirage de valeurs simples + formules),
     XSCHEMA (schémas SVG commentés étape par étape, avec flèches animées),
     XTETE (questions « ta 1re action ? ») et XVARIANTES (variantes par chapitre).
   - La Régulation (matière de base) reçoit ses schémas et ses exos de compréhension ici.
   ============================================================================= */
const XP={libre:false,schemas:[],byId:{},lien:{},
  NIV:['','Niveau 1 : comprendre (lire le schéma, choisir la bonne formule).','Niveau 2 : calculer, de tête : les chiffres sont ronds.','Niveau 3 : comme au DS, sans aide.'],

  /* ---------- Petit calculateur d'expressions (sans eval) ---------- */
  FN:{sqrt:Math.sqrt,racine:Math.sqrt,exp:Math.exp,ln:Math.log,log:Math.log10,abs:Math.abs,sin:Math.sin,cos:Math.cos,tan:Math.tan,
    floor:Math.floor,ceil:Math.ceil,min:Math.min,max:Math.max,pow:Math.pow,
    round:(x,n)=>{const k=Math.pow(10,n||0);return Math.round(x*k)/k;},arrondi:(x,n)=>{const k=Math.pow(10,n||0);return Math.round(x*k)/k;},
    entier:x=>Math.abs(x-Math.round(x))<1e-9?1:0,si:(c,a,b)=>c?a:b},
  calc(src,vars){const s=String(src);let i=0;const V=vars||{};
    const sp=()=>{while(i<s.length&&/\s/.test(s[i]))i++;};
    const fail=m=>{throw new Error(m+' dans « '+s+' »');};
    const peek=t=>{sp();return s.startsWith(t,i);};
    const eat=t=>{if(peek(t)){i+=t.length;return true;}return false;};
    function prim(){sp();const c=s[i];
      if(c==='('){i++;const v=or();if(!eat(')'))fail('parenthèse manquante');return v;}
      if(c==='-'||c==='−'){i++;return -pw();}
      if(c==='+'){i++;return pw();}
      if(c==='"'||c==='\''||c==='«'){const end=c==='«'?'»':c;const j=s.indexOf(end,i+1);if(j<0)fail('texte non fermé');const t=s.slice(i+1,j).trim();i=j+1;return t;}
      const m=s.slice(i).match(/^(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);if(m){i+=m[1].length;return parseFloat(m[1]);}
      const n=s.slice(i).match(/^[A-Za-zÀ-ÖØ-öø-ÿα-ωΑ-Ω_][\wÀ-ÖØ-öø-ÿα-ωΑ-Ω]*/);if(n){i+=n[0].length;const id=n[0];
        if(peek('(')){i++;const args=[];if(!peek(')')){do{args.push(or());}while(eat(','));}if(!eat(')'))fail('parenthèse manquante');const f=XP.FN[id];if(!f)fail('fonction inconnue '+id);return f(...args);}
        if(id==='pi'||id==='π')return Math.PI;if(id in V)return V[id];fail('valeur inconnue '+id);}
      fail('je ne lis pas');}
    function pw(){const b=prim();if(eat('^')){const e=pw();return Math.pow(b,e);}return b;}
    function mul(){let v=pw();for(;;){if(eat('*')||eat('×')||eat('·'))v*=pw();else if(eat('/')||eat('÷'))v/=pw();else return v;}}
    function add(){let v=mul();for(;;){if(eat('+'))v+=mul();else if(eat('-')||eat('−'))v-=mul();else return v;}}
    function cmp(){let v=add();for(;;){if(eat('<='))v=v<=add()?1:0;else if(eat('>='))v=v>=add()?1:0;else if(eat('==')){const w=add();v=v===w||(typeof v==='number'&&typeof w==='number'&&Math.abs(v-w)<1e-9)?1:0;}else if(eat('!=')){const w=add();v=v!==w?1:0;}else if(eat('<'))v=v<add()?1:0;else if(eat('>'))v=v>add()?1:0;else return v;}}
    function and(){let v=cmp();while(eat('&&')){const w=cmp();v=v&&w?1:0;}return v;}
    function or(){let v=and();while(eat('||')){const w=and();v=v||w?1:0;}return v;}
    const r=or();sp();if(i<s.length)fail('reste « '+s.slice(i)+' »');return r;},
  fmt(x){if(typeof x==='string')return x;if(x===Infinity)return '∞';if(x===-Infinity)return '−∞';if(!isFinite(x))return '?';
    const r=Math.abs(x)>=1000?Math.round(x):+(+x).toPrecision(4);return r.toLocaleString('fr-FR',{maximumFractionDigits:6}).replace(/[  ]/g,' ').replace('-','−');},
  fill(t,v){return String(t==null?'':t).replace(/\{\{([^}]+)\}\}/g,(m,e)=>{try{return XP.fmt(XP.calc(e,v));}catch(err){return '?';}});},

  /* ---------- Un exo d'application tiré au hasard (valeurs simples) ---------- */
  tirer(a,rnd){const T=a.tirage||{},C=a.calc||{};let v={};
    for(let essai=0;essai<120;essai++){v={};
      Object.keys(T).forEach(k=>{const d=T[k];if(Array.isArray(d))v[k]=d[Math.floor(rnd()*d.length)];
        else if(d&&typeof d==='object'){const pas=d.pas||1,n=Math.floor(((d.max-d.min)/pas)+1e-9)+1;v[k]=+(d.min+pas*Math.floor(rnd()*n)).toPrecision(10);}else v[k]=d;});
      try{Object.keys(C).forEach(k=>{v[k]=XP.calc(C[k],v);});if(!a.si||XP.calc(a.si,v))return v;}catch(e){}}
    return v;},
  exo(c,level,rnd){const a=c.tpl;const ns=a.niveaux||[];const nv=ns[Math.min(level,ns.length)-1]||ns[0]||{parts:[]};const v=XP.tirer(a,rnd);
    const parts=(nv.parts||[]).map(p=>{const q=XP.fill(p.q,v),aide=level<3?XP.fill(p.aide||'',v):'',explication=XP.fill(p.explication||'',v);
      if(Array.isArray(p.choix)){const bonne=p.bonne||0;const raw=p.choix.map(o=>XP.fill(o,v));const opts=[],idx=[];raw.forEach((o,k)=>{if(!opts.includes(o)){opts.push(o);idx.push(k);}});
        const good=opts.indexOf(raw[bonne]);const order=shuffle(opts.map((_,k)=>k),rnd);
        return{type:'choix',q,options:order.map(k=>opts[k]),answer:order.indexOf(good),aide,explication};}
      let ans=NaN;try{ans=XP.calc(p.rep,v);}catch(e){}
      return{type:'num',q,answer:ans,affiche:XP.fmt(ans)+(p.unite?' '+p.unite:''),unite:p.unite||'',tol:p.tol!=null?p.tol:0.03,aide,explication};});
    const corr=XP.fill(nv.correction||a.correction||'',v)||parts.filter(p=>p.explication).map((p,k)=>'<b>'+(k+1)+'.</b> '+p.explication).join('<br>');
    return{enonce:XP.fill(nv.enonce||a.enonce||'',v),parts,correction:corr,schema:a.schema};},

  /* ---------- Chargement : modules (XAPP, XSCHEMA, XTETE, XVARIANTES) et matières de base ---------- */
  charger(raw,meta){XP.schemas=[];XP.byId={};XP.lien={};
    const ex=(raw&&raw.extra)||{};const B=XP.BUILTIN[meta&&meta.id]||{};
    const schemas=(Array.isArray(ex.XSCHEMA)?ex.XSCHEMA:[]).concat(B.schemas||[]);
    schemas.forEach(s=>{if(s&&s.id&&s.svg&&!XP.byId[s.id]){XP.byId[s.id]=s;XP.schemas.push(s);}});
    Object.assign(XP.lien,B.lien||{});
    if(!PK)return;
    const exMod={};(raw.EXERCICES||[]).forEach(e=>{if(e&&e.id)exMod[e.id]=e.m;});
    const meths=PK.methodes||[];
    const methPour=mod=>{const m=meths.find(x=>x.id==='M-'+mod)||meths.find(x=>(x.pool||[]).some(id=>exMod[id]===mod));return m?m.id:(meths[0]||{}).id;};
    /* Variantes (par chapitre) et « où ça tombe » (titres des exos : TD n, DS année) */
    const VAR=ex.XVARIANTES&&typeof ex.XVARIANTES==='object'?ex.XVARIANTES:{};
    meths.forEach(m=>{if(!m.pool)return;const mods=[...new Set(m.pool.map(id=>exMod[id]).filter(Boolean))];
      if(!(m.variantes||[]).length){const vs=[];mods.forEach(md=>(VAR[md]||[]).forEach(x=>{if(x&&x.si)vs.push({si:String(x.si),alors:String(x.alors||'')});}));if(vs.length)m.variantes=vs;}
      const T=(raw.EXERCICES||[]).filter(e=>m.pool.includes(e.id)).map(e=>(String(e.titre||e.title||'').match(/^\s*((?:TD|TP|DS)\b[^—:–]*)/i)||[])[1]).filter(Boolean).map(t=>t.trim().replace(/\s*[-—–:]\s*$/,''));
      if(T.length)m.tombe=[...new Set(T)];});
    /* « Ta 1re action ? » écrites dans le module : en tête du contrôle de tête */
    if(Array.isArray(ex.XTETE)&&ex.XTETE.length){const t=ex.XTETE.filter(q=>q&&q.q&&Array.isArray(q.c)).map(q=>({m:methPour(q.mod),sect:q.mod,q:String(q.q),o:q.c.map(String),a:q.a||0,e:String(q.e||'')}));
      PK.controleTete=t.concat(PK.controleTete||[]);}
    /* Exos d'application à chiffres faciles */
    const apps=(Array.isArray(ex.XAPP)?ex.XAPP:[]).map(a=>({a,methode:a.methode||methPour(a.mod)})).concat((B.apps||[]).map(a=>({a,methode:a.methode})));
    if(apps.length)PK.application=apps.filter(x=>x.a&&x.a.id&&Array.isArray(x.a.niveaux)&&x.a.niveaux.length).map(x=>({id:'X'+x.a.id,titre:x.a.titre||x.a.id,methode:x.methode,gen:'tpl',tpl:x.a,schema:x.a.schema})).concat(PK.application||[]);},

  /* ---------- Schémas pas à pas ---------- */
  DEFS:'<defs><marker id="xsfl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xs-head"/></marker></defs>',
  schemaHTML(s,ouvert){if(!s)return '';const n=(s.etapes||[]).length;const svg=String(s.svg).replace(/<svg([^>]*)>/,(m,a)=>'<svg'+a+'>'+XP.DEFS);
    return `<figure class="xs" data-xs="${esc(s.id)}" data-i="0"><figcaption class="xs-t">🗺️ ${esc(s.titre||'Le schéma')}</figcaption>
      <div class="xs-svg">${svg}</div>
      <div class="xs-step"><div class="xs-e" data-n="0">${md(s.legende||(n?'Appuie sur ▶ pour suivre le schéma étape par étape.':''))}</div>
      ${(s.etapes||[]).map((e,k)=>`<div class="xs-e" data-n="${k+1}" hidden><b class="xs-k">Étape ${k+1}/${n}</b> ${md(e.t||'')}${e.f?`<div class="xs-f">${md(e.f)}</div>`:''}</div>`).join('')}</div>
      ${n?`<div class="xs-ctl"><button class="xs-b" data-xsgo="-1" aria-label="Étape précédente">‹</button><button class="xs-b pl" data-xsgo="play">▶ Pas à pas</button><button class="xs-b" data-xsgo="1" aria-label="Étape suivante">›</button></div>
      <div class="xs-dots">${Array.from({length:n+1},(_,k)=>`<i class="${k?'':'on'}"></i>`).join('')}</div>`:''}</figure>`;},
  voir(fig,i){const s=XP.byId[fig.dataset.xs];if(!s)return;const E=s.etapes||[];const n=E.length;i=Math.max(0,Math.min(n,i));fig.dataset.i=i;
    const on=new Set(i?(E[i-1].on||[]):[]),vus=new Set();E.slice(0,Math.max(0,i-1)).forEach(e=>(e.on||[]).forEach(k=>vus.add(k)));
    fig.classList.toggle('pas',i>0);
    fig.querySelectorAll('svg [data-k]').forEach(el=>{const ks=String(el.getAttribute('data-k')).split(/\s+/);const o=ks.some(k=>on.has(k));
      el.classList.toggle('on',o);el.classList.toggle('vu',!o&&ks.some(k=>vus.has(k)));
      if(o&&el.classList.contains('trace')){el.classList.remove('on');void el.getBoundingClientRect();el.classList.add('on');}});
    fig.querySelectorAll('.xs-e').forEach(el=>{el.hidden=+el.dataset.n!==i;});
    fig.querySelectorAll('.xs-dots i').forEach((d,k)=>d.classList.toggle('on',k===i));
    const pl=fig.querySelector('[data-xsgo="play"]');if(pl&&!fig._t)pl.textContent=i>=n?'↺ Revoir':i?'▶ Suite auto':'▶ Pas à pas';},
  jouer(fig){const s=XP.byId[fig.dataset.xs];if(!s)return;const n=(s.etapes||[]).length;const pl=fig.querySelector('[data-xsgo="play"]');
    if(fig._t){clearInterval(fig._t);fig._t=null;XP.voir(fig,+fig.dataset.i);return;}
    let i=+fig.dataset.i;if(i>=n)i=0;XP.voir(fig,i+1);fig._t=setInterval(()=>{const j=+fig.dataset.i+1;if(j>n||!document.body.contains(fig)){clearInterval(fig._t);fig._t=null;XP.voir(fig,+fig.dataset.i);return;}XP.voir(fig,j);},3600);
    if(pl)pl.textContent='⏸ Pause';},
  pourNotion(nid){const l=XP.schemas.filter(s=>(s.lecons||s.notions||[]).map(String).includes(String(nid)));return l.map(s=>XP.schemaHTML(s)).join('');},
  schemaPour(c,l){const id=c.schema||XP.lien[c.id];const s=id&&XP.byId[id];if(!s)return '';
    return l>=3?`<details class="xs-det"><summary>🗺️ Revoir le schéma : ${esc(s.titre||'')}</summary>${XP.schemaHTML(s)}</details>`:XP.schemaHTML(s);},
  schemasHTML(){if(!XP.schemas.length)return '';
    return `<section class="card"><div class="eyebrow">🗺️ Les schémas pas à pas</div><p class="small mut" style="margin:4px 0 8px">Chaque schéma se lit étape par étape : ce qui entre, ce qui sort, et où ça va dans les formules.</p>
      ${XP.schemas.map(s=>`<details class="xs-det"><summary>${esc(s.titre||s.id)}</summary>${XP.schemaHTML(s)}</details>`).join('')}</section><div class="sp"></div>`;},
  teteHTML(){const n=(PK.controleTete||[]).length;if(!n)return '';
    return `<section class="card"><div class="eyebrow">⚡ Ta 1re action ?</div><p class="small" style="margin:4px 0 10px">Questions éclair : face à un énoncé, quelle est la toute première chose à faire ? (${n} questions)</p>
      <button class="btn primary block" data-x="pqStart" data-k="tete">⚡ Lancer les questions éclair</button></section><div class="sp"></div>`;},
  tombeHTML(m){return (m.tombe||[]).length?`<div class="sp"></div><section class="card"><div class="eyebrow">Où ça tombe</div><div class="x-exos mt8">${m.tombe.map(t=>'<span class="chip">'+esc(t)+'</span>').join('')}</div></section>`:'';},
  sous(){const a=(PK.application||[]).length,s=XP.schemas.length;return `${a} compétence${a>1?'s':''} à 3 niveaux${s?' · '+s+' schéma'+(s>1?'s':'')+' pas à pas':''} · 1re action`;},

  BUILTIN:{}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-xsgo]');if(!b)return;const fig=b.closest('.xs');if(!fig)return;e.preventDefault();
  const g=b.dataset.xsgo;if(g==='play'){XP.jouer(fig);return;}if(fig._t){clearInterval(fig._t);fig._t=null;}XP.voir(fig,+fig.dataset.i+(+g));});
document.addEventListener('click',e=>{const p=e.target.closest('.xs-svg');if(!p||e.target.closest('[data-xsgo]'))return;const fig=p.closest('.xs');if(fig&&!fig._t)XP.voir(fig,+fig.dataset.i+1);});

/* ---------- Régulation (R3.08) : schémas et exos de compréhension ---------- */
XP.BUILTIN.regulation={
  lien:{'a-blocs':'sch-boucle','a-ecart':'sch-boucle','a-dil':'sch-boucle','a-routh':'sch-boucle','a-sens':'sch-sens','a-rep':'sch-ordre1','a-carac':'sch-ordre1','a-equa':'sch-ordre1'},
  schemas:[
  {id:'sch-boucle',titre:'La boucle fermée : qui est qui, et où ça va dans les formules',notions:['elements','blocs','precision'],
   legende:'Une boucle de régulation : la *consigne W* entre à gauche, la *sortie S* sort à droite, et le *retour* ramène la mesure au comparateur.',
   svg:`<svg viewBox="0 0 360 178" role="img" aria-label="Schéma bloc d'une boucle fermée">
<g data-k="w"><line class="ln" x1="6" y1="62" x2="42" y2="62" marker-end="url(#xsfl)"/><text x="10" y="54" class="tb">W</text><text x="4" y="80" class="ts">consigne</text></g>
<g data-k="cmp"><circle class="bx" cx="54" cy="62" r="11"/><line class="ln" x1="46" y1="54" x2="62" y2="70"/><line class="ln" x1="62" y1="54" x2="46" y2="70"/><text x="36" y="55" class="ts">+</text><text x="60" y="88" class="ts">−</text></g>
<g data-k="eps"><line class="ln anim" x1="65" y1="62" x2="96" y2="62" marker-end="url(#xsfl)"/><text x="76" y="54" class="tb">ε</text></g>
<g data-k="C"><rect class="bx" x="96" y="44" width="58" height="36" rx="6"/><text x="125" y="67" text-anchor="middle" class="tb">C(p)</text><text x="125" y="96" text-anchor="middle" class="ts">correcteur</text></g>
<g data-k="y"><line class="ln anim" x1="154" y1="62" x2="194" y2="62" marker-end="url(#xsfl)"/><text x="170" y="54" class="tb">Y</text></g>
<g data-k="H"><rect class="bx" x="194" y="44" width="60" height="36" rx="6"/><text x="224" y="67" text-anchor="middle" class="tb">H(p)</text><text x="224" y="96" text-anchor="middle" class="ts">procédé</text></g>
<g data-k="z"><line class="ln wa anim" x1="224" y1="6" x2="224" y2="42" marker-end="url(#xsfl)"/><text x="230" y="18" class="tb wa">Z</text><text x="242" y="18" class="ts">perturbation</text></g>
<g data-k="s"><line class="ln anim" x1="254" y1="62" x2="350" y2="62" marker-end="url(#xsfl)"/><text x="330" y="54" class="tb">S</text><text x="306" y="80" class="ts">sortie</text><circle cx="300" cy="62" r="3" class="pt"/></g>
<g data-k="ret"><polyline class="ln anim" points="300,62 300,140 256,140" marker-end="url(#xsfl)"/><polyline class="ln anim" points="194,140 54,140 54,75" marker-end="url(#xsfl)"/><text x="110" y="134" class="tb">X</text><text x="122" y="134" class="ts">mesure</text></g>
<g data-k="B"><rect class="bx" x="194" y="122" width="62" height="36" rx="6"/><text x="225" y="145" text-anchor="middle" class="tb">B(p)</text><text x="225" y="172" text-anchor="middle" class="ts">capteur (retour)</text></g>
</svg>`,
   etapes:[
    {t:'*W, la consigne* : la valeur que tu veux obtenir. C\'est l\'*entrée* de la boucle. Elle arrive au comparateur avec le signe *+*.',on:['w','cmp'],f:'Entrée de la BF : W(p)'},
    {t:'Le *comparateur* soustrait la mesure X (signe *−*, elle vient du retour) : il sort l\'*écart ε*.',on:['cmp','eps','ret'],f:'ε = W − X'},
    {t:'Le *correcteur C(p)* reçoit l\'écart et calcule la *commande Y* envoyée à l\'actionneur.',on:['eps','C','y'],f:'Y = C(p) · ε'},
    {t:'Le *procédé H(p)* reçoit la commande Y et donne la *sortie S*. La *perturbation Z* entre ici : elle dérange le procédé.',on:['y','H','z','s'],f:'S = H(p) · Y (+ l\'effet de Z)'},
    {t:'Le *capteur B(p)* mesure la sortie et la renvoie au comparateur : c\'est la *mesure X*. Si B = 1, c\'est un *retour unitaire*.',on:['s','ret','B'],f:'X = B(p) · S'},
    {t:'La *chaîne directe* : tout ce qui va de ε jusqu\'à S, en *série* → on *multiplie*.',on:['eps','C','y','H','s'],f:'A(p) = C(p) · H(p)'},
    {t:'La *boucle ouverte* : on coupe juste avant le comparateur et on fait *tout le tour* (aller + retour).',on:['eps','C','y','H','s','ret','B'],f:'BO = A · B = C · H · B'},
    {t:'La *boucle fermée* : ce qui relie l\'entrée W à la sortie S. *Formule de Black* : chaîne directe en haut, 1 + boucle ouverte en bas.',on:['w','cmp','eps','C','y','H','s','ret','B'],f:'BF = S/W = A / (1 + A·B) — retour unitaire : C·H / (1 + C·H)'},
    {t:'La *précision* se lit sur ε. Échelon d\'amplitude A, *sans intégrateur* (classe 0) : il reste un écart, d\'autant plus petit que le gain statique K de la BO est grand.',on:['eps','cmp'],f:'εs = A / (1 + K)   (avec une action I : εs = 0)'}]},
  {id:'sch-ordre1',titre:'Réponse d\'un 1er ordre à un échelon : lire Gs et θ',notions:['ordre1','lineaire'],
   legende:'La sortie monte *sans dépassement* vers sa valeur finale. Tout se lit sur la courbe.',
   svg:`<svg viewBox="0 0 360 200" role="img" aria-label="Réponse indicielle d'un premier ordre">
<line class="ln ax" x1="40" y1="170" x2="350" y2="170" marker-end="url(#xsfl)"/><line class="ln ax" x1="40" y1="176" x2="40" y2="14" marker-end="url(#xsfl)"/><text x="336" y="188" class="ts">t</text><text x="10" y="22" class="ts">s(t)</text>
<g data-k="ech"><line class="ln wa" x1="40" y1="190" x2="40" y2="174" marker-end="url(#xsfl)"/><text x="46" y="192" class="ts wa">échelon de A à t = 0</text></g>
<g data-k="fin"><line class="ln dsh" x1="40" y1="50" x2="345" y2="50"/><text x="262" y="44" class="tb">s(∞) = Gs · A</text></g>
<path data-k="courbe" class="ln ac trace" pathLength="100" d="M40.0,170.0 L45.0,160.4 L50.0,151.6 L55.0,143.5 L60.0,136.0 L65.0,129.1 L70.0,122.8 L75.0,117.0 L80.0,111.6 L85.0,106.7 L90.0,102.2 L95.0,98.0 L100.0,94.1 L105.0,90.6 L110.0,87.4 L115.0,84.4 L120.0,81.6 L125.0,79.1 L130.0,76.8 L135.0,74.6 L140.0,72.7 L145.0,70.9 L150.0,69.2 L155.0,67.7 L160.0,66.2 L165.0,64.9 L170.0,63.7 L175.0,62.6 L180.0,61.6 L185.0,60.7 L190.0,59.9 L195.0,59.1 L200.0,58.3 L205.0,57.7 L210.0,57.1 L215.0,56.5 L220.0,56.0 L225.0,55.5 L230.0,55.1 L235.0,54.7 L240.0,54.3 L245.0,53.9 L250.0,53.6 L255.0,53.3 L260.0,53.1 L265.0,52.8 L270.0,52.6 L275.0,52.4 L280.0,52.2 L285.0,52.0 L290.0,51.9 L295.0,51.7 L300.0,51.6 L305.0,51.4 L310.0,51.3 L315.0,51.2 L320.0,51.1 L325.0,51.0 L330.0,51.0 L335.0,50.9 L340.0,50.8"/>
<g data-k="tan"><line class="ln gr" x1="40" y1="170" x2="106" y2="38"/><text x="108" y="36" class="ts gr">tangente à l'origine</text></g>
<g data-k="p63"><line class="ln dsh" x1="40" y1="94" x2="100" y2="94"/><line class="ln dsh" x1="100" y1="94" x2="100" y2="170"/><circle cx="100" cy="94" r="3.5" class="pt"/><text x="6" y="98" class="tb">63 %</text><text x="96" y="184" class="tb">θ</text></g>
<g data-k="p95"><line class="ln dsh" x1="40" y1="56" x2="220" y2="56"/><line class="ln dsh" x1="220" y1="56" x2="220" y2="170"/><circle cx="220" cy="56" r="3.5" class="pt"/><text x="6" y="66" class="tb">95 %</text><text x="212" y="184" class="tb">3θ</text></g>
</svg>`,
   etapes:[
    {t:'À t = 0, on applique un *échelon d\'amplitude A* à l\'entrée (on passe d\'un coup de 0 à A).',on:['ech']},
    {t:'La sortie monte *sans dépassement*, de plus en plus lentement : c\'est la signature d\'un 1er ordre.',on:['courbe'],f:'s(t) = Gs · A · (1 − e^(−t/θ))'},
    {t:'Elle se stabilise à la *valeur finale*. Le *gain statique* = ce qui sort ÷ ce qui entre, une fois stabilisé.',on:['fin','ech'],f:'Gs = Δs / Δe = s(∞) / A'},
    {t:'À *t = θ*, la sortie a fait *63 %* du chemin : on lit θ sur l\'axe du temps.',on:['p63','courbe'],f:'s(θ) = 0,63 · s(∞)'},
    {t:'La *tangente à l\'origine* coupe la valeur finale exactement à t = θ : une 2e façon de lire θ.',on:['tan','fin']},
    {t:'À *t = 3θ*, la sortie est à *95 %* : c\'est le *temps de réponse à 5 %*.',on:['p95','courbe'],f:'t5% = 3θ'}]},
  {id:'sch-sens',titre:'Le sens d\'action : suis la chaîne des flèches',notions:['sens'],
   legende:'Régulation de niveau, vanne *FMA* sur l\'*arrivée* d\'eau. On imagine que la commande Y augmente et on suit la chaîne.',
   svg:`<svg viewBox="0 0 360 214" role="img" aria-label="Chaîne du sens d'action">
<g data-k="b1"><rect class="bx" x="6" y="16" width="100" height="46" rx="8"/><text x="56" y="36" text-anchor="middle" class="tb">Commande Y</text><text x="56" y="53" text-anchor="middle" class="tb ac">augmente ↑</text></g>
<g data-k="f1"><line class="ln anim" x1="106" y1="39" x2="128" y2="39" marker-end="url(#xsfl)"/></g>
<g data-k="b2"><rect class="bx" x="128" y="16" width="100" height="46" rx="8"/><text x="178" y="34" text-anchor="middle" class="ts">convertisseur I/P</text><text x="178" y="53" text-anchor="middle" class="tb ac">signal ↑ (direct)</text></g>
<g data-k="f2"><line class="ln anim" x1="228" y1="39" x2="250" y2="39" marker-end="url(#xsfl)"/></g>
<g data-k="b3"><rect class="bx" x="250" y="16" width="104" height="46" rx="8"/><text x="302" y="34" text-anchor="middle" class="ts">vanne FMA</text><text x="302" y="53" text-anchor="middle" class="tb ac">s'ouvre ↑</text></g>
<g data-k="f3"><line class="ln anim" x1="302" y1="62" x2="302" y2="100" marker-end="url(#xsfl)"/></g>
<g data-k="b4"><rect class="bx" x="250" y="100" width="104" height="46" rx="8"/><text x="302" y="118" text-anchor="middle" class="ts">débit d'arrivée</text><text x="302" y="137" text-anchor="middle" class="tb ac">augmente ↑</text></g>
<g data-k="f4"><line class="ln anim" x1="250" y1="123" x2="228" y2="123" marker-end="url(#xsfl)"/></g>
<g data-k="b5"><rect class="bx" x="128" y="100" width="100" height="46" rx="8"/><text x="178" y="118" text-anchor="middle" class="ts">niveau dans le bac</text><text x="178" y="137" text-anchor="middle" class="tb ac">monte ↑</text></g>
<g data-k="f5"><line class="ln anim" x1="128" y1="123" x2="106" y2="123" marker-end="url(#xsfl)"/></g>
<g data-k="b6"><rect class="bx" x="6" y="100" width="100" height="46" rx="8"/><text x="56" y="118" text-anchor="middle" class="ts">mesure X</text><text x="56" y="137" text-anchor="middle" class="tb ac">monte ↑</text></g>
<g data-k="concl"><text x="180" y="176" text-anchor="middle" class="tb">Y ↑ ⇒ X ↑ : procédé DIRECT</text><text x="180" y="200" text-anchor="middle" class="tb wa">⇒ régulateur INVERSE</text></g>
</svg>`,
   etapes:[
    {t:'On part toujours de la *commande Y* : on imagine qu\'elle *augmente*.',on:['b1']},
    {t:'Le *convertisseur* (courant → pression) est presque toujours *direct* : son signal augmente aussi.',on:['f1','b2']},
    {t:'La *vanne* : *FMA* (fermée par manque d\'air) → plus de signal = elle *s\'ouvre*. Une *OMA* ferait l\'inverse.',on:['f2','b3']},
    {t:'La vanne est sur l\'*arrivée* : elle s\'ouvre, donc le *débit d\'entrée augmente*. (Sur la sortie, c\'est le débit de vidange qui augmenterait.)',on:['f3','b4']},
    {t:'Plus d\'eau qui arrive : le *niveau monte*, et la *mesure X* aussi (transmetteur direct).',on:['f4','b5','f5','b6']},
    {t:'Y ↑ fait monter X : le *procédé est direct*. Le régulateur doit agir *à l\'opposé* : il sera *inverse*.',on:['b1','b6','concl'],f:'Y↑ ⇒ X↑ : procédé direct ⇒ régulateur inverse'}]}],
  apps:[
  {id:'reg-lire',titre:'Lire le schéma de la boucle (entrées, sorties, formules)',methode:'m-blocs',schema:'sch-boucle',
   tirage:{kp:[1,2,3,4,9],K:[1,2,3],theta:[10,20,40]},calc:{KBO:'kp*K',Gbf:'KBO/(1+KBO)',eps:'100/(1+KBO)',tbf:'theta/(1+KBO)'},
   si:'entier(eps) && entier(tbf)',
   niveaux:[
    {enonce:'Boucle à *retour unitaire* (B = 1). Correcteur proportionnel C(p) = {{kp}}. Procédé H(p) = {{K}} / (1 + {{theta}}p). La consigne W est un échelon.',
     parts:[{q:'Le signal qui sort du comparateur, c\'est…',choix:['l\'écart ε = W − X','la commande Y','la mesure X','la perturbation Z'],bonne:0,explication:'Le comparateur fait consigne − mesure : c\'est l\'écart ε.'},
      {q:'Dans la formule de la boucle fermée, au numérateur on met…',choix:['la chaîne directe C·H','1 + C·H','la chaîne de retour B','la consigne W'],bonne:0,explication:'Black : BF = chaîne directe / (1 + chaîne directe × retour).'},
      {q:'La boucle ouverte BO, c\'est…',choix:['C·H·B : tout le tour, coupé avant le comparateur','C·H / (1 + C·H)','W − X','H seul'],bonne:0,explication:'BO = produit de tous les blocs de la boucle (aller + retour).'}]},
    {enonce:'Boucle à retour unitaire. C(p) = {{kp}} et H(p) = {{K}} / (1 + {{theta}}p). Consigne en échelon. Tout se fait de tête : en régime permanent, p → 0.',
     parts:[{q:'Gain statique de la boucle ouverte K = C(0) · H(0) ?',rep:'KBO',aide:'En p = 0 : C(0) = {{kp}} et H(0) = {{K}}.',explication:'K = {{kp}} × {{K}} = {{KBO}}.'},
      {q:'Gain statique de la boucle fermée ?',rep:'Gbf',aide:'BF(0) = K / (1 + K).',explication:'{{KBO}} / (1 + {{KBO}}) = {{Gbf}}.'},
      {q:'Écart statique, en % de la consigne ?',rep:'eps',unite:'%',aide:'Classe 0 : εs = A / (1 + K).',explication:'100 / (1 + {{KBO}}) = {{eps}} %.'}]},
    {enonce:'Retour unitaire, C(p) = {{kp}}, H(p) = {{K}} / (1 + {{theta}}p). Consigne en échelon de 100 %.',
     parts:[{q:'Écart statique (en %) ?',rep:'eps',unite:'%',explication:'K = {{KBO}}, εs = 100 / (1 + {{KBO}}) = {{eps}} %.'},
      {q:'Constante de temps de la boucle fermée θBF = θ / (1 + K) ?',rep:'tbf',unite:'s',explication:'La BF reste un 1er ordre : {{theta}} / (1 + {{KBO}}) = {{tbf}} s. Elle est plus rapide que le procédé seul.'},
      {q:'Si on double kp, l\'écart statique…',choix:['diminue, sans devenir nul','augmente','ne change pas','devient nul'],bonne:0,explication:'K double, donc 1 + K grandit : εs diminue. Il ne s\'annule qu\'avec une action intégrale (et trop de gain menace la stabilité : c\'est le dilemme).'}]}]},
  {id:'reg-o1',titre:'Premier ordre : lire Gs et θ sur la réponse',methode:'m-carac',schema:'sch-ordre1',
   tirage:{A:[1,2,4,5,10],Gs:[0.5,2,3,5],theta:[2,4,5,10,20]},calc:{sinf:'Gs*A',t5:'3*theta'},
   niveaux:[
    {enonce:'Un système du 1er ordre reçoit un échelon de {{A}}. Sa sortie monte sans dépasser et se stabilise à {{sinf}}.',
     parts:[{q:'Pour trouver le gain statique Gs, tu fais…',choix:['sortie finale ÷ échelon','échelon ÷ sortie finale','sortie finale × échelon','tu lis la sortie à 63 %'],bonne:0,explication:'Gs = Δs / Δe : ce qui sort ÷ ce qui entre, une fois stabilisé.'},
      {q:'La constante de temps θ se lit quand la sortie atteint…',choix:['63 % de sa valeur finale','95 % de sa valeur finale','50 % de sa valeur finale','sa valeur finale'],bonne:0,explication:'À t = θ, 63 %. À 3θ, 95 %.'}]},
    {enonce:'Échelon d\'entrée de {{A}}. La sortie se stabilise à {{sinf}} ; elle passe par 63 % de cette valeur à t = {{theta}} s.',
     parts:[{q:'Gain statique Gs ?',rep:'Gs',aide:'Gs = s(∞) / A.',explication:'{{sinf}} / {{A}} = {{Gs}}.'},
      {q:'Constante de temps θ ?',rep:'theta',unite:'s',aide:'Lecture directe à 63 %.',explication:'θ = {{theta}} s (63 % atteint).'},
      {q:'Temps de réponse à 5 % ?',rep:'t5',unite:'s',aide:'t5% = 3θ.',explication:'3 × {{theta}} = {{t5}} s.'}]},
    {enonce:'H(p) = {{Gs}} / (1 + {{theta}}p). On applique un échelon de {{A}}.',
     parts:[{q:'Valeur finale de la sortie ?',rep:'sinf',explication:'Valeur finale = Gs · A = {{Gs}} × {{A}} = {{sinf}}.'},
      {q:'Au bout de combien de temps la sortie est-elle à 95 % ?',rep:'t5',unite:'s',explication:'t5% = 3θ = {{t5}} s.'},
      {q:'Si θ double, le système…',choix:['met deux fois plus de temps, même valeur finale','monte plus haut','devient plus rapide','se met à osciller'],bonne:0,explication:'θ règle la vitesse, Gs la valeur finale. Un 1er ordre n\'oscille jamais.'}]}]},
  {id:'reg-sens',titre:'Sens d\'action : suivre la chaîne',methode:'m-sens',schema:'sch-sens',
   tirage:{v:[0,1],pos:[0,1]},calc:{},
   niveaux:[
    {enonce:'Régulation de niveau d\'un bac. Vanne {{si(v==0,"FMA (fermée par manque d’air)","OMA (ouverte par manque d’air)")}} placée sur {{si(pos==0,"l’arrivée","la vidange")}} du bac. Convertisseur et transmetteur directs.',
     parts:[{q:'La commande Y augmente. La vanne…',choix:['{{si(v==0,"s’ouvre","se ferme")}}','{{si(v==0,"se ferme","s’ouvre")}}'],bonne:0,explication:'FMA : plus de signal ⇒ elle s’ouvre. OMA : l’inverse.'},
      {q:'Et donc le niveau dans le bac…',choix:['{{si(v==pos,"monte","baisse")}}','{{si(v==pos,"baisse","monte")}}'],bonne:0,explication:'Vanne sur l’arrivée : ouverte ⇒ plus d’eau entre. Sur la vidange : ouverte ⇒ plus d’eau sort.'}]},
    {enonce:'Bac régulé en niveau. Vanne {{si(v==0,"FMA","OMA")}} sur {{si(pos==0,"l’arrivée","la vidange")}}. Tous les autres appareils sont directs.',
     parts:[{q:'Le procédé (de Y à X) est…',choix:['{{si(v==pos,"direct","inverse")}}','{{si(v==pos,"inverse","direct")}}'],bonne:0,explication:'Y ↑ ⇒ {{si(v==pos,"X ↑ : direct","X ↓ : inverse")}}.'},
      {q:'Le régulateur doit être…',choix:['{{si(v==pos,"inverse","direct")}}','{{si(v==pos,"direct","inverse")}}'],bonne:0,explication:'Toujours le sens opposé au procédé.'}]},
    {enonce:'Vanne {{si(v==0,"FMA","OMA")}} sur {{si(pos==0,"l’arrivée","la vidange")}} d’un bac régulé en niveau.',
     parts:[{q:'Sens du régulateur ?',choix:['{{si(v==pos,"inverse","direct")}}','{{si(v==pos,"direct","inverse")}}'],bonne:0,explication:'Y ↑ ⇒ vanne {{si(v==0,"s’ouvre","se ferme")}} ⇒ niveau {{si(v==pos,"monte","baisse")}} : procédé {{si(v==pos,"direct","inverse")}}, donc régulateur {{si(v==pos,"inverse","direct")}}.'},
      {q:'On remplace la vanne par une vanne de type opposé ({{si(v==0,"OMA","FMA")}}). Le régulateur…',choix:['doit changer de sens','garde le même sens','n’a plus de sens d’action','doit passer en manuel'],bonne:0,explication:'Changer le type de vanne inverse le procédé : il faut inverser le régulateur.'}]}]}]
};
