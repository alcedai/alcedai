/* Alcedai : fonctions de base. Tout reste dans le navigateur (localStorage), rien n'est envoyé. */
const K={profil:'alcedai.profil',fait:'alcedai.fait'};
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const here=location.pathname.split('/').pop()||'index.html';

/* Parcours : enregistre les réponses puis affiche la suite */
const go=document.getElementById('go-parcours');
if(go){
  const ids=['pays','nat','ville','ecole','date','duree'];
  const saved=get(K.profil,null);
  if(saved) ids.forEach(i=>{const e=document.getElementById(i);if(e&&saved[i]!==undefined)e.value=saved[i]});
  go.addEventListener('click',()=>{const p={};ids.forEach(i=>{const e=document.getElementById(i);if(e)p[i]=e.value});put(K.profil,p)});
}

/* Recherche : fiches + étapes, avec indice d'adéquation (part de ta demande couverte) */
const SHOW_UNVERIFIED=true; /* mettre false avant la mise en ligne : seules les fiches « Vérifié » sont alors publiées */
const STOP=new Set(['un','une','des','les','le','la','de','du','et','ou','je','j','ai','besoin','pour','mon','ma','mes','en','au','aux','a','l','d','s','m','t','n','c','sur','dans','comment','veux','voudrais','faire','trouver','chercher','mettre','faut','dois','puis','peux','ouvrir','declarer','obtenir','demander','renouveler','souscrire','prendre','avoir','etre','passer','pas','cher','refaire','urgence','urgent','depuis','gratuit','gratuitement','ses','tes','son','sa','ta','ton','vos','nos','leur','mes']);
const LIEUX=new Set(['lyon','paris','marseille','lille','bordeaux','toulouse','nantes','strasbourg','nice','rennes','grenoble','maastricht','amsterdam','france','pays','bas','belgique']);
const SYN=[['mairie','commune','hotel de ville'],['inscrire','inscription','enregistrer','enregistrement'],['logement','loger','location','louer','appartement','studio','residence','loyer'],['banque','bancaire','compte'],['secu','securite','assurance','maladie','vitale','mutuelle','ameli','sante'],['impot','impots','fiscal','fisc','declaration'],['sejour','visa','titre'],['papiers','identite','passeport','cni','piece'],['emploi','job','travail','boulot','stage','saisonnier','ete'],['train','sncf','billet'],['aide','aides','caf','apl','bourse','alloc'],['fac','faculte','universite','campus'],['electorale','electorales','electeur','electoral','vote','voter'],['mental','mentale','psy','psychologue','ecoute','detresse']];
const stem=w=>w.length>5?w.slice(0,5):w;
const PAYS={lyon:'France',paris:'France',marseille:'France',lille:'France',bordeaux:'France',toulouse:'France',nantes:'France',strasbourg:'France',nice:'France',rennes:'France',grenoble:'France',france:'France',maastricht:'Pays-Bas',amsterdam:'Pays-Bas',belgique:'Belgique'};
/* un mot long : début de mot ; un mot court : mot entier (pluriel accepté) -> « visa » ne trouve plus « Visale » */
const pat=w=>new RegExp('(^|[^a-z0-9])'+(w.length>5?w.slice(0,5):w+'s?([^a-z0-9]|$)'));
function concepts(q){
  const words=norm(q).split(/[^a-z0-9]+/).filter(w=>w.length>1&&!STOP.has(w));
  const pays=words.map(w=>PAYS[w]).find(Boolean)||null;
  const cs=words.filter(w=>!LIEUX.has(w)).map(w=>{
    const syn=new Set();SYN.forEach(g=>{if(g.some(x=>stem(x)===stem(w)))g.forEach(x=>{if(stem(x)!==stem(w))syn.add(x)})});
    return {w,direct:pat(w),syn:[...syn].map(pat)}});
  return {cs,pays}}
