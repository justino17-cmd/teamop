// RECONTRÔLE ADVERSE des « restes » de CLIENTS, tour 5 (19 novembre 2026) : ce que les deux corrections ont pu CASSER à côté.
//   A1. dictée : les noms de la population de départ restent reconnus (dits en entier ou par un mot distinctif) et les faux amis restent refusés
//   A2. dictée : la coupe sur tout signe non alphanumérique NE doit PAS faire d'une moitié de prénom composé, d'un mot de trois lettres ou d'une forme
//       juridique (« pierre », « bar », « sas », « sci ») un nom de client : on les dicte pour parler de MATIÈRES ou d'OBJETS (mesure : on constate, on ne juge pas)
//   A3. dictée : deux clients partagent un mot : le client dont on dit LE NOM ENTIER ne doit pas être volé par un autre qui le contient en partie
//   B1. carte client à nom d'un seul mot de 54 signes AVEC la pastille « contrat » : la pastille garde sa forme, le nom se coupe, la page ne s'élargit pas
//   B2. le même nom, sur la fiche du client et dans les vues qui l'affichent : aucun élargissement de la page (mesure contre documentElement.clientWidth)
// Usage : PROFIL=… QUI=marc|julie NUIT=1 SEUL=A1,A2 node clients-restes5-recontrole.js — « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients5-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI;
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  require('fs').mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const D0 = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, ks: Object.keys(CLIENTS).join(',') }));
  v('population : ' + D0.n + ' clients de départ (' + D0.ks + ')', D0.n >= 7, D0);
  const dicter = t => p.evaluate(t => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = t; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; } const nv = DV.slice(n0); const r = { cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim() }; DV.splice(n0); try { fermerPanneau(); } catch (e) {} return r; }, t);
  const mk = (k, nom) => p.evaluate(([k, nom]) => { CLIENTS[k] = { nom, type: 'pro', contact: 'X', tel: '06 10 20 30 40', mail: 'x@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; }, [k, nom]);
  const rm = ks => p.evaluate(ks => { ks.forEach(k => delete CLIENTS[k]); for (let i = JOURNAL.length - 1; i >= 0; i--) if (JOURNAL[i].el && ks.includes(JOURNAL[i].el.cli)) JOURNAL.splice(i, 1); }, ks);   /* la sonde retire aussi les traces du journal d'un client qu'elle supprime : l'application, elle, n'efface jamais un client qui a un historique */

  if (veut('A1')) {
    const cas = [['Devis pour Mme Roux, une heure', 'mr'], ['Devis pour Madame Roux', 'mr'], ['Devis pour M. et Mme Durand, une heure', 'md'], ['Devis pour Durand, une heure', 'md'], ['Devis pour le restaurant Le Vieux Port, une heure', 'vp'], ['devis pour le vieux port', 'vp'],
      ['Devis pour l’hôtel de la Plage, une heure', 'hp'], ['Devis pour la plage', 'hp'], ['Devis pour la copropriété Les Mimosas', 'mi'], ['Devis pour les Mimosas, une heure', 'mi'], ['Devis pour le cabinet dentaire Martin', 'cm'], ['Devis pour Martin, une heure', 'cm'],
      ['Devis pour le camping Les Pins, une heure', 'cp'], ['Devis pour les Pins', 'cp'], ['Devis pour le garage Rochefort Auto, une heure', 'rf'], ['Devis pour Rochefort Auto', 'rf']];
    for (const [t, k] of cas) { const r = await dicter(t); v('A1 : « ' + t.slice(0, 50) + ' » va à ' + k + ' (' + (r.cli || []).join(',') + ', « ' + (r.toast || '').slice(0, 40) + ' »)', !r.err && r.cree === 1 && r.cli[0] === k, r); }
    // les mots génériques ajoutés ne doivent pas faire disparaître un client qui n'a QUE ceux-là de distinctif (ici : aucun) : on vérifie les refus
    for (const t of ['Devis pour un support mural, une heure', 'Devis pour un garage, une heure', 'Devis pour le syndic, une heure', 'Devis pour des travaux chez un voisin, une heure', 'Devis pour une résidence']) {
      const r = await dicter(t); const att = 0; v('A1 faux ami : « ' + t.slice(0, 50) + ' » → ' + (att ? 'Mimosas (pluriel toléré)' : 'aucun client') + ' (devis ' + r.cree + ' : ' + (r.cli || []).join(',') + ')', !r.err && r.cree === att, r); }
  }

  if (veut('A2')) {
    // prénoms composés, mots de trois lettres, formes juridiques : on constate lesquels « volent » une phrase qui parle d'autre chose
    const noms = { __jp: 'Jean-Pierre Vasseur', __mc: 'Marie-Claire Petit', __bt: 'Bar-Tabac Le Rialto', __sa: 'Dupuis SAS', __sc: 'SCI Les Tilleuls', __sr: 'Gaillard SARL', __ep: 'Boulangerie L’Épi d’Or' };
    for (const [k, n] of Object.entries(noms)) await mk(k, n);
    const cas = [['Devis pour la pose de pierre naturelle, une heure', 'aucun'], ['Devis pour un sas d’entrée vitré, une heure', 'aucun'], ['Devis pour un bar à vin, comptoir, une heure', 'aucun'], ['Devis pour une sci, une heure', 'aucun'],
      ['Devis pour un épi de faîtage, une heure', 'aucun'], ['Devis pour la claire-voie, une heure', 'aucun'], ['Devis pour la marie du village, une heure', 'aucun'], ['Devis pour la mairie, une heure', 'aucun'],
      ['Devis pour Vasseur, une heure', '__jp'], ['Devis pour Jean-Pierre, une heure', '__jp'], ['Devis pour Marie-Claire Petit, une heure', '__mc'], ['Devis pour Dupuis, une heure', '__sa'], ['Devis pour les Tilleuls', '__sc']];
    for (const [t, att] of cas) { const r = await dicter(t); const ok = att === 'aucun' ? r.cree === 0 : r.cree === 1 && r.cli[0] === att; v('A2 : « ' + t.slice(0, 55) + ' » → ' + att + ' (devis ' + r.cree + ' : ' + (r.cli || []).join(',') + ')', !r.err && ok, r); }
    await rm(Object.keys(noms));
  }

  if (veut('A3')) {
    // le client dont on dit le nom entier ne se fait pas voler par un autre qui en partage un morceau (premier trouvé = clé la plus ancienne)
    await mk('__a1', 'Jean-Pierre Vasseur'); await mk('__a2', 'Jean Martin'); await mk('__a3', 'Marie-Claire Petit'); await mk('__a4', 'Claire Dubois');
    const cas = [['Devis pour Jean Martin, une heure', '__a2'], ['Devis pour Claire Dubois, une heure', '__a4'], ['Devis pour Jean-Pierre Vasseur, une heure', '__a1'], ['Devis pour Marie-Claire Petit, une heure', '__a3']];
    for (const [t, k] of cas) { const r = await dicter(t); v('A3 : « ' + t + ' » va à ' + k + ' (' + (r.cli || []).join(',') + ')', !r.err && r.cree === 1 && r.cli[0] === k, r); }
    await rm(['__a1', '__a2', '__a3', '__a4']);
  }

  if (veut('B1')) {
    await L.aller(p, 'clients');
    const nom = 'Etablissementsdupontdelaunayfreresetassociesdusudouest';
    for (const cle of ['mi', 'hp']) for (const arch of [false, true]) {
      const r0 = await p.evaluate(([cle, nom, arch]) => { const o = CLIENTS[cle]; window.__nomSauve = window.__nomSauve || {}; if (!(cle in window.__nomSauve)) window.__nomSauve[cle] = [o.nom, !!o.archive]; o.nom = nom; if (arch) o.archive = true; else delete o.archive; rangClients = arch ? 'archives' : 'tous'; chercheClient = nom.slice(0, 8); rendre(); const k = document.querySelector('#contenu .client-carte'); const pas = k && k.querySelector('.st'); return { ctr: !!CONTRATS.find(x => x.cli === cle && x.st === 'signe'), pastille: pas ? pas.textContent.trim() : null }; }, [cle, nom, arch]);
      await L.calme(p, 400);
      const m = await p.evaluate(() => { const k = document.querySelector('#contenu .client-carte'); if (!k) return null; const r = k.getBoundingClientRect(), cw = document.documentElement.clientWidth, st = k.querySelector('.st'); const q = st && st.getBoundingClientRect(); const b = k.querySelector('b').getBoundingClientRect(); return { cw, sw: document.documentElement.scrollWidth, carteDroite: Math.round(r.right), pastilleL: q ? Math.round(q.width) : 0, pastilleH: q ? Math.round(q.height) : 0, pastilleSort: q ? q.right > r.right + 0.5 : false, nomH: Math.round(b.height), nomDroite: Math.round(b.right) }; });
      v('B1 : ' + cle + (arch ? ' archivé' : '') + ' au nom de 54 signes, pastille « ' + r0.pastille + ' » : carte ' + (m && m.carteDroite) + '/' + (m && m.cw) + ', pastille ' + (m && m.pastilleL) + '×' + (m && m.pastilleH) + ', nom sur ' + (m && m.nomH) + ' px', !!m && m.sw <= m.cw && m.carteDroite <= m.cw && !m.pastilleSort && (r0.pastille === null || (m.pastilleL >= 40 && m.pastilleH <= 30)), { r0, m });
      if (r0.ctr && !arch) await L.capture(c, CAP + 'carte-contrat-' + cle + '-' + ETQ + '.png');
      await p.evaluate(([cle]) => { const s = window.__nomSauve[cle]; CLIENTS[cle].nom = s[0]; if (s[1]) CLIENTS[cle].archive = true; else delete CLIENTS[cle].archive; }, [cle]);
    }
    await p.evaluate(() => { chercheClient = ''; rangClients = 'tous'; rendre(); });
  }

  if (veut('B2')) {
    const nom = 'Etablissementsdupontdelaunayfreresetassociesdusudouest';
    await p.evaluate(nom => { window.__nm = CLIENTS.mi.nom; CLIENTS.mi.nom = nom; CLIENTS.mi.contact = nom; }, nom);
    const vues = await p.evaluate(() => Object.keys(vues()).filter(x => !['inter', 'facture', 'client', 'contrat', 'signer', 'contrat-nouveau', 'clientvoit', 'espaceclient', 'carteBox', 'devisXylo'].includes(x) && !estGrise(x)));
    vues.push('client-x-mi', 'factures', 'devis');
    let n = 0;
    for (const h of vues) {
      try { await L.aller(p, h); } catch (e) { continue; } n++;
      const m = await p.evaluate(() => ({ cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth }));
      v('B2 : vue « ' + h + ' » avec un client au nom de 54 signes : page ' + m.sw + '/' + m.cw, m.sw <= m.cw && m.bw <= m.cw, m);
      if (h === 'client-x-mi') await L.capture(c, CAP + 'fiche-mot-unique-' + ETQ + '.png');
    }
    v('B2 : ' + n + ' vues parcourues (population non vide)', n >= 12, n);
    await p.evaluate(() => { CLIENTS.mi.nom = window.__nm; });
  }

  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
