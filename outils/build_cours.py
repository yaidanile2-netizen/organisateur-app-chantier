#!/usr/bin/env python3
"""Construit public/cours/index.html à partir de l'app de révision « Réviser le DS » (multi-matières).

Usage : python3 outils/build_cours.py <source.html> [public/cours/index.html]

Adaptations pour l'Organisateur (onglet Cours, chargé dans un cadre de même origine) :
  1. Synchro de la progression par n8n (POST /webhook/revisions, table cours_donnees) au lieu de la base
     de l'artefact Claude : clé « prog:v3-<matière> ». La progression de l'ancienne app (« prog:regulation »)
     est reprise si rien d'autre n'existe. Les modules importés sont aussi synchronisés (« pack:imp-… »).
  2. Programme de révision du jour (blocs d'étude de l'agenda) en haut de l'accueil et de la bibliothèque.
     Chaque révision ouvre directement la bonne préparation, en changeant de matière si besoin :
       - « Préparer le TD de demain » → onglet TD, préparation du bon TD (n° d'après l'avancement des TD) ;
       - DS étape 1 Réviser / 2 Appliquer / 3 Valider → séance 1 / 2 / 3 de l'onglet DS.
  3. window.Cours pour l'organisateur : jour(items), ouvrir(item), contexte() (pour l'assistant IA).
"""
import sys
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding='utf-8')
dest = Path(sys.argv[2] if len(sys.argv) > 2 else 'public/cours/index.html')


def remplacer(texte: str, avant: str, apres: str, n: int = 1) -> str:
    if texte.count(avant) != n:
        raise SystemExit(f'Motif trouvé {texte.count(avant)} fois au lieu de {n} : {avant[:80]!r}')
    return texte.replace(avant, apres)


html = src

# ---------- 1. Synchro n8n ----------
debut = html.index('const DBS={db:null,ok:false,path:SUBJ.db')
fin = html.index('this.busy=false;if(this.pending)this.flush();}};', debut) + len('this.busy=false;if(this.pending)this.flush();}};')
html = html[:debut] + r"""/* Synchro entre appareils par l'Organisateur (n8n → Supabase, table cours_donnees). */
const API_COURS='https://n8n-production-bdf5.up.railway.app/webhook/revisions';
const DBS={ok:false,cle:'prog:v3-'+SUBJ.id,t:null,busy:false,pending:null,
  async post(body){const s=JSON.stringify(body);const r=await fetch(API_COURS,{method:'POST',headers:{'content-type':'application/json'},body:s,keepalive:s.length<60000});if(!r.ok)throw new Error('http '+r.status);return r.json();},
  async init(){try{const d=await this.post({action:'etat'});this.ok=true;const els=d.elements||[];const get=k=>(els.find(e=>e&&e.cle===k)||{}).data;
    const r=get(this.cle);
    if(r&&(r.updatedAt||0)>(ST.updatedAt||0)){ST=mergeST(r);lsSet(KEY,ST);idxUpdate();render();}
    else if(!r&&!ST.updatedAt&&SUBJ.id==='regulation'){const o=get('prog:regulation');if(o&&migrateOld(o)){saveState();render();}}
    else if(ST.updatedAt&&(!r||ST.updatedAt>(r.updatedAt||0)))this.write(ST);
    ORG.imports(els);}catch(e){this.ok=false;}},
  write(st){if(!this.ok)return;this.pending=JSON.parse(JSON.stringify(st));clearTimeout(this.t);this.t=setTimeout(()=>{this.t=null;this.flush();},1200);},
  async flush(){if(this.busy||!this.pending)return;const data=this.pending;this.pending=null;this.busy=true;
    try{await this.post({action:'ecrire',cle:this.cle,data});}catch(e){if(!this.pending)this.pending=data;clearTimeout(this.t);this.t=setTimeout(()=>{this.t=null;this.flush();},15000);}
    this.busy=false;if(this.pending&&!this.t)this.flush();}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&DBS.pending){clearTimeout(DBS.t);DBS.t=null;DBS.flush();}});""" + html[fin:]

# Modules importés : envoyés en ligne à l'import, retirés à la suppression.
html = remplacer(html, "const imps=lsGet(IMP_KEY,[]).filter(m=>m.id!==id);imps.push(meta);lsSet(IMP_KEY,imps);",
                 "const imps=lsGet(IMP_KEY,[]).filter(m=>m.id!==id);imps.push(meta);lsSet(IMP_KEY,imps);ORG.envoyerImport(meta,r.data);")
html = remplacer(html, "XA.libDel=(d,b)=>twoStep(b,'Appuie encore pour retirer',()=>{",
                 "XA.libDel=(d,b)=>twoStep(b,'Appuie encore pour retirer',()=>{ORG.retirerImport(d.id);")

# Mots clés d'un module importé (<meta name="mots-cles">) : pour que l'agenda retrouve la matière.
html = remplacer(html, "const meta=Object.assign({},r.meta,{id,key:'mt2e:'+id+':v1',db:'progress/'+id});",
                 "const meta=Object.assign({},r.meta,{id,key:'mt2e:'+id+':v1',db:'progress/'+id,mots:(txt.match(/<meta\\s+name=\"mots-cles\"\\s+content=\"([^\"]*)\"/i)||[])[1]||''});")

# Correctif : le mini DS bouclait sans fin quand une matière a moins de 8 QCM.
html = remplacer(html, "const qs=[];let k=0;while(qs.length<8){", "const qs=[];let k=0;while(qs.length<8&&by.some(a=>a.length)){")

# Modules : un TD peut couvrir plusieurs chapitres (XTD.mods) ou des notions précises (XTD.notions).
html = remplacer(html, "notions:notions.filter(n=>n.secteur===mod).map(n=>n.id)",
                 "notions:(Array.isArray(t.notions)&&t.notions.length?t.notions.map(String).filter(id=>notions.some(n=>n.id===id)):notions.filter(n=>(Array.isArray(t.mods)&&t.mods.length?t.mods.map(String):[mod]).includes(n.secteur)).map(n=>n.id))")
# « Ce qu'il faut revoir pour le DS » en haut de l'onglet DS.
html = remplacer(html, 'return `<div class="fade"><div class="eyebrow">DS · ${esc(PK.court||SUBJ.titre)}</div>',
                 'return `<div class="fade">${ORG.dsHTML(true)}<div class="eyebrow">DS · ${esc(PK.court||SUBJ.titre)}</div>')