function rank(q,items){
  const {cs,pays}=concepts(q);if(!cs.length)return[];
  const scored=items.filter(it=>!pays||!it.portee||['Universel','UE',pays].includes(it.portee)).map(it=>{
    const ti=norm(it.titre),de=norm(it.sous+' '+(it.mots||'')),cl=norm(it.cles||'');let pts=0;
    const miss=[];cs.forEach(c=>{let b=0;
      if(c.direct.test(ti))b=1;else if(c.direct.test(cl))b=.85;else if(c.syn.some(p=>p.test(ti)))b=.7;else if(c.syn.some(p=>p.test(cl)))b=.6;else if(c.direct.test(de))b=.5;else if(c.syn.some(p=>p.test(de)))b=.35;
      if(b===0)miss.push(c.w);pts+=b});
    return {it,miss,pct:Math.round(100*pts/cs.length)}}).filter(x=>x.pct>0);
  scored.sort((a,b)=>b.pct-a.pct||(b.it.france===true)-(a.it.france===true)||(a.it.kind==='etape'?-1:1));
  if(!scored.length)return[];
  const top=scored[0].pct,seuil=Math.max(40,top*.6);
  return scored.filter(x=>x.pct>=seuil).slice(0,8)}
function searchBox(form,val){
  form.innerHTML='<label style="flex:1 1 280px;min-width:0;display:flex;align-items:center;gap:14px;background:#FFFFFF;border:1.5px solid #C2CBD5;border-radius:12px;padding:0 20px;min-height:64px;box-shadow:0 0 0 4px #EAF5F3,0 0 24px rgba(11,94,90,.18)"><span style="font-weight:600;font-size:18px;color:#0B5E5A;white-space:nowrap">J\'ai besoin de</span><input name="q" type="search" autocomplete="off" value="'+esc(val)+'" placeholder="ouvrir un compte bancaire…" style="flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:18px;color:#16202B;background:transparent"></label><button type="submit" style="min-height:48px;padding:0 24px;border-radius:8px;font:inherit;font-weight:600;font-size:15px;background:#0B5E5A;color:#fff;border:1.5px solid #0B5E5A;cursor:pointer">Trouver le bon outil</button>';
  form.style.cssText='display:flex;flex-wrap:wrap;gap:12px';form.method='get';form.action='besoin.html'}
