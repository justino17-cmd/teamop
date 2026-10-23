/* ══ SONDE — LA GRILLE D'UNE DEMANDE, QUAND L'ESPACE EST DÉJÀ OUVERT (relecture du 23 octobre 2026) ═════════════════
   Une entreprise qui travaille envoie une seconde demande : la grille doit partir de ses rubriques ACTUELLES (3 sur 38 pour « restreint », toutes pour
   « libre »), le dire, et ne pas promettre « l'application ne montrera que celles-là » (elle ne lit pas encore `cats`). Une entreprise sans espace
   part toujours du conseil de son métier. Jour ET nuit, 1440 / 1100 / 390 px ; chaque appareil prouve sa population (les trois cartes, les cases
   cochées) et le défilement latéral RÉEL (deux lectures à 700 ms). Données inventées, tour.html servi en 127.0.0.1, l'API simulée :
   rien ne sort. Usage : node scratchpad/sonde-tour-demande-ouverte.js [dossier de captures]
   Contre-épreuve : TOUR_FICHIER=<une Tour sans `demCatsDepart(d,esp)`> doit tomber. */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER } = require('./sonde-tour-theme.js');
const RACINE = path.resolve(__dirname, '..');
const CAPS = process.argv[2] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/caps';
fs.mkdirSync(CAPS, { recursive: true });
const toujours = ['dashboard', 'utilisateurs', 'modulesElan', 'parametres'];
const R = JSON.parse(fs.readFileSync(path.join(RACINE, 'metiers.json'), 'utf8'));
const REF = require('../server/metiers.js')(path.join(RACINE, 'metiers.json'), Object.keys(R.rubriques).filter(k => !toujours.includes(k)), toujours).publique();

const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };
const D = 'N-86400000';
const CLIENTS = `[
 {email:'restreint@sonde.test',entreprise:'Chauffage Restreint',nom:'Restreint',demandes:[{app:'OP GESTION',formule:'Pro',users:'3',metier:'chauffage',besoin:'Une seconde équipe',date:Date.now()-3000}],demandesTraitees:{}},
 {email:'libre@sonde.test',entreprise:'Libre Services',nom:'Libre',demandes:[{app:'OP GESTION',formule:'Business',users:'8',metier:'chauffage',besoin:'Plus de postes',date:Date.now()-2000}],demandesTraitees:{}},
 {email:'neuf@sonde.test',entreprise:'Neuf Plomberie',nom:'Neuf',demandes:[{app:'OP GESTION',formule:'Pro',users:'2',metier:'plomberie',besoin:'On démarre',date:Date.now()-1000}],demandesTraitees:{}}
]`;
const ENTS = `[
 {t:'t-restreint',slug:'restreint-banc',nom:'restreint-banc',email:'restreint@sonde.test',dansAnnuaire:true,formule:'pro',cats:['devis','factures','clients']},
 {t:'t-libre',slug:'libre-banc',nom:'libre-banc',email:'libre@sonde.test',dansAnnuaire:true,formule:'business',cats:null}
]`;