# Réviser : tuile, sous-menu et vues « DS corrigés ».
html = remplacer(html, "['exercices','✍️','Exercices corrigés','TD et DS corrigés étape par étape'],",
                 "['exercices','✍️','Exercices corrigés','TD et DS corrigés étape par étape'],['dscorr','📝','DS corrigés',ORG.dscSous()],")
html = remplacer(html, "const XREV_TOP=['cours','quiz','flash','comp','exercices','examen','fiches'];",
                 "const XREV_TOP=['cours','quiz','flash','comp','exercices','dscorr','examen','fiches'];")
html = remplacer(html, "['exercices','✍️ Exercices'],", "['exercices','✍️ Exercices'],['dscorr','📝 DS corrigés'],")
html = remplacer(html, "reglages:vReglages,lib:vLib,", "reglages:vReglages,lib:vLib,dscorr:()=>ORG.vDsc(),'dscorr-ex':()=>ORG.vDscEx(),")

# ---------- 2. Programme du jour sur l'accueil et la bibliothèque ----------
html = remplacer(html, "  return `<div class=\"fade\">\n  <section class=\"card hero-dark\">\n    <div class=\"eyebrow\" style=\"color:var(--gold)\">Es-tu prêt pour le DS ?</div>",
                 "  return `<div class=\"fade\">${ORG.html()}${ORG.dsHTML(false)}\n  <section class=\"card hero-dark\">\n    <div class=\"eyebrow\" style=\"color:var(--gold)\">Es-tu prêt pour le DS ?</div>")
html = remplacer(html, "  return `<div class=\"fade\"><div class=\"eyebrow\">Tes matières</div><h2 class=\"disp\">Choisis ta matière</h2>",
                 "  return `<div class=\"fade\">${ORG.html()}<div class=\"eyebrow\">Tes matières</div><h2 class=\"disp\">Choisis ta matière</h2>")

# Bibliothèque : modèle de module à télécharger, et texte sur la synchro des modules importés.
html = remplacer(html, """<label class="btn primary block x-file">➕ Importer un module (.html)<input type="file" accept=".html,.htm,text/html" id="libFile"></label>
   <p class="small mut" style="margin-top:8px">Un module importé reste sur cet appareil. Pour l’avoir partout, mets-le dans la banque du projet et demande à Claude de l’ajouter.</p>""",
  """<label class="btn primary block x-file">➕ Importer un module (.html)<input type="file" accept=".html,.htm,text/html" id="libFile"></label>
   <a class="btn ghost block" href="modele-module.html" download="modele-module-revision.html" style="margin-top:8px;text-decoration:none">📄 Télécharger le modèle de module</a>
   <p class="small mut" style="margin-top:8px">Le modèle explique quoi remplir (tu peux le donner à Claude avec tes cours). Ouvre-le dans un navigateur pour vérifier qu’il est bon avant de l’importer. Un module importé est synchronisé sur ton téléphone et ton PC.</p>""")

