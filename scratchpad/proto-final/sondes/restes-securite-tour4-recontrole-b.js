// RECONTRÔLE ADVERSE du tour 4, partie B : un client au nom de 112 signes (contact 120, adresse 160, accès 3 lignes) dans 13 écrans × 3 profils ; variante nom SANS espace (112 « W »).
// Mesure : ne déborde pas de la largeur POSÉE du profil, aucun texte écrasé, le nom est lisible (entier ou coupé par ellipse), jamais « undefined ». Captures hors dépôt. 127.0.0.1 seulement.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/cap-rec4/'; fs.mkdirSync(SORTIE, { recursive: true });
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
const NOMW = ('Wm'.repeat(60)).slice(0, 112);
const CONTACT = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix'.slice(0, 120);
const ADR = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur, parking visiteurs à droite du portail'.slice(0, 160);
const ECRANS = ['accueil', 'planning', 'interventions', 'devis', 'factures', 'taches', 'clients', 'CLIENT:histo', 'CLIENT:factures', 'CLIENT:infos', 'INTER', 'DEVIS', 'FACTURE'];
const PROFILS = process.env.PROFILS ? JSON.parse(process.env.PROFILS) : [['petit', false, NOM], ['iphone', true, NOM], ['ipad', false, NOM], ['petit', false, NOMW]];
(async () => {
  for (const [profil, nuit, nom] of PROFILS) {
    const tag = profil + (nuit ? '-nuit' : '-jour') + (nom === NOMW ? '-sansespace' : ''), c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const info = await p.evaluate(o => { const cnt = {}; const bump = (k, n) => { if (k && CLIENTS[k]) cnt[k] = (cnt[k] || 0) + n; };
      INTS.forEach(i => bump(i.cli, 3)); (dvInit(), DV).forEach(d => bump(d.cli, 3)); FACTURES.forEach(f => bump(f.cli, 3)); TACHES.forEach(t => bump(t.cli, 1));
      const k = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; Object.assign(CLIENTS[k], cliNet({ nom: o.nom, contact: o.contact, adr: o.adr, acces: 'Code portail 4821\nSonner chez la gardienne\nLocal à gauche', tel: '0546123456', mail: 'prenom.nom.service.comptabilite@residence-les-jardins-du-port.example.fr' })); rendre();
      const i = INTS.find(x => x.cli === k), dd = DV.find(x => x.cli === k), f = FACTURES.find(x => x.cli === k);
      return { k, nom: nbSignes(CLIENTS[k].nom), i: i && i.id, d: dd && dvCle(dd), f: f && f.id, liens: cnt[k] }; }, { nom, contact: CONTACT, adr: ADR });
    L.v(tag + ' · population : client de ' + info.nom + ' signes relié à intervention, devis, facture', info.nom === 112 && !!info.i && !!info.d && !!info.f, info);
    let vus = 0;
    for (const e of ECRANS) {
      const h = e === 'INTER' ? 'inter-x-' + info.i : e === 'DEVIS' ? 'devis-x-' + info.d : e === 'FACTURE' ? 'facture-x-' + info.f : e.startsWith('CLIENT:') ? 'client-x-' + info.k : e;
      if (e.startsWith('CLIENT:')) await p.evaluate(o => { ongletClient = o; }, e.split(':')[1]);
      await p.evaluate(x => aller(x), h); await L.calme(p, 700);
      const lu = await p.evaluate(n => { const t = (document.getElementById('contenu') || document.body).innerText || ''; return { nom: t.includes(n), debut: t.includes(n.slice(0, 30)), undef: /undefined|NaN|\[object/.test(t), nbl: (document.querySelectorAll('[data-cli],[data-ci]').length) }; }, nom);
      if (lu.debut) vus++;
      const d = await L.deborde(c);
      L.v(tag + ' · ' + e + ' : ne déborde pas (' + c.largeur + ' px)' + (lu.debut ? ' — nom lu' : ' — nom absent'), !d || !d.deborde, d);
      L.v(tag + ' · ' + e + ' : ni « undefined » ni « NaN »', !lu.undef, lu);
      const dg = await L.doigts(p, '#contenu'); const ec = (dg.ecrases || []).filter(x => /Syndicat|Wm|Marins|Madame Marie/.test(JSON.stringify(x))); L.v(tag + ' · ' + e + ' : texte du client non écrasé', ec.length === 0, ec);
      if (['CLIENT:histo', 'CLIENT:infos', 'clients', 'INTER', 'DEVIS', 'FACTURE', 'accueil'].includes(e) && !/sansespace/.test(tag)) await L.capture(c, SORTIE + e.replace(':', '-') + '-' + tag + '.png');
    }
    L.v(tag + ' · population : le nom est lu dans au moins 5 écrans sur 13', vus >= 5, vus);
    L.v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
