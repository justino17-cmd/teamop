// RELECTURE ADVERSE du lot « menu », angle TÉLÉPHONE, 3e sonde : Jour / Nuit / Auto retenu après rechargement, « Mes congés » de la
// technicienne (ses soldes, une demande, elle la retrouve, le gérant la voit), et l'espace du CLIENT (barre, feuille, chaque onglet).
// Variables : PROFILS=iphone,android,petit  CAP=dossier
const L = require('../lib.js'), v = L.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-menu-telephone';
const PROFILS = (process.env.PROFILS || 'iphone,android,petit').split(',');
const ECH = 'Voir comme|Prototype\\s*[:·]|pour l[’\']essai|voir l[’\']écran comme|Tester en tant que|simuler la réponse|Dans ce prototype|fais sa réponse|À refaire|rien n[’\']est enregistré';
// clair ou sombre, LU SUR LES PIXELS PEINTS : la luminance du fond calculé du corps (pas un attribut qu'on croirait juste)
const clair = p => p.evaluate(() => { const m = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(getComputedStyle(document.documentElement).backgroundColor); if (!m) return null; const lum = 0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3], jour = document.documentElement.dataset.mode === 'jour'; return (lum > 140) === jour ? lum > 140 : null; });   // le fond PEINT de <html> et l'attribut doivent dire la même chose
async function rouvrir(c) { await c.p.reload({ waitUntil:'load' }); await c.p.waitForTimeout(2400); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 500); }
async function choisirMode(c, mot) { await L.toucher(c, '#contenu .tt-menu'); const ok = await c.p.evaluate(m => { const b = [...document.querySelectorAll('#calque .panneau .mode-seg button')].find(x => x.textContent.trim() === m); if (!b) return false; b.scrollIntoView({ block:'center' }); return true; }, mot);
  if (!ok) return false; const t = await L.toucher(c, `#calque .panneau .mode-seg button:has-text("${mot}")`); await L.calme(c.p, 500); await L.ranger(c.p); return t; }

async function modes(c, tag) {
  // OS en nuit (c.p ouvert avec nuit:true) : « Jour » doit l'emporter, et se retenir
  const t0 = await clair(c.p); v(`${tag} : point de départ — OS ${c.nuitOS ? 'sombre' : 'clair'}, écran ${c.nuitOS ? 'sombre' : 'clair'} (population non vide)`, t0 === !c.nuitOS, t0);
  v(`${tag} : toucher le choix « ${c.nuitOS ? 'Jour' : 'Nuit'} » est possible`, await choisirMode(c, c.nuitOS ? 'Jour' : 'Nuit'));
  const t1 = await clair(c.p); v(`${tag} : le choix s'applique tout de suite (écran ${c.nuitOS ? 'clair' : 'sombre'})`, t1 === c.nuitOS, t1);
  await L.capture(c, `${CAP}/mode-force-${tag.replace(/\W/g, '_')}.png`);
  await rouvrir(c); const t2 = await clair(c.p);
  v(`${tag} : après rechargement, le choix est retenu (l'OS est ${c.nuitOS ? 'sombre' : 'clair'}, l'écran reste ${c.nuitOS ? 'clair' : 'sombre'})`, t2 === c.nuitOS, t2);
  const ret = await c.p.evaluate(() => { try { return localStorage.getItem('opg_proto_mode'); } catch (e) { return 'illisible'; } }); v(`${tag} : le rangement porte « ${c.nuitOS ? 'jour' : 'nuit'} »`, ret === (c.nuitOS ? 'jour' : 'nuit'), ret);
  // la feuille montre le choix actif
  await L.toucher(c, '#contenu .tt-menu'); const act = await c.p.evaluate(() => [...document.querySelectorAll('#calque .panneau .mode-seg button')].filter(b => b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim())); await L.ranger(c.p);
  v(`${tag} : la feuille montre le choix retenu (${c.nuitOS ? 'Jour' : 'Nuit'})`, act.join() === (c.nuitOS ? 'Jour' : 'Nuit'), act);
  // Auto : l'écran suit l'OS, même après rechargement
  await choisirMode(c, 'Auto'); await rouvrir(c); const t3 = await clair(c.p); v(`${tag} : « Auto » après rechargement suit l'appareil`, t3 === !c.nuitOS, t3);
  const ret2 = await c.p.evaluate(() => localStorage.getItem('opg_proto_mode')); v(`${tag} : le rangement porte « auto »`, ret2 === 'auto', ret2);
}