# ---------- 3. Pont avec l'Organisateur ----------
ORG = r"""
/* =============================================================================
   ██  ORGANISATEUR : programme de révision du jour (blocs d'étude de l'agenda),
       ouverture directe de la bonne préparation (TD la veille, séances de DS),
       contexte de l'écran pour l'assistant IA.
   ============================================================================= */
const ORG={items:[],
  /* nom du module dans l'emploi du temps → matière de l'app */
  motsCles:{regulation:/r[ée]gulation|r3[.\s]?08/i,climatisation:/traitement.{0,6}air|climatisation|\bclim\b/i,rayonnement:/rayonnement|transferts?.{0,14}(ray|conv)/i,
    electrothermie:/[ée]lectrothermi/i,hydroaero:/hydro|a[ée]rauli|r[ée]seaux|r3[.\s]?05/i,carbone:/carbone|r3[.\s]?09/i,re2020:/re\s?2020|r[ée]glementation/i},
  norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();},
  sujet(it){if(!it)return null;const t=(it.matiere||'')+' '+(it.titre||'');const all=allSubjects();
    for(const m of all){const re=ORG.motsCles[m.id];if(re&&re.test(t))return m;}
    const nt=ORG.norm(t);
    for(const m of all){const mc=String(m.mots||'').split(/[,;]/).map(x=>ORG.norm(x).trim()).filter(x=>x.length>2);if(mc.some(k=>nt.includes(k)))return m;}
    /* noms proches : abréviation, faute, pluriel, mots dans le désordre, même code de module */
    let best=null,bs=0.66;for(const m of all){const noms=[m.titre,m.court,m.sous,m.code].concat(String(m.mots||'').split(/[,;]/)).filter(Boolean);
      for(const x of noms){const sc=ORG.sim(it.matiere,x);if(sc>=bs){bs=sc+1e-9;best=m;}}}
    return best;},
  /* même algorithme que similarite() de l'organisateur (src/suiviTD.ts) */
  vides:new Set(['de','des','du','la','le','les','et','en','aux','au','un','une','pour','sur','dans','avec','cours','td','tp','ds','cm','semestre','module']),
  codes(t){return [...String(t||'').matchAll(/\b([rs]\d)\s*[.,]?\s*(\d{2})\b/gi)].map(m=>(m[1]+m[2]).toLowerCase());},
  mots(t){return ORG.norm(String(t||'').replace(/\b[rs]\d\s*[.,]?\s*\d{2}\b/gi,' ')).replace(/[^a-z0-9]+/g,'-').split('-').filter(w=>w.length>=3&&!ORG.vides.has(w)&&!/^\d+$/.test(w));},
  dist(a,b){const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t;}}return d[b.length];},
  proches(a,b){if(a===b)return true;let p=0;while(p<a.length&&p<b.length&&a[p]===b[p])p++;if(p>=4&&p>=Math.min(a.length,b.length)-1)return true;
    const l=Math.min(a.length,b.length);return l>=5&&ORG.dist(a,b)<=(l>=8?2:1);},
  sim(x,y){const cx=ORG.codes(x);if(cx.length&&ORG.codes(y).some(c=>cx.includes(c)))return 1;const a=ORG.mots(x),b=ORG.mots(y);if(!a.length||!b.length)return 0;
    const [pe,gr]=a.length<=b.length?[a,b]:[b,a];return pe.filter(w=>gr.some(v=>ORG.proches(w,v))).length/pe.length;},
  /* ce qu'ouvre chaque révision de l'agenda */
  action(it){const e=ORG.norm(it.etape),t=it.type;
    if(t==='td'||t==='tp'||/prepar/.test(e))return{k:'td',td:+it.td||0,l:'Préparer le '+(t==='tp'?'TP':'TD')+(it.td?' '+it.td:'')};
    if(t==='ds'){const n=/appliq/.test(e)?2:/valid/.test(e)?3:1;return{k:'seance',n,l:'DS · séance '+n+' de 30 min'};}
    return{k:'home',l:'Ouvrir la matière'};},
  tdPour(n){if(n){const re=new RegExp('\\bTD\\s*'+n+'\\b','i');const t=XTD.find(x=>x.id==='td'+n||re.test(x.titre));if(t)return t;}
    return XTD.find(t=>!XS().td[t.id])||XTD[0]||null;},
  faire(a){
    if(a.k==='seance'&&XDS.some(s=>s.n===a.n)){tab('ds');XA.openDs({n:a.n});return;}
    if(a.k==='td'){const t=ORG.tdPour(a.td);tab('td');if(t){XA.openTd({id:t.id});toast('Préparation : '+t.titre);}return;}
    tab('home');},
  ouvrir(it){const m=ORG.sujet(it);const a=ORG.action(it);
    if(!m){tab('home');toast('Pas encore de cours pour « '+(it.matiere||'cette matière')+' » dans l’app');return;}
    if(m.id!==SUBJ.id){lsSet('org:action',{a,at:Date.now()});switchSubject(m.id);return;}
    ORG.faire(a);},
  /* après un changement de matière (rechargement), on termine l'ouverture demandée */
  boot(){const p=lsGet('org:action',null);if(!p)return;try{localStorage.removeItem('org:action');}catch(e){}
    if(Date.now()-(p.at||0)<60000)setTimeout(()=>ORG.faire(p.a),30);},
  html(){if(!ORG.items.length)return '';
    return `<section class="card"><div class="eyebrow">📅 Ton programme de révision</div>
    <p class="small mut" style="margin-top:4px">Tes révisions de l’agenda. Touche-en une pour ouvrir directement la bonne préparation.</p>
    ${ORG.items.map((it,i)=>{const m=ORG.sujet(it);const a=ORG.action(it);const ic=it.fait?'✓':a.k==='td'?'📝':a.k==='seance'?'🎯':'📚';
      return `<button class="x-row2" data-x="orgGo" data-i="${i}" style="border-top:1px dashed var(--line)"><span class="ic" style="${it.fait?'background:var(--green-bg);color:var(--green)':''}">${ic}</span>
        <span style="flex:1;min-width:0"><b>${esc(it.quand)} · ${esc(m?(m.court||m.titre):it.matiere)}</b><small>${esc(a.l)}${it.echeance?' · '+esc(it.echeance):''}${m?(m.id===SUBJ.id?'':' · change de matière'):' · pas encore dans l’app'}</small></span><span class="arr" style="color:var(--faint);font-size:20px">›</span></button>`;}).join('')}
    </section><div class="sp"></div>`;},
  /* modules importés : partagés entre appareils */
  imports(els){let n=0;const imps=lsGet(IMP_KEY,[]);
    els.forEach(e=>{if(!e||!/^pack:imp-/.test(e.cle)||!e.data||!e.data.meta||!e.data.raw)return;const id=e.cle.slice(5);
      if(imps.some(m=>m.id===id))return;if(!lsSet2('mt2e:imp:'+id,e.data.raw))return;imps.push(e.data.meta);n++;});
    if(n){lsSet(IMP_KEY,imps);if(route.v==='lib')render();}},
  envoyerImport(meta,raw){const data={meta,raw};if(JSON.stringify(data).length<380000)DBS.post({action:'ecrire',cle:'pack:'+meta.id,data}).catch(()=>{});},
  retirerImport(id){DBS.post({action:'supprimer',cle:'pack:'+id}).catch(()=>{});}
};
/* ---------- Préparer le DS d'après les TD : quels cours revoir, lesquels laisser ----------
   Lien TD ↔ cours : les TD numérotés (id « td3 » ou titre « TD 3 »), les exercices et les méthodes
   dont le titre cite « TD n (ex. k) ». L'avancement noté dans l'Organisateur (td.avancement, même
   origine) dit jusqu'où la classe est arrivée et quels exos sont à revoir ou importants ; la prévision
   jusqu'au DS arrive par td.previsions. */
ORG.refs=function(txt){const out=[];String(txt||'').replace(/\bTD\s*(?:n°\s*)?(\d+)(?:[^\d<]{0,16}?\bex(?:ercice|o|\.)?\s*(\d+))?/gi,(m,a,b)=>{out.push([+a,b?+b:0]);return m;});return out;};
ORG.carteTD=function(){if(ORG._carte)return ORG._carte;const C={};
  const add=(td,k,ids)=>{const c=C[td]||(C[td]={all:new Set(),exo:{}});ids.forEach(id=>{if(!NBY[id])return;c.all.add(id);if(k)(c.exo[k]||(c.exo[k]=new Set())).add(id);});};
  XTD.forEach(t=>{const r=/^td(\d+)$/i.exec(String(t.id));const n=r?+r[1]:(ORG.refs(t.titre)[0]||[])[0];if(n)add(n,0,t.notions||[]);});
  EXERCICES.forEach(e=>{const ids=NOT.filter(x=>x.secteur===e.m).map(x=>x.id);ORG.refs(e.titre).forEach(([n,k])=>add(n,k,ids));});
  METH.forEach(m=>{ORG.refs((m.sous||'')+' '+(m.titre||'')).forEach(([n,k])=>add(n,k,m.notions||[]));});
  return ORG._carte=C;};
ORG.monSuivi=function(){const a=lsGet('td.avancement',null);if(!a||!a.matieres)return null;
  for(const [cle,m] of Object.entries(a.matieres)){const sj=ORG.sujet({matiere:m.nom});if(sj&&sj.id===SUBJ.id)return{cle,m};}return null;};
ORG.planDS=function(){const su=ORG.monSuivi();if(!su)return null;const s=su.m;const C=ORG.carteTD();const nums=Object.keys(C).map(Number).sort((a,b)=>a-b);
  const der=(s.seances||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).pop();
  const prev=(lsGet('td.previsions',{})||{})[su.cle]||null;
  const T=Math.max(der?der.td:0,prev&&new Date(prev.date)>new Date()?prev.td:0);
  const coursVu=(s.cours||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).pop()||null;
  const base={cle:su.cle,nom:s.nom,T,prev:prev&&new Date(prev.date)>new Date()?prev:null,der,coursVu};
  if(!nums.length||!T)return Object.assign(base,{vide:!nums.length});
  const need=new Set(),prio=new Map();
  nums.filter(n=>n<=T).forEach(n=>C[n].all.forEach(id=>need.add(id)));
  Object.entries(s.tds||{}).forEach(([n,info])=>{const c=C[+n];if(!c)return;
    const mark=(k,why)=>{const ids=c.exo[k]&&c.exo[k].size?c.exo[k]:c.all;ids.forEach(id=>{need.add(id);const r=prio.get(id)||[];if(!r.includes(why))r.push(why);prio.set(id,r);});};
    Object.entries(info.exos||{}).forEach(([k,et])=>{if(et==='revoir')mark(+k,'🔁 TD '+n+' ex. '+k);});
    Object.keys(info.importants||{}).forEach(k=>mark(+k,'⭐ TD '+n+' ex. '+k));});
  const inTD=new Set();nums.forEach(n=>C[n].all.forEach(id=>inTD.add(id)));
  const later=NOT.filter(x=>!need.has(x.id)&&nums.some(n=>n>T&&C[n].all.has(x.id))).map(x=>x.id);
  const seul=NOT.filter(x=>!inTD.has(x.id)).map(x=>x.id);
  return Object.assign(base,{prio:NOT.filter(x=>prio.has(x.id)).map(x=>({id:x.id,why:prio.get(x.id)})),voir:NOT.filter(x=>need.has(x.id)&&!prio.has(x.id)).map(x=>x.id),laisser:later,seul,tdsApres:nums.filter(n=>n>T)});};
ORG.parModule=function(ids){const by={};ids.forEach(id=>{const n=NBY[id];(by[n.secteur]=by[n.secteur]||[]).push(n);});
  return SECT.filter(sc=>by[sc.id]).map(sc=>`<div class="x-dsmod"><b>${esc(sc.nom)}</b><div class="x-exos">${by[sc.id].map(n=>`<button class="chip" data-x="openN" data-n="${esc(n.id)}">${n.num}. ${esc(n.titre)}</button>`).join('')}</div></div>`).join('');};
ORG.coursVuHTML=function(P){const c=P&&P.coursVu;if(!c)return '';const q=new Date(c.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
  return `<p class="small" style="margin-top:6px">📖 <b>Cours vu en classe :</b> ${c.partie?'jusqu’à la partie '+esc(c.partie):esc(String(c.texte).slice(0,120))} (le ${q}).${c.resume?' <span class="mut">'+esc(c.resume)+'</span>':''}</p>`;};
/* Mini DS et séances : seulement ce qui a déjà été vu (chapitres des TD faits ou prévus d'ici le DS) */
ORG.poolVu=function(pool){try{const P=ORG.planDS();if(!P||!P.T||!(P.voir||[]).length&&!(P.prio||[]).length)return pool;
  const vus=new Set(P.voir.concat(P.prio.map(x=>x.id)));const secs=new Set([...vus].map(id=>NBY[id]&&NBY[id].secteur).filter(Boolean));
  const f=pool.filter(q=>q.n?vus.has(q.n):secs.has(q.m));return f.length>=8?f:pool;}catch(e){return pool;}};
ORG.dsHTML=function(dansDS){const P=ORG.planDS();
  if(!P){return dansDS?`<section class="card tight"><div class="eyebrow">🎯 Quoi réviser pour le DS</div><p class="small mut" style="margin-top:4px">Note ton avancement après chaque TD (Agenda → « jusqu’où es-tu arrivé ? ») : je te dirai ici quels cours revoir pour le DS, et lesquels laisser de côté.</p></section><div class="sp"></div>`:'';}
  if(P.vide||!P.T)return dansDS?`<section class="card tight"><div class="eyebrow">🎯 Quoi réviser pour le DS</div><p class="small mut" style="margin-top:4px">${P.vide?'Ce module ne relie pas encore ses TD au cours (TD numérotés « td1 », « td2 »… avec leurs chapitres). Demande à Claude de l’ajouter avec le modèle de module.':'Note d’abord jusqu’où tu es arrivé dans un TD.'}</p>${ORG.coursVuHTML(P)}</section><div class="sp"></div>`:'';
  ORG.cacheDS(P);
  const jusqua=P.prev?`TD ${P.prev.td}${P.prev.exo?' ex. '+P.prev.exo:''} (prévu au DS du ${new Date(P.prev.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})})`:`TD ${P.T} (là où tu en es)`;
  const nb=P.prio.length+P.voir.length;
  return `<section class="card" style="border-left:4px solid var(--accent)"><div class="eyebrow">🎯 Quoi réviser pour le DS</div>
   <p class="small mut" style="margin-top:4px">D’après tes TD : programme jusqu’au ${esc(jusqua)}. ${nb} notion${nb>1?'s':''} à revoir${P.laisser.length?', '+P.laisser.length+' à laisser de côté':''}. Touche une notion pour l’ouvrir. Le mini DS ne pose que des questions sur ce que tu as déjà vu.</p>${ORG.coursVuHTML(P)}
   ${P.prio.length?`<h3 class="mt12">En priorité</h3><p class="small mut">Liées à tes exos à revoir ou importants.</p><div class="x-exos">${P.prio.map(x=>{const n=NBY[x.id];return `<button class="chip warn" data-x="openN" data-n="${esc(n.id)}">${n.num}. ${esc(n.titre)} <small>· ${esc(x.why.join(', '))}</small></button>`;}).join('')}</div>`:''}
   ${P.voir.length?`<h3 class="mt12">À revoir</h3><p class="small mut">Le cours des TD faits (ou prévus d’ici le DS).</p>${ORG.parModule(P.voir)}`:''}
   ${P.laisser.length?`<h3 class="mt12">Pas besoin pour ce DS</h3><p class="small mut">Pas encore traité en TD (TD ${P.tdsApres.join(', ')}). À laisser de côté, sauf si le prof l’annonce au programme.</p>${ORG.parModule(P.laisser)}`:''}
   ${P.seul.length?`<details class="mt12"><summary class="small">Cours sans TD (${P.seul.length}) : à survoler</summary><p class="small mut">Aucun TD n’y renvoie : il peut tomber en question de cours.</p>${ORG.parModule(P.seul)}</details>`:''}
  </section><div class="sp"></div>`;};
/* résumé pour les révisions planifiées de l'Organisateur (consignes des blocs DS) */
ORG.cacheDS=function(P){try{const c=lsGet('cours.ds',{})||{};const noms=ids=>[...new Set(ids.map(id=>SBY[NBY[id].secteur].nom))];
  c[P.cle]={sujet:SUBJ.titre,T:P.T,prio:P.prio.map(x=>NBY[x.id].titre).slice(0,8),voir:noms(P.voir.concat(P.prio.map(x=>x.id))),laisser:noms(P.laisser).filter(x=>!noms(P.voir.concat(P.prio.map(y=>y.id))).includes(x)),at:Date.now()};lsSet('cours.ds',c);}catch(e){}};
window.addEventListener('storage',e=>{if(['td.avancement','td.previsions'].includes(e.key)&&['home','ds'].includes(route.v))render();});
/* ---------- Réviser → DS corrigés : les sujets de DS, exercice par exercice et dans l'ordre ----------
   Exercices dont le titre commence par « DS 2025 — », « DS1 — », « Contrôle — »… (ils restent aussi dans
   « Exercices corrigés »), et pour les matières intégrées, les vrais sujets de l'onglet DS. */
ORG.DSRE=/^\s*((?:DS|D\.S\.|devoir surveill[ée]|contr[ôo]le(?: continu)?|partiel|examen)(?![a-zà-ÿ])[^—:–]*?)\s*[—:–]/i;
ORG.dsCorr=function(){if(ORG._dsc)return ORG._dsc;const G=new Map();
  const annee=t=>{const y=(String(t).match(/(?:19|20)\d{2}/g)||[]).map(Number);return y.length?Math.max(...y):0;};
  const num=t=>{const m=String(t).match(/\bex(?:ercice|o|\.)?\s*(\d+)/i);return m?+m[1]:99;};
  const add=(label,it)=>{const k=String(label).replace(/\s+/g,' ').trim();if(!G.has(k))G.set(k,{label:k,items:[]});G.get(k).items.push(it);};
  if(!PK.legacy)(PK.ds||[]).filter(d=>!d.gen&&Array.isArray(d.exercices)&&d.exercices.length).forEach(d=>d.exercices.forEach((e,i)=>add(d.titre,{k:'sujet',ds:d.id,i,titre:e.titre,n:i+1,pts:e.points,nq:(e.questions||[]).length})));
  const sujets=[...G.keys()].map(k=>ORG.norm(k));
  EXERCICES.forEach((e,j)=>{const ex=(e.meth&&e.meth.exemple)||{};const m=ORG.DSRE.exec(e.titre)||ORG.DSRE.exec((ex.source||'')+' —');if(!m)return;
    /* « DS d'entraînement, exercice 2 » : le n° d'exercice ne fait pas partie du nom du sujet */
    const nx=m[1].match(/[,;]?\s*\bex(?:ercice|o|\.)?\s*(\d+)\s*$/i);const label=nx?m[1].slice(0,nx.index):m[1];
    /* déjà dans un vrai sujet corrigé de la matière (matières intégrées) : pas de doublon */
    if(sujets.some(k=>k.startsWith(ORG.norm(label).trim())))return;
    add(label,{k:'exo',id:e.id,titre:e.titre.replace(ORG.DSRE,'').trim()||e.titre,n:nx?+nx[1]:num(e.titre),j,nq:(ex.etapes||[]).length});});
  const out=[...G.values()];out.forEach(g=>{g.y=annee(g.label);g.items.sort((a,b)=>a.n-b.n||(a.j||0)-(b.j||0));});
  out.sort((a,b)=>b.y-a.y||a.label.localeCompare(b.label,'fr',{numeric:true}));
  return ORG._dsc=out;};
ORG.dscSous=function(){const G=ORG.dsCorr();const n=G.reduce((s,g)=>s+g.items.length,0);
  return G.length?G.length+' sujet'+(G.length>1?'s':'')+' · '+n+' exercice'+(n>1?'s':'')+' corrigé'+(n>1?'s':'')+', dans l’ordre':'Les sujets de DS corrigés, exercice par exercice';};
ORG.vDsc=function(){const G=ORG.dsCorr();
  const carte=(it,i)=>it.k==='exo'
    ?`<button class="mod ${ST.doneEx[it.id]?'done':''}" data-ex="${esc(it.id)}"><span class="num c" style="--c:var(--accent)">${it.n<99?it.n:i+1}</span><span class="mt"><h3>${esc(it.titre)}</h3><span class="small mut">${it.nq} étape${it.nq>1?'s':''} corrigée${it.nq>1?'s':''}${ST.doneEx[it.id]?' · ✓ compris':''}</span></span><span class="arr">›</span></button>`
    :`<button class="mod" data-x="dscEx" data-ds="${esc(it.ds)}" data-i="${it.i}"><span class="num c" style="--c:var(--accent)">${it.n}</span><span class="mt"><h3>${esc(it.titre)}</h3><span class="small mut">${it.nq} question${it.nq>1?'s':''}${it.pts?' · '+it.pts+' pts':''}</span></span><span class="arr">›</span></button>`;
  return `<div class="fade"><div class="eyebrow">Réviser</div><h2 class="disp">DS corrigés</h2>
  <p class="lead">Les sujets de DS, exercice par exercice et dans l’ordre, avec leur corrigé. Ils restent aussi dans « Exercices corrigés ».</p>
  ${G.length?G.map(g=>`<div class="eyebrow" style="margin:18px 0 8px">📝 ${esc(g.label)} · ${g.items.length} exercice${g.items.length>1?'s':''}</div><div class="grid">${g.items.map(carte).join('')}</div>`).join('')
    :`<div class="card"><p class="small mut">Pas encore de sujet de DS corrigé dans cette matière. Dans un module, titre les exercices « DS 2025 — Exercice 1 : … » pour qu’ils apparaissent ici.</p></div>`}
  <div class="sp"></div><button class="btn ghost block" data-go="ds">🎯 Faire un DS en conditions réelles</button></div>`;};
XA.dscEx=d=>go('dscorr-ex',{ds:d.ds,i:+d.i});
ORG.vDscEx=function(){const def=(PK.ds||[]).find(x=>x.id===route.ds);const e=def&&def.exercices&&def.exercices[route.i];if(!e)return ORG.vDsc();
  return withK(()=>`<div class="fade" data-scope><div class="eyebrow">${esc(def.titre)} · exercice ${route.i+1}/${def.exercices.length}</div><h2 class="disp">${rich(e.titre)}</h2>
  ${e.enonce?`<div class="exo-enonce"><div class="eyebrow mut">Énoncé</div><div style="margin-top:6px">${rich(e.enonce)}</div></div>`:''}
  <p class="small mut" style="margin-bottom:8px">Cherche d’abord sur ton brouillon, puis ouvre le corrigé de chaque question.</p>
  ${(e.questions||[]).map((q,k)=>`<div class="exo-step"><div class="exo-head"><span class="stepnum">${k+1}</span><h3>${rich(q.q)}</h3></div><details><summary class="small">Voir le corrigé${q.pts?' ('+q.pts+' pt'+(q.pts>1?'s':'')+')':''}</summary><div class="exo-calc" style="margin-top:8px">${rich(q.corrige||'')}</div></details></div>`).join('')}
  <div class="btnrow">${route.i>0?`<button class="btn ghost" style="flex:1" data-x="dscEx" data-ds="${esc(def.id)}" data-i="${route.i-1}">‹ Exercice ${route.i}</button>`:''}${route.i<def.exercices.length-1?`<button class="btn primary" style="flex:1" data-x="dscEx" data-ds="${esc(def.id)}" data-i="${route.i+1}">Exercice ${route.i+2} ›</button>`:''}</div>
  <div class="sp"></div><button class="btn ghost block" data-go="dscorr">← Tous les DS corrigés</button></div>`);};
XA.orgGo=d=>ORG.ouvrir(ORG.items[+d.i]);
window.Cours={
  jour(items){ORG.items=Array.isArray(items)?items:[];if(['home','lib'].includes(route.v))render();},
  actualiser(){if(['home','ds','lib'].includes(route.v))render();},
  ouvrir(it){ORG.ouvrir(it);},
  contexte(){const h=document.querySelector('#view h2');const v=document.getElementById('view');
    return{vue:route.v,matiere:SUBJ.titre,titre:h?h.textContent.trim():route.v,texte:(v&&v.innerText||'').replace(/\n{3,}/g,'\n\n').slice(0,2500)};}
};

/* ---------- Démarrage ---------- */"""
html = remplacer(html, "\n/* ---------- Démarrage ---------- */", ORG)
html = remplacer(html, "function boot(){loadState();render();DBS.init();}", "function boot(){loadState();render();ORG.boot();DBS.init();}")