if(here==='besoin.html'){
  const q=(new URLSearchParams(location.search).get('q')||'').trim();
  const head=document.querySelector('h1').parentElement;
  const kids=[...head.children];
  const row=document.createElement('form');kids[1].replaceWith(row);searchBox(row,q);
  kids.slice(2).forEach(k=>k.remove());
  [...head.parentElement.querySelectorAll(':scope > section')].forEach(x=>x.remove());
  const out=document.createElement('div');out.style.cssText='display:flex;flex-direction:column;gap:14px';head.after(out);
  if(q){Promise.all([fetch('data/fiches.json').then(r=>r.json()),fetch('data/etapes.json').then(r=>r.json()),fetch('data/mots-cles.json').then(r=>r.json()).catch(()=>({}))]).then(([fiches,etapes,mc])=>{
    const items=[
      ...fiches.filter(f=>SHOW_UNVERIFIED||f.statut==='Vérifié').map(f=>({kind:'fiche',france:f.portee==='France',titre:f.nom,sous:f.description,portee:f.portee,cles:mc[f.id]||'',mots:f.famille,meta:f.statut_source+' · '+f.portee+' · '+(f.statut==='Vérifié'?'vérifié le '+f.verifie:'non vérifié'),href:f.url}))];
    const hit=rank(q,items);
    
    const card=(x,i)=>{const h=x.it;return '<div style="background:#fff;border:1px solid '+(i===0?'#0B5E5A':'#DCE1E7')+';border-radius:12px;padding:18px 22px"><div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:#0B5E5A">'+(h.kind==='etape'?'Démarche':'Outil ou service')+(i===0?' · Meilleure adéquation':'')+'</span>'+(i===0?'':'<span style="display:flex;align-items:center;gap:8px;font-size:13px;color:#3D4855" title="Part de ta demande couverte par cette fiche">Adéquation <span style="width:90px;height:8px;border-radius:4px;background:#DCE1E7;display:inline-block"><span style="display:block;height:8px;border-radius:4px;background:#0B5E5A;width:'+x.pct+'%"></span></span><b style="font-family:IBM Plex Mono,monospace;color:#0B5E5A">'+x.pct+' %</b></span>')+'</div><h3 style="margin:6px 0 4px;font-size:18px">'+esc(h.titre)+'</h3>'+(x.miss&&x.miss.length?'<p style="margin:0 0 4px;font-size:13px;color:#B45309">Ne couvre pas : '+esc(x.miss.join(', '))+'</p>':'')+'<p style="margin:0;color:#3D4855">'+esc(h.sous)+'</p>'+(h.meta?'<p style="margin:6px 0 0;font-size:13px;color:#5B6775">'+esc(h.meta)+'</p>':'')+'<a href="'+esc(h.href)+'"'+(h.kind==='fiche'?' target="_blank" rel="noopener"':'')+' style="display:inline-block;margin-top:10px;color:#0B5E5A;font-weight:600">'+(h.kind==='etape'?'Voir la fiche':'Ouvrir')+'</a></div>'};
    if(hit.length)out.innerHTML='<p style="margin:0;color:#3D4855">'+hit.length+' résultat'+(hit.length>1?'s':'')+' pour « '+esc(q)+' », le premier est la meilleure adéquation ; les suivants indiquent la part de ta demande qu’ils couvrent.</p>'+hit.map(card).join('');
    /* Annuaire complet : chargé à la demande, recherche par nom (ville, université, organisme) */
    const CATS=['','Administratif général','Visa et séjour','Santé et assurance','Banque et paiements','Impôts et aides','Logement','Études et université','Emploi et jobs étudiants','Transport','Vie pratique','Outils universels','Culture, sport, voyage'];
    const box=document.createElement('div');out.appendChild(box);
    fetch('data/annuaire.json').then(r=>r.json()).then(ann=>{
      const toks=norm(q).split(/\s+/).filter(t=>t.length>2);
      let res=[];
      if(toks.length){for(const e of ann){const h=norm(e[0]+' '+CATS[e[2]]+' '+e[3]);if(toks.every(t=>h.includes(t))){res.push(e);if(res.length>=40)break}}}
      if(!hit.length&&!res.length){location.replace('recherche-vide.html?q='+encodeURIComponent(q));return}
      if(!res.length)return;
      box.innerHTML='<h2 style="margin:18px 0 4px;font-size:20px">Dans l’annuaire'+(res.length>=40?' (40 premiers)':'')+'</h2><p style="margin:0 0 8px;color:#3D4855">Sites officiels ou publics référencés par nom, sans classement par adéquation.</p>'+res.map(e=>'<div style="background:#fff;border:1px solid #DCE1E7;border-radius:12px;padding:14px 20px;margin-bottom:10px"><div style="font-size:13px;color:#3D4855">'+esc(CATS[e[2]])+(e[3]?' · '+esc(e[3]):'')+'</div><a href="'+esc(e[1])+'" rel="noopener" style="font-weight:600;color:#0B5E5A">'+esc(e[0])+'</a><div style="font-size:13px;color:#5B6775;word-break:break-all">'+esc(e[1].replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))+'</div></div>').join('')
    }).catch(()=>{if(!hit.length)location.replace('recherche-vide.html?q='+encodeURIComponent(q))});
  });}
  else out.innerHTML='<p style="margin:0;color:#3D4855">Écris ce dont tu as besoin, par exemple « ouvrir un compte bancaire ».</p>';
}
/* Barre de recherche du haut, sur toutes les pages */
(()=>{const a=document.querySelector('a[aria-label="Rechercher sur le site"]');if(!a||here==='besoin.html')return;
  const f=document.createElement('form');f.action='besoin.html';f.method='get';f.setAttribute('role','search');f.style.cssText=a.getAttribute('style');
  f.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B5E5A" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input name="q" type="search" aria-label="Rechercher une démarche, un besoin" placeholder="Rechercher une démarche, un besoin" style="flex:1;min-width:0;border:0;outline:0;font:inherit;color:#16202B;background:transparent">';
  a.replaceWith(f)})();
