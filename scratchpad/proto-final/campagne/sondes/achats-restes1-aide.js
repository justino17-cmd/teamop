// RECONTRÔLE ADVERSE restes-achats tour 1 (18 novembre 2026) : « Comment ça marche ? » rangé APRÈS la liste sous 380 px (achats-05) reste atteignable,
// ouvre sa fenêtre, mesure ≥ 44 px, ne passe pas sous la barre d'onglets en bas de page ; et la phrase sous le titre masquée ne cache rien d'unique.
// Usage : node achats-restes1-aide.js [profil=petit] [nuit]
const { L, ouvrirAchats, titrePanneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '');
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  for (const onglet of ['demandes', 'notes']) {
    await E(o => { acOnglet = o; rendre(); }, onglet); await L.calme(p, 600);
    const m = await E(() => { const a = document.querySelector('#contenu .ach-aide'); if (!a) return null; const r = a.getBoundingClientRect(), liste = [...document.querySelectorAll('#contenu .carte, #contenu .ligne')].filter(e => e.offsetParent);
      const fin = Math.max(0, ...liste.map(e => e.getBoundingClientRect().bottom)), cs = getComputedStyle(a), sub = document.querySelector('#contenu .tete.ach-tete .gris');
      return { top: Math.round(r.top + scrollY), h: Math.round(r.height), finListe: Math.round(fin + scrollY), visible: cs.display !== 'none', sousTitre: sub ? getComputedStyle(sub).display : 'absent', sousTitreTxt: sub ? sub.textContent.trim().slice(0, 80) : '' }; });
    console.log('  ' + tag + ' ' + onglet + ' :', JSON.stringify(m));
    v(tag + ' ' + onglet + ' : le lien « Comment ça marche ? » existe', !!m && m.visible, m);
    if (!m) continue;
    v(tag + ' ' + onglet + ' : au téléphone ≤ 380 il est après la liste ; sinon avant', c.largeur <= 380 ? m.top >= m.finListe - 4 : m.top < m.finListe, m);
    v(tag + ' ' + onglet + ' : cible ≥ 44 px', m.h >= 44, m);
    await E(() => document.querySelector('#contenu .ach-aide').scrollIntoView({ block: 'center' })); await L.calme(p, 300);
    const pile = await E(() => { const a = document.querySelector('#contenu .ach-aide'), r = a.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && (a === e || a.contains(e)); });
    v(tag + ' ' + onglet + ' : au centre de l’écran le lien est bien ce qu’on touche', pile);
    await L.toucher(c, '#contenu .ach-aide'); await L.calme(p, 500);
    const t = await titrePanneau(p); v(tag + ' ' + onglet + ' : il ouvre « Comment ça marche ? »', /Comment ça marche/.test(t), t);
    await E(() => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); }); await L.calme(p, 300);
  }
  const err = c.err.filter(x => !/ERR_/.test(x)); v(tag + ' aucune erreur JavaScript', err.length === 0, err.slice(0, 2));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