# Styles des ajouts (quoi réviser pour le DS)
html = remplacer(html, "</style>\n</head>", ".x-dsmod{margin:8px 0 4px}.x-dsmod>b{display:block;font-size:13.5px;margin-bottom:2px}.x-dsmod .chip,.x-exos .chip{display:inline-block;border:0;text-align:left;line-height:1.35}.x-exos .chip small{font-weight:500;opacity:.85}\n</style>\n</head>")

# Titre de l'onglet du navigateur
html = remplacer(html, "document.title=m.titre+' — Réviser le DS';", "document.title=m.titre+' — Mes cours';")

dest.parent.mkdir(parents=True, exist_ok=True)
# ---------- 4. Application (16/11/2026) : exos à chiffres faciles, schémas pas à pas, 1re action, variantes ----------
# Le moteur est dans outils/application.js (XP). Un module peut définir XAPP, XSCHEMA, XTETE et XVARIANTES ;
# la Régulation reçoit ses schémas (boucle, 1er ordre, sens d'action) et 3 exos de compréhension.
xp_js = (Path(__file__).parent / 'application.js').read_text(encoding='utf-8')
html = remplacer(html, "let SUBJ=null,PK=null,XTRA=null,LEG=null;", xp_js + "\nlet SUBJ=null,PK=null,XTRA=null,LEG=null;")
html = remplacer(html, "else{const a=L0.adaptLegacy(raw,meta);PK=a.PK;XTRA=a.XTRA;LEG=a.LEG;}SUBJ=meta;};",
                 "else{const a=L0.adaptLegacy(raw,meta);PK=a.PK;XTRA=a.XTRA;LEG=a.LEG;}SUBJ=meta;try{XP.charger(raw,meta);}catch(e){try{console.warn('ajouts du module illisibles',e);}catch(_){}}};")
