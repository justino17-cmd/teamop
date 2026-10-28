/* ══ SONDE — UNE CONVERSATION EN PLEIN ÉCRAN, AU TÉLÉPHONE (Tour v2.118, 28 octobre 2026) ══
   Justin, capture iPhone à l'appui : « c'est trop petit ; quand j'ouvre un message je voudrais un truc comme un iPhone : le clavier je peux l'enlever, je vois
   les messages en entier ». Mesuré sur sa capture : 330 px de messages sur 874. On prouve, sur tour.html servi en local (API simulée — celle de
   sonde-tour-messagerie.js), iPhone 390 × 844, encoches posées :
     · la LISTE garde la Tour autour (en-tête, barre d'onglets) ; une conversation ouverte couvre TOUT l'écran — l'en-tête et la barre d'onglets
       ne sont plus touchables, le fil prend au moins 70 % de la hauteur ; l'en-tête de la conversation tient sur une ligne ;
     · pas de rangées de @noms : un bouton « @ » qui pose l'arobase au curseur et ouvre la liste de ceux qu'on peut citer ;
     · faire défiler les messages (un vrai doigt, Input.dispatchTouchEvent) ou toucher un message RANGE le clavier ; toucher la saisie ne le range pas ;
     · la hauteur suit la partie visible (un clavier simulé : visualViewport réduit) ;
     · « ‹ » rend la liste ET la Tour autour ; quitter l'onglet ne laisse rien en plein écran ;
     · au bureau, rien ne change (pas de plein écran, les @noms restent) ; cibles ≥ 44 px ; aucune exception.
   Usage : node scratchpad/sonde-tour-conv-plein.js   (TOUR_FICHIER=<tour d'avant> : la contre-épreuve doit TOMBER) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const SRC_SONDE = fs.readFileSync(path.join(__dirname, 'sonde-tour-messagerie.js'), 'utf8');
const { analyserMentions } = require('../server/conversations.js');
const SIMU = (() => { const i = SRC_SONDE.indexOf('const SIMU = String.raw`') + 'const SIMU = String.raw`'.length, j = SRC_SONDE.indexOf('`;\n', i);
  return SRC_SONDE.slice(i, j).replace('${analyserMentions.toString()}', analyserMentions.toString()); })();
const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/conv-plein';
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

async function main() {
  const S = await demarrer();
  console.log('Sonde « conversation plein écran » — tour.html ' + S.version);
  try {
    const o = await onglet(S, 'telephone', 'dark');
    const { c, ev } = o;
    const cap = n => c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, n + '.png'), Buffer.from(r.data, 'base64')));
    await ev(SIMU);
    await ev(`setTab('messagerie'); return 1;`);
    for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return !!document.querySelector('#ms-fils .ms-cv')`)) break; }
    await ev(APAISER);
    const etat = () => ev(`${STABLE}
      const z=document.getElementById('mess-zone'), r=z.getBoundingClientRect(), f=document.getElementById('ms-flux'), fr=f.getBoundingClientRect(), hd=document.getElementById('ms-hd');
      const qui=(x,y)=>{ const e=document.elementFromPoint(x,y); return e?(e.closest('#mess-zone')?'zone':e.closest('.barre-bas')?'barre':e.closest('.bandeau')?'entete':(e.tagName+'.'+e.className).slice(0,40)):'rien'; };
      return {plein:document.body.classList.contains('ms-plein'),mob:document.querySelector('.ms').getAttribute('data-mob'),
        z:{t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)},iw:innerWidth,ih:innerHeight,
        haut:qui(innerWidth/2,6),bas:qui(innerWidth/2,innerHeight-62),flux:Math.round(fr.height),hdH:Math.round(hd.getBoundingClientRect().height),
        puces:!!document.querySelector('.ms-puces')&&getComputedStyle(document.querySelector('.ms-puces')).display!=='none',
        arobase:!!document.querySelector('.ms-arobase')&&getComputedStyle(document.querySelector('.ms-arobase')).display!=='none',
        sx:document.documentElement.scrollWidth};`);
    let E = await etat();
    v('la LISTE garde la Tour autour (pas de plein écran, barre d’onglets touchable)', !E.plein && E.mob === 'liste' && E.bas === 'barre', JSON.stringify(E));
    await cap('01-liste');
    await ev(`document.querySelector('#ms-fils [data-fil="equipe"]').click(); return 1;`); await dormir(700); await ev(APAISER);
    E = await etat();
    v('une conversation ouverte couvre TOUT l’écran (0 → ' + E.ih + ' px), au-dessus de l’en-tête et de la barre d’onglets', E.plein && E.z.t === 0 && E.z.l === 0 && E.z.w === E.iw && Math.abs(E.z.h - E.ih) <= 1 && E.haut === 'zone' && E.bas === 'zone', JSON.stringify(E));
    v('le fil prend au moins 70 % de la hauteur (' + E.flux + ' px sur ' + E.ih + ' ; 330 sur 874 avant)', E.flux >= 0.7 * E.ih, String(E.flux));
    v('l’en-tête de la conversation tient sur une ligne (≤ 60 px)', E.hdH <= 60, String(E.hdH));
    v('plus de rangées de @noms : un bouton « @ » à la place', !E.puces && E.arobase, JSON.stringify([E.puces, E.arobase]));
    v('aucun défilement latéral', E.sx <= E.iw, String(E.sx));
    await cap('02-conversation');
    /* « @ » : l'arobase au curseur, la liste s'ouvre */
    const A = await ev(`const ta=document.getElementById('ms-ta'); ta.value='Bonjour'; ta.setSelectionRange(7,7); document.querySelector('.ms-arobase').click(); await new Promise(r=>setTimeout(r,200));
      const l=document.getElementById('ms-mentions'); return {v:ta.value,foc:document.activeElement===ta,liste:!!l&&!l.hidden&&l.querySelectorAll('.ms-mi').length};`);
    v('« @ » pose l’arobase au curseur (« Bonjour @ »), garde la saisie et ouvre la liste des personnes à citer', A.v === 'Bonjour @' && A.foc && A.liste > 3, JSON.stringify(A));
    await cap('03-arobase');
    await ev(`const ta=document.getElementById('ms-ta'); ta.value=''; ta.dispatchEvent(new Event('input')); messMentionFermer(); return 1;`);
    /* le clavier : on focalise la saisie, un VRAI doigt fait défiler le fil → elle perd le focus */
    const centre = await ev(`const r=document.getElementById('ms-flux').getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};`);
    const doigt = async (pts) => { await c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
      for (const p of pts.slice(1)) { await c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] }); await dormir(30); }
      await c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(150); };
    const focus = () => ev(`document.getElementById('ms-ta').focus(); return document.activeElement===document.getElementById('ms-ta');`);
    v('(population) la saisie a bien le clavier avant le geste', await focus());
    await doigt([{ x: centre.x, y: centre.y }, { x: centre.x, y: centre.y + 30 }, { x: centre.x, y: centre.y + 60 }]);
    v('faire défiler les messages range le clavier', await ev(`return document.activeElement!==document.getElementById('ms-ta');`));
    v('(population) la saisie a de nouveau le clavier', await focus());
    await doigt([{ x: centre.x, y: centre.y }]);
    v('toucher les messages range le clavier', await ev(`return document.activeElement!==document.getElementById('ms-ta');`));
    await focus();
    const ta = await ev(`const r=document.getElementById('ms-ta').getBoundingClientRect(); return {x:Math.round(r.left+20),y:Math.round(r.top+r.height/2)};`);
    await doigt([{ x: ta.x, y: ta.y }]);
    v('toucher la saisie ne le range pas', await ev(`return document.activeElement===document.getElementById('ms-ta');`));
    /* un clavier simulé : la partie visible passe à 500 px */
    const K = await ev(`const vv=window.visualViewport; if(!vv) return {pas:1};
      Object.defineProperty(vv,'height',{configurable:true,get:()=>500}); Object.defineProperty(vv,'offsetTop',{configurable:true,get:()=>0});
      vv.dispatchEvent(new Event('resize')); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const z=document.getElementById('mess-zone').getBoundingClientRect(), c=document.getElementById('ms-comp').getBoundingClientRect();
      delete vv.height; delete vv.offsetTop; return {h:Math.round(z.height),compBas:Math.round(c.bottom)};`);
    v('clavier ouvert : la conversation se règle sur la partie visible (500 px), la saisie reste au-dessus du clavier', K.h === 500 && K.compBas <= 500, JSON.stringify(K));
    await ev(`window.visualViewport.dispatchEvent(new Event('resize')); document.getElementById('ms-ta').blur(); return 1;`); await dormir(200);
    /* cibles */
    const C = await ev(`${STABLE} const bt=[...document.querySelectorAll('#ms-hd button, #ms-comp button, #ms-comp textarea')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; });
      return {n:bt.length,petits:bt.map(e=>({t:(e.getAttribute('aria-label')||e.textContent||e.id||'').trim().slice(0,24),h:Math.round(e.getBoundingClientRect().height),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.h<42||x.w<42)};`);
    v('cibles ≥ 44 px dans l’en-tête et la saisie (population : ' + C.n + ')', C.n >= 4 && C.petits.length === 0, JSON.stringify(C.petits));
    /* les réunions : le bandeau tient en une ligne */
    await ev(`document.querySelector('[data-act="retour"]').click(); return 1;`); await dormir(300);
    E = await etat();
    v('« ‹ » rend la liste ET la Tour autour (barre d’onglets touchable)', !E.plein && E.mob === 'liste' && E.bas === 'barre', JSON.stringify(E));
    /* les réunions LUES (la forme du GET du serveur) : le bandeau ordinaire, replié */
    await ev(`var _g=apiGet; apiGet=function(u){ if(String(u).indexOf('agents/reunions')>=0) return Promise.resolve({reunions:[],enCours:null,objectifs:{},lecons:{},semaine:'2026-W44',
      prochaine:{type:'sujet',libelle:'jeudi 29 octobre, 9 h – 10 h',ts:Date.now()+86400000},planifiees:[{id:'p1a2b3c4d',libelle:'jeudi 29 octobre, 9 h – 10 h',sujet:'le démarrage de l’entreprise',participants:'tout le monde',nb:16}]});
      return _g.apply(this,arguments); }; return 1;`);
    await ev(`document.querySelector('#ms-fils [data-fil="reunions"]').click(); return 1;`); await dormir(900); await ev(APAISER);
    const R = await ev(`${STABLE} const b=document.querySelector('.ms-reu-bd'); return {plein:document.body.classList.contains('ms-plein'),h:b?Math.round(b.getBoundingClientRect().height):-1,flux:Math.round(document.getElementById('ms-flux').getBoundingClientRect().height)};`);
    v('Réunions : plein écran, bandeau replié sur une ligne (≤ 64 px), le fil garde la place', R.plein && R.h > 0 && R.h <= 64 && R.flux >= 0.55 * E.ih, JSON.stringify(R));
    await cap('04-reunions');
    await ev(`setTab('agents'); return 1;`); await dormir(400);
    v('quitter l’onglet ne laisse rien en plein écran', await ev(`return !document.body.classList.contains('ms-plein');`));
    v('aucune exception JavaScript (téléphone)', o.exceptions.length === 0, o.exceptions.join(' | '));
    await o.fermer();
    /* au bureau : rien ne change */
    const b = await onglet(S, 'bureau', 'light');
    await b.ev(SIMU); await b.ev(`setTab('messagerie'); return 1;`);
    for (let i = 0; i < 80; i++) { await dormir(100); if (await b.ev(`return !!document.querySelector('#ms-flux .ms-b')`)) break; }
    const B = await b.ev(`return {plein:document.body.classList.contains('ms-plein'),puces:getComputedStyle(document.querySelector('.ms-puces')).display,arobase:getComputedStyle(document.querySelector('.ms-arobase')).display,
      env:document.querySelector('.ms-envoyer').getBoundingClientRect().width,txt:document.querySelector('.ms-envoyer').textContent.trim(),ph:document.getElementById('ms-ta').placeholder};`);
    v('au bureau, rien ne change : pas de plein écran, les @noms restent, « Envoyer » en toutes lettres, l’aide complète', !B.plein && B.puces !== 'none' && B.arobase === 'none' && B.env > 60 && B.txt === 'Envoyer' && /tape @/.test(B.ph), JSON.stringify(B));
    v('aucune exception JavaScript (bureau)', b.exceptions.length === 0, b.exceptions.join(' | '));
    await b.fermer();
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
