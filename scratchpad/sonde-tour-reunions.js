/* ══ SONDE — LE PANNEAU DES RÉUNIONS DANS LA MESSAGERIE DE LA TOUR (23 octobre 2026) ═════════════════════════════════════
   Cahier §7. Justin : « le lundi matin et le vendredi soir… je veux une vraie équipe d'entreprise » ; il voit les objectifs de la semaine et les leçons, peut en
   retirer une, lancer une réunion tout de suite, et sait quelle réunion est en cours, jusqu'à quelle heure, et quand est la prochaine.
   tour.html servi en local, jour ET nuit, 1440 ET 1100 px, plus un téléphone. L'API est SIMULÉE DANS LA PAGE : le simulateur de la messagerie
   (sonde-tour-messagerie.js, lu tel quel — pas recopié) pour les fils, plus ici les trois routes des réunions. Ce que le serveur fait de ces routes, c'est test-2884 / test-2885.
   Ce qu'on prouve ici, et que les bancs sans page ne voient pas :
     · le panneau n'existe que sur le fil « Réunions » (caché ailleurs) ; sa bande dit la réunion en cours + l'heure de fin, ou la prochaine ;
     · les objectifs de la semaine, par agent, avec le bilan (Atteint · Partiel · Non atteint : un MOT, pas seulement une couleur) ; les leçons se déplient, « Retirer » demande confirmation ;
     · « Lancer » demande confirmation, grise les boutons pendant l'appel et pendant la réunion, DIT le refus du serveur (409) ;
     · une lecture qui échoue se DIT (« n'ont pas pu être lues » + Réessayer) — et un rafraîchissement raté ne vide PAS ce qu'on voyait ;
     · le panneau ne mange jamais le fil (hauteur bornée, défilement interne, même avec vingt leçons) ; aucun défilement latéral ; cibles ≥ 44 px au doigt ;
     · aucune exception JavaScript.
   Chaque contrôle prouve d'abord sa population. Usage : node scratchpad/sonde-tour-reunions.js
     PROFILS=1440:light,1100:dark  CAPTURES=<dossier>  TOUR_FICHIER=<tour d'avant>  (contre-épreuve : la sonde doit TOMBER sur une Tour sans panneau) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const { analyserMentions } = require('../server/conversations.js');

const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/reunions-captures';
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

/* le simulateur de la messagerie, LU dans la sonde voisine (une seule définition de ce que la messagerie reçoit) */
const voisine = fs.readFileSync(path.join(__dirname, 'sonde-tour-messagerie.js'), 'utf8');
const mm = /const SIMU = String\.raw`([\s\S]*?)`;\n\n\/\* l'observateur/.exec(voisine);
if (!mm) { console.log('  ✗ le simulateur de la messagerie est introuvable dans sonde-tour-messagerie.js'); process.exit(1); }
const SIMU = new Function('analyserMentions', 'return String.raw`' + mm[1] + '`;')(analyserMentions);