html = remplacer(html, "['XFLASH','XD','XESS','XFICHE','XTD','ABQ_IN']", "['XFLASH','XD','XESS','XFICHE','XTD','ABQ_IN','XAPP','XSCHEMA','XTETE','XVARIANTES','XEXPLIQUE']")
html = remplacer(html, "function genExo(cid,level,seed){const c=APPL.find(x=>x.id===cid);",
                 "function genExo(cid,level,seed){const c=APPL.find(x=>x.id===cid);if(c&&c.gen==='tpl')return Object.assign({cid,level,seed},XP.exo(c,level,rng(seed)));")
# Partie 3 : accessible librement depuis Réviser, avec les schémas et la 1re action en tête.
html = remplacer(html, "function vP3(){const as=appState(),p=PR(),un=unlocked(3);", "function vP3(){const as=appState(),p=PR(),un=unlocked(3)||XP.libre;")
html = remplacer(html, "  ${un?'':lockCard(3)}", "  ${un?'':lockCard(3)}${XP.libre?XP.schemasHTML()+XP.teteHTML():''}")
html = remplacer(html, '<div class="exo-enonce mt8"><div class="eyebrow mut">Énoncé · niveau ${l}</div>',
                 '${XP.schemaPour(c,l)}<div class="exo-enonce mt8"><div class="eyebrow mut">Énoncé · niveau ${l}</div>')