async function conges(c, tag) {
  await L.toucher(c, '#contenu .tt-menu'); await c.p.evaluate(() => document.querySelector('#calque .panneau [data-go="absences"]').scrollIntoView({ block:'center' })); v(`${tag} : « Mes congés » dans la feuille`, await L.toucher(c, '#calque .panneau [data-go="absences"]'));
  const e = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, sur:(document.querySelector('#contenu .surtitre') || {}).textContent, soldes:[...document.querySelectorAll('#contenu .at-t')].map(t => t.innerText.replace(/\s+/g, ' ')), vide:!!document.querySelector('#contenu .t-vide'), txt:document.getElementById('contenu').innerText.length, }));
  v(`${tag} : l'écran s'appelle « Mes congés » et nomme la personne connectée (Sophie)`, e.h1 === 'Mes congés' && /Sophie/.test(e.sur || ''), e);
  v(`${tag} : ses deux soldes (congés payés, RTT) sont là`, e.soldes.length === 2 && /Congés payés/.test(e.soldes[0]) && /RTT/.test(e.soldes[1]), e.soldes);
  const e2 = await c.p.evaluate(src => (document.getElementById('contenu').innerText.match(new RegExp(src, 'i')) || [''])[0], ECH); v(`${tag} : aucun texte d'échafaudage sur « Mes congés »`, e2 === '', e2);
  const d = await L.deborde(c); v(`${tag} : « Mes congés » ne glisse pas de côté`, d.bouge === 0 && d.seconde <= c.largeur + 1, d);
  await L.capture(c, `${CAP}/conges-${tag.replace(/\W/g, '_')}.png`, false);
  const avant = await c.p.evaluate(() => document.querySelectorAll('#contenu .at-d').length);
  v(`${tag} : le bouton « Demande de congé » existe, ≥ 44 px`, await c.p.evaluate(() => { const b = document.querySelector('[data-atdem]'); if (!b) return false; const r = b.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; }));
  await L.toucher(c, '[data-atdem]'); await L.calme(c.p, 400);
  const P = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const ch = [...P.querySelectorAll('input:not([type=hidden]), select, textarea')].map(e => ({ id:e.id, fs:parseFloat(getComputedStyle(e).fontSize), h:Math.round(e.getBoundingClientRect().height) }));
    const b = P.querySelector('[data-atenvoi]'); P.scrollTop = P.scrollHeight; const r = b.getBoundingClientRect(); return { titre:P.querySelector('h2').textContent, champs:ch, larg:P.scrollWidth - P.clientWidth, bouton:{ h:Math.round(r.height), bas:Math.round(r.bottom), H:innerHeight, haut:Math.round(r.top) }, dis:b.disabled }; });
  if (!v(`${tag} : le panneau « Demande de congé » s'ouvre`, !!P && P.titre === 'Demande de congé', P)) return;
  v(`${tag} : champs ≥ 16 px (pas de zoom d'iOS) et ≥ 40 px de haut`, P.champs.every(x => x.fs >= 16 && x.h >= 40), P.champs);
  v(`${tag} : le panneau ne glisse pas et le bouton d'envoi se voit au-dessus du bas de l'écran (≥ 44 px)`, P.larg <= 1 && P.bouton.bas <= P.bouton.H && P.bouton.h >= 44 && !P.dis, P);
  await L.capture(c, `${CAP}/conges-demande-${tag.replace(/\W/g, '_')}.png`);
  await c.p.evaluate(() => { document.getElementById('ad-ty').value = 'Congé payé'; document.getElementById('ad-m').value = 'Sonde de relecture menu'; document.getElementById('ad-du').value = ''; });
  // les dates : on passe par des jours ouvrés lointains lus dans la page elle-même (jour(n) est la fonction de l'application)
  await c.p.evaluate(() => { const lun = n => { for (let i = n; i < n + 10; i++) { const s = jour(i), d = new Date(s + 'T12:00:00'); if (d.getDay() !== 0 && d.getDay() !== 6) return s; } return jour(n); }; const g = lun(40); document.getElementById('ad-du').value = g; document.getElementById('ad-au').value = g; document.getElementById('ad-du').dispatchEvent(new Event('input', { bubbles:true })); document.getElementById('ad-au').dispatchEvent(new Event('input', { bubbles:true })); });
  await L.calme(c.p, 300);
  const ok = await L.toucher(c, '[data-atenvoi]'); await L.calme(c.p, 600);
  const e3 = await c.p.evaluate(() => ({ cartes:document.querySelectorAll('#contenu .at-d').length, derniere:[...document.querySelectorAll('#contenu .at-d')].map(x => x.innerText).join(' ‖ '), panneau:!!document.querySelector('#calque .panneau'), toast:(document.getElementById('toast') || {}).textContent || '' }));
  v(`${tag} : la demande part (le panneau se ferme)`, ok && !e3.panneau, e3);
  v(`${tag} : le toast d'envoi ne propose pas « Voir comme Marc » (échafaudage de revue) en mode application`, !/Voir comme/.test(e3.toast), e3.toast);
  v(`${tag} : elle la RETROUVE dans « Mes demandes » (une carte de plus, « En attente de la décision »)`, e3.cartes === avant + 1 && /Sonde de relecture menu/.test(e3.derniere) && /En attente/.test(e3.derniere), e3);
  // elle la retrouve après être partie ailleurs puis revenue
  await L.aller(c.p, 'majournee'); await L.aller(c.p, 'absences'); const e4 = await c.p.evaluate(() => document.querySelectorAll('#contenu .at-d').length); v(`${tag} : elle la retrouve en revenant sur l'écran`, e4 === avant + 1, e4);
  // le gérant la voit : on ouvre la session de Marc par la fonction de l'application (pas de rechargement : le prototype n'a pas de serveur)
  await c.p.evaluate(() => { sessionOuvrir('marc'); }); await L.calme(c.p, 800); await L.aller(c.p, 'absences');
  const g = await c.p.evaluate(() => { const t = document.getElementById('contenu').innerText; return { h1:(document.querySelector('#contenu h1') || {}).textContent, sophie:/Sophie/.test(t), motif:/Sonde de relecture menu/.test(t), demandes:[...document.querySelectorAll('#contenu .a-dem-t')].length }; });
  v(`${tag} : le gérant la voit dans « Absences et congés » (Sophie + son motif)`, g.h1 === 'Absences et congés' && g.sophie && g.motif, g);
  await L.capture(c, `${CAP}/conges-gerant-${tag.replace(/\W/g, '_')}.png`, false);
  const dg = await L.deborde(c); v(`${tag} : « Absences et congés » ne glisse pas de côté`, dg.bouge === 0 && dg.seconde <= c.largeur + 1, dg);
}

