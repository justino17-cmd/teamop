// RECONTRÔLE ADVERSE des restes de la sécurité, tour 3 (18 novembre 2026) : ce que les plafonds posés sur le contact, l'adresse, les consignes d'accès,
// l'e-mail et le téléphone d'un client (21 champs, cinq formulaires) et la coupe sans moitié d'émoji (coupeSure) ont pu casser À CÔTÉ.
//   A. FRAPPE RÉELLE (clavier, 300 signes) dans chacun des cinq formulaires qui écrivent un client : le champ s'arrête à son plafond et cliNet garde TOUT ce qui a été tapé ;
//      la fiche client, elle, est enregistrée par la vraie fonction (clientEnregistrer) et relue ;
//   B. VOISINS DE LA MISE EN PAGE : ces valeurs, désormais tapables (adresse de 160 signes, e-mail de 120 SANS espace, accès de 200, contact de 120), rendues dans 13 écrans :
//      rien ne déborde de la largeur du profil, aucun texte écrasé ;
//   C. VOISINS DE coupeSure : libelleSur à chaque plafond du fichier (40, 60, 80, 120), entrées étranges (null, nombre, vide), moitié orpheline déjà présente dans le texte, texte tout juste de la longueur ;
//   D. NOUVEAUX : les autres champs dont la valeur est coupée EN SILENCE faute de plafond (même défaut que celui qu'on vient de corriger) — mesuré sur le source puis par la frappe réelle ;
//      les clients que le cadre Documents envoie (adresse + code postal + ville au-delà de 160) ; la coupe à l'AFFICHAGE d'un titre (« prochain passage ») au milieu d'un émoji.
// Population comptée à chaque contrôle. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Captures hors dépôt : cap/rec-secu3/.
const L = require('../lib.js'), fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../../../apercu/prototype-op-gestion.html'), 'utf8');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rec-secu3/';
const PLAFONDS = { nom: 120, contact: 120, tel: 60, mail: 120, adr: 160, acces: 200 };
const fixe = (t, n) => { t = t.slice(0, n); return /\s$/.test(t) ? t.slice(0, -1) + 'z' : t; };
const ADR160 = fixe('12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur'.padEnd(160, ' x'), 160);
const MAIL120 = ('responsable.achats.et.comptabilite.syndic.copropriete.jardins@' + 'x'.repeat(120)).slice(0, 113) + '.fr.com'.slice(0, 7);
const MAIL_SANS_ESPACE = 'prenom.nom.service.comptabilite.fournisseurs.syndic.copropriete@' + 'residence-les-jardins-du-port-de-rochefort-sur-mer.example.fr';
const CONTACT120 = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix'.slice(0, 120);
const ACCES200 = 'Sonner à l’interphone « Jardins », code du portail 4821B puis 1357, passer par la cour arrière, le local technique est à gauche derrière les vélos, prévenir la gardienne Mme Pereira au 06 12 34 56 78 avant d’entrer'.slice(0, 200).replace(/\s$/, 'z');
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const profils = process.env.PROFILS ? JSON.parse(process.env.PROFILS) : [['petit', false], ['iphone', true], ['ipad', false]];

  // ───────────────────────── A. frappe réelle, cinq formulaires ─────────────────────────
  {
    const c = await L.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const taper = async (sel, ch) => { const e = await p.$(sel); if (!e) return null; await e.scrollIntoViewIfNeeded().catch(() => {}); await e.focus(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.insertText(ch.repeat(300)); return p.evaluate(s => document.querySelector(s).value.length, sel); };
    // [nom du formulaire, comment l'ouvrir, [[sélecteur, plafond]]]
    const FORMS = [
      ['la fiche client (data-ci)', async () => { await p.evaluate(async () => { const k = Object.keys(CLIENTS)[0]; aller('client-x-' + k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }); },
        [['[data-ci="contact"]', 120], ['[data-ci="tel"]', 60], ['[data-ci="mail"]', 120], ['[data-ci="adr"]', 160], ['[data-ci="acces"]', 200]]],
      ['le devis (dvn-), nouveau client', async () => { await p.evaluate(() => { DVN_F = null; dvNouveau(); }); await L.calme(p, 500); await p.evaluate(() => { document.querySelector('#calque [data-dvn="nv|1"]').click(); }); await L.calme(p, 500); },
        [['#dvn-nom', 120], ['#dvn-prenom', 120], ['#dvn-tel', 60], ['#dvn-mail', 120], ['#dvn-adr', 160]]],
      ['la création d’intervention (data-cnv), nouveau client', async () => { await p.evaluate(() => { ouvrirCreation({}); CREA.nouveau = true; if (['devis', 'contrat'].includes(CREA.fact)) CREA.fact = 'temps'; rendreCreation(); }); await L.calme(p, 700); },
        [['[data-cnv="nom"]', 120], ['[data-cnv="contact"]', 120], ['[data-cnv="tel"]', 60], ['[data-cnv="mail"]', 120], ['[data-cnv="adr"]', 160]]],
      ['« Nouveau client » (cs-)', async () => { await p.evaluate(() => { fermerPanneau && fermerPanneau(); ACTIONS.clientSeul(); }); await L.calme(p, 500); },
        [['#cs-nom', 120], ['#cs-contact', 120], ['#cs-tel', 60], ['#cs-mail', 120], ['#cs-adr', 160]]],
      ['le devis xylophage (nv_ ; écran du métier 3D, rendu par dxVue())', async () => { await p.evaluate(async () => { DX = null; aller('devisXylo'); await new Promise(r => setTimeout(r, 900)); if (!document.querySelector('[data-dx="cli"]')) { DX = dxNeuf(); DX.nv = true; document.getElementById('contenu').innerHTML = dxVue(); } else { DX.cli = ''; DX.nv = true; rendre(); } await new Promise(r => setTimeout(r, 500)); }); },
        [['[data-dx="nv_nom"]', 120], ['[data-dx="nv_prenom"]', 120], ['[data-dx="nv_tel"]', 60], ['[data-dx="nv_mail"]', 120], ['[data-dx="nv_adr"]', 160]]],
    ];
    let champsVus = 0;
    for (const [nom, ouvrir, champs] of FORMS) {
      try { await ouvrir(); } catch (e) { console.log('  · ouverture de « ' + nom + ' » : ' + e.message.slice(0, 120)); }
      const lus = [];
      for (const [sel, plafond] of champs) { const n = await taper(sel, sel.includes('mail') ? 'm' : sel.includes('tel') ? '7' : 'x'); lus.push([sel, plafond, n]); if (n != null) champsVus++; }
      L.v('A. ' + nom + ' : les ' + champs.length + ' champs sont là (population)', lus.every(x => x[2] != null), lus.filter(x => x[2] == null).map(x => x[0]));
      for (const [sel, plafond, n] of lus) if (n != null) L.v('A. ' + nom + ' · ' + sel + ' : 300 signes tapés, le champ s’arrête à ' + plafond, n === plafond, n);
      // ce qui est tapé est ce qui est gardé : la toilette de cliNet ne rogne plus rien au plafond du champ
      const gardes = await p.evaluate(lus2 => lus2.map(([sel, plafond]) => { const e = document.querySelector(sel); if (!e) return [sel, null]; const q = sel.includes('contact') || sel.includes('prenom') ? 'contact' : sel.includes('nom') ? 'nom' : sel.includes('tel') ? 'tel' : sel.includes('mail') ? 'mail' : sel.includes('adr') ? 'adr' : 'acces'; const o = cliNet({ [q]: e.value }); return [sel, o[q].length, e.value.length]; }), lus.map(x => [x[0], x[1]]));
      for (const [sel, gardee, tapee] of gardes) if (gardee != null) L.v('A. ' + nom + ' · ' + sel + ' : cliNet garde les ' + tapee + ' signes tapés (rien n’est coupé après la bulle « enregistré »)', gardee === tapee, [gardee, tapee]);
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
    L.v('A. population : 24 champs de formulaire frappés au clavier', champsVus >= 24, champsVus);
    // la fiche enregistrée par la VRAIE fonction, puis relue
    const f = await p.evaluate(async o => { const k = Object.keys(CLIENTS)[0]; aller('client-x-' + k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600));
      const set = (q, v) => { const e = document.querySelector('[data-ci="' + q + '"]'); if (e) e.value = v; };
      set('contact', o.contact); set('tel', '0546123456'); set('mail', o.mail); set('adr', o.adr); set('acces', o.acces); const ok = clientEnregistrer(k); const c = CLIENTS[k];
      return { ok, contact: [o.contact.length, c.contact.length], mail: [o.mail.length, c.mail.length], adr: [o.adr.length, c.adr.length], acces: [o.acces.length, c.acces.length] }; }, { contact: CONTACT120, mail: MAIL120, adr: ADR160, acces: ACCES200 });
    console.log('  · fiche enregistrée :', JSON.stringify(f));
    L.v('A. la fiche enregistrée par clientEnregistrer garde contact 120, e-mail 120, adresse 160, accès 200 sans en perdre un signe', f.ok === true && f.contact[0] === f.contact[1] && f.mail[0] === f.mail[1] && f.adr[0] === f.adr[1] && f.acces[0] === f.acces[1], f);
    // les consignes d'accès sur plusieurs lignes : se rangent-elles encore sur plusieurs lignes ? (les consignes d'un terrain sont écrites à la ligne)
    await p.evaluate(async () => { const k = Object.keys(CLIENTS)[0]; aller('client-x-' + k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); });
    const ta = await p.$('[data-ci="acces"]'); await ta.focus(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
    await p.keyboard.type('Code portail 4821'); await p.keyboard.press('Enter'); await p.keyboard.type('Sonner chez la gardienne'); await p.keyboard.press('Enter'); await p.keyboard.type('Local à gauche');
    const ml = await p.evaluate(() => { const k = Object.keys(CLIENTS)[0]; const tape = document.querySelector('[data-ci="acces"]').value; clientEnregistrer(k); return { tape, rangee: CLIENTS[k].acces, lignes: CLIENTS[k].acces.split('\n').length }; });
    console.log('  · accès sur trois lignes (frappe réelle, Entrée) :', JSON.stringify(ml));
    L.v('A. population : trois lignes ont bien été tapées dans le champ des consignes d’accès', ml.tape.split('\n').length === 3, ml);
    L.v('NOUVEAU E1. les consignes d’accès écrites sur trois lignes se rangent sur trois lignes, sans mots collés', ml.lignes === 3 && !/4821Sonner|gardienneLocal/.test(ml.rangee), ml);
    await L.fermer(c);
  }

  // ───────────────────────── B. voisins de la mise en page ─────────────────────────
  const ECRANS = ['accueil', 'planning', 'interventions', 'devis', 'factures', 'taches', 'clients', 'CLIENT:histo', 'CLIENT:factures', 'CLIENT:infos', 'INTER', 'DEVIS', 'FACTURE'];
  for (const [profil, nuit] of profils) {
    const tag = profil + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const info = await p.evaluate(o => { const cnt = {}; const bump = (k, n) => { if (k && CLIENTS[k]) cnt[k] = (cnt[k] || 0) + n; };
      (typeof INTS !== 'undefined' ? INTS : []).forEach(i => bump(i.cli, 3)); (dvInit(), DV).forEach(d => bump(d.cli, 3)); (typeof FACTURES !== 'undefined' ? FACTURES : []).forEach(f => bump(f.cli, 3)); (typeof TACHES !== 'undefined' ? TACHES : []).forEach(t => bump(t.cli, 1));
      const k = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; Object.assign(CLIENTS[k], cliNet({ contact: o.contact, mail: o.mail, adr: o.adr, acces: o.acces, tel: '0546123456' })); rendre();
      const i = (typeof INTS !== 'undefined' ? INTS : []).find(x => x.cli === k), dd = DV.find(x => x.cli === k), d = dd ? { id: dvCle(dd) } : null, f = (typeof FACTURES !== 'undefined' ? FACTURES : []).find(x => x.cli === k);
      return { k, adr: CLIENTS[k].adr.length, mail: CLIENTS[k].mail.length, acces: CLIENTS[k].acces.length, contact: CLIENTS[k].contact.length, liens: cnt[k], i: i && i.id, d: d && d.id, f: f && f.id }; },
      { contact: CONTACT120, mail: MAIL_SANS_ESPACE, adr: ADR160, acces: ACCES200 });
    L.v(tag + ' : population : un client à adresse 160 / contact 120 / e-mail ' + info.mail + ' sans espace / accès 200, relié à intervention, devis, facture', info.adr === 160 && info.contact === 120 && info.acces === 200 && info.mail >= 100 && !!info.i && !!info.d && !!info.f, info);
    let vus = 0;
    for (const e of ECRANS) {
      const h = e === 'INTER' ? 'inter-x-' + info.i : e === 'DEVIS' ? 'devis-x-' + info.d : e === 'FACTURE' ? 'facture-x-' + info.f : e.startsWith('CLIENT:') ? 'client-x-' + info.k : e;
      if (e.startsWith('CLIENT:')) await p.evaluate(o => { ongletClient = o; }, e.split(':')[1]);
      await p.evaluate(x => aller(x), h); await L.calme(p, 700);
      const mont = await p.evaluate(() => ((document.getElementById('contenu') || document.body).textContent || '').includes('Pereira') || ((document.getElementById('contenu') || document.body).textContent || '').includes('Marins d’Aunis') || ((document.getElementById('contenu') || document.body).textContent || '').includes('prenom.nom.service'));
      const d = await L.deborde(c); if (mont) vus++;
      L.v(tag + ' · ' + e + ' : ne déborde pas de la largeur du profil (' + c.largeur + ' px)' + (mont ? ' — une des valeurs longues y est lue' : ' — aucune valeur longue n’y est affichée'), !d || !d.deborde, d);
      const dg = await L.doigts(p, '#contenu'); const ec = (dg.ecrases || []).filter(x => /Marins|Pereira|prenom\.nom|Madame Marie/.test(JSON.stringify(x))); L.v(tag + ' · ' + e + ' : les valeurs longues ne sont pas écrasées en colonne étroite', ec.length === 0, ec);
      if (!nuit === (profil === 'petit') && ['CLIENT:infos', 'INTER', 'DEVIS'].includes(e)) await L.capture(c, SORTIE + e.replace(':', '-') + '-' + tag + '.png');
      if (nuit && ['CLIENT:infos', 'INTER'].includes(e)) await L.capture(c, SORTIE + e.replace(':', '-') + '-' + tag + '.png');
    }
    L.v(tag + ' : population : une valeur longue est lue dans au moins 4 écrans sur ' + ECRANS.length, vus >= 4, vus);
    await L.fermer(c);
  }

  // ───────────────────────── C. voisins de coupeSure et D. nouveaux ─────────────────────────
  {
    const c = await L.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const r = await p.evaluate(() => {
      const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t), e = '😀';
      const out = { orph: [], garde: [], etranges: {}, sains: [] };
      for (const n of [40, 60, 80, 120, 160, 200]) {
        const coupe = libelleSur('a'.repeat(n - 1) + e + 'fin', n), pile = libelleSur('a'.repeat(n - 4) + e + 'fin', n);
        out.orph.push([n, coupe.length, orph(coupe)]); out.garde.push([n, pile.length, pile.endsWith('fin'.slice(0, 3)) && pile.includes(e)]); out.sains.push([n, libelleSur('b'.repeat(n + 30), n).length]); }
      out.etranges = { nul: libelleSur(null, 5), indef: libelleSur(undefined, 5), nombre: libelleSur(12345, 3), vide: libelleSur('', 0), nan: libelleSur('abc', NaN), zero: libelleSur('abcdef', 0), un: libelleSur(e, 1), deux: libelleSur(e, 2), longSansN: libelleSur('c'.repeat(100)).length, bas: libelleSur('\udc00ab', 5), haut: libelleSur('ab\ud83d', 5), objet: libelleSur({ a: 1 }, 20) };
      out.tronque = { nom80: libelleSur('d'.repeat(100), 80).length, tel60: cliNet({ tel: '1'.repeat(80) }).tel.length, mail120: cliNet({ mail: 'e'.repeat(150) }).mail.length };
      // un drapeau ou une famille coupés au milieu (séquences de plusieurs émojis) : pas un signe orphelin, mais un émoji amputé
      const drapeau = '🇫🇷', fam = '👨‍👩‍👧';
      out.seq = { drapeau: [libelleSur('a'.repeat(118) + drapeau, 120).length, orph(libelleSur('a'.repeat(118) + drapeau, 120))], fam: [libelleSur('a'.repeat(118) + fam, 120).length, orph(libelleSur('a'.repeat(118) + fam, 120))],
        drapeau2: [libelleSur('a'.repeat(116) + drapeau + drapeau, 120).length, [...libelleSur('a'.repeat(116) + drapeau + drapeau, 120).slice(116)].length] };
      return out; });
    console.log('  · coupeSure voisins :', JSON.stringify(r));
    L.v('C. population : six plafonds (40, 60, 80, 120, 160, 200) rejoués', r.orph.length === 6, r.orph.length);
    L.v('C. (tour 4, graphèmes) un émoji à la limite tient ENTIER dans le plafond (n − 1 lettres + 1 émoji = n signes, n + 1 unités UTF-16), aucun signe orphelin', r.orph.every(x => x[1] === x[0] + 1 && !x[2]), r.orph);
    L.v('C. un émoji entier est gardé quand il tombe avant la limite (n − 4 lettres + émoji + « fin » = n signes)', r.garde.every(x => x[1] === x[0] + 1 && x[2] === true), r.garde);
    L.v('C. un texte sans émoji est coupé exactement au plafond', r.sains.every(x => x[0] === x[1]), r.sains);
    L.v('C. entrées étranges : null, undefined, nombre, vide, NaN, objet ne jettent pas et rendent une chaîne', Object.values(r.etranges).every(v => typeof v === 'string' || typeof v === 'number'), r.etranges);
    L.v('C. libelleSur(null) rend « », un nombre se garde (123), un émoji est UN signe (tient dans 1 comme dans 2)', r.etranges.nul === '' && r.etranges.nombre === '123' && r.etranges.deux === '😀' && r.etranges.un === '😀', r.etranges);
    L.v('C. un plafond absent ou nul retombe sur 60 (comme avant la correction)', r.etranges.longSansN === 60 && r.etranges.zero === 'abcdef', [r.etranges.longSansN, r.etranges.zero, r.etranges.nan]);
    L.v('C. les plafonds propres à cliNet sont inchangés (nom 80 par défaut de libelleSur, téléphone 60 (deux numéros), e-mail 120)', r.tronque.nom80 === 80 && r.tronque.tel60 === 60 && r.tronque.mail120 === 120, r.tronque);
    console.log('  · (information) séquences coupées :', JSON.stringify(r.seq));
    L.v('C. (information) un drapeau ou une famille d’émojis coupés au plafond ne laissent aucun signe orphelin', !r.seq.drapeau[1] && !r.seq.fam[1], r.seq);

    // D1. source : les champs dont la valeur est coupée en silence (libelleSur / slice à l'enregistrement) faute de plafond
    const SANS = [['id="m-t"', 'titre d’une intervention (120)'], ['id="bl-titre"', 'titre d’un créneau bloqué (120)'], ['id="fo-l-nom"', 'nom d’un fournisseur (80)'], ['id="eq-r"', 'rôle d’une personne de l’équipe (40)'], ['id="eqx-mr"', 'rôle (modifier, 40)'], ['id="pa-n"', 'nom (60)'], ['data-cchamp="motif"', 'motif d’une intervention (600)']];
    const sans = SANS.map(([m, l]) => { const re = new RegExp('<(?:input|textarea)[^>]*' + m.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&') + '[^>]*>'), b = (SRC.match(re) || [''])[0]; return [l, b.length > 0, !b.includes('maxlength')]; });
    L.v('D1. population : sept champs recensés dans le source', sans.every(x => x[1]), sans);
    const nus = sans.filter(x => x[2]).map(x => x[0]);
    console.log('  · (information) champs coupés en silence, sans maxlength :', JSON.stringify(nus));
    L.v('NOUVEAU D1. (défaut à noter) aucun de ces champs n’est coupé en silence : tous portent un maxlength', nus.length === 0, nus);

    // D2. un fournisseur local : on tape 120 signes, le nom gardé est de 80
    const four = await p.evaluate(async () => { try { foLocal(); await new Promise(r => setTimeout(r, 500)); const n = document.getElementById('fo-l-nom'); if (!n) return { absent: true };
      n.value = 'F'.repeat(80); const av = MES_FOURN.length; document.getElementById('fo-l-tel').value = ''; document.querySelector('[data-fo="localok"]').click(); await new Promise(r => setTimeout(r, 500));
      const f = MES_FOURN[MES_FOURN.length - 1]; return { cree: MES_FOURN.length === av + 1, tape: 80, garde: f && f.nom.length, maxlength: n.getAttribute('maxlength') }; } catch (e) { return { erreur: e.message }; } });
    console.log('  · fournisseur local :', JSON.stringify(four));
    L.v('D2. population : le fournisseur local a été créé par la vraie action', four.cree === true, four);
    L.v('NOUVEAU D2. (défaut à noter) le nom de fournisseur tapé (120 signes) est gardé entier OU son champ porte un plafond', four.garde === four.tape || !!four.maxlength, four);

    // D3. le cadre Documents : un client reçu avec adresse + code postal + ville au-delà de 160
    const doc = await p.evaluate(() => { try { const id = 'zz' + Date.now().toString(36); opdClientRecu({ id, nom: 'Client reçu du cadre', adresse: 'a'.repeat(120), cp: '17300', ville: 'V'.repeat(60), email: 'x@y.fr', tel: '0546123456' }); const c = CLIENTS[id]; return c ? { adr: c.adr.length, attendu: 120 + 2 + 5 + 1 + 60 } : { absent: true }; } catch (e) { return { erreur: e.message }; } });
    console.log('  · client reçu du cadre :', JSON.stringify(doc));
    L.v('D3. population : le client du cadre est entré dans CLIENTS', typeof doc.adr === 'number', doc);
    L.v('D3. (connu, À SOUMETTRE À JUSTIN : relever le plafond d’adresse ou borner la composition du cadre) l’adresse du cadre (120 + code postal + ville = 188) est bornée à 160 par cliNet', doc.adr === 160 && doc.attendu === 188, doc);

    // D4. la coupe à l'affichage : « prochain passage » d'un client coupe le titre à 31 signes
    const aff = await p.evaluate(async () => { const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t);
      const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x && i.st !== 'fait')); const i = INTS.find(o => o.cli === k && o.st !== 'fait'); if (!i) return { absent: true };
      const avant = i.titre; i.titre = 'a'.repeat(30) + '😀 chantier du port'; aller('client-x-' + k); ongletClient = 'histo'; rendre(); await new Promise(r => setTimeout(r, 700));
      const txt = (document.getElementById('contenu') || document.body).textContent || ''; const m = txt.match(/a{30}.{0,2}…/); i.titre = avant; return { trouve: !!m, extrait: m && m[0], orphelin: m ? orph(m[0]) : null }; });
    console.log('  · prochain passage :', JSON.stringify(aff));
    L.v('D4. population : le titre à émoji est lu dans la fiche (« prochain passage »)', aff.trouve === true, aff);
    L.v('NOUVEAU D4. (défaut à noter) la coupe d’affichage du titre ne laisse pas de signe orphelin', aff.orphelin === false, aff);
    await L.fermer(c);
  }
  process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(2); });