html = remplacer(html, "${(PK.legacy?['','Niveau 1 : une seule étape, la méthode est donnée.'", "${(c.gen==='tpl'?XP.NIV:PK.legacy?['','Niveau 1 : une seule étape, la méthode est donnée.'")
html = remplacer(html, "${PK.legacy?'↻ Nouvel essai':'↻ Autres chiffres'}", "${PK.legacy&&c.gen!=='tpl'?'↻ Nouvel essai':'↻ Autres chiffres'}")
html = remplacer(html, "(PK.legacy?'lis la correction, puis fais un nouvel essai.'", "(PK.legacy&&c.gen!=='tpl'?'lis la correction, puis fais un nouvel essai.'")
html = remplacer(html, "${ap&&unlocked(3)?", "${ap&&(unlocked(3)||XP.libre)?")
html = remplacer(html, "if(['td','td-run','p2','methode','p3','app','melange'].includes(v)||(v==='pq'&&SS&&SS.qk==='tete'))return 'td';",
                 "if(['td','td-run','p2','methode','p3','app','melange'].includes(v)||(v==='pq'&&SS&&SS.qk==='tete'))return XP.libre?'reviser':'td';")
html = remplacer(html, "function tab(v){Prof.stop();", "function tab(v){Prof.stop();XP.libre=(v==='appli');")
html = remplacer(html, "['dscorr','📝','DS corrigés',ORG.dscSous()],", "['appli','🧮','Application',XP.sous()],['dscorr','📝','DS corrigés',ORG.dscSous()],")
html = remplacer(html, "const XREV_TOP=['cours','quiz','flash','comp','exercices','dscorr','examen','fiches'];",
                 "const XREV_TOP=['cours','quiz','flash','comp','exercices','appli','dscorr','examen','fiches'];")
