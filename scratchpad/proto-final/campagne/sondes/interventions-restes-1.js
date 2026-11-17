// RESTES « Interventions », tour 1 (17 novembre 2026) : ce que le recontrôle adverse avait laissé ouvert et les décisions du chef de chantier.
//   A  garantie : ni « Paiement sur place » ni « la facture lui sera envoyée », avant comme après « Terminer », chez la technicienne ET au bureau
//   B  « Entretien annuel » n'est cochée d'office qu'après un Entretien / une Mise en service / une Installation ; « Un autre passage est nécessaire » pour TOUS les clients
//   C  le filtre « Toutes » de la liste se voit sans défiler (tous les appareils) ; « Date à fixer » en gras au téléphone
//   D  44 px au doigt : « Voir dans Tâches › » et la case « Seulement les techniciens du secteur »
//   E  un relevé en nombre n'accepte que des chiffres et une virgule
//   F  un téléphone accepte « poste 12 », refuse plus de 20 chiffres ; un prix de ligne de facture a le plafond du forfait de création
//   G  « Ma journée » et la fiche du technicien : aucune note « ton compte ne peut pas créer »
// usage : node interventions-restes-1.js <profil> [nuit] [filtre de sections]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
// CONTRE=garantie|entretien|filtre|releve|tel|prix remet UN défaut ; le contrôle qui le garde doit alors tomber.
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', filtre = process.argv[4] ? new RegExp(process.argv[4]) : null;
  const tel = ['iphone', 'android', 'petit'].includes(profil);
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = async z => (await I.texte(p, z)).replace(/[\u00a0\u202f]/g, ' '); const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `restes1-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const sec = async (nom, f) => { if (filtre && !filtre.test(nom)) return; console.log('\n── ' + nom); try { await f(); } catch (e) { v(nom + ' : la section ne plante pas', false, String(e.message).slice(0, 240)); } };
  const MOTS_FAUX = /Paiement sur place|Payé en totalité|Acompte versé|Pas encore payé|la facture lui sera envoyée|la facture partira/i;
  if (process.env.CONTRE) { const k = process.env.CONTRE; console.log('  · CONTRE-ÉPREUVE :', k);
    if (k === 'garantie') await p.evaluate(() => { window.enGarantie = () => false; });
    if (k === 'entretien') await p.evaluate(() => { SUITE_ENTRETIEN.push('Dépannage'); });
    if (k === 'filtre') await p.addStyleTag({ content: '.seg:has([data-filtreint]){flex-wrap:nowrap!important;overflow-x:auto!important}.seg:has([data-filtreint]) button{flex:0 0 auto!important}' });
    if (k === 'tel') await p.evaluate(() => { window.cfTelOk = () => true; });
  }

  await sec('A garantie sans bloc de paiement', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="hp"]'); await tap('#fenetre [data-cfact="garantie"]');
    await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
    const g = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; i.tech = 'sm'; i.d = AUJ; i.st = 'planifiee'; const F = fiche(i.id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Remplacement du joint sous garantie constructeur.'; F.signature = 'signee'; return { id: i.id, mode: i.fact && i.fact.mode, suite: F.suite }; });
    v('A population : l’intervention créée est en garantie', g.mode === 'garantie', g);
    // la technicienne, AVANT « Terminer »
    await I.devenir(c, 'sm', 'inter-x-' + g.id); let t = await txt();
    v('A avant Terminer : la technicienne lit « Garantie : rien à encaisser, aucune facture »', /Garantie : rien à encaisser, aucune facture/.test(t), (t.match(/Paiement[\s\S]{0,160}/) || [''])[0]);
    v('A avant Terminer : ni « Payé en totalité », ni « Acompte versé », ni « la facture lui sera envoyée »', !MOTS_FAUX.test(t), (t.match(MOTS_FAUX) || [''])[0]);
    v('A avant Terminer : plus de choix de paiement (aucun bouton radio « paie »)', (await p.locator('input[name="paie"]').count()) === 0);
    await L.capture(c, CAPN('a1-garantie-avant'));
    await tap('[data-action="terminer"]'); await L.calme(p, 500); t = await txt();
    v('A après Terminer : la fiche dit « Garantie : rien à encaisser, aucune facture » et « Sans facture »', /Garantie : rien à encaisser, aucune facture/.test(t) && /Sans facture/.test(t), (t.match(/Facturation[\s\S]{0,200}/) || [''])[0]);
    v('A après Terminer : ni « Paiement sur place » ni « Pas encore payé » ni « la facture lui sera envoyée »', !MOTS_FAUX.test(t), (t.match(MOTS_FAUX) || [''])[0]);
    await L.capture(c, CAPN('a2-garantie-apres-tech'));
    // le bureau relit la même fiche
    await I.devenir(c, 'marc', 'inter-x-' + g.id); t = await txt();
    v('A le bureau : même fiche, mêmes mots', /Garantie : rien à encaisser, aucune facture/.test(t) && !MOTS_FAUX.test(t), (t.match(MOTS_FAUX) || [''])[0] || (t.match(/Facturation[\s\S]{0,160}/) || [''])[0]);
    await L.capture(c, CAPN('a3-garantie-apres-bureau'));
    // contre-population : une intervention NON garantie garde son bloc de paiement
    await I.devenir(c, 'tl', 'inter-x-i7'); t = await txt(); v('A contre-épreuve : une intervention normale garde « Paiement sur place »', /paiement sur place/i.test(t) && !/Garantie : rien à encaisser/.test(t));
  });

  await sec('B autre passage pour tous, entretien jamais d’office après un dépannage', async () => {
    const lire = async id => { await I.devenir(c, await ev(i => INTS.find(o => o.id === i).tech, id), 'inter-x-' + id); return ev(() => ({ ent: (document.querySelector('input[data-suite="entretien"]') || {}).checked, autre: !!document.querySelector('input[data-suite="ventilo"]'), libelle: ((document.querySelector('input[data-suite="ventilo"]') || {}).closest && document.querySelector('input[data-suite="ventilo"]').closest('label').innerText.replace(/\s+/g, ' ')) || null })); };
    // population : des clients et des types différents
    const types = await ev(() => ['i1', 'i2', 'i4', 'i7', 'i9', 'i12'].map(id => { const i = INTS.find(o => o.id === id); return id + ':' + i.cli + ':' + i.type; })); console.log('  · population :', types.join(' · '));
    const dep = await lire('i9');   // Dépannage — fuite d’eau, client « cp » (pas le Vieux Port)
    v('B dépannage chez un autre client que le Vieux Port : « Entretien annuel » PAS cochée d’office', dep.ent === false, dep);
    v('B …et la case « Un autre passage est nécessaire » est proposée (client hors Vieux Port)', dep.autre && /Un autre passage est nécessaire/.test(dep.libelle || '') && /le bureau prépare le devis/.test(dep.libelle || ''), dep);
    const d1 = await lire('i1'); v('B le dépannage du Vieux Port (i1) : entretien pas cochée non plus, autre passage cochée', d1.ent === false && d1.autre, d1);
    const d7 = await lire('i7'); v('B dépannage i7 (client cp) : entretien pas cochée', d7.ent === false && d7.autre, d7);
    const e12 = await lire('i12'); v('B un ENTRETIEN (i12) : « Entretien annuel » cochée d’office', e12.ent === true && e12.autre, e12);
    const m2 = await lire('i2'); v('B une MISE EN SERVICE (i2) : « Entretien annuel » cochée d’office', m2.ent === true, m2);
    const i8 = await ev(() => { const i = INTS.find(o => o.id === 'i8'); return fiche('i8').suite.entretien === true && i.type; }); v('B une INSTALLATION (i8) : « Entretien annuel » cochée d’office', i8 === 'Installation', i8);
    const gar = await ev(() => { const i = INTS.find(o => o.id === 'i7'); const sauve = i.fact; i.fact = { mode:'garantie' }; delete FICHES.i7; const r = fiche('i7').suite.entretien; i.fact = sauve; delete FICHES.i7; return r; });
    v('B une intervention en garantie (type Dépannage) ne propose pas l’entretien d’office', gar === false, gar);
    // parcours : on coche « un autre passage » sur i9, on termine, le bureau voit une intervention « à planifier » et le client sa phrase
    await I.devenir(c, 'sm', 'inter-x-i9'); await ev(() => { const F = fiche('i9'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fuite réparée. Il faut revenir changer le ballon.'; F.signature = 'signee'; });
    await tap('input[data-suite="ventilo"]'); const co = await ev(() => fiche('i9').suite); v('B la case se coche', co.ventilo === true && !co.entretien, co);
    await L.capture(c, CAPN('b1-case-autre-passage'));
    await tap('[data-action="terminer"]'); await L.calme(p, 500); let t = await txt();
    const n = await ev(() => ({ ven: INTS.find(o => o.id === 'n-ven-i9'), ent: INTS.find(o => o.id === 'n-ent-i9') }));
    v('B Terminer : une intervention « à planifier » est créée pour un autre passage, titre générique', !!n.ven && n.ven.st === 'aplanifier' && /Un autre passage/.test(n.ven.titre) && !/ventilateur/i.test(n.ven.titre), n.ven);
    v('B …et aucun entretien annuel n’est posé après ce dépannage', !n.ent, n.ent);
    v('B la fiche terminée : « Suites à donner » dit « Un autre passage » et pas « ventilateur »', /Un autre passage/.test(t) && !/Remplacer le ventilateur/.test(t), (t.match(/Suites à donner[\s\S]{0,200}/) || [''])[0]);
    await L.capture(c, CAPN('b2-fiche-terminee'));
    await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i9'; modeClient = 'web'; rendre(); }); t = await txt('#contenu .client-web');
    const suite = x => (x.match(/La suite[\s\S]{0,170}?(?=\n(FACTURE|Facture|Le technicien|Le client)|$)/i) || [''])[0];
    v('B le client lit « Un autre passage est nécessaire » dans « La suite » (pas « ventilateur »)', /Un autre passage est nécessaire/.test(suite(t)) && !/ventilateur/i.test(suite(t)), suite(t));
    await ev(() => { modeClient = 'pdf'; rendre(); }); t = await txt('.pdf');
    v('B le PDF : « Un autre passage est nécessaire : un devis vous est envoyé. » dans « La suite », pas de « ventilateur »', /Un autre passage est nécessaire : un devis vous est envoyé/.test(suite(t)) && !/ventilateur/i.test(suite(t)), suite(t) || t.slice(-300));
    await L.capture(c, CAPN('b3-client'));
    // l'histoire du Vieux Port (i1) reste intacte
    await ev(() => { voirInt = 'i1'; modeClient = 'web'; rendre(); }); t = await txt('#contenu .client-web'); v('B la démonstration du Vieux Port (i1) garde son devis « Remplacer le ventilateur »', /Remplacer le ventilateur/.test(t) || (await ev(() => INTS.find(o => o.id === 'i1').st)) !== 'fait', t.slice(0, 80));
  });

  await sec('C filtre visible, date à fixer', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="auj"]'); await L.calme(p, 300);
    const m = await ev(() => { const seg = document.querySelector('.seg [data-filtreint]').closest('.seg'), W = innerWidth, bs = [...seg.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height) }; });
      return { n: bs.length, W, seg: { sw: seg.scrollWidth, cw: seg.clientWidth, ov: getComputedStyle(seg).overflowX }, hors: bs.filter(b => b.g < 0 || b.d > W + 1), bs }; });
    console.log('  · filtre :', JSON.stringify({ n: m.n, W: m.W, seg: m.seg, hors: m.hors }));
    v('C population : cinq filtres', m.n === 5, m.n);
    v('C aucun filtre ne sort de l’écran (largeur du profil ' + m.W + ' px)', m.hors.length === 0, m.hors);
    v('C le filtre ne défile pas de côté (rien de caché derrière le bord)', m.seg.sw <= m.seg.cw + 1, m.seg);
    const tousVus = await ev(() => { const b = [...document.querySelectorAll('[data-filtreint]')].find(x => x.dataset.filtreint === 'tout'); const r = b.getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height), W: innerWidth, haut: Math.round(r.top) }; });
    v('C « Toutes » est visible sans rien faire défiler (entre 0 et la largeur)', tousVus.g >= 0 && tousVus.d <= tousVus.W + 1 && tousVus.h >= 36, tousVus);
    await L.capture(c, CAPN('c1-filtre'));
    await tap('[data-filtreint="plan"]'); await L.calme(p, 300); const d = await ev(() => ({ vis: getComputedStyle(document.querySelector('.liste-tel')).display !== 'none', lignes: [...document.querySelectorAll('.liste-tel .jl-h')].map(e => e.innerText.trim()), tiret: [...document.querySelectorAll('.liste-tel .jl-h')].some(e => e.innerText.trim() === '—') }));
    if (d.vis) { v('C au téléphone, « À planifier » : « Date à fixer » en gras, jamais un tiret', d.lignes.length > 0 && d.lignes.every(x => /^Date à fixer$/.test(x) || /^\d\d:\d\d$/.test(x)) && d.lignes.some(x => x === 'Date à fixer') && !d.tiret, d);
      const fort = await ev(() => { const e = [...document.querySelectorAll('.liste-tel .jl-h')].find(x => x.innerText.trim() === 'Date à fixer'); return e ? { tag: e.tagName, poids: getComputedStyle(e).fontWeight, haut: e.getBoundingClientRect().height, coupe: e.scrollWidth > e.clientWidth + 1 } : null; }); v('C …en gras et sans coupure', !!fort && fort.tag === 'B' && +fort.poids >= 600 && !fort.coupe, fort);
      await L.capture(c, CAPN('c2-a-planifier')); }
    else console.log('  · liste tableau (bureau) : « Date à fixer » déjà en gras dans le tableau');
    const tab = await ev(() => [...document.querySelectorAll('.liste-bureau tbody tr td:first-child')].map(x => x.innerText.trim())); if (!d.vis) v('C tableau du bureau : « Date à fixer »', tab.length > 0 && tab.every(x => /^Date à fixer$/.test(x)), tab);
  });

  await sec('D cibles de 44 px', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="auj"]');
    const ouvert = await ev(() => { const d = document.querySelector('#contenu details.t-ici'); if (!d) return null; d.open = true; return true; }); await L.calme(p, 300);
    if (ouvert) { const zr = await ev(() => { const a = document.querySelector('.t-ici-tout'); a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(), x = r.left + Math.min(40, r.width / 2); let n = 0; for (let y = Math.floor(r.top) - 20; y <= Math.ceil(r.bottom) + 20; y++) { const e = document.elementFromPoint(x, y); if (e === a || (e && a.contains(e))) n++; } return { rect: Math.round(r.height), repond: n }; });
      v('D « Voir dans Tâches › » répond sur 44 px de haut au moins', zr.repond >= 43, zr); await L.capture(c, CAPN('d1-voir-taches')); }
    else console.log('  · pas de bandeau de tâches pour ce profil');
    // la case « seulement les techniciens du secteur » (client dans un secteur, vue « jour » de la création)
    await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="md"]'); await L.calme(p, 400);
    const cs = await ev(() => { const k = document.querySelector('#fenetre [data-csect="1"]'); if (!k) return null; const l = k.closest('label'); l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect(), x = r.left + Math.min(60, r.width / 2); let n = 0; for (let y = Math.floor(r.top) - 20; y <= Math.ceil(r.bottom) + 20; y++) { const e = document.elementFromPoint(x, y); if (e === l || (e && l.contains(e))) n++; } return { rect: Math.round(r.height), repond: n }; });
    v('D population : la case « Seulement les techniciens du secteur » existe pour ce client', !!cs, cs);
    if (cs) v('D elle répond sur 44 px de haut au moins', cs.repond >= 43, cs);
    await L.capture(c, CAPN('d2-case-secteur')); await ev(() => { try { document.querySelector('#fenetre [data-action="cFermer"]').click(); } catch (e) {} });
  });

  await sec('E relevé en nombre', async () => {
    await I.devenir(c, 'sm', 'inter-x-i1');
    const champs = await ev(() => [...document.querySelectorAll('input[data-releve]')].map(e => e.dataset.releve)); console.log('  · relevés :', champs.join(' · '));
    v('E population : trois relevés', champs.length === 3, champs);
    const poser = async (k, val) => { await p.fill(`input[data-releve="${k}"]`, ''); await p.type(`input[data-releve="${k}"]`, val, { delay: 5 }); await L.calme(p, 150); return ev(k => ({ champ: document.querySelector(`input[data-releve="${k}"]`).value, fiche: fiche('i1').releves[k] }), k); };
    const k = champs[0]; let r = await poser(k, 'abc'); v('E « abc » : le champ reste vide, rien n’est rangé', r.champ === '' && (r.fiche === '' ), r);
    const e = await L.etat(p); v('E …et l’écran dit ce qu’il attend', /nombre/i.test(e.toast || ''), e.toast);
    r = await poser(k, '2,4'); v('E « 2,4 » est gardé', r.champ === '2,4' && r.fiche === '2,4', r);
    r = await poser(k, '12x3'); v('E « 12x3 » devient « 123 »', r.champ === '123' && r.fiche === '123', r);
    r = await poser(k, '1,2,3'); v('E « 1,2,3 » devient « 1,23 » (une seule virgule)', r.champ === '1,23', r);
    r = await poser(k, '-5'); v('E « -5 » (température négative) est gardé', r.champ === '-5', r);
    r = await poser(k, '2.4'); v('E « 2.4 » (point) est gardé', r.champ === '2.4', r);
    r = await poser(k, '2,4'); await L.capture(c, CAPN('e1-releves'));
    // un relevé qui n'est pas un nombre (nuisibles : « Infestation » = un mot) reste libre
    const libre = await ev(() => { const F = fiche('i1'); const m0 = F.metier; F.metier = 'nuis'; rendre(); const el = document.querySelector('input[data-releve="Infestation"]'); const r = !!el; F.metier = m0; rendre(); return r; });
    console.log('  · relevé en mots (nuisibles) présent :', libre);
    if (libre) { await ev(() => { const F = fiche('i1'); F.metier = 'nuis'; rendre(); }); await p.fill('input[data-releve="Infestation"]', 'faible'); await L.calme(p, 150); const w = await ev(() => document.querySelector('input[data-releve="Infestation"]').value); v('E un relevé en mots (« Infestation ») accepte des mots', w === 'faible', w); await ev(() => { const F = fiche('i1'); F.metier = 'clim'; rendre(); }); }
  });

  await sec('F téléphone et prix', async () => {
    const T = await ev(() => ({ ok: ['05 46 00 00 00 poste 12', '05 46 00 00 00 p. 12', '05.46.00.00.00 ext. 345', '+33 5 46 00 00 00', '05 46 12 12 12 / 06 12 34 56 78', '12345678901234567890', ''].map(x => [x, cfTelOk(x)]), ko: ['123456789012345678901', '05 46 00 00 00 poste', 'abc', '05 46 poste 12', '12', '05 46 00 00 00 poste 1234567'].map(x => [x, cfTelOk(x)]),
      lien: ['05 46 00 00 00 poste 12', '05 46 12 12 12 / 06 12 34 56 78', '05 46 12 12 12'].map(x => lienTel(x)) }));
    console.log('  · téléphones :', JSON.stringify(T));
    v('F population : sept numéros valides, six refusés', T.ok.length === 7 && T.ko.length === 6);
    v('F valides : « poste 12 », « p. 12 », « ext. 345 », « +33… », deux numéros, vingt chiffres, vide', T.ok.every(x => x[1]), T.ok.filter(x => !x[1]));
    v('F refusés : 21 chiffres, « poste » seul, des lettres, trop court, poste de 7 chiffres', T.ko.every(x => !x[1]), T.ko.filter(x => x[1]));
    v('F le lien « Appeler » compose le numéro seul (ni le poste ni le second numéro collés)', T.lien[0] === 'tel:0546000000' && T.lien[1] === 'tel:0546121212' && T.lien[2] === 'tel:0546121212', T.lien);
    // le même contrôle par l'écran : création d'un nouveau client
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-cnouveau="1"]'); const nv = await ev(() => !!document.querySelector('#fenetre [data-cnv="tel"]')); v('F population : le champ téléphone du nouveau client existe', nv);
    const essaiTel = async tel => { for (const [k, x] of Object.entries({ nom: 'Boulangerie Poste', tel, mail: '', adr: '5 rue Gambetta, 17440 Aytré' })) { await p.fill(`#fenetre [data-cnv="${k}"]`, x); await p.dispatchEvent(`#fenetre [data-cnv="${k}"]`, 'change').catch(() => {}); } await tap('#fenetre [data-action="cPlusTard"]'); const av = await ev(() => Object.keys(CLIENTS).length); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 400); const e = await L.etat(p); const ap = await ev(() => Object.keys(CLIENTS).length); return { cree: /Intervention créée/.test(e.toast || '') && ap >= av, toast: e.toast }; };
    let rt = await essaiTel('05 46 00 00 00 poste 12 poste'); v('F à l’écran : « 05 46 00 00 00 poste » (poste sans numéro) refusé, avec la phrase qui explique « poste 12 » et « 20 chiffres »', !rt.cree && /poste 12/.test(rt.toast || '') && /20 chiffres/.test(rt.toast || ''), rt);
    rt = await essaiTel('123456789012345678901'); v('F à l’écran : 21 chiffres refusés', !rt.cree, rt);
    rt = await essaiTel('05 46 00 00 00 poste 12'); v('F à l’écran : « 05 46 00 00 00 poste 12 » accepté, le client est créé', rt.cree, rt);
    // le prix d'une ligne de facture
    await I.devenir(c, 'marc', 'interventions'); await ev(() => { try { fermerPanneau(); } catch (e) {} });
    await L.aller(p, 'inter-x-i6');
    const fid = await ev(() => { const i = INTS.find(o => o.id === 'i6'); let f = FACTURES.find(x => x.int === 'i6'); if (!f) { try { ACTIONS.prepFacture({ dataset: { id: 'i6' } }); } catch (e) {} f = FACTURES.find(x => x.int === 'i6'); } return f ? f.id : null; });
    v('F population : une facture préparée pour la ligne de prix', !!fid, fid);
    if (fid) { await L.aller(p, 'facture-x-' + fid); const n0 = await ev(() => document.querySelectorAll('[data-prix]').length); v('F population : des lignes de prix à saisir', n0 >= 1, n0);
      const poser = async (val) => { await p.fill('[data-prix="0"]', val); await p.dispatchEvent('[data-prix="0"]', 'change'); await L.calme(p, 400); return ev(() => ({ pu: FACTURES.find(x => x.id === document.querySelector('[data-prix="0"]').dataset.id).lignes[0].pu, champ: document.querySelector('[data-prix="0"]').value })); };
      let r = await poser('35,5'); v('F prix « 35,5 » accepté', r.pu === 35.5, r);
      r = await poser('9999999999'); const e = await L.etat(p); v('F prix « 9999999999 » refusé : le précédent est conservé', r.pu === 35.5, r);
      v('F …et le champ revient au précédent (pas de valeur fantôme)', /^35[,.]5/.test(r.champ), r);
      v('F …et l’écran dit pourquoi', /trop grand/i.test(e.toast || ''), e.toast);
      r = await poser('1000000'); v('F prix « 1 000 000 » refusé comme au forfait de création (strictement inférieur)', r.pu === 35.5, r);
      r = await poser('999999,99'); v('F prix « 999 999,99 » accepté', Math.abs(r.pu - 999999.99) < 0.001, r);
      r = await poser('35,5'); }
  });

  await sec('G aucune note « ton compte ne peut pas créer » sur le terrain', async () => {
    for (const q of ['sm', 'tl']) { await I.devenir(c, q, 'majournee'); let t = await txt(); v(`G Ma journée (${q}) : pas de « ton compte ne peut pas »`, !/ton compte ne peut pas/.test(t), (t.match(/.{0,40}ton compte ne peut.{0,80}/) || [''])[0]);
      await I.devenir(c, q, 'inter-x-i7'); t = await txt(); v(`G fiche d’intervention (${q}) : pas de « ton compte ne peut pas »`, !/ton compte ne peut pas/.test(t) && !/Pour changer ça, demande à/.test(t), (t.match(/.{0,40}ton compte ne peut.{0,80}/) || [''])[0]); }
  });

  const dl = await L.deborde(c); v('aucun débordement de la page', !dl || (dl.un === undefined ? true : !dl.un), dl);
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });
