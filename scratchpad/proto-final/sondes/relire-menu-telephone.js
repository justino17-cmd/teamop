// RELECTURE ADVERSE du lot « menu », angle TÉLÉPHONE : iPhone (390), Android (360), petit (320), au doigt, jour et nuit,
// mode application, gérant · bureau · technicienne. Écrit APRÈS le lot, sans reprendre ses mesures (menu-telephone.js) :
// ici on TOUCHE chaque onglet et chaque ligne de la feuille, on regarde où l'on arrive, ce qui s'allume, et ce qui reste sous la
// barre, sous l'encoche ou hors de l'écran. Variables : PROFILS=iphone,petit  NUITS=0,1  ROLES=marc,julie,sm  CAP=dossier
const L = require('../lib.js'), v = L.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-menu-telephone';
const PROFILS = (process.env.PROFILS || 'iphone,android,petit').split(','), NUITS = (process.env.NUITS || '0,1').split(',').map(x => x === '1'), ROLES = (process.env.ROLES || 'marc,julie,sm').split(',');
const BARRE = { // [mot affiché, nom entier, route attendue]
  marc:[['Accueil', 'Accueil', 'accueil'], ['Planning', 'Planning', 'planning'], ['Interventions', 'Interventions', 'interventions'], ['Clients', 'Clients', 'clients'], ['Comptabilité', 'Comptabilité', 'comptabilite']],
  julie:[['Comptabilité', 'Comptabilité', 'comptabilite'], ['Devis', 'Devis', 'devis'], ['Clients', 'Clients', 'clients'], ['Tâches', 'Mes tâches', 'taches'], ['Achats', 'Achats et frais', 'achats']],
  sm:[['Journée', 'Ma journée', 'majournee'], ['Frais', 'Mes frais', 'techfrais'], ['Heures', 'Mes heures', 'mesheures'], ['Tâches', 'Mes tâches', 'taches'], ['Camion', 'Mon camion', 'moncamion']]
};
const ECHAFAUDAGE = /Prototype\s*[:·]|pour l[’']essai|voir l[’']écran comme|Tester en tant que|simuler la réponse|Dans ce prototype|fais sa réponse|À refaire|rien n[’']est enregistré/i;
const stats = { onglets:0, lignes:0, ecrans:0 };

// la mesure d'une barre : ce qui est PEINT (rect) contre ce qui est écrit (scrollWidth), onglet par onglet
const mesureBarre = p => p.evaluate(() => { const nav = document.querySelector('#barre-bas .opg-barre'); if (!nav) return null;
  const rn = nav.getBoundingClientRect(), hb = document.getElementById('barre-bas').getBoundingClientRect();
  return { rn:{ g:Math.round(rn.left), d:Math.round(rn.right), h:Math.round(rn.top), b:Math.round(rn.bottom) }, bas:{ top:Math.round(hb.top), bottom:Math.round(hb.bottom) },
    tabs:[...nav.querySelectorAll('.opg-tab')].map((t, i, tous) => { const s = t.querySelector('.t-n'), r = t.getBoundingClientRect(), rs = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const sui = tous[i + 1] ? tous[i + 1].getBoundingClientRect() : null;
      return { mot:s.textContent.trim(), aria:t.getAttribute('aria-label'), on:t.classList.contains('on'), cur:t.getAttribute('aria-current'), coupe:s.scrollWidth > s.clientWidth + 0.5 || cs.textOverflow === 'ellipsis' && s.scrollWidth > s.clientWidth,
        dehors:rs.left < r.left - 0.5 || rs.right > r.right + 0.5, chevauche:!!sui && rs.right > sui.left + 0.5, l:Math.round(r.width * 10) / 10, h:Math.round(r.height * 10) / 10, taille:parseFloat(cs.fontSize), lh:parseFloat(cs.lineHeight) || 0, hs:rs.height, wrap:cs.whiteSpace, tr:cs.textTransform, svg:t.querySelectorAll('svg').length, emo:t.querySelectorAll('.emo').length, k:t.dataset.tab || t.dataset.ec }; }) }; });

async function barre(c, tag, qui, nom) {
  const b = await mesureBarre(c.p); if (!v(`${tag} : la barre existe`, !!b)) return null;
  const att = BARRE[qui]; stats.onglets += b.tabs.length;
  v(`${tag} : ${att.length} onglets exactement`, b.tabs.length === att.length, b.tabs.map(t => t.mot));
  v(`${tag} : mots ENTIERS dans l'ordre, sans point, sans « Plus »`, b.tabs.map(t => t.mot).join('|') === att.map(a => a[0]).join('|') && b.tabs.every(t => !/\.|…|^Plus$/.test(t.mot)), b.tabs.map(t => t.mot));
  v(`${tag} : le nom entier est lu (aria-label)`, att.every((a, i) => ((b.tabs[i] || {}).aria || '').startsWith(a[1])), b.tabs.map(t => t.aria));
  v(`${tag} : aucun mot coupé, débordé ni chevauchant son voisin`, b.tabs.every(t => !t.coupe && !t.dehors && !t.chevauche), b.tabs.filter(t => t.coupe || t.dehors || t.chevauche));
  v(`${tag} : une seule ligne par mot`, b.tabs.every(t => t.hs <= (t.lh || t.taille * 1.3) * 1.2), b.tabs.map(t => t.mot + ' h=' + t.hs + ' lh=' + t.lh));
  v(`${tag} : cibles ≥ 44 × 44`, b.tabs.every(t => t.l >= 44 && t.h >= 44), b.tabs.map(t => t.l + '×' + t.h));
  v(`${tag} : police ≥ 10 px`, b.tabs.every(t => t.taille >= 10), b.tabs.map(t => t.taille));
  v(`${tag} : une icône et aucun émoji par onglet`, b.tabs.every(t => t.svg === 1 && t.emo === 0), b.tabs.map(t => t.svg + '/' + t.emo));
  v(`${tag} : la barre tient dans l'écran (${c.largeur})`, b.rn.g >= 0 && b.rn.d <= c.largeur, b.rn);
  if (c.encoches) v(`${tag} : la barre est au-dessus de l'encoche du bas (${c.encoches.bottom} px)`, b.rn.b <= c.hauteur - Math.max(c.encoches.bottom * 0.5, 4), { bas:b.rn.b, h:c.hauteur });
  return b;
}

// où l'on arrive en TOUCHANT chaque onglet, et ce qui s'allume
async function ongletsTouches(c, tag, qui) {
  const att = BARRE[qui];
  for (const [mot, nom, route] of att) {
    // on part d'un écran qui n'est pas la cible, pour qu'un toucher sans effet se voie
    // (la secrétaire n'a ni Accueil ni Planning : son écran d'ouverture est OP COMPTABLE plein écran, qui a sa propre barre — on part de « Clients »)
    const depart = qui === 'sm' ? (route === 'majournee' ? 'techfrais' : 'majournee') : qui === 'julie' ? (route === 'clients' ? 'devis' : 'clients') : (route === 'accueil' ? 'planning' : 'accueil');
    await L.aller(c.p, depart); await c.p.evaluate(() => { try { if (document.getElementById('cmpt') && cpSysteme) { cpSysteme = false; rendre(); } } catch (e) {} });
    const ok = await L.toucher(c, `#barre-bas .opg-tab[data-tab="${route}"]`);
    await L.calme(c.p, 500);
    const e = await c.p.evaluate(() => ({ hash:location.hash, h1:(document.querySelector('#contenu h1') || {}).textContent || '', cmpt:!!document.querySelector('#cmpt') && document.querySelector('#cmpt').offsetParent !== null, allume:[...document.querySelectorAll('#barre-bas .opg-tab.on')].map(t => t.querySelector('.t-n').textContent), echec:/n[’']existe pas/.test(document.body.innerText.slice(0, 4000)) }));
    v(`${tag} : toucher « ${mot} » mène à #${route}`, ok && e.hash === '#' + route, e);
    // la comptabilité s'ouvre en plein écran (OP COMPTABLE) : la barre n'y est pas, et c'est son écran à elle
    if (route !== 'comptabilite') v(`${tag} : « ${mot} » est le SEUL onglet allumé`, e.allume.length === 1 && e.allume[0] === mot, e.allume);
    v(`${tag} : « ${mot} » ouvre un écran (titre non vide, pas d'erreur de page)`, route === 'comptabilite' ? e.cmpt || e.h1 !== '' : e.h1.trim() !== '' && !e.echec, e);
  }
}

async function bouton(c, tag) {
  const m = await c.p.evaluate(() => { const b = document.querySelector('#contenu .tete-tel .tt-menu'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b), mot = b.querySelector('.tt-mot');
    const t = document.querySelector('#contenu .tete-tel').getBoundingClientRect(), mr = mot.getBoundingClientRect();
    return { x:Math.round(r.left), y:Math.round(r.top), l:Math.round(r.width), h:Math.round(r.height), traits:!!b.querySelector('svg path[d="M4 7h16M4 12h16M4 17h16"]'), mot:mot.textContent, motVu:cs.visibility !== 'hidden' && mr.width > 10, motDedans:mr.right <= r.right + 0.5,
      premier:b === document.querySelector('#contenu .tete-tel').firstElementChild, ancien:!!document.querySelector('[data-cnx="compte"], [data-tab="plus"]'), tete:{ top:Math.round(t.top) } }; });
  if (!v(`${tag} : le bouton « Menu » existe`, !!m)) return null;
  v(`${tag} : trois traits ET le mot « Menu », en haut à gauche, ≥ 44 px`, m.traits && m.mot === 'Menu' && m.motVu && m.motDedans && m.premier && m.x < 30 && m.l >= 44 && m.h >= 44, m);
  v(`${tag} : plus de bouton « Mon compte » ni d'onglet « Plus »`, !m.ancien);
  return m;
}

// la feuille : groupes et lignes lus dans le DOM, puis CHAQUE ligne touchée
async function feuille(c, tag, qui, complete) {
  await L.aller(c.p, qui === 'sm' ? 'majournee' : qui === 'julie' ? 'clients' : 'accueil');
  const ok = await L.toucher(c, '#contenu .tt-menu'); if (!v(`${tag} : le bouton ouvre la feuille`, ok)) return;
  const f = await c.p.evaluate(src => { const ECH = new RegExp(src, 'i'); const P = document.querySelector('#calque .panneau'); if (!P) return null; const r = P.getBoundingClientRect(), li = P.querySelector('.fm-liste'), pied = P.querySelector('.fm-pied');
    return { titre:(P.querySelector('h2') || {}).textContent, lignes:[...P.querySelectorAll('[data-go], [data-ec]')].map(b => ({ k:b.dataset.go || b.dataset.ec, nom:(b.querySelector('b') || b).textContent.trim() })), groupes:[...P.querySelectorAll('.plus-grp')].map(g => g.textContent.trim()),
      haut:Math.round(r.top), bas:Math.round(r.bottom), H:innerHeight, defile:P.scrollHeight > P.clientHeight + 1 || (li && li.scrollHeight > li.clientHeight + 1), piedVu:!!pied && pied.getBoundingClientRect().bottom <= innerHeight + 1, piedHaut:pied ? Math.round(pied.getBoundingClientRect().top) : -1, larg:P.scrollWidth - P.clientWidth,
      pied:[...P.querySelectorAll('.fm-pied > *')].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)), echaf:ECH.test(P.innerText) }; }, ECHAFAUDAGE.source);
  if (!v(`${tag} : la feuille est là`, !!f)) return;
  v(`${tag} : elle s'appelle « Menu »`, f.titre === 'Menu', f.titre);
  v(`${tag} : aucun texte d'échafaudage dans la feuille`, !f.echaf);
  v(`${tag} : ni glissement latéral ni rien sous l'encoche (haut ≥ 0, bas ≤ écran)`, f.larg <= 1 && f.haut >= 0 && f.bas <= f.H + 1, f);
  await L.capture(c, `${CAP}/feuille-${tag.replace(/[ /:]/g, '_')}.png`);
  // le pied (Apparence, Nouveautés, Se déconnecter…) doit être ATTEIGNABLE : visible, ou après défilement de la feuille
  const pied = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'), sortir = P.querySelector('[data-cnx="sortir"]'); if (!sortir) return null; const pa = P.querySelector('.fm-liste'); [P, pa].forEach(e => { if (e) e.scrollTop = e.scrollHeight; }); sortir.scrollIntoView({ block:'nearest' });
    const r = sortir.getBoundingClientRect(); const pile = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { haut:Math.round(r.top), bas:Math.round(r.bottom), H:innerHeight, dessus:pile[0] === sortir || sortir.contains(pile[0]), haut44:r.height >= 44 }; });
  v(`${tag} : « Se déconnecter » est atteignable en bas de la feuille (visible et touchable, ≥ 44 px)`, !!pied && pied.bas <= pied.H && pied.haut >= 0 && pied.dessus && pied.haut44, pied);
  // CHAQUE ligne : on rouvre la feuille, on la touche, on regarde l'arrivée
  const n = f.lignes.length; stats.lignes += n; const vues = [];
  for (let i = 0; i < n; i++) {
    const cle = f.lignes[i].k, nom = f.lignes[i].nom;
    await L.aller(c.p, qui === 'sm' ? 'techfrais' : qui === 'julie' ? 'clients' : 'planning');   // un écran qui n'est (presque) jamais la cible
    await c.p.evaluate(() => { try { if (typeof cpSysteme !== 'undefined' && cpSysteme) { cpSysteme = false; rendre(); } } catch (e) {} });
    await L.toucher(c, '#contenu .tt-menu');
    const sel = `#calque .panneau [data-go="${cle}"]`; await c.p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block:'center' }); }, sel);
    const cible = await c.p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), pile = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { h:Math.round(r.height), ok:pile[0] === e || e.contains(pile[0]), bas:Math.round(r.bottom), H:innerHeight }; }, sel);
    const touche = await L.toucher(c, sel);
    await L.calme(c.p, 600);
    const e = await c.p.evaluate(() => ({ hash:location.hash, h1:((document.querySelector('#contenu h1') || {}).textContent || '').trim(), feuille:!!document.querySelector('#calque .panneau'), cmpt:!!document.querySelector('#cmpt') && document.querySelector('#cmpt').offsetParent !== null, absente:/Cette page n.existe pas/.test(document.body.innerText), allume:[...document.querySelectorAll('#barre-bas .opg-tab.on')].map(t => t.querySelector('.t-n').textContent) }));
    v(`${tag} : la ligne « ${nom} » est touchable (≥ 44 px, rien dessus)`, !!cible && cible.h >= 44 && cible.ok, cible);
    v(`${tag} : « ${nom} » mène à #${cle} et referme la feuille`, touche && e.hash === '#' + cle && !e.feuille, e);
    v(`${tag} : « ${nom} » ouvre un écran qui a un titre (pas de page vide)`, e.cmpt || e.h1 !== '', e);
    v(`${tag} : « ${nom} » ne dit pas « Cette page n'existe pas »`, !e.absente, e);
    vues.push({ cle, nom, h1:e.h1, allume:e.allume });
    // rien sous l'encoche, rien qui glisse de côté, le bas de l'écran atteignable au-dessus de la barre
    if (!e.cmpt) { stats.ecrans++;
      const d = await L.deborde(c); v(`${tag} : « ${nom} » ne glisse pas de côté`, d.bouge === 0 && d.seconde <= c.largeur + 1, d);
      const bas = await c.p.evaluate(() => { const nav = document.querySelector('#barre-bas .opg-barre'); if (!nav) return null; const hb = nav.getBoundingClientRect(); window.scrollTo(0, 1e6); const c = document.getElementById('contenu'); const el = [...c.querySelectorAll('*')].filter(x => x.offsetParent && x.getBoundingClientRect().height > 0 && getComputedStyle(x).position !== 'fixed'); let m = 0; for (const x of el) m = Math.max(m, x.getBoundingClientRect().bottom); const r = { fond:Math.round(m), barreHaut:Math.round(hb.top), H:innerHeight }; window.scrollTo(0, 0); return r; });
      v(`${tag} : « ${nom} » — le dernier élément se voit AU-DESSUS de la barre en bas de page`, !!bas && bas.fond <= bas.barreHaut + 1, bas);
      const echaf = await c.p.evaluate(() => (document.getElementById('contenu').innerText.match(/Prototype\s*[:·]|pour l[’']essai|voir l[’']écran comme|Tester en tant que|simuler la réponse|Dans ce prototype|fais sa réponse|À refaire|rien n[’']est enregistré/i) || [''])[0]);
      v(`${tag} : « ${nom} » — aucun texte d'échafaudage`, echaf === '', echaf);
    }
    if (c.err.length) { v(`${tag} : « ${nom} » — aucune erreur JavaScript`, false, c.err.slice(0, 2)); c.err.length = 0; }
  }
  if (complete) return vues;
}

(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) for (const qui of ROLES) {
    const tag = `${profil}/${nuit ? 'nuit' : 'jour'}/${qui}`; console.log('\n##', tag);
    const c = await L.ouvrir({ profil, nuit, qui });
    await L.capture(c, `${CAP}/ouverture-${tag.replace(/\//g, '_')}.png`);
    if (qui === 'julie') await L.aller(c.p, 'devis');   // elle ouvre sur OP COMPTABLE (barre propre) : on mesure la barre d'OP GESTION sur Devis
    await barre(c, tag, qui); await bouton(c, tag);
    await ongletsTouches(c, tag, qui);
    await feuille(c, tag, qui);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  console.log('\npopulation :', JSON.stringify(stats));
  v('population : des onglets, des lignes et des écrans ont été comptés', stats.onglets >= 5 && stats.lignes >= 6 && stats.ecrans >= 5, stats);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})();
