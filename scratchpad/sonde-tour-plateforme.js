/* ══ SONDE — LE PANNEAU DES AGENTS DE LA PLATEFORME DANS LA MESSAGERIE DE LA TOUR (23 octobre 2026) ═════════════════════════
   Justin : « des agents qui gèrent toutes les catégories de la Tour ». Au-dessus du fil « Plateforme » : l'état (voyant vert / ambre / rouge), les épisodes en cours et
   rétablis, les six agents (dernier passage, « Passer maintenant »), les demandes RGPD que Nina suit (« Marquer traitée »), le point de Victor à la demande.
   tour.html servi en local, jour ET nuit, 1440 ET 1100 px, plus un téléphone. L'API est SIMULÉE DANS LA PAGE (le simulateur de la messagerie, lu tel quel, plus la route du
   panneau) ; ce que le serveur en fait, c'est test-2924 / test-2925 / test-2927. Ce qu'on prouve ici, et que les bancs sans page ne voient pas :
     · le panneau n'existe que sur le fil « Plateforme » (caché ailleurs) ; sa bande dit l'état par un MOT et un voyant (jamais la couleur seule) ;
     · les épisodes (niveau écrit en toutes lettres), les six agents, les demandes RGPD ; « Passer maintenant », « Dire le point », « Marquer traitée » demandent confirmation
       (par défaut NON), grisent les boutons pendant l'appel, et DISENT le refus du serveur ;
     · une lecture qui échoue se DIT (« n'a pas pu être lu » + Réessayer) — et un rafraîchissement raté ne vide pas ce qu'on voyait ;
     · le texte venu du serveur est échappé (un « <img onerror> » dans une phrase ne s'exécute pas) ;
     · le panneau ne mange jamais le fil (hauteur bornée, défilement interne), aucun défilement latéral, cibles ≥ 44 px au doigt ;
     · aucune exception JavaScript.
   Usage : node scratchpad/sonde-tour-plateforme.js    PROFILS=1440:light,…  CAPTURES=<dossier>  TOUR_FICHIER=<tour d'avant> (la sonde doit TOMBER sur une Tour sans panneau) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const { analyserMentions } = require('../server/conversations.js');

const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/plateforme-captures';
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

const voisine = fs.readFileSync(path.join(__dirname, 'sonde-tour-messagerie.js'), 'utf8');
const mm = /const SIMU = String\.raw`([\s\S]*?)`;\n\n\/\* l'observateur/.exec(voisine);
if (!mm) { console.log('  ✗ le simulateur de la messagerie est introuvable dans sonde-tour-messagerie.js'); process.exit(1); }
const SIMU = new Function('analyserMentions', 'return String.raw`' + mm[1] + '`;')(analyserMentions);

const PF = String.raw`
(function(){
  if(window.__pf) return 1;
  var N=Date.now(), M=60000, H=3600000;
  var etat=window.__pf={ get:0, posts:[], echec:0, refus:0, hostile:0,
    d:{ ok:true, ts:N, illisible:false,
      agents:{ max:{mode:'brouillon',pasMin:5,dernier:N-2*M,illisible:false,episodes:[]}, jules:{mode:'brouillon',pasMin:1,dernier:N-M,diagnosticsAujourdhui:2}, theo:{mode:'brouillon',pasMin:5,dernier:N-3*M},
              nina:{mode:'brouillon',pasMin:5,dernier:N-3*M}, ines:{mode:'arret',pasMin:10,dernier:0,relu:'2026-10-22',derniere:{courriels:{envoyes:4,conformes:3}}}, victor:{mode:'brouillon',pasMin:1,dernier:N-M,dernierPoint:{jour:'2026-10-23',ts:N-90*M,statut:'fait',modele:false},decisions:[{id:'d1',ts:N-5*H,entre:['camille','lea'],decision:'Léa garde la relance, Camille le courrier',raison:'un canal chacune',statut:'dite'}]} },
      episodes:[
        {id:'e1',proprio:'max',cle:'bugs_applications',zone:'serveur',niveau:'important',depuis:N-25*M,fin:0,annonce:true,incident:true,pris:true,texte:'3 erreurs signalées par les applications des entreprises dans la dernière heure'},
        {id:'e2',proprio:'theo',cle:'sauvegarde_vieille',zone:'sauvegarde',niveau:'critique',depuis:N-70*M,fin:0,annonce:true,incident:true,pris:false,texte:'La dernière sauvegarde réussie date de 31 h'},
        {id:'e3',proprio:'nina',cle:'verrou_tour',zone:'securite',niveau:'info',depuis:N-9*M,fin:0,annonce:false,incident:false,pris:false,texte:'1 compte de la Tour verrouillé quinze minutes après cinq échecs de connexion d’affilée'}],
      recents:[{cle:'email_desactive',depuis:N-30*H,fin:N-29*H,niveau:'important',texte:'L’envoi d’e-mails du serveur est désactivé'}],
      incidents:{ouverts:2,haute:0,nouveau:1}, rgpd:[{id:'g0000001',recu:N-20*86400000,limite:N+11*86400000,joursRestants:11,accusee:true},{id:'g0000002',recu:N-33*86400000,limite:N-2*86400000,joursRestants:-2,accusee:false}],
      victor:{decisions:[{id:'d1',ts:N-5*H,entre:['camille','lea'],decision:'Léa garde la relance, Camille le courrier',statut:'dite'}]}, ines:{} } };
  etat.d.agents.victor.decisions=etat.d.victor.decisions;
  var json=function(st,d,lent){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },lent||25); }); };
  var prev=window.fetch;
  window.fetch=function(u,o){
    var s=String(u); if(s.indexOf('https://api.teamop.fr')!==0) return prev(u,o);
    var chemin=s.slice('https://api.teamop.fr'.length).split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
    if(chemin==='/api/monitor/agents/plateforme'&&meth==='GET'){ etat.get++;
      if(etat.echec>0){ etat.echec--; return json(503,{error:'La mémoire des agents est illisible'}); }
      var d=JSON.parse(JSON.stringify(etat.d)); if(etat.hostile) d.episodes[0].texte='<img src=x onerror="window.__xss=1"> piégé';
      return json(200,d); }
    if(chemin.indexOf('/api/monitor/agents/plateforme/')===0&&meth==='POST'){ var b=JSON.parse(o.body); etat.posts.push([chemin.slice('/api/monitor/agents/plateforme/'.length),b.agent||b.id||'']);
      if(etat.refus){ etat.refus=0; return json(409,{error:'Un passage est déjà en cours'},200); }
      if(chemin.endsWith('/rgpd')) etat.d.rgpd=etat.d.rgpd.filter(function(g){ return g.id!==b.id; });
      return json(200,{ok:true},900); }
    return prev(u,o);
  };
  return 1;
})()`;

const ETAT = `${STABLE}
  const r=document.getElementById('ms-pf'), cs=e=>getComputedStyle(e), q=s=>r?[...r.querySelectorAll(s)]:[];
  const centre=document.querySelector('.ms-centre'), flux=document.getElementById('ms-flux'), z=document.getElementById('mess-zone'), rr=document.getElementById('ms-reu');
  const pt=r?r.querySelector('.ms-pf-pt'):null;
  return {existe:!!r,cache:r?r.hidden||cs(r).display==='none':null,reuCache:rr?rr.hidden||cs(rr).display==='none':null,
    bande:r&&r.querySelector('.ms-reu-t')?r.querySelector('.ms-reu-t').textContent.replace(/[\\u00a0\\u202f]/g,' '):null,
    voyant:pt?{cls:pt.className,fond:cs(pt).backgroundColor,w:Math.round(pt.getBoundingClientRect().width)}:null,
    boutons:q('.ms-reu-btn').map(b=>({t:b.textContent.replace(/[\\u00a0\\u202f]/g,' '),off:b.disabled,h:Math.round(b.getBoundingClientRect().height)})),
    sections:q('.ms-reu-h').map(b=>({t:b.firstChild.textContent.trim(),ouvert:b.getAttribute('aria-expanded')==='true',h:Math.round(b.getBoundingClientRect().height)})),
    epis:q('.ms-reu-s:nth-of-type(1) li').map(l=>l.textContent.replace(/[\\u00a0\\u202f]/g,' ')),
    cartes:q('.ms-reu-ag').length,
    passer:q('[data-act="pfPasser"]').map(b=>({a:b.getAttribute('data-agent'),off:b.disabled,h:Math.round(b.getBoundingClientRect().height),nom:b.getAttribute('aria-label')})),
    rgpd:q('[data-act="pfRgpd"]').map(b=>({id:b.getAttribute('data-id'),h:Math.round(b.getBoundingClientRect().height),off:b.disabled,li:b.parentElement.textContent.replace(/[\\u00a0\\u202f]/g,' ')})),
    vide:q('.ms-reu-vide').map(x=>x.textContent),
    hPanneau:r?Math.round(r.getBoundingClientRect().height):0,hCentre:centre?Math.round(centre.getBoundingClientRect().height):0,hFlux:flux?Math.round(flux.getBoundingClientRect().height):0,
    defileInterne:r?r.scrollHeight>r.clientHeight+1:false,
    sx:document.documentElement.scrollWidth,iw:innerWidth,zx:z?z.scrollWidth:0,zw:z?z.clientWidth:0,
    fil:(document.querySelector('.ms-ht h2')||{}).textContent,toast:(document.getElementById('toast')||{}).textContent,xss:!!window.__xss,
    html:r?r.innerHTML:''};`;

const cap = async (o, nom) => { const r = await o.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); };
const attendre = async (ev, cond, n = 40) => { for (let i = 0; i < n; i++) { await dormir(100); if (await ev('return !!(' + cond + ')')) return true; } return false; };

async function main() {
  const S = await demarrer();
  console.log('Sonde des agents de la plateforme — tour.html ' + S.version);
  try {
    const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'light'], ['1100', 'dark'], ['telephone', 'dark']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
    for (const [larg, mode] of profils) {
      console.log('\n── ' + larg + ' · ' + (mode === 'light' ? 'jour' : 'nuit') + ' ──');
      const tel = larg === 'telephone';
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode);
      const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 900, deviceScaleFactor: 1, mobile: false });
      const nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      await ev(SIMU); await ev(PF);
      await ev(`setTab('messagerie'); return 1;`);
      await attendre(ev, `document.querySelector('#ms-fils .ms-cv')`, 80);
      await ev(APAISER);

      /* ── 1. ailleurs que « Plateforme » : pas de panneau ── */
      let E = await ev(ETAT);
      v('population : la messagerie est ouverte, le panneau existe dans la page', E.existe && /^# /.test(E.fil || ''), JSON.stringify([E.existe, E.fil]));
      v('⛔ sur le fil « Équipe » le panneau est CACHÉ', E.cache === true, JSON.stringify([E.cache, E.fil]));
      await ev(`document.querySelector('#ms-fils [data-fil="plateforme"]').click(); return 1;`);
      await attendre(ev, `document.querySelector('#ms-pf .ms-reu-s')`);
      await ev(APAISER);

      /* ── 2. l'état au repos ── */
      E = await ev(ETAT);
      v('population : le fil « Plateforme » est ouvert, le panneau visible, celui des réunions caché', E.cache === false && E.reuCache === true && /Plateforme/.test(E.fil || ''), JSON.stringify([E.cache, E.reuCache, E.fil]));
      const minFlux = tel ? 100 : 160;
      if (tel) {
        v('⛔ au téléphone le panneau démarre PLIÉ : sa bande seule (≤ 90 px), le fil garde ≥ 220 px', E.hPanneau <= 90 && E.hFlux >= 220 && E.boutons.every(b => b.h === 0) && E.sections.every(x => x.h === 0), JSON.stringify([E.hPanneau, E.hFlux]));
        await cap(o, '00-plie-' + nom);
        await ev(`document.querySelector('#ms-pf [data-act="pfPlier"]').click(); return 1;`); await dormir(250); await ev(APAISER); E = await ev(ETAT);
        v('« Détails » déplie : trois sections visibles', E.sections.length === 3 && E.sections.every(x => x.h > 0), JSON.stringify(E.sections));
      }
      v('⛔ la bande dit l\'état par un MOT et un voyant ROUGE (un épisode critique, une demande RGPD en retard) — pas la couleur seule', /3 épisodes en cours dont 1 critique/.test(E.bande) && E.voyant && /crit/.test(E.voyant.cls) && E.voyant.w >= 10, JSON.stringify([E.bande, E.voyant]));
      v('…et la ligne du dessous : Max a relu il y a 2 min, deux demandes RGPD à suivre', /Max a relu la santé il y a 2 min/.test(E.bande) && /2 demandes RGPD/.test(E.bande), E.bande);
      v('un bouton « Dire le point de Victor », actif', E.boutons.length === 1 && /Dire le point de Victor/.test(E.boutons[0].t) && !E.boutons[0].off, JSON.stringify(E.boutons));
      v('trois sections : épisodes et RGPD ouverts, les six agents fermés', E.sections.length === 3 && E.sections[0].ouvert && !E.sections[1].ouvert && E.sections[2].ouvert && /Épisodes/.test(E.sections[0].t) && /Les six agents/.test(E.sections[1].t) && /Demandes RGPD/.test(E.sections[2].t), JSON.stringify(E.sections));
      v('⛔ les épisodes par agent (Max, Théo, Nina), niveau écrit en toutes lettres, incident ouvert dit', E.epis.length >= 4 && /3 erreurs signalées.*Important/.test(E.epis[0]) && /incident ouvert dans la Tour/.test(E.epis[0]) && E.epis.some(x => /La dernière sauvegarde réussie date de 31 h.*Critique/.test(x)) && E.epis.some(x => /pas encore annoncé/.test(x)), JSON.stringify(E.epis));
      v('…et les épisodes rétablis sur 7 jours', E.epis.some(x => /L’envoi d’e-mails du serveur est désactivé.*rétabli/.test(x)), JSON.stringify(E.epis));
      v('deux demandes RGPD, la deuxième EN RETARD (dit en mots), chacune avec « Marquer traitée » nommé', E.rgpd.length === 2 && /il reste 11 jours/.test(E.rgpd[0].li) && /accusé de réception envoyé/.test(E.rgpd[0].li) && /en retard de 2 jours/.test(E.rgpd[1].li) && !/accusé/.test(E.rgpd[1].li), JSON.stringify(E.rgpd));
      v('le panneau est BORNÉ : au plus 46 % du fil et 360 px, et le fil garde de la place', E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux, JSON.stringify([E.hPanneau, E.hCentre, E.hFlux]));
      v('aucun défilement latéral (page ni zone)', E.sx <= E.iw && E.zx <= E.zw + 1, JSON.stringify([E.sx, E.iw, E.zx, E.zw]));
      v('les six agents fermés ne montrent aucun « Passer maintenant » (population)', E.passer.length === 0);
      await cap(o, '01-repos-' + nom);

      /* ── 3. les six agents ── */
      await ev(`document.querySelector('#ms-pf [data-act="pfSection"][data-s="ag"]').click(); return 1;`); await dormir(200);
      E = await ev(ETAT);
      v('⛔ les six agents : six « Passer maintenant » nommés, celui d\'Inès (à l\'arrêt) GRISÉ', E.passer.length === 6 && E.passer.every(b => /^Faire passer /.test(b.nom)) && E.passer.filter(b => b.off).map(b => b.a).join() === 'ines', JSON.stringify(E.passer));
      const txt = E.html.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ');
      v('…le dernier passage de chacun, la relecture d\'Inès, le point de Victor, les diagnostics de Jules', /Dernier passage : il y a 2 min/.test(txt) && /relu le 2026-10-22/.test(txt) && /point dit il y a/.test(txt) && /2 diagnostics aujourd’hui/.test(txt) && /Décisions de Victor/.test(txt), txt.slice(0, 900));
      v('…toujours borné, toujours sans défilement latéral', E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux && E.sx <= E.iw, JSON.stringify([E.hPanneau, E.hFlux, E.sx, E.iw]));
      if (tel) v('au doigt : boutons, sections, « Passer maintenant » et « Marquer traitée » ≥ 44 px', E.boutons.every(b => b.h >= 44) && E.sections.every(s => s.h >= 44) && E.passer.filter(b => !b.off).every(b => b.h >= 44) && E.rgpd.every(b => b.h >= 44), JSON.stringify([E.boutons.map(b => b.h), E.sections.map(s => s.h), E.passer.map(b => b.h), E.rgpd.map(b => b.h)]));
      await cap(o, '02-agents-' + nom);

      /* ── 4. « Passer maintenant » : confirmation pour Jules et Victor (ils peuvent appeler Claude), pas pour Max ── */
      await ev(`window.__pf.posts.length=0; window.__conf=[]; window.confirm=m=>{ window.__conf.push(m); return false; }; document.querySelector('#ms-pf [data-act="pfPasser"][data-agent="jules"]').click(); return 1;`); await dormir(250);
      let P = await ev(`return {posts:window.__pf.posts.slice(),conf:window.__conf.slice()};`);
      v('⛔ « Passer » Jules → « Non » : rien n\'est parti, la question dit qu\'il peut appeler Claude', P.posts.length === 0 && P.conf.length === 1 && /Faire passer Jules maintenant/.test(P.conf[0]) && /appeler Claude/.test(P.conf[0]), JSON.stringify(P));
      await ev(`window.__pf.posts.length=0; window.__conf=[]; window.confirm=m=>{ window.__conf.push(m); return true; }; document.querySelector('#ms-pf [data-act="pfPasser"][data-agent="max"]').click(); return 1;`); await dormir(120);
      E = await ev(ETAT);
      v('⛔ Max (le code seul, aucun appel à Claude) passe SANS question ; pendant l\'appel tous les boutons sont GRISÉS', E.passer.every(b => b.off) && E.boutons.every(b => b.off), JSON.stringify([E.passer.map(b => b.off), E.boutons.map(b => b.off)]));
      await attendre(ev, `!document.querySelector('#ms-pf [data-act="pfPasser"][data-agent="max"]:disabled')`, 40); await ev(APAISER);
      P = await ev(`return {posts:window.__pf.posts.slice(),conf:window.__conf.slice(),toast:(document.getElementById('toast')||{}).textContent};`);
      E = await ev(ETAT);
      v('la route reçoit l\'agent ; le toast le dit ; les boutons se dégrisent (sauf Inès, à l\'arrêt)', JSON.stringify(P.posts) === JSON.stringify([['passer', 'max']]) && P.conf.length === 0 && /Max est passé/.test(P.toast) && E.passer.filter(b => b.off).map(b => b.a).join() === 'ines', JSON.stringify([P, E.passer.map(b => b.off)]));

      /* ── 5. le point de Victor ── */
      await ev(`window.__pf.posts.length=0; window.confirm=()=>false; document.querySelector('#ms-pf [data-act="pfPoint"]').click(); return 1;`); await dormir(200);
      P = await ev(`return window.__pf.posts.slice();`);
      v('⛔ « Dire le point » → « Non » : rien n\'est parti', P.length === 0, JSON.stringify(P));
      await ev(`window.confirm=m=>{ window.__msgPt=m; return true; }; document.querySelector('#ms-pf [data-act="pfPoint"]').click(); return 1;`);
      await attendre(ev, `/point de Victor est dit/.test((document.getElementById('toast')||{}).textContent||'')`, 40);
      P = await ev(`return {posts:window.__pf.posts.slice(),msg:window.__msgPt,toast:(document.getElementById('toast')||{}).textContent};`);
      v('« Oui » : la route reçoit le geste, le toast le dit, la question annonce « en plus de celui du matin »', JSON.stringify(P.posts) === JSON.stringify([['point', '']]) && /point de Victor est dit dans/.test(P.toast) && /en plus de celui du matin/.test(P.msg), JSON.stringify(P));

      /* ── 6. un refus du serveur se DIT ── */
      await ev(`window.__pf.refus=1; window.confirm=()=>true; document.querySelector('#ms-pf [data-act="pfPasser"][data-agent="theo"]').click(); return 1;`);
      await attendre(ev, `/déjà en cours/.test((document.getElementById('toast')||{}).textContent||'')`, 40);
      E = await ev(ETAT);
      v('⛔ un 409 du serveur : le toast REPREND sa phrase, les boutons se dégrisent', /Un passage est déjà en cours/.test(E.toast) && E.boutons.every(b => !b.off), JSON.stringify([E.toast, E.boutons]));

      /* ── 7. marquer une demande RGPD traitée ── */
      await ev(`window.__pf.posts.length=0; window.confirm=()=>false; document.querySelector('#ms-pf [data-act="pfRgpd"][data-id="g0000002"]').click(); return 1;`); await dormir(200);
      P = await ev(`return window.__pf.posts.slice();`);
      v('⛔ « Marquer traitée » → « Non » : rien n\'est parti', P.length === 0, JSON.stringify(P));
      await ev(`window.confirm=m=>{ window.__msgRg=m; return true; }; document.querySelector('#ms-pf [data-act="pfRgpd"][data-id="g0000002"]').click(); return 1;`);
      await attendre(ev, `document.querySelectorAll('#ms-pf [data-act="pfRgpd"]').length===1`, 50); await ev(APAISER);
      E = await ev(ETAT); P = await ev(`return {posts:window.__pf.posts.slice(),msg:window.__msgRg};`);
      v('« Oui » : la route reçoit l\'identifiant, la demande sort de la liste, Nina cesse ses rappels (dit dans la question)', JSON.stringify(P.posts) === JSON.stringify([['rgpd', 'g0000002']]) && E.rgpd.length === 1 && E.rgpd[0].id === 'g0000001' && /arrête ses rappels/.test(P.msg), JSON.stringify([P, E.rgpd.map(x => x.id)]));

      /* ── 8. le texte du serveur est échappé ── */
      await ev(`window.__pf.hostile=1; messPfCharger(); return 1;`); await dormir(500); await ev(APAISER);
      E = await ev(ETAT);
      v('⛔ une phrase du serveur qui contient une balise est AFFICHÉE comme texte, jamais exécutée', !E.xss && E.epis.some(x => /<img src=x onerror=.*piégé/.test(x)) && !/<img src=x/.test(E.html.replace(/&lt;img/g, '')), JSON.stringify([E.xss, E.epis[0]]));
      await ev(`window.__pf.hostile=0; return 1;`);

      /* ── 9. une lecture qui échoue ── */
      await ev(`window.__pf.echec=1; messPfCharger(); return 1;`); await dormir(500);
      E = await ev(ETAT);
      v('⛔ un rafraîchissement RATÉ ne vide pas le panneau (on garde ce qu\'on avait lu)', E.existe && E.sections.length === 3 && E.rgpd.length === 1, JSON.stringify([E.sections.length, E.rgpd.length]));
      await ev(`window.__pf.echec=1; MS.pf.d=null; MS.pf.lec=0; messChoisir('equipe'); messChoisir('plateforme'); return 1;`);
      await attendre(ev, `document.querySelector('#ms-pf [data-act="pfRecharger"]')`, 40); await ev(APAISER);
      E = await ev(ETAT);
      v('⛔ première lecture ratée : « n\'a pas pu être lu » + la raison du serveur + Réessayer (pas « rien d\'anormal »)', /n’a pas pu être lu/.test(E.bande) && /illisible|refusé \(503\)/.test(E.bande) && E.boutons.length === 1 && /Réessayer/.test(E.boutons[0].t) && !/Rien d’anormal/.test(E.bande), JSON.stringify([E.bande, E.boutons]));
      if (!tel) await cap(o, '03-illisible-' + nom);
      await ev(`document.querySelector('#ms-pf [data-act="pfRecharger"]').click(); return 1;`);
      await attendre(ev, `document.querySelector('#ms-pf .ms-reu-s')`, 40);
      E = await ev(ETAT);
      v('« Réessayer » relit : le panneau revient', E.sections.length === 3 && E.boutons.length === 1 && /Dire le point/.test(E.boutons[0].t), JSON.stringify([E.sections.length, E.boutons.length]));

      /* ── 10. le calme : voyant vert, un MOT ── */
      await ev(`window.__pf.d.episodes=[]; window.__pf.d.rgpd=[]; window.__pf.d.recents=[]; messPfCharger(); return 1;`);
      await attendre(ev, `/Rien d’anormal/.test((document.querySelector('#ms-pf .ms-reu-t')||{}).textContent||'')`, 40); await ev(APAISER);
      E = await ev(ETAT);
      v('⛔ plateforme calme : « Rien d\'anormal sur la plateforme » + voyant VERT ; sections vides dites en phrase', /Rien d’anormal sur la plateforme/.test(E.bande) && E.voyant && /ok/.test(E.voyant.cls) && E.vide.length >= 2, JSON.stringify([E.bande, E.voyant, E.vide]));
      await cap(o, '04-calme-' + nom);

      /* ── 11. beaucoup d'épisodes : le panneau défile en lui-même, le fil reste ── */
      await ev(`var L=[]; for(var i=0;i<14;i++) L.push({id:'ee'+i,proprio:['max','theo','nina'][i%3],cle:'x'+i,zone:'serveur',niveau:'important',depuis:Date.now()-i*60000,fin:0,annonce:true,incident:true,pris:true,texte:'Un épisode numéro '+(i+1)+' dont la phrase est assez longue pour prendre de la place dans la carte de cet agent, comme un vrai relevé.'}); window.__pf.d.episodes=L; messPfCharger(); return 1;`);
      await attendre(ev, `document.querySelectorAll('#ms-pf .ms-reu-s:nth-of-type(1) li').length>=14`, 40); await ev(APAISER);
      E = await ev(ETAT);
      v('⛔ quatorze épisodes : le panneau reste borné, DÉFILE en lui-même, le fil garde de la place', E.epis.length >= 14 && E.defileInterne && E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux && E.sx <= E.iw, JSON.stringify([E.epis.length, E.defileInterne, E.hPanneau, E.hFlux, E.sx, E.iw]));
      await cap(o, '05-beaucoup-' + nom);
      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.log('  ✗ sonde morte : ' + (e && e.stack || e)); process.exit(1); });
