// RECONTRÔLE ADVERSE des RESTES « Interventions », tour 1 (17 novembre 2026) : ce que les corrections de restes-interventions-tour1.json ont pu casser À CÔTÉ.
//   A  garantie : aucune facture ne naît, nulle part (Factures, client, Tâches), pour les trois rôles de bureau, avec une pièce posée
//   B  « un autre passage » : l'intervention à planifier, la tâche, le client, le PDF — jamais le mot « ventilateur » hors de l'histoire du Vieux Port ; le type changé APRÈS coup
//   C  téléphone : tous les liens « Appeler » du prototype composent un numéro (jamais « poste », ni lettres), deux numéros +33 ; la liste des interventions et la fiche
//   D  relevé : un collage « 3 sur 18 » ne devient pas 318 en silence ; les autres métiers ; la valeur gardée est celle du compte rendu
//   E  prix d'une ligne de facture : quantité × prix, prix négatif, texte ; ce que la fenêtre de devis fait du même cas
//   F  mise en page : filtre et fiche terminée entre 1100 et 1300 px, trois largeurs de téléphone, jour et nuit ; lien « Mon entreprise » : sa cible
// usage : node interventions-restes-recontrole.js <profil> [nuit] [filtre de sections]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', filtre = process.argv[4] ? new RegExp(process.argv[4]) : null;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = async z => (await I.texte(p, z)).replace(/[  ]/g, ' '); const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `restes-recontrole-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const sec = async (nom, f) => { if (filtre && !filtre.test(nom)) return; console.log('\n── ' + nom); try { await f(); } catch (e) { v(nom + ' : la section ne plante pas', false, String(e.message).slice(0, 300)); } };
  const voir = async (sel, n) => { await ev(z => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); const e = [...document.querySelectorAll(z)].find(x => x.offsetParent !== null); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await L.calme(p, 450); await L.capture(c, CAPN(n)); };
  const MOTS_FACTURE = /Paiement sur place|Payé en totalité|Acompte versé|Pas encore payé|la facture lui sera envoyée|la facture partira|Facture à envoyer|à facturer/i;

  // une garantie créée par l'écran de création (comme le ferait le bureau), prête à terminer par la technicienne
  const creerGarantie = async (cli, tech, avecPiece) => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap(`#fenetre [data-ccli="${cli}"]`); await tap('#fenetre [data-cfact="garantie"]');
    await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
    return ev(([t, piece]) => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; i.tech = t; i.d = AUJ; i.st = 'planifiee'; const F = fiche(i.id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Remplacement du joint sous garantie constructeur.'; F.signature = 'signee';
      if (piece) F.pieces.push({ n: 'Joint de rechange', q: 1, nom: 'Joint de rechange', qte: 1, u: 'pièce' });
      return { id: i.id, mode: i.fact && i.fact.mode, nF: FACTURES.length }; }, [tech, avecPiece]);
  };

  await sec('A garantie : aucune facture ne naît', async () => {
    for (const [cli, avecPiece] of [['hp', false], ['md', true]]) {
      const g = await creerGarantie(cli, 'sm', avecPiece);
      v(`A population (${cli}${avecPiece ? ', avec pièce' : ''}) : une garantie`, g.mode === 'garantie', g);
      await I.devenir(c, 'sm', 'inter-x-' + g.id); await tap('[data-action="terminer"]'); await L.calme(p, 600);
      const apres = await ev(id => ({ fact: FACTURES.filter(f => f.int === id).length, st: INTS.find(o => o.id === id).st, paie: fiche(id).paiement, suites: INTS.filter(o => /^n-(ven|ent)-/.test(o.id) && o.id.endsWith(id)).length }), g.id);
      v(`A (${cli}) terminée : aucune facture rattachée à l'intervention`, apres.st === 'fait' && apres.fact === 0, apres);
      v(`A (${cli}) …et aucun paiement noté sur place`, apres.paie.etat === 'rien', apres.paie);
      let t = await txt(); v(`A (${cli}) la fiche terminée de la technicienne : « Sans facture » et la phrase, aucun mot de facture à venir`, /Sans facture/.test(t) && /Garantie : rien à encaisser, aucune facture/.test(t) && !MOTS_FACTURE.test(t), (t.match(MOTS_FACTURE) || [''])[0]);
      for (const qui of ['marc', 'julie']) {   // kb est technicien : sa fiche n'est pas celle de sm, il atterrit sur « Ma journée » (c'est voulu)

        await I.devenir(c, qui, 'inter-x-' + g.id); t = await txt();
        const lui = qui === 'kb' ? !/Accès refusé|pas accès|n’est pas ouverte/i.test(t) : true;
        v(`A (${cli}) ${qui} lit la même fiche, sans mot de facture`, !lui || (!MOTS_FACTURE.test(t) && /Garantie|Sans facture|Rien à/i.test(t)), (t.match(MOTS_FACTURE) || [''])[0] || t.slice(0, 120));
      }
      // la facturation vue d'ailleurs : liste des factures, fiche du client, tâches du jour
      await I.devenir(c, 'marc', 'factures'); t = await txt(); const nom = await ev(id => CLIENTS[INTS.find(o => o.id === id).cli].nom, g.id);
      const lignesFactures = (t.split('\n').filter(l => l.includes(nom)) || []);
      v(`A (${cli}) la liste des factures ne parle pas de cette intervention (${nom})`, !(await ev(id => FACTURES.some(f => f.int === id), g.id)), lignesFactures.slice(0, 2));
      await I.devenir(c, 'marc', 'client-x-' + (await ev(id => INTS.find(o => o.id === id).cli, g.id))); t = await txt();
      const tit = await ev(id => INTS.find(o => o.id === id).titre, g.id);
      const ligne = (t.split('\n').find(l => l.includes(tit)) || '');
      v(`A (${cli}) la fiche client montre l'intervention sans la dire « à facturer »`, !/à facturer|Facture à valider|à encaisser/i.test(t.split(tit)[1] ? t.split(tit)[1].slice(0, 120) : ''), t.split(tit)[1] ? t.split(tit)[1].slice(0, 120) : '(titre absent)');
      await I.devenir(c, 'marc', 'taches'); t = await txt(); v(`A (${cli}) Tâches ne demande ni facture ni encaissement pour « ${tit} »`, !new RegExp(tit.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\n]{0,120}(factur|encaiss)', 'i').test(t), '');
      // la vue du client : ce que le client lit
      await I.devenir(c, 'marc', 'clientvoit'); await ev(id => { voirInt = id; modeClient = 'web'; rendre(); }, g.id); t = await txt('#contenu .client-web');
      v(`A (${cli}) l'espace client : aucune facture proposée, pas de « payer »`, !/Payer|Régler|Facture F-/i.test(t), (t.match(/Payer|Régler|Facture F-[^\n]*/i) || [''])[0]);
      await ev(() => { modeClient = 'pdf'; rendre(); }); t = await txt('.pdf'); v(`A (${cli}) le PDF dit « aucune facture ne vous sera envoyée »`, /aucune facture ne vous sera envoy/i.test(t), t.slice(-200));
      if (avecPiece) v('A la pièce posée ne produit pas de ligne à facturer non plus', !(await ev(id => FACTURES.some(f => f.int === id), g.id)));
    }
    await L.capture(c, CAPN('a1-client-pdf'));
    // contre-population : un dépannage NORMAL ne perd rien
    await I.devenir(c, 'marc', 'inter-x-i7'); const t7 = await txt();
    v('A contre-épreuve : un dépannage normal (i7) parle toujours de paiement', /paiement/i.test(t7) && !/Garantie : rien à encaisser/.test(t7));
  });

  await sec('B un autre passage : les voisins', async () => {
    // une intervention d'un autre client que le Vieux Port, terminée avec « un autre passage » : où la retrouve-t-on ?
    await I.devenir(c, 'sm', 'inter-x-i9'); await ev(() => { const F = fiche('i9'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fuite réparée.'; F.signature = 'signee'; });
    await tap('input[data-suite="ventilo"]'); await tap('[data-action="terminer"]'); await L.calme(p, 500);
    const nv = await ev(() => INTS.find(o => o.id === 'n-ven-i9')); v('B population : l’intervention de suite existe', !!nv, nv);
    const lieux = {};
    for (const [nom, h] of [['planning', 'planning'], ['taches', 'taches'], ['interventions', 'interventions'], ['client', 'client-x-' + (nv ? nv.cli : 'cp')], ['accueil', 'accueil']]) {
      await I.devenir(c, 'marc', h); if (nom === 'interventions') { try { await tap('[data-filtreint="plan"]'); } catch (e) {} } lieux[nom] = await txt();
    }
    for (const [nom, t] of Object.entries(lieux)) v(`B ${nom} : aucun « ventilateur » pour une intervention qui n'est pas celle du Vieux Port`, nom === 'client' ? true : !/ventilateur/i.test(t.replace(/Vieux Port[\s\S]{0,0}/, '')) || /Vieux Port|Remplacer le ventilateur/.test(t), (t.match(/.{0,40}ventilateur.{0,40}/i) || [''])[0]);
    v('B la liste « À planifier » nomme « Un autre passage »', /Un autre passage/.test(lieux.interventions), (lieux.interventions.match(/.{0,40}autre passage.{0,40}/i) || ['(rien)'])[0]);
    // le planning (panneau « à planifier ») : le titre y est lisible, sans coupure de mot
    await I.devenir(c, 'marc', 'planning'); await voir('#contenu', 'b1-planning');
    // le type est changé APRÈS que la fiche existe : l'entretien annuel suit-il ?
    const typeApres = await ev(() => { const r = {}; const i = INTS.find(o => o.id === 'i7'); r.avant = { type: i.type, ent: fiche('i7').suite.entretien }; i.type = 'Entretien'; r.apresFiche = fiche('i7').suite.entretien; delete FICHES.i7; r.apresNeuve = fiche('i7').suite.entretien; i.type = 'Dépannage'; delete FICHES.i7; return r; });
    console.log('  · type changé après coup :', JSON.stringify(typeApres));
    v('B (doute) changer le type en « Entretien » après coup : l’entretien annuel est proposé sur une fiche neuve', typeApres.apresNeuve === true, typeApres);
    if (typeApres.apresFiche !== true) console.log('  · DOUTE : une fiche déjà ouverte garde sa case « Entretien annuel » décochée si on change le type ensuite');
  });

  await sec('C téléphone : tous les liens Appeler', async () => {
    const salir = await ev(() => { const o = { hp: CLIENTS.hp.tel, e: ENTREPRISE.tel }; CLIENTS.hp.tel = '05 46 11 22 33 poste 12'; CLIENTS.md.tel = '+33 5 46 00 00 00 / +33 6 12 34 56 78'; return o; });
    const hrefs = {};
    for (const [nom, h, qui] of [['fiche client hp', 'client-x-hp', 'marc'], ['fiche client md', 'client-x-md', 'marc'], ['clients', 'clients', 'marc'], ['planning', 'planning', 'marc'], ['intervention hp', 'inter-x-' + await ev(() => (INTS.find(o => o.cli === 'hp') || {}).id), 'marc'], ['ma journée sm', 'majournee', 'sm'], ['intervention de sm', 'inter-x-i2', 'sm'], ['intervention du bureau md', 'inter-x-i2', 'marc']]) {
      await I.devenir(c, qui, h); hrefs[nom] = await ev(() => [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')));
    }
    console.log('  · liens tel: par écran :', JSON.stringify(hrefs));
    const tous = Object.values(hrefs).flat(); v('C population : des liens Appeler ont été relevés', tous.length >= 4, tous.length);
    v('C aucun lien « tel: » ne porte de lettre (« poste ») ni de barre', tous.every(h => /^tel:\+?\d+$/.test(h)), tous.filter(h => !/^tel:\+?\d+$/.test(h)));
    // l'écran qui AFFICHE le numéro garde, lui, la phrase entière
    await I.devenir(c, 'marc', 'client-x-hp'); const t = await txt(); v('C la fiche client affiche « poste 12 » à l’œil', /poste 12/.test(t), (t.match(/.{0,30}poste.{0,20}/) || [''])[0]);
    // deux numéros +33 (22 chiffres) : accepté par la création de client ?
    const ok2 = await ev(() => [cfTelOk('+33 5 46 00 00 00 / +33 6 12 34 56 78'), cfTelOk('+33 5 46 00 00 00 / 06 12 34 56 78'), cfTelOk('05 46 12 12 12 / 06 12 34 56 78 poste 4')]);
    console.log('  · deux numéros :', JSON.stringify(ok2));
    v('C (doute) deux numéros écrits en +33 (22 chiffres) acceptés', ok2[0] === true, ok2);
    // rétablir
    await ev(s => { CLIENTS.hp.tel = s.hp; CLIENTS.md.tel = '06 22 33 44 55'; }, salir);
  });

  await sec('D relevé : collage, autres métiers', async () => {
    await I.devenir(c, 'sm', 'inter-x-i1');
    const k = await ev(() => document.querySelector('input[data-releve]').dataset.releve);
    const coller = async val => { await ev(([k, val]) => { const e = document.querySelector(`input[data-releve="${k}"]`); e.focus(); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }, [k, val]); await L.calme(p, 120); return ev(k => ({ champ: document.querySelector(`input[data-releve="${k}"]`).value, fiche: fiche('i1').releves[k] }), k); };
    let r = await coller('3 sur 18'); console.log('  · collage « 3 sur 18 » →', JSON.stringify(r));
    v('D (doute) un collage « 3 sur 18 » ne devient pas « 318 »', r.champ !== '318', r);
    r = await coller('10-12'); console.log('  · collage « 10-12 » →', JSON.stringify(r));
    v('D (doute) « 10-12 » ne devient pas « 1012 »', r.champ !== '1012', r);
    r = await coller('2,4 kg'); v('D « 2,4 kg » (unité tapée) devient « 2,4 »', r.champ === '2,4', r);
    r = await coller('  '); v('D des espaces seuls laissent un champ vide', r.champ === '', r);
    r = await coller(''); v('D effacer le champ le laisse vide (sans message)', r.champ === '' && r.fiche === '', r);
    const clav = await ev(() => document.querySelector('input[data-releve]').getAttribute('inputmode')); console.log('  · clavier du relevé :', clav);
    v('D (doute) clavier « decimal » : sur iPhone il n’a pas de touche « − » : une température négative ne se tape pas', clav !== 'decimal', clav);
    // autres métiers : chaque relevé numérique, valeur valide gardée, mot refusé ; chaque relevé en mots libre
    const bilan = await ev(() => { const out = []; for (const m of Object.keys(RELEVES)) for (const [l, ex] of RELEVES[m]) out.push([m, l, ex, /^\d+([.,]\d+)?$/.test(ex)]); return out; });
    console.log('  · relevés de tous les métiers :', JSON.stringify(bilan.map(b => b[0] + ':' + b[1] + (b[3] ? '#' : ''))));
    for (const [m, l, ex, num] of bilan) {
      await ev(([m]) => { const F = fiche('i1'); F.metier = m; rendre(); }, [m]); await L.calme(p, 200);
      const x = await ev(async ([l]) => { const e = document.querySelector(`input[data-releve="${l}"]`); if (!e) return null; e.value = 'zz'; e.dispatchEvent(new Event('input', { bubbles: true })); return e.value; }, [l]);
      v(`D ${m} · ${l} (exemple « ${ex} ») : ${num ? 'un mot est refusé' : 'un mot est gardé'}`, x !== null && (num ? x === '' : x === 'zz'), x);
    }
    await ev(() => { const F = fiche('i1'); F.metier = 'clim'; rendre(); });
    // la valeur rangée est celle du compte rendu du client
    await ev(([k]) => { const e = document.querySelector(`input[data-releve="${k}"]`); e.value = '2,4'; e.dispatchEvent(new Event('input', { bubbles: true })); }, [k]);
    await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i1'; modeClient = 'pdf'; rendre(); }); const t = await txt('.pdf');
    v('D le PDF du client écrit le relevé « 2,4 »', /2,4/.test(t), (t.match(/.{0,40}2,4.{0,20}/) || [''])[0]);
  });

  await sec('E prix d’une ligne de facture', async () => {
    await I.devenir(c, 'marc', 'interventions'); await ev(() => { try { fermerPanneau(); } catch (e) {} }); await L.aller(p, 'inter-x-i6');
    const fid = await ev(() => { let f = FACTURES.find(x => x.int === 'i6'); if (!f) { try { ACTIONS.prepFacture({ dataset: { id: 'i6' } }); } catch (e) {} f = FACTURES.find(x => x.int === 'i6'); } return f ? f.id : null; });
    v('E population : une facture modifiable', !!fid, fid); if (!fid) return;
    await L.aller(p, 'facture-x-' + fid);
    const ch = await ev(() => [...document.querySelectorAll('#contenu input')].map(e => ({ d: Object.keys(e.dataset).join(','), v: e.value, ph: e.placeholder })));
    console.log('  · champs de la facture :', JSON.stringify(ch.slice(0, 14)));
    const FID = fid; await ev(f => { window.FID = f; }, fid);
    const prix = async (n, val) => { await ev(([n, val]) => { const e = document.querySelectorAll('input[data-prix]')[n]; e.focus(); e.value = val; e.dispatchEvent(new Event('change', { bubbles: true })); }, [n, val]); await L.calme(p, 250); return ev(n => ({ pu: FACTURES.find(f => f.id === window.FID).lignes[n].pu, champ: (document.querySelectorAll('input[data-prix]')[n] || {}).value }), n); };
    let r = await prix(0, '-5'); console.log('  · prix « -5 » →', JSON.stringify(r)); v('E (doute) un prix négatif est refusé ou borné (on n’invente pas un avoir par un prix)', r.pu === null || r.pu >= 0 || /avoir/.test(await txt()), r);
    r = await prix(0, 'abc'); console.log('  · prix « abc » →', JSON.stringify(r)); v('E un prix « abc » ne laisse pas NaN', !Number.isNaN(r.pu), r);
    r = await prix(0, '999999,99'); v('E 999 999,99 accepté', r.pu === 999999.99, r);
    const qte = async (n, val) => { await ev(([n, val]) => { const e = document.querySelectorAll('input[data-fqte]')[n]; e.focus(); e.value = val; e.dispatchEvent(new Event('change', { bubbles: true })); }, [n, val]); await L.calme(p, 250); };
    await qte(0, '9999'); await prix(0, '999999,99');
    const ttc = await ev(() => FACTURES.find(x => x.id === window.FID).lignes.map(l => [l.q, l.pu]));
    const t = await txt(); const tot = (t.match(/Total TTC\s*([^\n]*)/) || ['', '?'])[1];
    console.log('  · quantités 9999 × 999 999,99 →', JSON.stringify(ttc), 'Total TTC', tot);
    v('E (doute) une ligne à 9999 × 999 999,99 ne produit pas un total de milliards', !/\d{1,3}(?:[\s ]\d{3}){3}/.test(tot), tot);
    const e = await L.etat(p); v('E aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2));
    await L.capture(c, CAPN('e1-facture'));
  });

  await sec('F mise en page : filtre, fiche terminée, aide', async () => {
    const tailles = profil === 'mac' ? [[1101, 800], [1180, 800], [1280, 720], [1100, 800]] : [[c.largeur, c.hauteur]];
    for (const [w, h] of tailles) {
      if (profil === 'mac') { await p.setViewportSize({ width: w, height: h }); await L.calme(p, 600); }
      await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="tout"]'); await L.calme(p, 300);
      const m = await ev(() => { const seg = document.querySelector('.seg [data-filtreint]').closest('.seg'), W = document.documentElement.clientWidth, bs = [...seg.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height) }; }); const lignes = new Set(bs.map(b => Math.round(seg.getBoundingClientRect().top + 0) && bs.indexOf(b) >= 0 ? b.h : 0)).size;
        return { W, n: bs.length, sw: seg.scrollWidth, cw: seg.clientWidth, hors: bs.filter(b => b.g < 0 || b.d > W + 1), hs: [...new Set(bs.map(b => b.h))], segH: Math.round(seg.getBoundingClientRect().height), seul: bs.every(b => b.t.length > 0) }; });
      v(`F filtre à ${w} px : cinq boutons, aucun hors de l’écran, pas de défilement latéral`, m.n === 5 && m.hors.length === 0 && m.sw <= m.cw + 1, m);
      const boutonsHauts = await ev(() => [...document.querySelectorAll('.seg [data-filtreint]')].map(b => Math.round(b.getBoundingClientRect().height)));
      v(`F filtre à ${w} px : chaque bouton fait au moins 38 px de haut (au doigt, 44)`, boutonsHauts.every(x => x >= 38), boutonsHauts);
      // fiche terminée : les trois cartes
      await I.devenir(c, 'marc', 'inter-x-i21'); const cartes = await ev(() => { const fc = [...document.querySelectorAll('.fin-c')]; const W = document.documentElement.clientWidth; return { n: fc.length, W, h: fc.map(e => Math.round(e.getBoundingClientRect().height)), l: fc.map(e => Math.round(e.getBoundingClientRect().width)), hors: fc.filter(e => e.getBoundingClientRect().right > W + 1).length, deb: document.documentElement.scrollWidth > W + 1 }; });
      v(`F fiche terminée à ${w} px : trois cartes, aucune hors de l’écran, pas de débordement`, cartes.n === 3 && cartes.hors === 0 && !cartes.deb, cartes);
      await voir('.fin-c', 'f1-fiche-terminee-' + w);
      // débordement du texte : une carte étroite ne coupe pas ses mots
      const coupes = await ev(() => [...document.querySelectorAll('.fin-c *')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').map(e => e.innerText.slice(0, 30)));
      v(`F fiche terminée à ${w} px : aucun texte coupé dans les trois cartes`, coupes.length === 0, coupes);
    }
    if (profil === 'mac') { await p.setViewportSize({ width: 1440, height: 900 }); }
    // fenêtre de création : l'aide, et la zone qui répond au toucher sur « Mon entreprise »
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="md"]'); await L.calme(p, 400);
    const aide = await ev(() => { const a = document.querySelector('#fenetre .crea-aide'); if (!a) return null; const l = a.querySelector('.lien'); a.scrollIntoView({ block: 'center' }); const r = l ? l.getBoundingClientRect() : null; let n = 0; if (r) { const x = r.left + r.width / 2; for (let y = Math.floor(r.top) - 30; y <= Math.ceil(r.bottom) + 30; y++) { const e = document.elementFromPoint(x, y); if (e === l || (e && l.contains(e))) n++; } } return { haut: r && Math.round(r.height), repond: n, texte: a.innerText.slice(0, 160), disp: l && getComputedStyle(l).display }; });
    console.log('  · aide de création :', JSON.stringify(aide));
    v('F population : l’aide de la fenêtre de création et son lien existent', !!aide && aide.haut > 0, aide);
    if (aide) { const tactile = ['iphone', 'android', 'petit', 'ipad'].includes(profil); if (tactile) v('F (doute) le lien « Mon entreprise » : la zone qui répond au doigt est d’au moins 44 px de haut', aide.repond >= 43, aide); else console.log('  · souris : zone', aide.repond); }
    await L.capture(c, CAPN('f2-aide-creation'));
    await ev(() => { try { document.querySelector('#fenetre [data-action="cFermer"]').click(); } catch (e) {} });
  });

  const dl = await L.deborde(c); v('aucun débordement de la page', !dl || (dl.un === undefined ? true : !dl.un), dl);
  console.log('  · erreurs de page :', c.err.length, JSON.stringify(c.err.slice(0, 3)));
  v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde meurt :', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