if(here==='recherche-vide.html'){
  const q=(new URLSearchParams(location.search).get('q')||'').trim();
  const h=document.querySelector('h1');
  if(h){const head=h.parentElement,kids=[...head.children];
    const row=document.createElement('form');kids[1].replaceWith(row);searchBox(row,q);
    if(q)h.textContent='Aucun résultat pour « '+q+' »';
    const sec=[...document.querySelectorAll('section')].find(x=>/Des résultats proches/.test(x.textContent));if(sec)sec.remove();
    const miss=[...document.querySelectorAll('a')].find(a=>/Dire que ça manque/.test(a.textContent));if(miss)miss.href='contribuer.html'+(q?'?q='+encodeURIComponent(q):'');
    const t=[...document.querySelectorAll('h3')].find(x=>/pas de fiche vérifiée/.test(x.textContent));if(t)t.textContent='Nous n’avons rien trouvé pour ça';
  }
}

/* ================= Fonctions branchées (v1.1) ================= */
const MOIS=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
function parseDateFr(s){const m=norm(s||'').match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);if(!m)return null;const i=MOIS.indexOf(m[2]);return i<0?null:new Date(Date.UTC(+m[3],i,+m[1]))}
const dl=(name,type,content)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
const byText=(sel,txt)=>[...document.querySelectorAll(sel)].find(e=>norm(e.textContent).trim()===norm(txt));

/* --- Parcours : titre personnalisé, état des étapes, impression --- */
if(here==='parcours.html'){
  const p=get(K.profil,null);
  const h1=document.querySelector('h1');
  if(p&&h1){
    const lieu=[p.ville,p.ecole].filter(Boolean).join(', ');
    h1.textContent='Ton parcours'+(lieu?' : '+lieu:'');
    const d=h1.nextElementSibling;
    if(d&&p.date)d.textContent='Arrivée prévue le '+p.date+'. Chaque étape ouvre sa fiche avec la source officielle.';
  }
  const fait=get(K.fait,{});
  document.querySelectorAll('a[href="etape.html"]').forEach(card=>{
    const titre=card.children[1]?.textContent?.trim();if(!titre)return;
    const badge=card.lastElementChild;const orig=badge.cloneNode(true);
    const btn=document.createElement('button');btn.type='button';
    btn.style.cssText='margin-left:auto;font:inherit;font-size:13px;font-weight:600;color:#0B5E5A;background:#fff;border:1.5px solid #0B5E5A;border-radius:8px;padding:6px 12px;cursor:pointer';
    const draw=()=>{const f=!!fait['p|'+titre];btn.textContent=f?'Fait ✓':'Marquer comme fait';btn.setAttribute('aria-pressed',f);card.style.opacity=f?.65:1;
      if(f){badge.lastChild.textContent='Fait'}else{badge.innerHTML=orig.innerHTML}};
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fait['p|'+titre]=!fait['p|'+titre];put(K.fait,fait);draw();upd()});
    card.appendChild(btn);draw();
  });
  const upd=()=>{const n=Object.keys(fait).filter(k=>k.startsWith('p|')&&fait[k]).length;
    const c=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/^\d+ \/ \d+$/.test(d.textContent.trim()));if(c)c.textContent=n+' / '+c.textContent.split('/')[1].trim();
    const pp=[...document.querySelectorAll('p')].find(x=>x.textContent.startsWith('Coche une étape'));if(pp)pp.textContent='Marque chaque étape comme faite avec son bouton.'};
  upd();document.addEventListener('click',()=>setTimeout(upd,0));
  const imp=byText('a','Imprimer ou enregistrer en PDF');
  if(imp)imp.addEventListener('click',e=>{e.preventDefault();window.print()});
}

