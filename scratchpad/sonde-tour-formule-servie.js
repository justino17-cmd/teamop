/* ══ SONDE — LA FORMULE SERVIE DANS LA TOUR (Abonnements), AU TÉLÉPHONE ET AU BUREAU ═══════════════════════════════
   Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent » ; « le code promo, mets-le au plus gros
   forfait ». L'application reçoit la formule PAYÉE (ou celle du code pendant une période offerte), et la Tour doit
   montrer l'écart quand ce n'est pas celle de la fiche (`abnFormule`). Ce qu'on exige, de nuit et de jour :
     · les lignes à écart disent la formule SERVIE d'abord, puis pourquoi, puis la fiche ;
     · ⛔ rien d'essentiel n'est coupé : la formule servie ET la fiche se lisent en entier (la ligne 2 du registre se
       tronque en « … » — c'est la suite qui se perd, jamais le début) ;
     · une ligne sans écart est celle d'avant (la fiche seule) ;
     · aucune erreur JavaScript.
   Données inventées, injectées dans la page (ESP.list, ABO) — tour.html servi en 127.0.0.1, l'API simulée par
   sonde-tour-theme.js : aucune requête ne sort. Usage : node scratchpad/sonde-tour-formule-servie.js
   Contre-épreuve : TOUR_FICHIER=<une Tour sans abnFormule> node scratchpad/sonde-tour-formule-servie.js (doit tomber). */
'use strict';
const { demarrer, onglet, STABLE } = require('./sonde-tour-theme.js');

const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

const LISTE = `[
  {slug:'azur',nom:'Azur Nettoyage Services Professionnels de la Côte',email:'direction@azur.test',formule:'premium',formuleServie:'pro',quantite:1,places:20,paye:true,motif:'abonnement Stripe',promoCode:'',finLe:'',echeance:'2026-10-29',t:'azur-1'},
  {slug:'boul',nom:'Boulangerie Martin',email:'contact@boul.test',formule:'business',formuleServie:'premium',quantite:3,places:3,paye:true,motif:'code promo',promoCode:'ESSAI-SONDE',finLe:'2026-12-15',echeance:'',t:'boul-1'},
  {slug:'hotel',nom:'Hôtel des Pins',email:'gerance@hotel.test',formule:'business',formuleServie:'gratuit',quantite:1,places:1,paye:true,motif:'abonnement Stripe',promoCode:'',finLe:'',echeance:'',t:'hotel-1'},
  {slug:'grat',nom:'Garage du Centre',email:'garage@centre.test',formule:'gratuit',formuleServie:'business',quantite:1,places:2,paye:true,motif:'abonnement Stripe',promoCode:'',finLe:'',echeance:'2026-10-20',t:'grat-1'},
  {slug:'pareil',nom:'Sans écart',email:'pareil@test.test',formule:'pro',formuleServie:'pro',quantite:2,places:2,paye:true,motif:'abonnement Stripe',promoCode:'',finLe:'',echeance:'2026-10-02',t:'pareil-1'}
]`;
/* ce qui se VOIT d'une ligne 2 : tout son texte si rien ne déborde ; sinon les seuls caractères peints DANS la boîte
   (une plage par caractère, à 12 px du bord droit pour laisser le « … ») — une ligne sur deux lignes (`abn-ecart`) se
   mesure en hauteur autant qu'en largeur */
const LIRE = `${STABLE} await new Promise(r=>setTimeout(r,700));
  /* au téléphone, un groupe long qui n'est pas le premier se replie tout seul (regPliage) : on l'ouvre, comme le doigt */
  document.querySelectorAll('.reg-g.plie').forEach(g=>g.classList.remove('plie')); ${STABLE}
  const lignes=[...document.querySelectorAll('.reg-l2')].filter(e=>e.offsetParent);
  return lignes.map(e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e);
    const coupe=e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1; let vu=e.textContent;
    if(coupe){ const rg=document.createRange(), tw=document.createTreeWalker(e,NodeFilter.SHOW_TEXT), cs2=[]; let nd;
      while((nd=tw.nextNode())) for(let i=0;i<nd.length;i++){ rg.setStart(nd,i); rg.setEnd(nd,i+1); const b=rg.getBoundingClientRect(); cs2.push({c:nd.data[i],b}); }
      /* le « … » ne se pose qu'au bout de la DERNIÈRE ligne visible : la marge de 12 px ne vaut que pour elle */
      const dedans=cs2.filter(x=>x.b.bottom<=r.bottom+1), der=Math.max(...dedans.map(x=>x.b.top));
      vu=dedans.filter(x=>x.b.top<der-1||x.b.right<=r.right-12).map(x=>x.c).join(''); }
    return { t:e.textContent, vu, coupe, w:Math.round(r.width), h:Math.round(r.height), ecart:e.classList.contains('abn-ecart') }; });`;