html = remplacer(html, "['dscorr','📝 DS corrigés'],", "['appli','🧮 Application'],['dscorr','📝 DS corrigés'],")
html = remplacer(html, "reglages:vReglages,lib:vLib,", "reglages:vReglages,lib:vLib,appli:()=>{XP.libre=true;return vP3();},")
# Schémas dans le cours, variantes et « où ça tombe » dans les méthodes.
html = remplacer(html, '<div class="x-leg">${n.html}</div>', '<div class="x-leg">${n.html}</div>${XP.pourNotion(n.id)}')
html = remplacer(html, '    ${ill}\n', '    ${ill}${XP.pourNotion(n.id)}\n')
html = remplacer(html, "${(m.pieges||[]).length?", "${XP.tombeHTML(m)}${(m.pieges||[]).length?")
# Préparer un TD : le schéma illustré juste sous « L'essentiel » (axe gradué, boîte à moustaches, boucle…).
html = remplacer(html, "<p class=\"small mut\">Lis-le une fois, puis cache l’écran et redis les 5 lignes de mémoire.</p>`;}",
                 "<p class=\"small mut\">Lis-le une fois, puis cache l’écran et redis les 5 lignes de mémoire.</p>${XP.pourTD(t)}`;}")
html = remplacer(html, "</style>\n</head>", """/* Schémas pas à pas (Organisateur) */
.xs{margin:14px 0;padding:12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
.xs-t{font-weight:700;font-size:14.5px;margin-bottom:8px}
.xs-svg{overflow-x:auto;cursor:pointer}.xs-svg svg{display:block;width:100%;height:auto;min-width:300px;max-height:340px}
.xs svg text{fill:var(--ink);font-family:var(--font-body);font-size:12px}.xs svg .ts{font-size:10.5px;fill:var(--muted)}.xs svg .tb{font-weight:700;font-size:13px}
.xs svg .bx{fill:var(--card);stroke:var(--ink);stroke-width:1.6}.xs svg .ln{fill:none;stroke:var(--ink);stroke-width:1.7}.xs svg .ax{stroke:var(--muted);stroke-width:1.2}
.xs svg .dsh{stroke-dasharray:4 4;stroke:var(--muted);stroke-width:1.2}.xs svg .pt{fill:var(--accent)}.xs-head{fill:var(--ink)}
.xs svg .ac{stroke:var(--accent)}.xs svg text.ac{fill:var(--accent);stroke:none}.xs svg .wa{stroke:var(--red)}.xs svg text.wa{fill:var(--red);stroke:none}.xs svg .gr{stroke:var(--green)}.xs svg text.gr{fill:var(--green);stroke:none}
.xs svg [data-k]{transition:opacity .35s,filter .35s}
.xs.pas svg [data-k]{opacity:.12}.xs.pas svg [data-k].vu{opacity:.45}.xs.pas svg [data-k].on{opacity:1;filter:drop-shadow(0 0 2.5px var(--accent))}
.xs svg .anim{stroke-dasharray:6 5;animation:xsflow 1s linear infinite}.xs.pas svg .anim:not(.on){animation-play-state:paused}
@keyframes xsflow{to{stroke-dashoffset:-11}}
.xs svg .trace{stroke-width:2.6;stroke-dasharray:100;stroke-dashoffset:0}.xs svg .trace.on{animation:xsdraw 1.8s ease-out}
@keyframes xsdraw{from{stroke-dashoffset:100}}
.xs svg .pulse.on{animation:xspulse 1.2s ease-in-out infinite}@keyframes xspulse{50%{opacity:.4}}
@media (prefers-reduced-motion:reduce){.xs svg .anim,.xs svg .trace.on,.xs svg .pulse.on{animation:none}}
.xs-step{margin-top:10px;font-size:14.5px;line-height:1.5;min-height:3.2em}.xs-k{color:var(--accent);margin-right:4px}
.xs-f{margin-top:7px;padding:7px 11px;border-radius:10px;background:var(--accent-bg);color:var(--ink);font-weight:700;font-size:14px}
.xs-ctl{display:flex;gap:8px;margin-top:10px}.xs-b{border:1.5px solid var(--line);border-radius:10px;padding:8px 14px;font-weight:700;background:var(--card)}
.xs-b.pl{flex:1;background:var(--accent);border-color:var(--accent);color:#fff}
.xs-dots{display:flex;gap:5px;justify-content:center;margin-top:8px}.xs-dots i{width:7px;height:7px;border-radius:50%;background:var(--line)}.xs-dots i.on{background:var(--accent)}
.xs-det{margin:8px 0}.xs-det>summary{cursor:pointer;font-weight:700;padding:8px 2px;color:var(--accent)}.xs-det .xs{margin-top:6px}
</style>
</head>""")