/* --- Mon tableau : cases à cocher, progression, export / import --- */
if(here==='tableau.html'){
  const state=get(K.fait,{});
  const cards=[...document.querySelectorAll('h3')].map(h=>h.closest('div[style*="border-radius:12px"]')).filter(c=>c&&c.querySelector('[aria-hidden="true"]'));
  const p=get(K.profil,null);
  const intro=document.querySelector('h1')?.nextElementSibling;
  if(p&&intro)intro.textContent=[p.ville&&('À '+p.ville),p.date&&('arrivée le '+p.date)].filter(Boolean).join(', ')+'. Tout est stocké sur cet appareil.';
  function refresh(){cards.forEach(c=>{
    const dom=c.querySelector('h3').textContent.trim();
    const rows=[...c.querySelectorAll('div')].filter(r=>r.children.length===2&&r.children[0].getAttribute?.('aria-hidden')==='true');
    if(!rows.length)return;
    let n=0;const col=getComputedStyle(rows[0].children[0]).borderTopColor;
    rows.forEach(r=>{const lab=r.children[1].textContent.trim();const on=!!state['t|'+dom+'|'+lab];if(on)n++;
      r.children[0].style.background=on?col:'#FFFFFF';r.children[1].style.textDecoration=on?'line-through':'none';r.children[1].style.color=on?'#5B6775':'';});
    c.querySelector('span[style*="IBM Plex Mono"]').textContent=n+'/'+rows.length;
    const bar=c.querySelector('div[style*="height:8px"] > div');if(bar)bar.style.width=Math.round(100*n/rows.length)+'%';
  })}
  cards.forEach(c=>{const dom=c.querySelector('h3').textContent.trim();
    [...c.querySelectorAll('div')].filter(r=>r.children.length===2&&r.children[0].getAttribute?.('aria-hidden')==='true').forEach(r=>{
      r.style.cursor='pointer';r.setAttribute('role','checkbox');r.setAttribute('tabindex','0');
      const lab=r.children[1].textContent.trim();
      const tog=()=>{const k='t|'+dom+'|'+lab;state[k]=!state[k];put(K.fait,state);r.setAttribute('aria-checked',!!state[k]);refresh()};
      r.addEventListener('click',tog);r.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();tog()}});
      r.setAttribute('aria-checked',!!state['t|'+dom+'|'+lab]);
    })});
  /* départ vide : les cases d'exemple de la maquette ne sont pas à toi */
  refresh();
  const ex=byText('a','Exporter ma sauvegarde'),im=byText('a','Importer une sauvegarde');
  if(ex)ex.addEventListener('click',e=>{e.preventDefault();dl('alcedai-sauvegarde.json','application/json',JSON.stringify({profil:get(K.profil,null),fait:get(K.fait,{})},null,1))});
  if(im){const inp=document.createElement('input');inp.type='file';inp.accept='application/json';inp.hidden=true;document.body.appendChild(inp);
    im.addEventListener('click',e=>{e.preventDefault();inp.click()});
    inp.addEventListener('change',async()=>{try{const d=JSON.parse(await inp.files[0].text());if(typeof d.fait==='object'&&d.fait){put(K.fait,d.fait);if(d.profil)put(K.profil,d.profil);location.reload()}else alert('Fichier non reconnu.')}catch(e){alert('Fichier non reconnu.')}})}
}

