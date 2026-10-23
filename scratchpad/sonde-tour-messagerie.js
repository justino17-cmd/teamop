/* ══ SONDE — LA MESSAGERIE DES AGENTS DANS LA TOUR (v2.104, 23 octobre 2026) ═══════════════════════════════════════════
   Justin : « quand je tape arobase, il faudrait que ça aille surligné en bleu… que je puisse sélectionner plusieurs personnes, et que ça mette
   tous… un bon fonctionnement : rapide, efficace, sympa à utiliser ». Tout se joue AU CLAVIER pour de vrai (Input.dispatchKeyEvent : de vraies
   touches, pas une valeur posée), sur tour.html servi en local, jour ET nuit, à 1440 ET 1100 px, plus un téléphone.
   L'API est SIMULÉE DANS LA PAGE (sonde-tour-theme.js) — aucune requête ne sort. Le simulateur applique la règle du SERVEUR pour les mentions :
   c'est le texte même de `analyserMentions` (server/conversations.js) qu'il exécute, pas une recopie. Il ne PARLE pas à la place d'un agent hors
   des deux réponses scriptées ci-dessous (une réponse de Margaux, un « écrit… » de Camille) : c'est le rôle de test-2883, avec le vrai serveur.
   Ce qu'on prouve ici, et que les bancs sans page ne voient pas :
     · la page existe, entre Agents et Rapport, avec sa pastille de non-lus ; 4 groupes + les 16 privés avec leur état (allumé · brouillon · à l'arrêt) ;
     · « @ca » ouvre la liste filtrée (Camille), Entrée la choisit, « @Camille » est BLEU dans la saisie (couleur CALCULÉE lue) ; on enchaîne
       « @Hu » → Hugo, « @to » → @tous ; une mention qui n'est pas du fil reste en texte simple ; le calque et la zone de texte font la même hauteur ;
     · Entrée envoie, Maj+Entrée va à la ligne ; le message paraît À L'INSTANT (avant la réponse du serveur), mentions bleues dans la bulle ;
     · un refus se DIT (« Non envoyé — réessayer ») et le réessai passe ;
     · « Camille écrit… » ; le fil reste en bas, mais pas si on est remonté lire (puce « Nouveaux messages ») ;
     · RIEN ne part quand la page est cachée ni quand on a quitté l'écran (appels comptés pendant 9 s) ;
     · « Parler à X » de la page Agents ouvre la Messagerie sur le fil de X ; pas de défilement latéral ; cibles ≥ 44 px au doigt.
   Chaque contrôle prouve d'abord sa population. Usage : node scratchpad/sonde-tour-messagerie.js
     PROFILS=1440:light,1100:dark (un sous-ensemble)  CAPTURES=<dossier>  TOUR_FICHIER=<tour d'avant>  (contre-épreuve : la sonde doit TOMBER sur une Tour sans Messagerie) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const { analyserMentions } = require('../server/conversations.js');

const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/messagerie-captures';
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

/* ── le simulateur du serveur, dans la page ── */
const SIMU = String.raw`
(function(){
  if(window.__simu) return 1; window.__simu=1;
  var norm=function(t){ return String(t==null?'':t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); };
  var analyserMentions=${analyserMentions.toString()};
  var N=Date.now(), M=60000, H=3600000;
  var AG=[['victor','Victor','Chef d’orchestre','auto'],['ines','Inès','Contrôle qualité','brouillon'],['camille','Camille','Courrier et support','auto'],['hugo','Hugo','Paiements et accès','auto'],
    ['margaux','Margaux','Facturation et compta','brouillon'],['lea','Léa','Onboarding et fidélisation','auto'],['max','Max','Sentinelle','auto'],['nina','Nina','Sécurité et RGPD','arret'],
    ['theo','Théo','Sauvegardes et données','auto'],['jules','Jules','Maintenance dev','arret'],['chloe','Chloé','Devis et interventions','brouillon'],['emma','Emma','Réunions et agenda','arret'],
    ['louis','Louis','Documentation et aide','arret'],['sarah','Sarah','Communication','arret'],['lola','Lola','Instagram','arret'],['noah','Noah','Réputation et visibilité','arret']];
  var NOM={}; AG.forEach(function(a){ NOM[a[0]]=a[1]; });
  var MEMBRES={equipe:'*',clients:['lea','chloe','camille','hugo','margaux','emma'],plateforme:['max','jules','theo','nina','ines'],reunions:'*'};
  var MENEUR={equipe:'victor',clients:'lea',plateforme:'max',reunions:'victor'};
  var GRP={equipe:'Équipe',clients:'Clients',plateforme:'Plateforme',reunions:'Réunions'};
  var membres=function(f){ var l=MEMBRES[f]==='*'?AG.map(function(a){return a[0];}):(MEMBRES[f]||(NOM[f]?[f]:[])); return l.map(function(id){ return {id:id,nom:NOM[id]}; }); };
  var MSG=[], seq=0;
  var add=function(fil,de,texte,dt,o){ o=o||{}; var m={id:'m'+(++seq),ts:N-dt,fil:fil,de:de,texte:texte,niveau:o.niveau||'info',lu:de==='justin'||de==='systeme'||o.lu===true,prof:de==='justin'?0:1,mentions:analyserMentions(texte,membres(fil))}; if(o.dossier) m.dossier=o.dossier; MSG.push(m); return m; };
  add('equipe','victor','Bonjour l’équipe. Priorités du jour : 1) les deux clients en attente (Camille) ; 2) la facture de Société E (Margaux) ; 3) la relance de Société C (Hugo).',9*H,{lu:true});
  add('equipe','camille','Je prends Société A et Société B.',8.9*H,{lu:true});
  add('equipe','camille','Société B : le bouton « Imprimer » ne répond pas, défaut reproduit sur la bêta. Je suis encore sur Société A. @Jules tu peux le prendre ?',3*H,{lu:true});
  add('equipe','systeme','Camille a confié « Corriger le bouton Imprimer (Société B) » à Jules.',3*H-M);
  add('equipe','max','Alerte : le service de signature ne répond plus. Je le redémarre. @Nina vérifie qu’aucune donnée n’est exposée pendant la panne.',40*M);
  add('equipe','nina','Rien d’exposé. Je surveille jusqu’à la reprise.',35*M);
  add('clients','margaux','Facture et contrat de Société E prêts. Ils partent dès que tu auras validé les textes de contrats.',30*M);
  add('victor','victor','Le rapport du jour est prêt. Deux décisions t’attendent : les textes de contrats et le « 24 h/24 » de Business Premium.',12*M,{niveau:'important'});
  add('camille','camille','Un client demande à être rappelé.',5*M,{niveau:'urgent',dossier:'DOS-000123'});
  var TACHES=[
    {id:'t1',ts:N-50*M,de:'justin',vers:'camille',type:'consigne',params:{texte:'Répondre aux deux clients en attente (Société A, Société B)'},statut:'prise',passePar:[]},
    {id:'t2',ts:N-30*M,de:'justin',vers:'jules',type:'consigne',params:{texte:'Corriger le bouton Imprimer (Société B)'},statut:'prise',passePar:['camille']},
    {id:'t3',ts:N-20*M,de:'victor',vers:'max',type:'verifier_paiement',params:{espace:'societe-c'},statut:'attente',passePar:[]},
    {id:'t4',ts:N-90*M,de:'justin',vers:'hugo',type:'consigne',params:{texte:'Tâche terminée, ne doit pas paraître'},statut:'faite',passePar:[]}];
  var ECRIT={}; var script={envoyer:[]}; window.__script=script;
  var vue=function(m){ return {id:m.id,ts:m.ts,fil:m.fil,de:m.de,nom:m.de==='justin'?'Toi':m.de==='systeme'?'Système':(NOM[m.de]||m.de),texte:m.texte,niveau:m.niveau,lu:m.lu===true,dossier:m.dossier||'',motif:'',mentions:m.mentions||[],prof:m.prof||0,systeme:m.de==='systeme'}; };
  var resume=function(f){ var ms=MSG.filter(function(m){return m.fil===f;}), d=ms[ms.length-1];
    return {fil:f,nom:GRP[f]||NOM[f],groupe:!!GRP[f],nonLus:ms.filter(function(m){return m.de!=='justin'&&m.lu!==true;}).length,membres:membres(f),meneur:MENEUR[f]||'',ecrit:Object.keys(ECRIT[f]||{}).map(function(id){return {id:id,nom:NOM[id]};}),
      dernier:d?{ts:d.ts,de:d.de,texte:d.texte.slice(0,120),niveau:d.niveau}:null}; };
  var json=function(st,d,lent){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },lent||25); }); };
  window.__simuEtat={msg:MSG,ecrit:ECRIT,taches:TACHES,agents:AG,mode:function(id,m){ AG.forEach(function(a){ if(a[0]===id) a[3]=m; }); }};
  window.__mess=[];
  var prev=window.fetch;
  window.fetch=function(u,o){
    var s=String(u); if(s.indexOf('https://api.teamop.fr')!==0) return prev(u,o);
    var p=s.slice('https://api.teamop.fr'.length), q=p.indexOf('?')>=0?p.slice(p.indexOf('?')+1):'', chemin=p.split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
    var mi=/^\/api\/monitor\/(conversations|agents)/.test(chemin); if(!mi) return prev(u,o);
    window.__mess.push(meth+' '+chemin+(q?'?'+q:''));
    if(meth==='GET'&&chemin==='/api/monitor/agents') return json(200,{ok:true,illisible:false,pause:{actif:false},enAttente:0,cleOk:true,agents:AG.map(function(a){ return {id:a[0],nom:a[1],role:a[2],mode:a[3],cerveau:true,couche:'x',vague:1,plafondUsd:10}; })});
    if(meth==='GET'&&chemin==='/api/monitor/agents/taches') return json(200,{ok:true,taches:TACHES});
    if(meth==='GET'&&chemin==='/api/monitor/conversations'){ var tous=/tous=1/.test(q); var fils=Object.keys(GRP).concat(AG.map(function(a){return a[0];})).map(resume).filter(function(x){ return tous||x.dernier||x.fil==='equipe'; });
      return json(200,{ok:true,fils:fils,nonLus:fils.reduce(function(s,x){return s+x.nonLus;},0),agents:AG.map(function(a){return {id:a[0],nom:a[1]};})}); }
    var g=/^\/api\/monitor\/conversations\/([a-z]+)$/.exec(chemin);
    if(meth==='GET'&&g){ var f=g[1]; if(!GRP[f]&&!NOM[f]) return json(400,{error:'Fil inconnu'});
      var tout=MSG.filter(function(m){return m.fil===f;}), ap=(/apres=([^&]+)/.exec(q)||[])[1], liste=tout.slice(-100), complet=true;
      if(ap){ var i=tout.findIndex(function(m){return m.id===ap;}); if(i>=0){ liste=tout.slice(i+1); complet=false; } }
      return json(200,{ok:true,fil:f,nom:GRP[f]||NOM[f],groupe:!!GRP[f],membres:membres(f),meneur:MENEUR[f]||'',ecrit:resume(f).ecrit,complet:complet,messages:liste.map(vue)}); }
    if(meth==='POST'&&chemin==='/api/monitor/conversations/lire'){ var b0=JSON.parse(o.body); MSG.forEach(function(m){ if(m.fil===b0.fil) m.lu=true; }); return json(200,{ok:true}); }
    if(meth==='POST'&&chemin==='/api/monitor/conversations/envoyer'){
      var b=JSON.parse(o.body), r=script.envoyer.length?script.envoyer.shift():null;
      if(r&&r.st) return json(r.st,r.d||{error:'refusé'},r.lent);
      var m=add(b.fil,'justin',b.texte,0); m.ts=Date.now();
      /* deux réponses scriptées, dites comme un agent : Margaux répond à une question, Camille « écrit… » puis parle */
      var cites=m.mentions.slice(); if(!cites.length&&NOM[b.fil]) cites=[b.fil];
      cites.slice(0,2).forEach(function(id,k){ ECRIT[b.fil]=ECRIT[b.fil]||{}; ECRIT[b.fil][id]=1;
        setTimeout(function(){ delete ECRIT[b.fil][id]; var rep=add(b.fil,id,id==='margaux'?'Pour la compta, je suis à jour sur Société E ; il reste la facture de Société F.':'Bien reçu, je regarde ça.',0); rep.ts=Date.now(); rep.lu=false; },(r&&r.lent||0)+3500+k*1500); });
      return json(200,{ok:true,message:vue(m),mentions:m.mentions.slice()},(r&&r.lent)||300); }
    return json(404,{error:'route simulée absente'});
  };
  return 1;
})()`;

