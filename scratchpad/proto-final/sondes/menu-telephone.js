// Le téléphone : barre du bas (5 onglets, mots entiers, jamais coupés), bouton « Menu » (trois traits ET le mot), feuille « Menu »
// (liste du rôle + pied), client compris — iPhone, Android, petit écran, jour et nuit (MENU-FINAL.md).
const { L, ATTENDU, G3D } = require('./menu-commun.js'), v = L.v;
const BARRE = {
  marc:{ route:'planning', onglets:[['Accueil', 'Accueil'], ['Planning', 'Planning'], ['Interventions', 'Interventions'], ['Clients', 'Clients'], ['Comptabilité', 'Comptabilité']] },
  julie:{ route:'devis', onglets:[['Comptabilité', 'Comptabilité'], ['Devis', 'Devis'], ['Clients', 'Clients'], ['Tâches', 'Mes tâches'], ['Achats', 'Achats et frais']] },
  sm:{ route:'majournee', onglets:[['Journée', 'Ma journée'], ['Frais', 'Mes frais'], ['Heures', 'Mes heures'], ['Tâches', 'Mes tâches'], ['Camion', 'Mon camion']] }
};
const PIED = { marc:['mode-seg', 'nv-menu', 'btn', 'cn-out'], julie:['mode-seg', 'nv-menu', 'cn-out'], sm:['mode-seg', 'nv-menu', 'cn-out'] };
async function bilanBarre(c, tag, attendu) {
  const b = await c.p.evaluate(() => { const nav = document.querySelector('#barre-bas .opg-barre'); if (!nav) return null; const rn = nav.getBoundingClientRect();
    return { rn:{ g:Math.round(rn.left), d:Math.round(rn.right) }, plus:!!document.querySelector('#barre-bas [data-tab="plus"]') || /(^|\s)Plus(\s|$)/.test(nav.innerText),
      tabs:[...nav.querySelectorAll('.opg-tab')].map(t => { const s = t.querySelector('.t-n'), r = t.getBoundingClientRect(), rs = s.getBoundingClientRect(), cs = getComputedStyle(s), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
        return { mot:s.textContent.trim(), aria:t.getAttribute('aria-label') || '', coupe:s.scrollWidth > s.clientWidth + 1, dehors:rs.left < r.left - 0.5 || rs.right > r.right + 0.5, lignes:Math.round(rs.height / lh), taille:parseFloat(cs.fontSize), l:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.left), nbSvg:t.querySelectorAll('svg').length, emo:t.querySelectorAll('.emo').length }; }) }; });
  if (!v(`${tag} : la barre existe`, !!b)) return;
  v(`${tag} : cinq onglets, pas de « Plus »`, b.tabs.length === 5 && !b.plus, b.tabs.map(t => t.mot));
  v(`${tag} : les mots, dans l'ordre, ENTIERS`, b.tabs.map(t => t.mot).join('|') === attendu.map(a => a[0]).join('|'), b.tabs.map(t => t.mot));
  v(`${tag} : les noms entiers sont lus par aria-label`, attendu.every(([, n], i) => (b.tabs[i].aria || '').startsWith(n)), b.tabs.map(t => t.aria));
  v(`${tag} : aucun libellé coupé (ni débordé de son onglet)`, b.tabs.every(t => !t.coupe && !t.dehors), b.tabs.filter(t => t.coupe || t.dehors));
  v(`${tag} : un mot ne passe pas à la ligne (une ligne)`, b.tabs.every(t => t.lignes <= 1), b.tabs.map(t => t.mot + ':' + t.lignes));
  v(`${tag} : police ≥ 10 px`, b.tabs.every(t => t.taille >= 10), b.tabs.map(t => t.taille));
  v(`${tag} : cibles de 44 px au moins`, b.tabs.every(t => t.l >= 44 && t.h >= 44), b.tabs.map(t => t.l + '×' + t.h));
  v(`${tag} : pas d'émoji dans un libellé, une icône par onglet`, b.tabs.every(t => t.emo === 0 && t.nbSvg === 1), b.tabs.map(t => t.emo + '/' + t.nbSvg));
  v(`${tag} : la barre tient dans l'écran`, b.rn.g >= 0 && b.rn.d <= c.largeur, b.rn);
  return b.tabs;
}
async function bilanMenu(c, tag, qui) {
  const m = await c.p.evaluate(() => { const b = document.querySelector('#contenu .tete-tel .tt-menu'); if (!b) return null; const r = b.getBoundingClientRect(), s = b.querySelector('svg');
    return { aria:b.getAttribute('aria-label') || '', mot:(b.querySelector('.tt-mot') || {}).textContent, traits:s ? (s.querySelector('path') || {}).getAttribute('d') : '', x:Math.round(r.left), y:Math.round(r.top), l:Math.round(r.width), h:Math.round(r.height), premier:b === document.querySelector('#contenu .tete-tel').firstElementChild, ancienCompte:!!document.querySelector('[data-cnx="compte"]') }; });
  if (!v(`${tag} : le bouton « Menu » existe en haut à gauche`, !!m)) return;
  v(`${tag} : trois traits ET le mot « Menu »`, m.mot === 'Menu' && /M4 7h16M4 12h16M4 17h16/.test(m.traits), m);
  v(`${tag} : en haut à gauche, 44 px au moins`, m.premier && m.x < 40 && m.y < 120 && m.l >= 44 && m.h >= 44, m);
  v(`${tag} : plus de bouton « Mon compte »`, !m.ancienCompte);
}
async function bilanFeuille(c, tag, qui, groupes) {
  const ok = await L.toucher(c, '#contenu .tt-menu'); v(`${tag} : le bouton « Menu » ouvre la feuille`, ok);
  const f = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const G = []; let g = null;
    for (const e of P.querySelector('.fm-liste').children) { if (e.classList.contains('plus-grp')) { g = { t:e.textContent.trim(), L:[] }; G.push(g); continue; } if (!g) { g = { t:'', L:[] }; G.push(g); } g.L.push((e.querySelector('b') || e).textContent.trim()); }
    return { titre:(P.querySelector('h2') || {}).textContent, G, pied:[...P.querySelectorAll('.fm-pied > *')].map(e => e.className.split(' ')[0] || e.tagName), mode:[...P.querySelectorAll('.mode-seg button')].map(b => b.textContent), plus:/Toutes les catégories|Mon compte/.test(P.innerText), larg:P.scrollWidth, cl:P.clientWidth }; });
  if (!v(`${tag} : la feuille est ouverte`, !!f)) return;
  v(`${tag} : la feuille s'appelle « Menu »`, f.titre === 'Menu', f.titre);
  v(`${tag} : la liste complète du rôle, groupes et ordre`, f.G.map(g => g.t + '=' + g.L.join('|')).join(' ‖ ') === groupes.map(([g, l]) => g + '=' + l.join('|')).join(' ‖ '), f.G.map(g => g.t + '=' + g.L.join('|')));
  v(`${tag} : le pied de la feuille (Apparence, Nouveautés, ${qui === 'marc' ? 'la barre, ' : ''}Se déconnecter)`, f.pied.filter(x => x !== 'surtitre').join(',') === PIED[qui].join(','), f.pied);
  v(`${tag} : Jour / Nuit / Auto`, f.mode.join('|') === 'Jour|Nuit|Auto', f.mode);
  v(`${tag} : plus d'« Toutes les catégories » ni de « Mon compte »`, !f.plus);
  v(`${tag} : la feuille ne glisse pas de côté`, f.larg <= f.cl + 1, f);
  const d = await L.doigts(c.p, '#calque .panneau');
  v(`${tag} : cibles de la feuille ≥ 44 px`, d.petits.filter(x => !/^Fermer|^✕/.test(x)).length === 0, d.petits);
  return f;
}
(async () => {
  for (const profil of ['iphone', 'android', 'petit']) for (const nuit of [false, true]) for (const qui of ['marc', 'julie', 'sm']) {
    const T = BARRE[qui], tag = `${profil}${nuit ? '/nuit' : ''}/${qui}`;
    const c = await L.ouvrir({ profil, qui, nuit, hash:T.route });
    await bilanBarre(c, tag, T.onglets); await bilanMenu(c, tag, qui);
    const dep = await L.deborde(c); v(`${tag} : la page ne glisse pas de côté`, dep.bouge === 0 && dep.seconde <= c.largeur + 1, dep);
    const groupes = ATTENDU[qui];
    if (!nuit || qui === 'marc') await bilanFeuille(c, tag, qui, groupes);
    if (profil === 'iphone' && !nuit && qui === 'marc') {   // toucher une ligne : on y va, la feuille se ferme
      await c.p.evaluate(() => document.querySelector('#calque .panneau [data-go="vehicules"]').scrollIntoView({ block:'center' })); await L.toucher(c, '#calque .panneau [data-go="vehicules"]');
      const e = await c.p.evaluate(() => ({ hash:location.hash, feuille:!!document.querySelector('#calque .panneau') }));
      v(`${tag} : toucher « Véhicules » y mène et referme la feuille`, e.hash === '#vehicules' && !e.feuille, e);
    }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  // le client (espace client) : ouvert comme dans « Tester en tant que » ; barre Accueil · Factures · Devis · Interventions · Contrat
  for (const profil of ['iphone', 'petit']) {
    const c = await L.ouvrir({ profil, app:false, qui:null }), tag = `${profil}/client`;
    await c.p.evaluate(() => rlChanger('client', { muet:true })); await L.calme(c.p, 600);
    await bilanBarre(c, tag, [['Accueil', 'Accueil'], ['Factures', 'Mes factures'], ['Devis', 'Mes devis'], ['Interventions', 'Mes interventions'], ['Contrat', 'Mon contrat']]);
    await bilanMenu(c, tag, 'client');
    const ok = await L.toucher(c, '#contenu .tt-menu');
    const f = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? [...P.querySelectorAll('.fm-liste b')].map(e => e.textContent.trim()).join('|') : null; });
    v(`${tag} : la feuille liste Accueil · Mes factures · Mes interventions · Mes devis · Mon contrat`, ok && f === 'Accueil|Mes factures|Mes interventions|Mes devis|Mon contrat', f);
    await L.toucher(c, '#calque .panneau [data-ec="tab|factures"]'); const t = await c.p.evaluate(() => ({ tab:EC.tab, feuille:!!document.querySelector('#calque .panneau') }));
    v(`${tag} : « Mes factures » dans la feuille ouvre l'onglet et la referme`, t.tab === 'factures' && !t.feuille, t);
    await L.toucher(c, '#barre-bas [data-ec="tab|devis"]'); v(`${tag} : l'onglet « Devis » de la barre change d'onglet`, (await c.p.evaluate(() => EC.tab)) === 'devis');
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