const REU = String.raw`
(function(){
  if(window.__reu) return 1;
  var N=Date.now(), H=3600000, M=60000;
  var lecon=function(id,t,sem){ return {id:id,texte:t,ts:N-3*H,semaine:sem||'2026-W43'}; };
  var etat=window.__reu={ get:0, posts:[], echec:0, refus:0, enCours:null,
    reunions:[{id:'r0',type:'objectifs',ts:N-26*H,fin:N-25*H,statut:'terminee',semaine:'2026-W44',manuelle:false,participants:['victor','lea'],compteRendu:'Compte rendu de Victor : chacun a ses objectifs.'}],
    objectifs:{
      lea:[{id:'o111111',texte:'Répondre à chaque inscription sous 24 h',mesure:'Zéro inscription sans réponse au vendredi',bilan:{statut:'atteint',pourquoi:'Toutes les inscriptions ont reçu une réponse.'}},
           {id:'o222222',texte:'Envoyer trois exemples de mails à valider par Justin',mesure:'Trois mails validés',bilan:{statut:'partiel',pourquoi:'Deux mails sur trois ont été validés.'}},
           {id:'o333333',texte:'Contacter dix prospects de la liste de la semaine dernière',mesure:'Dix contacts notés dans les dossiers',bilan:{statut:'non',pourquoi:'La liste est arrivée jeudi, trop tard pour dix contacts.'}}],
      camille:[{id:'o444444',texte:'Traiter le courrier de contact@ chaque matin avant 10 h',mesure:'Aucun message en attente à 10 h',bilan:null},{id:'o555555',texte:'Passer chaque facture à Margaux le jour même',mesure:'Zéro facture en attente de passage',bilan:null}],
      hugo:[{id:'o666666',texte:'Relire Stripe toutes les quinze minutes sans exception',mesure:'Aucune relecture manquée dans le journal',bilan:null}],
      victor:[{id:'o777777',texte:'Tenir la réunion du vendredi à l’heure',mesure:'Compte rendu publié avant 19 h',bilan:null}] },
    lecons:{ lea:[lecon('aaaaaa01','Toujours répondre à une inscription le jour même.'),lecon('aaaaaa02','Ne jamais promettre une date de démonstration sans l’avoir vérifiée avec Emma.'),lecon('aaaaaa03','Dire clairement que la semaine d’essai arrive après le retour du client.')],
             chloe:[lecon('bbbbbb01','Demander le nombre d’utilisateurs avant de parler de prix.'),lecon('bbbbbb02','Un devis sur mesure commence par les catégories inutiles à retirer.')] } };
  var json=function(st,d,lent){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },lent||25); }); };
  var prev=window.fetch;
  window.fetch=function(u,o){
    var s=String(u); if(s.indexOf('https://api.teamop.fr')!==0) return prev(u,o);
    var chemin=s.slice('https://api.teamop.fr'.length).split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
    if(chemin==='/api/monitor/agents/reunions'&&meth==='GET'){ etat.get++;
      if(etat.echec>0){ etat.echec--; return json(503,{error:'Les réunions des agents sont illisibles'}); }
      return json(200,{ok:true,semaine:'2026-W44',semainePrecedente:'2026-W43',enCours:etat.enCours,prochaine:{type:'bilan',ts:N+4*H,libelle:'vendredi 30 octobre, 18 h'},reunions:etat.reunions,objectifs:etat.objectifs,objectifsPrecedents:{},lecons:etat.lecons}); }
    if(chemin==='/api/monitor/agents/reunions/lancer'&&meth==='POST'){ var b=JSON.parse(o.body); etat.posts.push(['lancer',b.type]);
      if(etat.refus){ etat.refus=0; return json(409,{error:'Une réunion est déjà en cours'},200); }
      etat.enCours={id:'r1',type:b.type,debut:Date.now(),fin:Date.now()+H,jusqua:'10 h',titre:b.type==='bilan'?'Réunion du vendredi':'Réunion du lundi'};
      return json(200,{ok:true,id:'r1',annulee:false},1500); }
    if(chemin==='/api/monitor/agents/lecons/retirer'&&meth==='POST'){ var c=JSON.parse(o.body); etat.posts.push(['retirer',c.agent,c.id]);
      var l=etat.lecons[c.agent]||[]; etat.lecons[c.agent]=l.filter(function(x){ return x.id!==c.id; }); if(!etat.lecons[c.agent].length) delete etat.lecons[c.agent];
      return json(200,{ok:true},200); }
    return prev(u,o);
  };
  return 1;
})()`;