async function main() {
  const S = await demarrer();
  console.log('Sonde de la formule servie dans la Tour — tour.html ' + S.version);
  try {
    for (const [appareil, largeur] of [['telephone', 390], ['telephone', 360], ['bureau', 0]]) for (const mode of ['dark', 'light']) {
      console.log('\n── ' + appareil + (largeur ? ' ' + largeur + ' px' : '') + ' · ' + mode + ' ──');
      const o = await onglet(S, appareil, mode);
      if (largeur && largeur !== 390) await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 780, deviceScaleFactor: 3, mobile: true });
      const aFormule = await o.ev('return typeof abnFormule==="function";');
      v('la Tour a `abnFormule`', aFormule);
      if (!aFormule) { await o.fermer(); continue; }
      /* A · Stripe relié : le groupe « Attribuées depuis la console » (payées, hors période offerte) */
      /* l'onglet d'abord (il recharge la liste simulée), PUIS les lignes de la sonde, et le rendu */
      await o.ev(`try{ if(APP!=='gestion') setApp('gestion',true); }catch(e){} setTab('abonnements',true); await new Promise(r=>setTimeout(r,900)); return 1;`);
      /* ⚠️ la liste de la sonde est FIGÉE (une propriété sans écriture) : la Tour recharge la liste simulée à son rythme, et
         un rechargement pendant la lecture remplaçait nos lignes par celles de la simulation — la sonde lisait alors quatre
         lignes sur douze, au téléphone seulement, selon l'heure */
      const A = await o.ev(`const L=${LISTE}; Object.defineProperty(ESP,'list',{configurable:true,get(){return L;},set(){}}); ESP.loaded=true; ESP.err=''; ABO.f=''; ABO.configured=true; render(); ${LIRE}`);
      const trouve = (l, re) => l.find(x => re.test(x.t));
      const az = trouve(A, /^Pro \(payée/), ho = trouve(A, /^Gratuit \(/), ga = trouve(A, /^Business \(payée/), pa = A.find(x => /^Pro\s· prochaine échéance 2026-10-02$/.test(x.t));
      v('population : les lignes du groupe « payées » sont rendues (' + A.length + ' lignes 2)', A.length >= 4, JSON.stringify(A.map(x => x.t)));
      v('Stripe relié — payée Pro, fiche Business Premium : « Pro (payée ; la fiche dit Business Premium) »', !!az && /^Pro \(payée ; la fiche dit Business Premium\)/.test(az.t), JSON.stringify(az));
      v('   … OP MESSAGES seul : « Gratuit (OP GESTION non payé ; la fiche dit Business) »', !!ho && /^Gratuit \(OP GESTION non payé ; la fiche dit Business\)/.test(ho.t), JSON.stringify(ho));
      v('   … fiche Gratuit qui paie Business : « Business (payée ; la fiche dit Gratuit) »', !!ga && /^Business \(payée ; la fiche dit Gratuit\)/.test(ga.t), JSON.stringify(ga));
      v('   … sans écart : la fiche seule, comme avant', !!pa && !/fiche/.test(pa.t), JSON.stringify(A.map(x => x.t)));
      /* ⛔ ce qui se VOIT : la formule servie ET la fiche entières (le « … » ne mange que la suite) */
      /* ⛔ une ligne à écart se lit EN ENTIER, suite comprise (relecture adverse du 29 septembre : la coupe à deux lignes
         mangeait l'échéance d'une période offerte à 360 px — cette sonde ne regardait que l'écart, et la laissait passer) */
      for (const [x, servie, fiche] of [[az, 'Pro', 'Business Premium'], [ho, 'Gratuit', 'Business'], [ga, 'Business', 'Gratuit']]) {
        if (!x) continue;
        v('   ⛔ se lit en entier : « ' + servie + ' », « la fiche dit ' + fiche + ' » et la suite' + (x.coupe ? ' (ligne coupée après : « ' + x.vu + ' »)' : ''),
          x.vu.startsWith(servie + ' (') && x.vu.replace(/\s/g, ' ').includes('la fiche dit ' + fiche) && !x.coupe && x.ecart, JSON.stringify(x));
      }
      /* B · Stripe PAS relié : « Formules attribuées depuis la console » (toutes, période offerte comprise) */
      const B = await o.ev(`ABO.configured=false; render(); ${LIRE}`);
      const bo = trouve(B, /^Business Premium \(offerte/), az2 = trouve(B, /^Pro \(payée/), pa2 = trouve(B, /^Pro ×2/);
      v('Stripe pas relié — période offerte, fiche Business ×3 : « Business Premium (offerte par le code ; la fiche dit Business ×3) · offert jusqu’au … »',
        !!bo && /^Business Premium \(offerte par le code ; la fiche dit Business ×3\)\s· offert jusqu’au 2026-12-15/.test(bo.t), JSON.stringify(bo));
      v('   … payée Pro : l\'écart, puis « · payé · 20 places servies »', !!az2 && /^Pro \(payée ; la fiche dit Business Premium\)\s· payé\s· 20 places servies/.test(az2.t), JSON.stringify(az2));
      v('   … sans écart : « Pro ×2 · payé · 2 places servies », comme avant', !!pa2 && /^Pro ×2\s· payé\s· 2 places servies$/.test(pa2.t), JSON.stringify(B.map(x => x.t)));
      for (const [x, servie, fiche, fin] of [[bo, 'Business Premium', 'Business ×3', 'offert jusqu’au 2026-12-15'], [az2, 'Pro', 'Business Premium', '20 places servies']]) {
        if (!x) continue;
        v('   ⛔ se lit en entier : « ' + servie + ' », « la fiche dit ' + fiche + ' » et « ' + fin + ' »' + (x.coupe ? ' (coupée après : « ' + x.vu + ' »)' : ''),
          x.vu.startsWith(servie + ' (') && x.vu.replace(/\s/g, ' ').includes('la fiche dit ' + fiche) && x.vu.replace(/\s/g, ' ').includes(fin) && !x.coupe && x.ecart, JSON.stringify(x));
      }
      /* C · la fiche d'une entreprise (« Formule actuelle ») : la formule que l'application reçoit, quand ce n'est pas la fiche */
      const C = await o.ev(`let el=document.getElementById('pack-info'); const neuf=!el; if(neuf){ el=document.createElement('div'); el.id='pack-info'; document.body.appendChild(el); }
        const lire=d=>{ PACK={nom:'x',charge:true,err:'',d}; packPeindre(); return el.textContent; };
        const r=[lire({formule:'premium',formuleServie:'pro',quantite:1,places:20,aboStatut:'auto',promoCode:''}),
          lire({formule:'business',formuleServie:'premium',quantite:3,places:3,aboStatut:'auto',promoCode:'ESSAI-SONDE'}),
          lire({formule:'pro',formuleServie:'pro',quantite:2,places:2,aboStatut:'auto',promoCode:''}),
          lire({formule:'pro',quantite:2,aboStatut:'auto'})];
        if(neuf) el.remove(); return r;`);
      v('la fiche : « l’application reçoit : Pro (payée) » après la formule de la fiche', /Formule actuelle\s: Business Premium[\s\S]*l’application reçoit\s: Pro \(payée\)/.test(C[0]), JSON.stringify(C[0]));
      v('   … « Business Premium (offerte par le code) » pendant une période offerte', /l’application reçoit\s: Business Premium \(offerte par le code\)/.test(C[1]), JSON.stringify(C[1]));
      v('   … rien de plus sans écart, ni avec un serveur d\'avant (sans `formuleServie`)', !/reçoit/.test(C[2]) && !/reçoit/.test(C[3]), JSON.stringify([C[2], C[3]]));
      const exc = o.exceptions || [];
      v('aucune erreur JavaScript', !exc.length, JSON.stringify(exc.slice(0, 3)));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