async function client(c, tag, app) {
  await c.p.evaluate(() => rlChanger('client', { muet:true })); await L.calme(c.p, 700);
  const b = await c.p.evaluate(() => { const nav = document.querySelector('#barre-bas .opg-barre'); if (!nav) return null; return [...nav.querySelectorAll('.opg-tab')].map(t => { const s = t.querySelector('.t-n'), r = t.getBoundingClientRect(); return { mot:s.textContent.trim(), aria:t.getAttribute('aria-label'), coupe:s.scrollWidth > s.clientWidth + 0.5, l:Math.round(r.width), h:Math.round(r.height), on:t.classList.contains('on'), k:t.dataset.ec }; }); });
  if (!v(`${tag} : la barre du client existe`, !!b)) return;
  // l'ordre est celui de « Restes client » tour 1, client-14 (final/restes-client-tour1.json) : « Mêmes mots et même ordre partout : Accueil, Factures, Interventions, Devis, Contrat » ; la sonde attendait l'ordre du premier jet de MENU-FINAL.md
  v(`${tag} : Accueil · Factures · Interventions · Devis · Contrat, entiers, non coupés, ≥ 44 px`, b.map(x => x.mot).join('|') === 'Accueil|Factures|Interventions|Devis|Contrat' && b.every(x => !x.coupe && x.l >= 44 && x.h >= 44), b);
  const m = await c.p.evaluate(() => { const x = document.querySelector('#contenu .tete-tel .tt-menu'); return x ? { mot:(x.querySelector('.tt-mot') || {}).textContent, l:Math.round(x.getBoundingClientRect().width) } : null; });
  v(`${tag} : le bouton « Menu » existe aussi chez le client`, !!m && m.mot === 'Menu', m);
  await L.capture(c, `${CAP}/client-${tag.replace(/\W/g, '_')}.png`);
  const eff = []; for (const k of ['accueil', 'factures', 'devis', 'interventions', 'contrats']) {
    await L.toucher(c, `#barre-bas [data-ec="tab|${k}"]`); await L.calme(c.p, 500);
    const e = await c.p.evaluate(k => ({ tab:EC.tab, on:[...document.querySelectorAll('#barre-bas .opg-tab.on')].map(t => t.dataset.ec), txt:document.getElementById('contenu').innerText.length, h:document.getElementById('contenu').innerText.slice(0, 60).replace(/\s+/g, ' ') }), k);
    v(`${tag} : l'onglet « ${k} » ouvre son écran et s'allume seul`, e.tab === k && e.on.join() === 'tab|' + k && e.txt > 80, e);
    const d = await L.deborde(c); v(`${tag} : onglet « ${k} » : ne glisse pas de côté`, d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    const bas = await c.p.evaluate(() => { const nav = document.querySelector('#barre-bas .opg-barre'); const hb = nav.getBoundingClientRect(); window.scrollTo(0, 1e6); let m = 0; for (const x of document.getElementById('contenu').querySelectorAll('*')) if (x.offsetParent && x.getBoundingClientRect().height > 0 && getComputedStyle(x).position !== 'fixed') m = Math.max(m, x.getBoundingClientRect().bottom); const r = { fond:Math.round(m), barre:Math.round(hb.top) }; window.scrollTo(0, 0); return r; });
    v(`${tag} : onglet « ${k} » : le dernier élément se voit au-dessus de la barre`, bas.fond <= bas.barre + 1, bas);
    if (app) { const echaf = await c.p.evaluate(src => (document.body.innerText.match(new RegExp(src, 'i')) || [''])[0], ECH); v(`${tag} : onglet « ${k} » : aucun échafaudage en mode application`, echaf === '', echaf); }
    if (k === 'factures') await L.capture(c, `${CAP}/client-factures-${tag.replace(/\W/g, '_')}.png`);
  }
}

(async () => {
  for (const profil of PROFILS) {
    for (const nuitOS of [true, false]) { if (profil === 'android' && nuitOS === false) continue; if (profil === 'petit' && nuitOS === false) continue;
      const tag = `${profil}/mode(OS ${nuitOS ? 'sombre' : 'clair'})`; console.log('\n##', tag); const c = await L.ouvrir({ profil, nuit:nuitOS, qui:'marc' }); c.nuitOS = nuitOS;
      // ouvrir() force 'nuit'/'jour' en mémoire pour les sondes : on rend la main à l'application, en « auto », comme à la première ouverture réelle
      await c.p.evaluate(() => { try { localStorage.removeItem('opg_proto_mode'); } catch (e) {} }); await rouvrir(c);
      await modes(c, tag); v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
    if (profil !== 'petit') { const tag = `${profil}/congés`; console.log('\n##', tag); const c = await L.ouvrir({ profil, nuit:false, qui:'sm' }); await conges(c, tag); v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
    { const tag = `${profil}/client(app)`; console.log('\n##', tag); const c = await L.ouvrir({ profil, nuit:profil === 'petit', qui:'marc' }); await client(c, tag, true); v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})();