/* l'observateur typographique de la Tour pose des espaces INSÉCABLES devant « : ; ! ? · — » : on compare des textes ramenés à l'espace ordinaire */
const N_ = `.replace(/[\u00a0\u202f]/g,' ')`;
const touche = (c, key, extra) => c.envoyer('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: { Enter: 13, ArrowDown: 40, ArrowUp: 38, Escape: 27, Tab: 9, Backspace: 8 }[key] || 0 }, extra || {}))
  .then(() => c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: { Enter: 13, ArrowDown: 40, ArrowUp: 38, Escape: 27, Tab: 9, Backspace: 8 }[key] || 0 }));
const taper = async (c, texte) => { for (const ch of texte) { await c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch });
  await c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await dormir(12); } };

const ETAT = `${STABLE}
  const ta=document.getElementById('ms-ta'), mi=document.getElementById('ms-miroir'), li=document.getElementById('ms-mentions');
  const marks=mi?[...mi.querySelectorAll('mark.ms-m')].map(m=>m.textContent):[];
  const cs=e=>e?getComputedStyle(e):null;
  return {valeur:ta?ta.value:null,marks:marks,
    liste:li&&!li.hidden?[...li.querySelectorAll('.ms-mi')].map(x=>x.querySelector('b').textContent):null,
    actif:li&&!li.hidden?[...li.querySelectorAll('.ms-mi')].findIndex(x=>x.getAttribute('aria-selected')==='true'):-1,
    hMiroir:mi?mi.scrollHeight:0,hTa:ta?ta.scrollHeight:0,
    couleurMark:mi&&mi.querySelector('mark')?cs(mi.querySelector('mark')).color:null,couleurTexte:mi?cs(mi).color:null,fondMark:mi&&mi.querySelector('mark')?cs(mi.querySelector('mark')).backgroundColor:null,
    largeurMark:mi&&mi.querySelector('mark')?mi.querySelector('mark').getBoundingClientRect().width:0};`;

const rgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/) || String(s).match(/color\(srgb ([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
  return /srgb/.test(s) ? p.slice(0, 3).map(x => x * 255) : p.slice(0, 3); };
const bleu = s => { const c = rgb(s); return !!c && c[2] > c[0] + 35 && c[2] > c[1] + 5; };

async function main() {
  const S = await demarrer();
  console.log('Sonde de la Messagerie — tour.html ' + S.version);
  try {
    const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'light'], ['1100', 'dark'], ['telephone', 'dark']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
    for (const [larg, mode] of profils) {
      console.log('\n── ' + larg + ' · ' + (mode === 'light' ? 'jour' : 'nuit') + ' ──');
      const tel = larg === 'telephone';
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode);
      const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 900, deviceScaleFactor: 1, mobile: false });
      const nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      await ev(SIMU);
      /* ── 1. la page existe, entre Agents et Rapport ── */
      const menu = await ev(`${STABLE} const t=[...document.querySelectorAll('nav.tabs .tab')].map(b=>b.getAttribute('data-t')); return {t,i:t.indexOf('messagerie'),ag:t.indexOf('agents'),ra:t.indexOf('rapport'),lib:(document.querySelector('nav.tabs .tab[data-t="messagerie"] .lib')||{}).textContent};`);
      if (!tel) v('« Messagerie » est au menu, entre Agents et Rapport', menu.i > 0 && menu.i === menu.ag + 1 && menu.ra === menu.i + 1 && menu.lib === 'Messagerie', JSON.stringify(menu));
      await ev(`setTab('messagerie'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-flux .ms-b, #ms-flux .ms-sys') && !!document.querySelector('#ms-fils .ms-cv')`)) break; }
      await ev(APAISER);
      const P = await ev(`${STABLE}
        const fils=[...document.querySelectorAll('#ms-fils .ms-cv')];
        const grp=fils.slice(0,4).map(b=>b.querySelector('b').textContent), priv=fils.slice(4);
        const etats={}; priv.forEach(b=>{ const p=b.querySelector('.ms-pt'); etats[b.getAttribute('data-fil')]=p?p.getAttribute('aria-label'):null; });
        const cv=n=>fils.find(b=>b.getAttribute('data-fil')===n);
        const nl=n=>{ const e=cv(n)&&cv(n).querySelector('.ms-nl'); return e?+e.textContent:0; };
        const z=document.getElementById('mess-zone').getBoundingClientRect(), droite=document.getElementById('ms-droite'), dr=getComputedStyle(droite);
        return {n:fils.length,grp,priv:priv.length,etats,nlVictor:nl('victor'),nlCamille:nl('camille'),nlEquipe:nl('equipe'),bdg:(document.getElementById('bdg-msgr')||{}).textContent,
          bdgVisible:!!document.getElementById('bdg-msgr')&&getComputedStyle(document.getElementById('bdg-msgr')).display!=='none',
          titre:(document.querySelector('.ms-ht h2')||{}).textContent,sous:((document.querySelector('.ms-ht p')||{}).textContent||'')${N_},
          bientot:((document.querySelector('.ms-bientot')||{}).textContent||'')${N_},regle:/Règle de sécurité/.test(document.querySelector('.ms-regle')?document.querySelector('.ms-regle').textContent:''),
          placeholder:(document.getElementById('ms-ta')||{}).placeholder,
          bulles:document.querySelectorAll('#ms-flux .ms-b').length,sys:document.querySelectorAll('#ms-flux .ms-sys').length,
          mentionsFil:[...document.querySelectorAll('#ms-flux .ms-bc mark.ms-m')].map(m=>m.textContent),
          tq:[...document.querySelectorAll('#ms-taches .ms-tq')].map(t=>t.textContent${N_}.replace(/\\s+/g,' ').trim()),
          droiteVisible:dr.display!=='none',zone:{w:Math.round(z.width),h:Math.round(z.height)},sx:document.documentElement.scrollWidth,iw:innerWidth,
          colonnes:getComputedStyle(document.querySelector('.ms')).gridTemplateColumns,
          basFlux:Math.round(document.getElementById('ms-flux').scrollHeight-document.getElementById('ms-flux').scrollTop-document.getElementById('ms-flux').clientHeight)};`);
      v('population : 4 groupes + 16 messages privés', P.n === 20 && P.priv === 16, JSON.stringify([P.n, P.priv]));
      v('les groupes portent leurs noms', JSON.stringify(P.grp) === JSON.stringify(['Équipe TeamOP', 'Clients', 'Plateforme', 'Réunions']), JSON.stringify(P.grp));
      v('l’état des agents se lit (allumé · brouillon · à l’arrêt)', P.etats.victor === 'Allumé' && P.etats.margaux === 'Brouillon' && P.etats.nina === 'À l’arrêt' && Object.values(P.etats).every(Boolean), JSON.stringify(P.etats));
      /* au départ : équipe 2 (Max, Nina), clients 1, Victor 1, Camille 1 = 5 ; l'équipe est ouverte → lue après affichage → la liste se relit → 3 */
      let NL = null; for (let i = 0; i < 40; i++) { await dormir(150); NL = await ev(`return {eq:+((document.querySelector('#ms-fils [data-fil="equipe"] .ms-nl')||{}).textContent||0),cl:+((document.querySelector('#ms-fils [data-fil="clients"] .ms-nl')||{}).textContent||0),bdg:(document.getElementById('bdg-msgr')||{}).textContent,vis:getComputedStyle(document.getElementById('bdg-msgr')).display!=='none'};`); if (NL.bdg === (tel ? '5' : '3')) break; }
      if (!tel) v('les non-lus : Victor 1, Camille 1, Clients 1 ; l’équipe, ouverte, est LUE après affichage (2 → 0) ; la pastille du menu dit 3', P.nlVictor === 1 && P.nlCamille === 1 && NL.cl === 1 && NL.eq === 0 && NL.bdg === '3' && NL.vis, JSON.stringify([P.nlVictor, P.nlCamille, NL]));
      else v('⛔ au téléphone le fil est derrière la liste : il n\'est pas VU, donc rien n\'est marqué lu (équipe 2 non lus, pastille 5)', NL.eq === 2 && NL.cl === 1 && NL.bdg === '5', JSON.stringify(NL));
      v('le fil ouvert : titre, sous-titre, « Bientôt », règle de sécurité, texte d’aide de la saisie', P.titre === '# Équipe TeamOP' && /16 agents et toi/.test(P.sous) && /Victor répond/.test(P.sous) && /Bientôt/.test(P.bientot) && P.regle && P.placeholder === 'Écrire… — tape @ pour citer quelqu’un', JSON.stringify([P.titre, P.sous, P.bientot, P.regle, P.placeholder]));
      v('le fil : 5 bulles d’agents, 1 ligne du système, et les mentions du serveur colorées (@Jules, @Nina)', P.bulles === 5 && P.sys === 1 && JSON.stringify(P.mentionsFil) === JSON.stringify(['@Jules', '@Nina']), JSON.stringify([P.bulles, P.sys, P.mentionsFil]));
      v('le fil reste en bas à l’ouverture', P.basFlux <= 2, String(P.basFlux));
      v('« Qui fait quoi » : 3 tâches ouvertes (la terminée n’y est pas), la déléguée le dit', P.tq.length === 3 && /Jules.*déléguée, d’abord à Camille/.test(P.tq.join('|')) && !/ne doit pas paraître/.test(P.tq.join('|')) && /Camille.*en cours/.test(P.tq.join('|')) && /Max.*en attente/.test(P.tq.join('|')) , JSON.stringify(P.tq));
      v('aucun défilement latéral de la page', P.sx <= P.iw, JSON.stringify([P.sx, P.iw]));
      if (!tel) v('colonnes selon la largeur de la zone (' + P.zone.w + ' px) : trois au-delà de 1000, deux sinon, « Qui fait quoi » en volet', (P.zone.w > 1000 ? P.droiteVisible && P.colonnes.split(' ').length === 3 : !P.droiteVisible && P.colonnes.split(' ').length === 2), JSON.stringify([P.zone, P.colonnes, P.droiteVisible]));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '01-ouverture-' + nom + '.png'), Buffer.from(r.data, 'base64')));

      if (tel) {
        /* le téléphone : une colonne à la fois — la liste d'abord (comme une messagerie), puis le fil, et « ‹ Conversations » pour revenir */
        const aff = () => ev(`${STABLE} return {m:document.querySelector('.ms').getAttribute('data-mob'),g:getComputedStyle(document.querySelector('.ms-gauche')).display,ce:getComputedStyle(document.querySelector('.ms-centre')).display,dr:getComputedStyle(document.getElementById('ms-droite')).display,sx:document.documentElement.scrollWidth,iw:innerWidth,retour:getComputedStyle(document.querySelector('.ms-retour')).display};`);
        let T = await aff();
        v('au téléphone, on ouvre sur la LISTE des conversations (le fil et « Qui fait quoi » sont derrière)', T.m === 'liste' && T.g !== 'none' && T.ce === 'none' && T.dr === 'none' && T.sx <= T.iw, JSON.stringify(T));
        await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '02-liste-' + nom + '.png'), Buffer.from(r.data, 'base64')));
        await ev(`document.querySelector('#ms-fils [data-fil="clients"]').click(); return 1;`); await dormir(600); await ev(APAISER);
        T = await aff();
        v('toucher « Clients » ouvre le fil seul, avec « ‹ Conversations » pour revenir', T.m === 'fil' && T.g === 'none' && T.ce !== 'none' && T.retour !== 'none' && T.sx <= T.iw, JSON.stringify(T));
        let NL2 = null; for (let i = 0; i < 30; i++) { await dormir(150); NL2 = await ev(`return (document.getElementById('bdg-msgr')||{}).textContent;`); if (NL2 === '4') break; }
        v('…et affiché, il est LU : la pastille passe de 5 à 4', NL2 === '4', String(NL2));
        const C = await ev(`${STABLE} const bt=[...document.querySelectorAll('.ms-centre button, .ms-centre textarea')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'&&!e.closest('[hidden]'); });
          return {n:bt.length,petits:bt.map(e=>({t:(e.textContent||e.id||'').trim().slice(0,24),h:Math.round(e.getBoundingClientRect().height),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.h<44||x.w<44)};`);
        v('cibles ≥ 44 px au doigt, dans le fil (population : ' + C.n + ')', C.n > 5 && C.petits.length === 0, JSON.stringify(C.petits));
        await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '03-fil-' + nom + '.png'), Buffer.from(r.data, 'base64')));
        await ev(`document.querySelector('[data-act="retour"]').click(); return 1;`); await dormir(250);
        T = await aff();
        v('« ‹ Conversations » ramène à la liste seule', T.m === 'liste' && T.g !== 'none' && T.ce === 'none', JSON.stringify(T));
        await ev(`document.querySelector('#ms-fils [data-fil="equipe"]').click(); return 1;`); await dormir(500); await ev(APAISER);
        await ev(`document.querySelector('.ms-btn-tq').click(); return 1;`); await dormir(250);
        const Q = await ev(`${STABLE} const d=document.getElementById('ms-droite'), r=d.getBoundingClientRect(); return {aff:getComputedStyle(d).display,l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),iw:innerWidth,t:document.querySelectorAll('#ms-taches .ms-tq').length};`);
        v('au téléphone, « Qui fait quoi » est un volet qu\'on ouvre, et il tient dans l\'écran (3 tâches)', Q.aff !== 'none' && Q.r <= Q.iw && Q.l >= 0 && Q.t === 3, JSON.stringify(Q));
        await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '04-volet-' + nom + '.png'), Buffer.from(r.data, 'base64')));
        v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.join(' | '));
        await o.fermer(); continue;
      }

      /* ── 2. la saisie : « @ca » → Camille ── */
      await ev(`document.getElementById('ms-ta').focus(); return 1;`);
      await taper(c, '@ca');
      let E = await ev(ETAT);
      v('« @ca » ouvre la liste filtrée : Camille seule, sélectionnée', E.liste && E.liste.length === 1 && E.liste[0] === 'Camille' && E.actif === 0, JSON.stringify(E.liste));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '02-liste-arobase-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      await touche(c, 'Enter');
      E = await ev(ETAT);
      v('Entrée choisit : « @Camille » + une espace, la liste se ferme, rien n’est envoyé', E.valeur === '@Camille ' && E.liste === null, JSON.stringify([E.valeur, E.liste]));
      v('« @Camille » est reconnue : un <mark> dans le calque', JSON.stringify(E.marks) === JSON.stringify(['@Camille']), JSON.stringify(E.marks));
      v('…et sa couleur CALCULÉE est bleue, pas celle du texte (' + E.couleurMark + ' contre ' + E.couleurTexte + ')', bleu(E.couleurMark) && !bleu(E.couleurTexte) && E.couleurMark !== E.couleurTexte, JSON.stringify([E.couleurMark, E.couleurTexte, E.fondMark]));
      /* enchaîner une deuxième personne, au clavier : ↓ puis Tab */
      await taper(c, '@h');
      E = await ev(ETAT);
      v('« @h » : Hugo (et Chloé, qui contient un h) — le prefixe d’abord', E.liste && E.liste[0] === 'Hugo' && E.liste.includes('Chloé'), JSON.stringify(E.liste));
      await touche(c, 'Tab');
      E = await ev(ETAT);
      v('Tab choisit aussi : « @Camille @Hugo »', E.valeur === '@Camille @Hugo ' && JSON.stringify(E.marks) === JSON.stringify(['@Camille', '@Hugo']), JSON.stringify([E.valeur, E.marks]));
      await taper(c, '@');
      E = await ev(ETAT);
      v('« @ » seul : @tous en tête, et ceux déjà cités n’y reviennent pas (16 membres − 2 + @tous = 15)', E.liste && E.liste[0] === '@tous' && E.liste.length === 15 && !E.liste.includes('Camille') && !E.liste.includes('Hugo'), JSON.stringify(E.liste && [E.liste.length, E.liste.slice(0, 3)]));
      await touche(c, 'ArrowDown'); await touche(c, 'ArrowDown'); await touche(c, 'ArrowUp');
      E = await ev(ETAT);
      v('↓ ↓ ↑ déplace la sélection (de 0 à 1)', E.actif === 1, String(E.actif));
      await touche(c, 'Escape');
      E = await ev(ETAT);
      v('Échap ferme la liste sans rien changer', E.liste === null && E.valeur === '@Camille @Hugo @', JSON.stringify([E.liste, E.valeur]));
      await touche(c, 'Backspace'); await taper(c, '@to');
      E = await ev(ETAT);
      v('« @to » : @tous', E.liste && E.liste[0] === '@tous', JSON.stringify(E.liste));
      await touche(c, 'Enter');
      E = await ev(ETAT);
      v('« @tous » est reconnue elle aussi (3 mentions bleues)', E.valeur === '@Camille @Hugo @tous ' && E.marks.length === 3 && E.marks[2] === '@tous', JSON.stringify([E.valeur, E.marks]));
      await taper(c, 'et @Inconnu vous faites ça — jean@camille.fr');
      E = await ev(ETAT);
      v('une mention d’un inconnu et une adresse restent du texte simple (pas de 4ᵉ mark)', E.marks.length === 3, JSON.stringify(E.marks));
      /* Maj+Entrée : une ligne de plus, rien d’envoyé */
      const avant = await ev(`return window.__mess.filter(x=>/envoyer/.test(x)).length;`);
      await c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r', modifiers: 8 });
      await c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 8 });
      await taper(c, 'ligne deux');
      E = await ev(ETAT);
      const apres = await ev(`return window.__mess.filter(x=>/envoyer/.test(x)).length;`);
      v('Maj+Entrée va à la ligne et n’envoie rien', /\n/.test(E.valeur || '') && apres === avant, JSON.stringify([E.valeur && E.valeur.slice(-14), avant, apres]));
      v('le calque et la zone de texte ont la MÊME hauteur de contenu (même retour à la ligne)', Math.abs(E.hMiroir - E.hTa) <= 2, JSON.stringify([E.hMiroir, E.hTa]));
      /* les styles CALCULÉS de la zone de texte et du calque : ce que le navigateur applique, pas ce que la feuille dit (une règle plus spécifique peut en changer un) */
      const SC = await ev(`${STABLE} const ta=document.getElementById('ms-ta'), mi=document.getElementById('ms-miroir'), mk=mi.querySelector('mark');
        const P=['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textIndent','textTransform','textAlign','whiteSpace','overflowWrap','wordBreak','tabSize','boxSizing','fontKerning','fontVariantLigatures','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderLeftWidth','borderRightWidth','borderBottomWidth','direction','unicodeBidi','textRendering'];
        const a=getComputedStyle(ta), b=getComputedStyle(mi), m=mk?getComputedStyle(mk):null;
        const diff=P.filter(k=>a[k]!==b[k]).map(k=>[k,a[k],b[k]]);
        const diffMark=m?['fontFamily','fontSize','fontWeight','letterSpacing','wordSpacing','paddingLeft','paddingRight','marginLeft','marginRight','borderLeftWidth','textTransform'].filter(k=>(k.startsWith('padding')||k.startsWith('margin')||k.startsWith('border'))?parseFloat(m[k])!==0:m[k]!==b[k]).map(k=>[k,m[k],b[k]]):null;
        const larg=[ta.clientWidth,Math.round(mi.getBoundingClientRect().width-parseFloat(mi.style.right||0))];
        return {n:P.length,diff,diffMark,larg,marks:mi.querySelectorAll('mark').length};`);
      v('⛔ la zone de texte et le calque ont les MÊMES styles calculés (' + SC.n + ' propriétés), et une mention y est sans marge, sans espacement ni graisse en plus', SC.n > 20 && SC.marks > 0 && SC.diff.length === 0 && SC.diffMark && SC.diffMark.length === 0, JSON.stringify(SC.diff.concat(SC.diffMark || [])));
      /* un texte qui va jusqu'au bord, avec des mentions près des coupures : les deux couches coupent au même endroit (même hauteur, et mêmes coupures lues sur le calque) */
      const Lg = await ev(`const ta=document.getElementById('ms-ta'), mi=document.getElementById('ms-miroir'); const mots=['@Camille','extraordinairement','si','@Hugo','anticonstitutionnellement','a','@tous','demain','pneumonoultramicroscopique','ok'];
        const res=[]; for(let q=0;q<6;q++){ ta.value=Array.from({length:70},(_,i)=>mots[(i*(q+3)+q)%mots.length]).join(' '); ta.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          res.push([mi.scrollHeight,ta.scrollHeight]); } return res;`);
      v('six longs textes qui touchent le bord : le calque et la zone ont chaque fois la même hauteur de contenu (mêmes coupures)', Lg.length === 6 && Lg.every(x => Math.abs(x[0] - x[1]) <= 2 && x[0] > 100), JSON.stringify(Lg));
      await ev(`const ta=document.getElementById('ms-ta'); ta.value='@Camille @Hugo @tous et @Inconnu vous faites ça — jean@camille.fr\\nligne deux'; ta.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);
      /* alignement : on peint la zone de texte en rouge par-dessus, le calque doit se lire dessous sans doublon */
      await ev(`document.getElementById('ms-ta').style.color='rgba(255,0,0,.55)'; return 1;`);
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '03-alignement-calque-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      await ev(`document.getElementById('ms-ta').style.color=''; return 1;`);
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '04-saisie-' + nom + '.png'), Buffer.from(r.data, 'base64')));

      /* ── 3. l’envoi : à l’instant, puis confirmé ── */
      await ev(`document.getElementById('ms-ta').value='@Camille @Hugo @tous vous faites ça ?'; document.getElementById('ms-ta').dispatchEvent(new Event('input',{bubbles:true})); return 1;`);
      await ev(`window.__script.envoyer.length=0; window.__script.envoyer.push({lent:900}); return 1;`);
      await ev(`window.__t0=performance.now(); return 1;`);
      await touche(c, 'Enter');
      await dormir(120);
      const I = await ev(`${STABLE} const b=[...document.querySelectorAll('#ms-flux .ms-b.moi')].pop(); const ta=document.getElementById('ms-ta');
        return {present:!!b,envoi:!!b&&b.classList.contains('ms-envoi'),txt:b?b.textContent:'',marks:b?[...b.querySelectorAll('mark.ms-m')].map(m=>m.textContent):[],
          couleur:b&&b.querySelector('mark')?getComputedStyle(b.querySelector('mark')).color:'',fond:b&&b.querySelector('mark')?getComputedStyle(b.querySelector('mark')).backgroundColor:'',
          vide:ta.value,bas:Math.round(document.getElementById('ms-flux').scrollHeight-document.getElementById('ms-flux').scrollTop-document.getElementById('ms-flux').clientHeight),
          appelEnvoyer:window.__mess.filter(x=>/envoyer/.test(x)).length};`);
      v('le message paraît À L’INSTANT (le serveur met 900 ms à répondre) : « Envoi… », la saisie est vidée', I.present && I.envoi && /Envoi…/.test(I.txt) && I.vide === '', JSON.stringify(I));
      v('…avec ses 3 mentions colorées, en bleu sur la bulle (' + I.couleur + ' sur ' + I.fond + ')', JSON.stringify(I.marks) === JSON.stringify(['@Camille', '@Hugo', '@tous']) && bleu(I.couleur), JSON.stringify(I));
      v('…et le fil est descendu jusqu’à lui', I.bas <= 2, String(I.bas));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '05-envoi-instant-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      await dormir(1200);
      const Cf = await ev(`${STABLE} const bs=[...document.querySelectorAll('#ms-flux .ms-b.moi')]; const b=bs[bs.length-1]; return {n:bs.length,envoi:!!b&&b.classList.contains('ms-envoi'),id:b&&b.getAttribute('data-id'),cle:b&&b.getAttribute('data-cle'),marks:b?[...b.querySelectorAll('mark.ms-m')].map(m=>m.textContent):[]};`);
      v('confirmé par le serveur : la bulle porte son identifiant, plus de « Envoi… », UNE seule bulle de moi en plus', Cf.n === 1 && !Cf.envoi && Cf.id && !Cf.cle && Cf.marks.length === 3, JSON.stringify(Cf));
      /* « Camille écrit… » puis sa réponse */
      let ecr = null; for (let i = 0; i < 30 && !ecr; i++) { await dormir(300); ecr = await ev(`const e=document.getElementById('ms-ecrit'); return e?e.textContent.trim():null;`); }
      v('« Camille et Hugo écrivent… » paraît, vu du serveur (état en mémoire, jamais inventé par la page)', !!ecr && /Camille/.test(ecr) && /écrivent…/.test(ecr), String(ecr));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '06-ecrit-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      let rep = 0; for (let i = 0; i < 40 && typeof rep !== 'string'; i++) { await dormir(300); rep = await ev(`const l=[...document.querySelectorAll('#ms-flux .ms-b:not(.moi)')].filter(b=>/Bien reçu/.test(b.textContent)); return l.length===2?l.map(b=>b.querySelector('b').textContent).join('+'):l.length;`); }
      v('les réponses de Camille et de Hugo arrivent par la lecture incrémentale (sans recharger le fil)', rep === 'Camille+Hugo', String(rep));
      const apresRep = await ev(`${STABLE} return {bas:Math.round(document.getElementById('ms-flux').scrollHeight-document.getElementById('ms-flux').scrollTop-document.getElementById('ms-flux').clientHeight),ecrit:!!document.getElementById('ms-ecrit'),nl:(document.querySelector('#ms-fils [data-fil="equipe"] .ms-nl')||{}).textContent||'0'};`);
      v('…le fil est resté en bas, « écrit… » a disparu, et le fil ouvert ne s’affiche pas non lu', apresRep.bas <= 2 && !apresRep.ecrit, JSON.stringify(apresRep));

      /* ── 4. un refus se DIT, le réessai passe ── */
      await ev(`window.__script.envoyer.length=0; window.__script.envoyer.push({st:503,d:{error:'Message non enregistré'}}); const t=document.getElementById('ms-ta'); t.focus(); t.value='Test du refus'; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);
      await touche(c, 'Enter'); await dormir(500);
      const F = await ev(`${STABLE} const b=document.querySelector('#ms-flux .ms-b.ms-echec'); return {present:!!b,txt:b?b.textContent${N_}.replace(/\\s+/g,' '):'',alerte:!!(b&&b.querySelector('[role=alert]')),btn:!!(b&&b.querySelector('[data-act=reessayer]')),bas:Math.round(document.getElementById('ms-flux').scrollHeight-document.getElementById('ms-flux').scrollTop-document.getElementById('ms-flux').clientHeight)};`);
      v('refus du serveur : « Non envoyé — réessayer », avec la raison dite', F.present && F.alerte && F.btn && /Non envoyé — réessayer/.test(F.txt) && /Message non enregistré/.test(F.txt), JSON.stringify(F));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '07-non-envoye-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      await ev(`document.querySelector('#ms-flux [data-act=reessayer]').click(); return 1;`); await dormir(900);
      const F2 = await ev(`${STABLE} return {echec:document.querySelectorAll('#ms-flux .ms-echec').length,envoi:document.querySelectorAll('#ms-flux .ms-envoi').length,txt:[...document.querySelectorAll('#ms-flux .ms-b.moi p')].map(p=>p.textContent).pop()};`);
      v('« réessayer » : le message part, l’alerte disparaît, une seule bulle', F2.echec === 0 && F2.envoi === 0 && F2.txt === 'Test du refus', JSON.stringify(F2));
      /* serveur injoignable */
      await ev(`window.__fetchSauve=window.fetch; window.fetch=function(u,o){ if(/conversations\\/envoyer/.test(String(u))) return Promise.reject(new TypeError('Failed to fetch')); return window.__fetchSauve(u,o); }; const t=document.getElementById('ms-ta'); t.focus(); t.value='Hors ligne'; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);
      await touche(c, 'Enter'); await dormir(400);
      const F3 = await ev(`${STABLE} const b=document.querySelector('#ms-flux .ms-b.ms-echec'); return {txt:b?b.textContent${N_}.replace(/\\s+/g,' '):''};`);
      v('serveur injoignable : « Non envoyé — réessayer » aussi, raison « Serveur injoignable »', /Non envoyé — réessayer/.test(F3.txt) && /Serveur injoignable/.test(F3.txt), JSON.stringify(F3));
      await ev(`window.fetch=window.__fetchSauve; document.querySelector('#ms-flux [data-act=retirer]').click(); return 1;`); await dormir(200);
      const F4 = await ev(`${STABLE} return {echec:document.querySelectorAll('#ms-flux .ms-echec').length,saisie:document.getElementById('ms-ta').value};`);
      v('« retirer » enlève la bulle et rend le texte à la saisie', F4.echec === 0 && F4.saisie === 'Hors ligne', JSON.stringify(F4));
      await ev(`const t=document.getElementById('ms-ta'); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);

      /* ── 5. le fil reste en bas… sauf si on est remonté lire ── */
      await ev(`const f=document.getElementById('ms-flux'); f.scrollTop=0; return 1;`); await dormir(200);
      await ev(`(function(){ var S=window.__simuEtat; var m={id:'zz'+Date.now(),ts:Date.now(),fil:'equipe',de:'theo',texte:'Sauvegarde reçue, relue et contrôlée.',niveau:'info',lu:false,prof:1,mentions:[]}; S.msg.push(m); })(); return 1;`);
      await dormir(4600);
      const R = await ev(`${STABLE} const f=document.getElementById('ms-flux'); const n=document.getElementById('ms-nouv'); return {top:f.scrollTop,nouv:n&&!n.hidden,txt:n?n.textContent:'',theo:/Sauvegarde reçue/.test(f.textContent)};`);
      v('remonté lire : le nouveau message arrive SANS faire sauter le fil, une puce « Nouveaux messages » le dit', R.theo && R.top < 5 && R.nouv, JSON.stringify(R));
      await ev(`document.getElementById('ms-nouv').click(); return 1;`); await dormir(200);
      const R2 = await ev(`${STABLE} const f=document.getElementById('ms-flux'); return {bas:Math.round(f.scrollHeight-f.scrollTop-f.clientHeight),nouv:!document.getElementById('ms-nouv').hidden};`);
      v('la puce ramène en bas et disparaît', R2.bas <= 2 && !R2.nouv, JSON.stringify(R2));

      /* ── 6. changer de fil : le brouillon de chacun, les non-lus tombent ── */
      await ev(`document.getElementById('ms-ta').focus(); const t=document.getElementById('ms-ta'); t.value='brouillon équipe'; t.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#ms-fils [data-fil="victor"]').click(); return 1;`);
      await dormir(700); await ev(APAISER);
      const V = await ev(`${STABLE} return {titre:document.querySelector('.ms-ht h2').textContent,sous:document.querySelector('.ms-ht p').textContent${N_},saisie:document.getElementById('ms-ta').value,puces:document.querySelectorAll('.ms-puces button').length,
        nl:(document.querySelector('#ms-fils [data-fil="victor"] .ms-nl')||{}).textContent||'0',niv:document.querySelectorAll('#ms-flux .ms-niv').length,bdg:(document.getElementById('bdg-msgr')||{}).textContent,place:document.getElementById('ms-ta').placeholder,
        lus:window.__mess.filter(x=>/conversations\\/lire/.test(x)).length};`);
      v('le fil privé de Victor : titre, rôle + état, pas de puces, saisie vide, « Important » dit en toutes lettres', V.titre === 'Victor' && /Chef d’orchestre · allumé/.test(V.sous) && V.puces === 0 && V.saisie === '' && V.niv === 1, JSON.stringify(V));
      v('lu après affichage : sa pastille tombe (1 → 0), celle du menu aussi, et un seul appel « lire »', V.nl === '0' && V.lus >= 1, JSON.stringify([V.nl, V.bdg, V.lus]));
      await ev(`document.querySelector('#ms-fils [data-fil="equipe"]').click(); return 1;`); await dormir(500);
      const Q = await ev(`${STABLE} return {saisie:document.getElementById('ms-ta').value,puces:document.querySelectorAll('.ms-puces button').length};`);
      v('revenu dans l’équipe, son brouillon est là, et les puces @ aussi (8 + @tous)', Q.saisie === 'brouillon équipe' && Q.puces === 9, JSON.stringify(Q));
      await ev(`const t=document.getElementById('ms-ta'); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);
      /* une puce */
      await ev(`document.querySelector('.ms-puces button[data-nom="Margaux"]').click(); return 1;`);
      E = await ev(ETAT);
      v('une puce « @Margaux » écrit la mention, bleue', E.valeur === '@Margaux ' && JSON.stringify(E.marks) === JSON.stringify(['@Margaux']), JSON.stringify([E.valeur, E.marks]));
      await ev(`const t=document.getElementById('ms-ta'); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`);

      /* ── 7. un agent à l’arrêt : la page le dit ── */
      await ev(`document.querySelector('#ms-fils [data-fil="nina"]').click(); return 1;`); await dormir(500);
      const N = await ev(`${STABLE} return {note:((document.querySelector('.ms-note')||{}).textContent||'')${N_},vide:((document.querySelector('#ms-flux .ms-vide')||{}).textContent||'')${N_}};`);
      v('fil d’un agent à l’arrêt : « Nina est à l’arrêt… » et l’état vide parle', /Nina est à l’arrêt/.test(N.note) && /Écris à Nina/.test(N.vide), JSON.stringify(N));
      await o.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '08-agent-arret-' + nom + '.png'), Buffer.from(r.data, 'base64')));

      /* ── 8. rien ne part quand la page est cachée, ni quand on a quitté l’écran ── */
      await ev(`document.querySelector('#ms-fils [data-fil="equipe"]').click(); return 1;`); await dormir(600);
      await ev(`window.__mess.length=0; Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return 'hidden';}}); document.dispatchEvent(new Event('visibilitychange')); return 1;`);
      await dormir(9500);
      const H = await ev(`return window.__mess.slice();`);
      v('page CACHÉE pendant 9,5 s : aucun appel à la messagerie (population : le fil se relisait toutes les 4 s)', H.length === 0, JSON.stringify(H));
      await ev(`window.__mess.length=0; Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return 'visible';}}); document.dispatchEvent(new Event('visibilitychange')); return 1;`);
      await dormir(700);
      const H2 = await ev(`return window.__mess.slice();`);
      v('page de nouveau visible : le fil et la liste se relisent tout de suite, les minuteries repartent', H2.some(x => /conversations\/equipe\?apres=/.test(x)) && H2.some(x => /tous=1/.test(x)), JSON.stringify(H2));
      await ev(`window.__mess.length=0; setTab('accueil'); return 1;`);
      await dormir(9500);
      const H3 = await ev(`return {appels:window.__mess.slice(),zone:!!document.getElementById('mess-zone'),inst:!!MS.inst,tFil:MS.tFil,tListe:MS.tListe};`);
      v('écran QUITTÉ pendant 9,5 s : aucun appel, la zone est démontée, les minuteries sont éteintes', H3.appels.length === 0 && !H3.zone && !H3.inst && H3.tFil === 0 && H3.tListe === 0, JSON.stringify(H3));
      const hd = await ev(`return {h:location.hash};`);

      /* ── 9. « Parler à X » ouvre la messagerie sur son fil ── */
      await ev(`setTab('agents'); return 1;`); await dormir(900);
      const pa = await ev(`${STABLE} const b=[...document.querySelectorAll('#vue .ag-carte button')].filter(x=>/Parler à Margaux/.test(x.textContent)); if(b.length) b[0].click(); return b.length;`);
      for (let i = 0; i < 40; i++) { await dormir(150); if (await ev(`return !!document.querySelector('#ms-hd h2')`)) break; }
      await dormir(400);
      const PA = await ev(`${STABLE} return {tab:TAB,titre:(document.querySelector('.ms-ht h2')||{}).textContent,cur:(document.querySelector('#ms-fils [aria-current="true"]')||{}).getAttribute&&document.querySelector('#ms-fils [aria-current="true"]').getAttribute('data-fil'),hash:location.hash};`);
      v('« Parler à Margaux » (page Agents) ouvre la Messagerie sur le fil de Margaux', pa === 1 && PA.tab === 'messagerie' && PA.titre === 'Margaux' && PA.cur === 'margaux', JSON.stringify([pa, PA]));
      v('aucune exception JavaScript (' + o.exceptions.length + ')', o.exceptions.length === 0, o.exceptions.join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