/* --- Échéances : calendrier .ics et dossier de pièces (IndexedDB) --- */
if(here==='echeances.html'){
  const p=get(K.profil,{});const arr=parseDateFr(p.date);
  const ics=()=>{const pad=n=>String(n).padStart(2,'0');const ymd=d=>d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate());
    const ev=[];if(arr){const next=new Date(arr.getTime()+864e5);ev.push(['alcedai-arrivee@local','Arrivée'+(p.ville?' à '+p.ville:''),ymd(arr),ymd(next)])}
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Alcedai//FR\r\n'+ev.map(e=>'BEGIN:VEVENT\r\nUID:'+e[0]+'\r\nDTSTAMP:'+ymd(new Date())+'T000000Z\r\nSUMMARY:'+e[1]+'\r\nDTSTART;VALUE=DATE:'+e[2]+'\r\nDTEND;VALUE=DATE:'+e[3]+'\r\nEND:VEVENT\r\n').join('')+'END:VCALENDAR\r\n'};
  const note=document.createElement('p');note.style.cssText='font:14px IBM Plex Sans,sans-serif;color:#5B6775;margin:8px 0 0';
  note.textContent=arr?'Le fichier contient ta date d’arrivée. Les échéances officielles s’ajouteront quand les fiches auront leurs dates vérifiées.':'Réponds d’abord aux quatre questions du parcours pour que ta date d’arrivée soit ajoutée.';
  const copy=byText('a','Copier le lien');
  if(copy){copy.textContent='Télécharger le calendrier';copy.addEventListener('click',e=>{e.preventDefault();dl('alcedai.ics','text/calendar',ics())});copy.parentElement.after(note)}
  const url=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent.startsWith('webcal://'));
  if(url)url.textContent='alcedai.ics (fichier à importer dans ton agenda)';
  ['Google Agenda','Apple Calendar','Outlook'].forEach(n=>{const a=byText('a',n);if(a)a.addEventListener('click',e=>{e.preventDefault();dl('alcedai.ics','text/calendar',ics())})});
  /* pièces */
  const db=new Promise(res=>{try{const r=indexedDB.open('alcedai',1);r.onupgradeneeded=()=>r.result.createObjectStore('pieces');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch(e){res(null)}});
  const tx=async(mode,fn)=>{const d=await db;if(!d)return;return new Promise(res=>{const t=d.transaction('pieces',mode);const r=fn(t.objectStore('pieces'));t.oncomplete=()=>res(r&&r.result)})};
  const names=['Pièce d\'identité','Justificatif de logement','Attestation d\'inscription','Attestation d\'assurance'];
  const rows=names.map(n=>{const t=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&norm(d.textContent)===norm(n));return t&&{n,badge:t.parentElement.parentElement.lastElementChild}}).filter(Boolean);
  rows.forEach(async r=>{
    const cur=await tx('readonly',s=>s.get(r.n));
    const draw=f=>{r.badge.textContent=f?'Joint':'À joindre';r.badge.title=f?f.name:'Ajouter un fichier';r.badge.style.cursor='pointer'};
    draw(cur);
    const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
    r.badge.setAttribute('role','button');r.badge.tabIndex=0;
    const open=()=>inp.click();r.badge.addEventListener('click',open);r.badge.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
    inp.addEventListener('change',async()=>{const f=inp.files[0];if(!f)return;await tx('readwrite',s=>s.put(f,r.n));draw(f)});
  });
  const j=byText('a','Joindre un fichier');if(j)j.addEventListener('click',e=>{e.preventDefault();alert('Clique sur « À joindre » à côté de la pièce concernée.')});
}

/* --- Finitions : liens pas encore actifs, impression, accessibilité --- */
(()=>{
  const toast=msg=>{let t=document.getElementById('alc-toast');if(!t){t=document.createElement('div');t.id='alc-toast';t.setAttribute('role','status');
    t.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#16202B;color:#fff;padding:12px 18px;border-radius:10px;font:15px IBM Plex Sans,system-ui,sans-serif;z-index:99;max-width:90vw';document.body.appendChild(t)}
    t.textContent=msg;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',3500)};
  ['Imprimer','Enregistrer en PDF'].forEach(n=>{const a=byText('a',n);if(a)a.addEventListener('click',e=>{e.preventDefault();window.print()})});
  document.querySelectorAll('a[href="#"]').forEach(a=>{
    if(a.dataset.alcOk)return;
    a.addEventListener('click',e=>{if(e.defaultPrevented)return;e.preventDefault();toast('Cette fonction n’est pas encore disponible dans cette version.')});
    a.setAttribute('aria-disabled','true');
  });
  document.querySelectorAll('input[type=file]:not([aria-label])').forEach(i=>i.setAttribute('aria-label','Choisir un fichier'));
})();

/* Contribuer : chaque bouton ouvre ton application mail avec le message prérempli ; rien n'est envoyé sans ton clic final */
if(here==='contribuer.html'){
  const MAIL='alcedai.contact@gmail.com';
  document.querySelectorAll('input[type=text]').forEach(i=>{if(i.value==="S'inscrire à la commune")i.value=''});
  [...document.querySelectorAll('a[href="#"]')].forEach(a=>{
    a.addEventListener('click',e=>{e.preventDefault();
      const card=a.closest('div[style*="border-radius:12px"]');if(!card)return;
      const titre=(card.querySelector('h3')||{}).textContent||'Message';
      const lines=[...card.querySelectorAll('input,textarea')].map(i=>{const lab=card.querySelector('label[for="'+i.id+'"]');return (lab?lab.textContent:'')+' : '+i.value}).filter(x=>!/ : $/.test(x));
      if(!lines.length){alert('Écris d’abord ton message dans un des champs.');return}
      location.href='mailto:'+MAIL+'?subject='+encodeURIComponent('Alcedai : '+titre)+'&body='+encodeURIComponent(lines.join('\n'));
    })});
}