const ETAT = `${STABLE}
  const r=document.getElementById('ms-reu'), cs=e=>getComputedStyle(e), q=s=>r?[...r.querySelectorAll(s)]:[];
  const centre=document.querySelector('.ms-centre'), flux=document.getElementById('ms-flux'), z=document.getElementById('mess-zone');
  const pill=q('.ms-reu-b').map(p=>({t:p.textContent,fond:cs(p).backgroundColor,encre:cs(p).color}));
  return {existe:!!r,cache:r?r.hidden||cs(r).display==='none':null,
    bande:r&&r.querySelector('.ms-reu-t')?r.querySelector('.ms-reu-t').textContent.replace(/[\\u00a0\\u202f]/g,' '):null,
    cours:r?!!r.querySelector('.ms-reu-bd.cours'):false,
    boutons:q('.ms-reu-btn').map(b=>({t:b.textContent.replace(/[\\u00a0\\u202f]/g,' '),off:b.disabled,h:Math.round(b.getBoundingClientRect().height)})),
    sections:q('.ms-reu-h').map(b=>({t:b.firstChild.textContent.trim(),ouvert:b.getAttribute('aria-expanded')==='true',h:Math.round(b.getBoundingClientRect().height)})),
    agentsObj:q('.ms-reu-s:nth-of-type(1) .ms-reu-ag').length,agentsLec:q('.ms-reu-s:nth-of-type(2) .ms-reu-ag').length,
    objectifs:q('.ms-reu-s:nth-of-type(1) li').map(l=>l.firstChild.textContent),pill,
    retirer:q('[data-act="reuRetirer"]').map(b=>({a:b.getAttribute('data-agent'),id:b.getAttribute('data-id'),h:Math.round(b.getBoundingClientRect().height),nom:b.getAttribute('aria-label')})),
    vide:q('.ms-reu-vide').map(x=>x.textContent),
    hPanneau:r?Math.round(r.getBoundingClientRect().height):0,hCentre:centre?Math.round(centre.getBoundingClientRect().height):0,hFlux:flux?Math.round(flux.getBoundingClientRect().height):0,
    defileInterne:r?r.scrollHeight>r.clientHeight+1:false,maxH:r?cs(r).maxHeight:null,
    sx:document.documentElement.scrollWidth,iw:innerWidth,zx:z?z.scrollWidth:0,zw:z?z.clientWidth:0,
    fil:(document.querySelector('.ms-ht h2')||{}).textContent,toast:(document.getElementById('toast')||{}).textContent,
    msgs:document.querySelectorAll('#ms-flux .ms-b, #ms-flux .ms-sys').length};`;

const cap = async (o, nom) => { const r = await o.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); };