async function main() {
  const S = await demarrer();
  console.log('Sonde de la grille des demandes (espace déjà ouvert) — tour.html ' + S.version);
  try {
    for (const [nom, appareil, largeur] of [['1440', 'bureau', 1440], ['1100', 'bureau', 1100], ['390', 'telephone', 0]]) for (const mode of ['dark', 'light']) {
      console.log('\n── ' + nom + ' px · ' + mode + ' ──');
      const o = await onglet(S, appareil, mode);
      if (largeur) await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 1000, deviceScaleFactor: 1, mobile: false });
      await o.ev(`try{ if(APP!=='gestion') setApp('gestion',true); }catch(e){} setTab('demandes',true); await new Promise(r=>setTimeout(r,700)); return 1;`);
      const prep = await o.ev(`
        const C=${CLIENTS}, E=${ENTS};
        Object.defineProperty(CLI,'list',{configurable:true,get(){return C;},set(){}}); CLI.loaded=true; CLI.err='';
        Object.defineProperty(ENT,'liste',{configurable:true,get(){return E;},set(){}}); ENT.loaded=true;
        REFM.d=${JSON.stringify(REF)}; REFM.err='';
        DEM.vue='atraiter'; DEM.cats={}; MYROLE='patron'; render(); ${APAISER}
        return {role:MYROLE, cartes:document.querySelectorAll('.dem-carte').length, grilles:document.querySelectorAll('.dem-cats').length};`);
      v('(population) trois cartes de demande, trois grilles', prep.cartes === 3 && prep.grilles === 3, JSON.stringify(prep));
      const lire = await o.ev(`
        const cartes=[...document.querySelectorAll('.dem-carte')];
        return cartes.map(c=>({ nom:(c.querySelector('.reg-t1')||{}).textContent, note:((c.querySelector('.dem-cats .note')||{}).textContent||'').slice(0,160),
          info:(c.querySelector('[id^="dc-info-"]')||{}).textContent||'', coches:c.querySelectorAll('.dem-cats input[type=checkbox]:checked').length, total:c.querySelectorAll('.dem-cats input[type=checkbox]').length,
          bouton:[...c.querySelectorAll('.dem-cats-actions button')].map(b=>b.textContent).join(' | ') }));`);
      const par = n => lire.find(x => (x.nom || '').includes(n)) || {};
      v('⛔ « Chauffage Restreint » (3 rubriques actuelles) : la grille ne coche que les trois, et le dit', par('Restreint').coches === 3 && /Espace déjà ouvert/.test(par('Restreint').note) && /3 sur 38/.test(par('Restreint').note), JSON.stringify(par('Restreint')));
      v('   … le compteur dit trois sur 38, « pré-cochées avec les rubriques actuelles de l’espace »', /3 rubriques sur 38/.test(par('Restreint').info) && /rubriques actuelles de l’espace/.test(par('Restreint').info), par('Restreint').info);
      v('   … le bouton de retour parle de l\'espace, pas du conseil du métier', /Revenir aux rubriques actuelles de l’espace/.test(par('Restreint').bouton), par('Restreint').bouton);
      v('⛔ « Libre Services » (rien de restreint) : TOUTES les rubriques sont cochées (38), pas le conseil du chauffage', par('Libre').coches === par('Libre').total && par('Libre').total === 38, JSON.stringify(par('Libre')));
      v('⛔ « Neuf Plomberie » (pas d\'espace) : le conseil du métier, ni « Espace déjà ouvert », ni toutes', par('Neuf').coches > 3 && par('Neuf').coches < 38 && !/Espace déjà ouvert/.test(par('Neuf').note) && /conseil du métier/.test(par('Neuf').info), JSON.stringify(par('Neuf')));
      v('⛔ aucune carte ne promet « l\'application ne montrera que celles-là »', lire.every(x => !/ne montrera/.test(x.info + x.note)) && lire.every(x => /ne les applique pas encore|Tout coché/.test(x.info)), JSON.stringify(lire.map(x => x.info)));
      /* le défilement latéral RÉEL, deux lectures */
      const bord = await o.ev(`
        ${STABLE} const y=window.scrollY; window.scrollTo(9999,y); ${STABLE} const x1=window.scrollX; window.scrollTo(0,y);
        await new Promise(r=>setTimeout(r,700)); ${STABLE} window.scrollTo(9999,y); ${STABLE} const x2=window.scrollX; window.scrollTo(0,y);
        return {x1,x2,iw:innerWidth,sw:document.documentElement.scrollWidth};`);
      v('aucun défilement latéral réel (deux lectures à 700 ms)', bord.x1 === 0 && bord.x2 === 0, JSON.stringify(bord));
      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.join(' | '));
      /* captures : la grille de « Restreint », en haut */
      const r = await o.ev(`const c=[...document.querySelectorAll('.dem-carte')].find(x=>/Restreint/.test(x.textContent)); c.querySelector('.dem-cats').scrollIntoView({block:'start'}); ${STABLE} const b=c.querySelector('.dem-cats').getBoundingClientRect(); const t=Math.max(0,b.top-20); return {x:scrollX,y:scrollY+t,w:innerWidth,h:Math.min(innerHeight-t,820)};   /* le clip de CDP est en coordonnées de PAGE : on ajoute le défilement */`);
      const shot = await o.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y + 0, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: false });
      const f = path.join(CAPS, 'demande-ouverte-' + nom + '-' + mode + '.png'); fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
      console.log('  capture : ' + f);
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