# ---------- 5. « Je n'ai pas compris » : explication qui se déroule (bref → pas à pas → tout en détail) ----------
html = remplacer(html, "${xMediaHTML('n:'+n.id)}", "${XP.derNotion(n)}${xMediaHTML('n:'+n.id)}", 2)
html = remplacer(html, '<div class="btnrow"><button class="btn ghost" style="flex:1" data-x="openM" data-m="${e.methId||m.id}">',
                 '${XP.derExo(e)}<div class="btnrow"><button class="btn ghost" style="flex:1" data-x="openM" data-m="${e.methId||m.id}">')
html = remplacer(html, '<div class="btnrow mt8"><button class="btn sm ghost" data-x="openM" data-m="${k.id}">▶ La méthode en action</button></div>',
                 '${XP.derMeth(me)}<div class="btnrow mt8"><button class="btn sm ghost" data-x="openM" data-m="${k.id}">▶ La méthode en action</button></div>')
html = remplacer(html, "<section class=\"card\">${ex.parts.map((pt,k)=>partHtml(pt,k,ss)).join('')}</section><div class=\"sp\"></div>",
                 "<section class=\"card\">${ex.parts.map((pt,k)=>partHtml(pt,k,ss)).join('')}</section>${ss.checked?'':XP.derApp(c,ex,false)}<div class=\"sp\"></div>")
html = remplacer(html, "${ex.correction?`<div class=\"x-corr\">${rich(ex.correction)}</div>`:''}\n    <div class=\"btnrow\"><button class=\"btn primary\" style=\"flex:1\" data-x=\"aNew\">",
                 "${ex.correction?`<div class=\"x-corr\">${rich(ex.correction)}</div>`:''}${XP.derApp(c,ex,true)}\n    <div class=\"btnrow\"><button class=\"btn primary\" style=\"flex:1\" data-x=\"aNew\">")
html = remplacer(html, "</style>\n</head>", """/* « Je n'ai pas compris » (Organisateur) */
.xd{margin:12px 0}.xd-go,.xd-more{display:block;width:100%;text-align:left;padding:11px 14px;border-radius:12px;border:1.5px dashed var(--accent);color:var(--accent);font-weight:700;background:var(--accent-bg)}
.xd-more{margin-top:12px;border-style:solid;background:var(--card)}
.xd-n{margin-top:10px;padding:12px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);animation:xdin .3s ease-out}
@keyframes xdin{from{opacity:0;transform:translateY(-4px)}}
.xd-h{font-weight:800;font-size:15px;margin-bottom:8px}.xd-n p{margin:6px 0;line-height:1.55}
.xd-s{margin:12px 0}.xd-l.xd-st{display:flex;gap:8px;align-items:center;margin:10px 0 6px}.xd-l.xd-st[hidden]{display:none}.xd-l.xd-src{font-size:13px;color:var(--muted);margin:2px 0 6px}.xd-l.xd-en{font-size:14px;margin-top:6px;padding:6px 10px;border-left:3px solid var(--green);background:var(--green-bg);border-radius:6px}
.xd-src{font-size:13px;color:var(--muted);margin:2px 0 6px}.xd-en{font-size:14px;margin-top:6px;padding:6px 10px;border-left:3px solid var(--green);background:var(--green-bg);border-radius:6px}
.xd-l.xd-f{margin:6px 0;padding:8px 12px;border-radius:10px;background:var(--paper);text-align:center;font-weight:600;overflow-x:auto}
.xd-l.xd-new{animation:xdin .35s ease-out}
.xd-ctl{display:flex;gap:8px;margin-top:10px}.xd-b{flex:1;padding:9px;border-radius:10px;background:var(--accent);color:#fff;font-weight:700}.xd-b.gh{flex:0 0 auto;background:var(--card);color:var(--ink);border:1.5px solid var(--line)}
.xd-ok{margin-top:10px;padding:8px 12px;border-radius:10px;background:var(--green-bg);font-size:14px}
.xd-sub{font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin:12px 0 6px}
.xd-tbl td,.xd-tbl th{font-size:13px;vertical-align:top}.xd-rel{margin-top:12px;padding:8px 12px;border-radius:10px;background:var(--accent-bg);font-size:14px}
</style>
</head>""")

# ---------- 6. Grand écran (PC) : toute la largeur, texte à gauche, illustrations à droite ----------
html = remplacer(html, "</style>\n</head>", """/* Grand écran (Organisateur) */
@media (min-width:1100px){
  .hd-in,main,nav.bottom .in{max-width:min(1640px,96vw)}
  main{padding:26px 32px 56px}
  body{font-size:17px}
  .x-tiles{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .grid:not(.cols2):not(.cols3){grid-template-columns:repeat(2,minmax(0,1fr))}
  .xp2{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:32px;align-items:start}
  .xp2-t{min-width:0}.xp2-i{min-width:0;position:sticky;top:96px;max-height:calc(100vh - 120px);overflow-y:auto;padding-bottom:8px}
  .xp2-i{overflow-x:hidden}.xp2-i .xs,.xp2-i .x-ab{margin-top:0;margin-left:0;margin-right:0;padding:12px}.xp2-i .ill{margin-left:0;margin-right:0}
  .xp2-i .x-legend{font-size:14px}
  .xp2-i svg{max-height:62vh}
  .lbody{padding:6px 26px 24px}
  .ill-scroll>svg,.x-leg svg,.xs-svg svg{max-height:66vh;width:100%}
  .x-leg{max-width:1180px}
  .flash{max-width:620px}
  .exo-step,.exo-enonce,.x-pq{font-size:17px}
  #xplayer{max-width:820px}
}
@media (min-width:1700px){.grid:not(.cols2):not(.cols3){grid-template-columns:repeat(3,minmax(0,1fr))}.xp2{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
</style>
</head>""")

# ---------- 7. Mini DS : seulement ce qui a déjà été vu en TD (d'après l'avancement) ----------
html = remplacer(html, "const pool=QUESTIONS.filter(q=>!q.tete);const by=SECT.map(", "const pool=ORG.poolVu(QUESTIONS.filter(q=>!q.tete));const by=SECT.map(")

dest.write_text(html, encoding='utf-8')
print(f'{dest} : {len(html.encode())} octets')