async function main() {
  const S = await demarrer();
  console.log('Sonde des réunions — tour.html ' + S.version);
  try {
    const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'light'], ['1100', 'dark'], ['telephone', 'dark']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
    for (const [larg, mode] of profils) {
      console.log('\n── ' + larg + ' · ' + (mode === 'light' ? 'jour' : 'nuit') + ' ──');
      const tel = larg === 'telephone';
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode);
      const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 900, deviceScaleFactor: 1, mobile: false });
      const nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      await ev(SIMU); await ev(REU);
      await ev(`setTab('messagerie'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-fils .ms-cv')`)) break; }
      await ev(APAISER);

      /* ── 1. ailleurs que « Réunions » : pas de panneau ── */
      let E = await ev(ETAT);
      v('population : la messagerie est ouverte, le panneau existe dans la page', E.existe && E.msgs > 0, JSON.stringify([E.existe, E.msgs]));
      v('⛔ sur le fil « Équipe » le panneau est CACHÉ (il n\'est pas pour tous les fils)', E.cache === true && E.fil === '# Équipe TeamOP', JSON.stringify([E.cache, E.fil]));
      if (tel) { await ev(`document.querySelector('#ms-fils [data-fil="reunions"]').click(); return 1;`); }
      else await ev(`document.querySelector('#ms-fils [data-fil="reunions"]').click(); return 1;`);
      for (let i = 0; i < 60; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-reu .ms-reu-s')`)) break; }
      await ev(APAISER);

      /* ── 2. l'état au repos ── */
      E = await ev(ETAT);
      v('population : le fil « Réunions » est ouvert, le panneau visible', E.cache === false && /Réunions/.test(E.fil || ''), JSON.stringify([E.cache, E.fil]));
      const minFlux = tel ? 100 : 160;
      if (tel) {
        v('⛔ au téléphone le panneau démarre PLIÉ : sa bande seule (≤ 90 px), le fil garde ≥ 220 px, ni boutons ni sections visibles', E.hPanneau <= 90 && E.hFlux >= 220 && E.boutons.every(b => b.h === 0) && E.sections.every(x => x.h === 0), JSON.stringify([E.hPanneau, E.hFlux, E.boutons.map(b => b.h), E.sections.map(x => x.h)]));
        await cap(o, '00-plie-' + nom);
        await ev(`document.querySelector('#ms-reu [data-act="reuPlier"]').click(); return 1;`); await dormir(250); await ev(APAISER); E = await ev(ETAT);
        v('« Détails » déplie (aria-expanded), « Réduire » replie', E.sections.length === 2 && E.sections.every(x => x.h > 0), JSON.stringify(E.sections));
      }
      v('la bande dit « Aucune réunion en cours » et la PROCHAINE (jour, heure, fuseau)', /Aucune réunion en cours/.test(E.bande) && /Prochaine : vendredi 30 octobre, 18 h \(heure de Paris\)/.test(E.bande) && /dernière : Objectifs du lundi/.test(E.bande), E.bande);
      v('deux boutons de lancement, actifs, avec le NOM de la réunion', E.boutons.length === 2 && E.boutons.every(b => !b.off) && /objectifs du lundi/.test(E.boutons[0].t) && /bilan du vendredi/.test(E.boutons[1].t), JSON.stringify(E.boutons));
      v('deux sections ; les objectifs ouverts, les leçons fermées', E.sections.length === 2 && E.sections[0].ouvert && !E.sections[1].ouvert && /Objectifs de la semaine/.test(E.sections[0].t) && /Leçons retenues/.test(E.sections[1].t), JSON.stringify(E.sections));
      v('⛔ les objectifs par agent : quatre agents, sept objectifs', E.agentsObj === 4 && E.objectifs.length === 7 && /Répondre à chaque inscription/.test(E.objectifs[0]), JSON.stringify([E.agentsObj, E.objectifs.length]));
      v('⛔ le bilan se LIT par un mot : Atteint, Partiel, Non atteint (jamais la couleur seule)', JSON.stringify(E.pill.map(p => p.t)) === JSON.stringify(['Atteint', 'Partiel', 'Non atteint']), JSON.stringify(E.pill.map(p => p.t)));
      v('…et les trois pastilles ont une encre ≠ de leur fond', E.pill.every(p => p.fond !== p.encre));
      v('le panneau est BORNÉ : au plus 46 % du fil et 360 px, et le fil garde de la place (≥ 160 px au bureau, 100 px au téléphone déplié)', E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux, JSON.stringify([E.hPanneau, E.hCentre, E.hFlux, E.maxH]));
      v('aucun défilement latéral (page ni zone)', E.sx <= E.iw && E.zx <= E.zw + 1, JSON.stringify([E.sx, E.iw, E.zx, E.zw]));
      v('les leçons fermées ne montrent aucun « Retirer » (population)', E.retirer.length === 0);
      await cap(o, '01-repos-' + nom);

      /* ── 3. les leçons ── */
      await ev(`document.querySelector('#ms-reu [data-act="reuSection"][data-s="lec"]').click(); return 1;`); await dormir(200);
      E = await ev(ETAT);
      v('⛔ les leçons se déplient : deux agents, cinq leçons, chacune avec « Retirer » nommé pour son agent', E.sections[1].ouvert && E.agentsLec === 2 && E.retirer.length === 5 && /Léa/.test(E.retirer[0].nom) && E.retirer.every(b => /^Retirer cette leçon de /.test(b.nom)), JSON.stringify([E.agentsLec, E.retirer.map(b => b.nom)]));
      v('…toujours borné, toujours sans défilement latéral', E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux && E.sx <= E.iw, JSON.stringify([E.hPanneau, E.hFlux, E.sx, E.iw]));
      if (tel) v('au doigt : boutons de lancement, sections et « Retirer » ≥ 44 px', E.boutons.every(b => b.h >= 44) && E.sections.every(s => s.h >= 44) && E.retirer.every(b => b.h >= 44), JSON.stringify([E.boutons.map(b => b.h), E.sections.map(s => s.h), E.retirer.map(b => b.h)]));
      await cap(o, '02-lecons-' + nom);

      /* ── 4. retirer une leçon : la fenêtre de confirmation d'abord (par défaut NON), puis oui ── */
      await ev(`window.__reu.posts.length=0; window.confirm=()=>false; document.querySelector('#ms-reu [data-act="reuRetirer"]').click(); return 1;`); await dormir(300);
      let P = await ev(`return {posts:window.__reu.posts.slice(),n:document.querySelectorAll('#ms-reu [data-act="reuRetirer"]').length};`);
      v('⛔ « Retirer » → « Non » à la confirmation : rien n\'est parti, rien n\'a bougé', P.posts.length === 0 && P.n === 5, JSON.stringify(P));
      await ev(`window.confirm=m=>{ window.__msgConfirm=m; return true; }; document.querySelector('#ms-reu [data-act="reuRetirer"]').click(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if ((await ev(`return document.querySelectorAll('#ms-reu [data-act="reuRetirer"]').length`)) === 4) break; }
      P = await ev(`return {posts:window.__reu.posts.slice(),n:document.querySelectorAll('#ms-reu [data-act="reuRetirer"]').length,msg:window.__msgConfirm,toast:(document.getElementById('toast')||{}).textContent};`);
      v('⛔ « Oui » : la route reçoit l\'agent et l\'identifiant, la leçon disparaît, un toast le dit', JSON.stringify(P.posts) === JSON.stringify([['retirer', 'lea', 'aaaaaa01']]) && P.n === 4 && /Leçon retirée/.test(P.toast), JSON.stringify(P));
      v('…la confirmation cite la leçon et dit ce qui change pour l\'agent', /Toujours répondre à une inscription/.test(P.msg) && /ne la lira plus dans ses consignes/.test(P.msg), P.msg);

      /* ── 5. lancer : confirmation, boutons grisés, état « en cours » ── */
      await ev(`window.__reu.posts.length=0; window.confirm=()=>false; document.querySelector('#ms-reu [data-act="reuLancer"][data-type="objectifs"]').click(); return 1;`); await dormir(250);
      P = await ev(`return window.__reu.posts.slice();`);
      v('⛔ « Lancer » → « Non » : rien n\'est parti', P.length === 0, JSON.stringify(P));
      await ev(`window.confirm=m=>{ window.__msgLancer=m; return true; }; document.querySelector('#ms-reu [data-act="reuLancer"][data-type="objectifs"]').click(); return 1;`);
      await dormir(120);
      E = await ev(ETAT);
      v('⛔ pendant l\'appel les deux boutons sont GRISÉS (pas de double lancement)', E.boutons.length === 2 && E.boutons.every(b => b.off), JSON.stringify(E.boutons));
      for (let i = 0; i < 60; i++) { await dormir(100); if ((await ev(`return !!document.querySelector('#ms-reu .ms-reu-bd.cours')`))) break; }
      await ev(APAISER); E = await ev(ETAT);
      P = await ev(`return {posts:window.__reu.posts.slice(),msg:window.__msgLancer};`);
      v('la route reçoit le type ; la confirmation annonce « une vingtaine d\'appels à Claude » et « une seule réunion à la fois »', JSON.stringify(P.posts) === JSON.stringify([['lancer', 'objectifs']]) && /une vingtaine d’appels à Claude/.test(P.msg) && /Une seule réunion à la fois/.test(P.msg), JSON.stringify(P));
      v('⛔ « en cours » : la bande dit LAQUELLE et JUSQU\'À QUELLE HEURE, boutons grisés tant qu\'elle dure', E.cours && /Réunion du lundi en cours — jusqu’à 10 h/.test(E.bande) && E.boutons.every(b => b.off), E.bande + ' ' + JSON.stringify(E.boutons));
      await cap(o, '03-en-cours-' + nom);

      /* ── 6. un refus du serveur se DIT ── */
      await ev(`window.__reu.enCours=null; window.__reu.refus=1; MS.reu.d=null; messReunionsCharger(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if ((await ev(`return !document.querySelector('#ms-reu .ms-reu-bd.cours') && !!document.querySelector('#ms-reu [data-act="reuLancer"]:not(:disabled)')`))) break; }
      await ev(`window.confirm=()=>true; document.querySelector('#ms-reu [data-act="reuLancer"][data-type="bilan"]').click(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if (/déjà en cours/.test((await ev(`return (document.getElementById('toast')||{}).textContent||''`)))) break; }
      E = await ev(ETAT);
      v('⛔ un 409 du serveur : le toast REPREND sa phrase, et les boutons se dégrisent', /Une réunion est déjà en cours/.test(E.toast) && E.boutons.every(b => !b.off), JSON.stringify([E.toast, E.boutons]));

      /* ── 7. une lecture qui échoue ── */
      await ev(`window.__reu.echec=1; messReunionsCharger(); return 1;`); await dormir(500);
      E = await ev(ETAT);
      v('⛔ un rafraîchissement RATÉ ne vide pas le panneau (on garde ce qu\'on avait lu)', E.existe && E.sections.length === 2 && E.objectifs.length === 7, JSON.stringify([E.sections.length, E.objectifs.length]));
      await ev(`window.__reu.echec=2; MS.reu={lec:0,d:null,err:'',enVol:false,lance:false,ouvert:{obj:true,lec:false}}; messChoisir('equipe'); messChoisir('reunions'); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-reu [data-act="reuRecharger"]')`)) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('⛔ première lecture ratée : « Les réunions n\'ont pas pu être lues » + la raison du serveur + Réessayer (pas « aucun objectif »)', /n’ont pas pu être lues/.test(E.bande) && /illisibles|refusé \(503\)/.test(E.bande) && E.boutons.length === 1 && /Réessayer/.test(E.boutons[0].t) && E.sections.length === 0, JSON.stringify([E.bande, E.boutons]));
      if (!tel) await cap(o, '04-illisible-' + nom);
      await ev(`document.querySelector('#ms-reu [data-act="reuRecharger"]').click(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-reu .ms-reu-s')`)) break; }
      E = await ev(ETAT);
      v('« Réessayer » relit : le panneau revient', E.sections.length === 2 && E.boutons.length === 2, JSON.stringify([E.sections.length, E.boutons.length]));

      /* ── 8. beaucoup de leçons : le panneau défile en lui-même, le fil reste ── */
      await ev(`var L=[]; for(var i=0;i<20;i++) L.push({id:'cccc'+(100+i),texte:'Leçon numéro '+(i+1)+' : une phrase assez longue pour prendre de la place dans la carte de cet agent, comme une vraie leçon.',ts:Date.now(),semaine:'2026-W43'}); window.__reu.lecons.noah=L; window.__reu.enCours=null; MS.reu.ouvert.lec=true; messReunionsCharger(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if ((await ev(`return document.querySelectorAll('#ms-reu [data-act="reuRetirer"]').length`)) >= 24) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('⛔ vingt leçons de plus : le panneau reste borné, DÉFILE en lui-même, et le fil garde de la place', E.retirer.length >= 24 && E.defileInterne && E.hPanneau <= Math.max(360, 0.46 * E.hCentre) + 2 && E.hFlux >= minFlux && E.sx <= E.iw, JSON.stringify([E.retirer.length, E.defileInterne, E.hPanneau, E.hFlux]));
      await cap(o, '05-beaucoup-' + nom);
      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.log('  ✗ sonde morte : ' + (e && e.stack || e)); process.exit(1); });
