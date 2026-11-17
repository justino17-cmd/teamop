// Valeurs LONGUES dans la fiche d'un brouillon : la quantité « 1523,5 » se lit en entier, le total de ligne « 18 808 628,25 € » aussi (ni coupé ni
// recouvert par le ✕), et chaque onglet de la liste est atteignable sans défilement caché (« Tous »). usage : node devis-atelier-valeurs-longues.js <profils>
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const profil of (process.argv[2] || 'mac,iphone,petit').split(',')) {
    const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
    await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await L.calme(p, 300);
    const seg = await p.evaluate(() => { const s = document.querySelector('#contenu .seg'), r = s.getBoundingClientRect(); return [...s.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), vu: q.left >= -1 && q.right <= innerWidth + 1, dedans: q.right <= r.right + 1 }; }); });
    v(`${profil} : les cinq onglets de la liste sont tous entièrement visibles sans défiler (« À envoyer, En attente, Acceptés, Refusés/expirés, Tous »)`, seg.length === 5 && seg.every(b => b.vu && b.dedans), seg.filter(b => !(b.vu && b.dedans)).map(b => b.t));
    await p.evaluate(() => { CLIENTS.zl = { nom: 'Client long', type: 'pro', contact: 'X', tel: '', mail: 'a@b.fr', adr: 'Rue', acces: '', depuis: '2026', appareils: [] }; dvCreer({ cli: 'zl', objet: 'Valeurs longues', lignes: [['Centrale de traitement d’air', 1523.5, 12345.67], ['Autre', 12, 1999.99]], source: 'essai' }); }); await L.calme(p, 600);
    const m = await p.evaluate(() => { const l = document.querySelector('#contenu .dv-lg:not(.dv-lg-t)'); if (!l) return null; const q = l.querySelector('.dv-q2'), pu = l.querySelector('.dv-pu'), t = l.querySelector('.dv-tot'), x = l.querySelector('.dv-x');
      const rect = e => e && e.getBoundingClientRect(); const vis = e => e && getComputedStyle(e).display !== 'none' && rect(e).width > 0;
      return { qClip: q.scrollWidth > q.clientWidth + 1, qVal: q.value, puClip: pu.scrollWidth > pu.clientWidth + 1, puVal: pu.value, totVisible: vis(t), totClip: vis(t) && t.scrollWidth > t.clientWidth + 1, totTxt: t.textContent, chevauche: vis(t) && vis(x) && rect(t).right > rect(x).left + 1 }; });
    v(`${profil} : la quantité « 1523,5 » tient en entier dans son champ`, m && !m.qClip, m);
    v(`${profil} : le prix « 12345,67 » tient en entier dans son champ`, m && !m.puClip, m);
    v(`${profil} : le total de la ligne (${m && m.totTxt}) est lisible en entier : ni coupé ni recouvert par le ✕`, m && !m.totClip && !m.chevauche && (c.doigt ? true : m.totVisible), m);
    v(`${profil} : le total de chaque ligne est visible pendant qu'on la modifie`, m && m.totVisible, m);
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
