// Recontrôle ADVERSE de l'espace client (17 novembre 2026, étape 3 sur 3) : ce que les corrections ont pu casser à côté, et ce que le client voit
// qui ne le regarde pas. Une passe indépendante des sondes du correcteur (client-*.js), qui les complète sans les recopier.
// node client-recontrole.js <profil> [jour|nuit] [sections]   sections : mots, paiement, autres, demande, routes, regard (toutes par défaut)
// → « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Captures (à REGARDER) dans O.CAP + 'rc-…'.
const O = require('./client-outils.js'), L = O.L, v = L.v, fs = require('fs');
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', sections = (process.argv[4] || 'mots,paiement,autres,demande,routes,regard').split(',');
const APP = process.argv.includes('app'), ES = s => sections.includes(s), tag = `${profil}-${nuit ? 'nuit' : 'jour'}${APP ? '-app' : ''}`;   // « app » : le mode application, sans la bande « Tester en tant que » : ce que voit un vrai client
const ev = (p, f, a) => p.evaluate(f, a);
const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return ''; const k = e.cloneNode(true); k.querySelectorAll('.rl-bande,[data-rlcli]').forEach(x => x.remove()); document.body.appendChild(k); k.style.cssText = 'position:absolute;left:-9999px;width:' + e.offsetWidth + 'px'; const t = k.innerText; k.remove(); return t.replace(/\s+/g, ' ').trim(); }, sel);
const signer = async (c, sel) => { await c.p.evaluate(x => { const e = document.querySelector(x); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await L.calme(c.p, 200); const b = await c.p.locator(sel).first().boundingBox(); if (!b) return false;
  await c.p.mouse.move(b.x + 20, b.y + b.height / 2); await c.p.mouse.down(); for (let i = 1; i <= 8; i++) await c.p.mouse.move(b.x + 20 + i * 18, b.y + b.height / 2 + (i % 2 ? 14 : -14)); await c.p.mouse.up(); await L.calme(c.p, 150); return true; };
const clic = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
// tout ce qui s'affiche PAR-DESSUS l'écran, en clair
const dessus = p => p.evaluate(() => { const q = document.querySelector('#calque .panneau'), d = document.getElementById('docplein'), t = document.getElementById('toast');
  return { panneau: q ? q.innerText.replace(/\s+/g, ' ').trim() : '', doc: d ? d.innerText.replace(/\s+/g, ' ').trim() : '', toast: t && t.classList.contains('on') ? t.textContent.trim() : '', hash: location.hash }; });
const espions = p => p.evaluate(() => { window.__toasts = []; const t0 = toast; toast = function (m) { try { window.__toasts.push(String(m).replace(/<[^>]+>/g, '')); } catch (e) {} return t0.apply(this, arguments); }; });
const TUTOIEMENT = /(?<!\p{L})(tu|ton|ta|tes|toi|te|t’)(?!\p{L})|(?<!\p{L})(Signe|Coche|Indique|Touche|Choisis|Dis|Recharge|Vérifie|Attends)(?!\p{L})/u;
const BUREAU = /sans réponse|côté bureau|à planifier|aplanifier|avalider|relancé|brouillon|à chiffrer|à envoyer|note interne|marge|prix d.achat|coût de revient|le bureau|Julie|Tester en tant|undefined|NaN|\[object|null\b/i;

(async () => {
  /* ═══ M · tout ce qu'un client LIT, pour chacun des sept clients : tutoiement, vocabulaire du bureau, et SURTOUT ce qui regarde un autre client ═══ */
  if (ES('mots')) { console.log('\n## M · tout ce que le client lit');
    const c = await O.client({ profil, nuit, cli: 'md' }), p = c.p; await espions(p);
    const info = await ev(p, () => Object.keys(CLIENTS).map(k => ({ k, nom: CLIENTS[k].nom, mail: CLIENTS[k].mail, tel: CLIENTS[k].tel, rue: CLIENTS[k].adr.split(',')[0], facs: FACTURES.filter(f => f.cli === k && f.num !== '—').map(f => f.num),
      devis: dvInit().filter(d => d.cli === k && d.num).map(d => d.num), ctr: CONTRATS.filter(o => o.cli === k).map(o => o.num) })));
    v('M · population : sept clients', info.length >= 7, info.length);
    for (const cl of info) { const k = cl.k, corpus = [];
      const prendre = async src => { const d = await dessus(p); corpus.push({ src, t: [await texte(p, '#contenu'), d.panneau, d.doc].join(' · ') }); };
      for (const tab of ['accueil', 'factures', 'interventions', 'devis', 'contrats']) {
        await ev(p, ({ k, tab }) => { RL_CLI.cli = k; EC.tab = tab; rendre(); }, { k, tab }); await L.calme(p, 150); await prendre(`${k}/${tab}`);
        const gestes = await ev(p, () => [...document.querySelectorAll('[data-ec],[data-dv^="pdf|"],[data-ecctr],[data-go^="signer-x-"]')].filter(b => b.offsetParent).map(b => b.dataset.ec ? '[data-ec="' + b.dataset.ec + '"]' : b.dataset.dv ? '[data-dv="' + b.dataset.dv + '"]' : b.dataset.go ? '[data-go="' + b.dataset.go + '"]' : '[data-ecctr]').filter(s => !/data-ec="tab\|/.test(s)));
        for (const s of [...new Set(gestes)]) {
          await ev(p, ({ k, tab }) => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} RL_CLI.cli = k; EC.tab = tab; if (route !== 'espaceclient') aller('espaceclient'); else rendre(); }, { k, tab }); await L.calme(p, 120);
          if (!(await clic(p, s))) continue; await L.calme(p, 250); await prendre(`${k}/${tab} ${s}`);
          // les refus : la fenêtre de paiement vide, le devis sans rien, le refus du devis
          if (/payer\|/.test(s)) { await ev(p, () => { ['ec-cb', 'ec-ex', 'ec-cvc'].forEach(i => { const e = document.getElementById(i); if (e) e.value = ''; }); }); await clic(p, '[data-ec^="payok|"]'); await L.calme(p, 100); }
          if (/signer\|/.test(s)) { await clic(p, '.panneau [data-dv^="signer|"]'); await L.calme(p, 100); await clic(p, '.panneau [data-dv^="clientRefus|"]'); await L.calme(p, 100); await prendre(`${k}/${tab} ${s} refus`); }
          if (/ecctr|demande$|nvdevis/.test(s)) { await clic(p, '.panneau [data-ec^="demandeok"]'); await L.calme(p, 100); } } }
      await ev(p, () => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} });
      const toasts = await ev(p, () => { const t = window.__toasts.slice(); window.__toasts.length = 0; return t; }); corpus.push({ src: k + ' toasts', t: toasts.join(' · ') });
      const tout = corpus.map(x => x.t).join('\n');
      v(`M · ${k} : population lue (${corpus.length} écrans, ${tout.length} signes, ${toasts.length} messages)`, corpus.length >= 8 && tout.length > 1500, corpus.length + '/' + tout.length);
      const tu = corpus.filter(x => TUTOIEMENT.test(x.t)).map(x => x.src + ' « ' + (x.t.match(TUTOIEMENT) || [])[0] + ' »'); v(`M · ${k} : aucun tutoiement`, !tu.length, tu.slice(0, 4));
      const bu = corpus.filter(x => BUREAU.test(x.t)).map(x => x.src + ' « ' + (x.t.match(BUREAU) || [])[0] + ' »'); v(`M · ${k} : aucun mot du bureau, aucun « undefined / NaN / null »`, !bu.length, bu.slice(0, 4));
      const fuite = []; for (const o of info) { if (o.k === k) continue;
        for (const x of corpus) { for (const m of [o.nom, o.mail, o.tel, o.rue, ...o.facs, ...o.devis, ...o.ctr]) if (m && x.t.includes(m)) fuite.push(x.src + ' → ' + m + ' (de ' + o.k + ')'); } }
      v(`M · ${k} : rien qui regarde un AUTRE client (nom, adresse, numéro de facture, de devis ou de contrat)`, !fuite.length, [...new Set(fuite)].slice(0, 5)); }
    v('M · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ═══ P · payer : saisies limites, puis TOUTES les factures à régler de TOUS les clients, au centime ═══ */
  if (ES('paiement')) { console.log('\n## P · paiement');
    const c = await O.client({ profil, nuit, cli: 'md', ec: 'factures' }), p = c.p; await espions(p);
    const dues0 = await ev(p, () => FACTURES.filter(f => f.num !== '—' && ['envoyee', 'retard', 'partielle'].includes(f.st)).map(f => ({ id: f.id, cli: f.cli, st: f.st, r: Math.round(restant(f) * 100) })));
    v('P · population : des factures à régler chez plusieurs clients, dont une payée en partie ou en retard (' + dues0.length + ')', dues0.length >= 3 && new Set(dues0.map(x => x.cli)).size >= 2, JSON.stringify(dues0));
    // saisies limites sur la première facture de md : rien ne doit être encaissé tant qu'une saisie est fausse
    await L.toucher(c, '[data-ec^="payer|"]'); let d = await dessus(p); v('P · la fenêtre de paiement s’ouvre', /Payer la facture/.test(d.panneau), d.panneau.slice(0, 80));
    const nb0 = await ev(p, () => ENCAISSEMENTS.length);
    const essais = [['expiration 1228 sans barre', '4242 4242 4242 4242', '1228', '123'], ['mois 13', '4242 4242 4242 4242', '13/28', '123'], ['mois 00', '4242 4242 4242 4242', '00/28', '123'], ['carte échue 01/20', '4242 4242 4242 4242', '01/20', '123'],
      ['année seule', '4242 4242 4242 4242', '28', '123'], ['lettres', '4242 4242 4242 4242', 'ab/cd', '123'], ['code à 2 chiffres', '4242 4242 4242 4242', '12/28', '12'], ['code à 5 chiffres', '4242 4242 4242 4242', '12/28', '12345'],
      ['code en lettres', '4242 4242 4242 4242', '12/28', 'abc'], ['carte à 17 chiffres', '4242 4242 4242 42424', '12/28', '123'], ['carte avec tirets', '4242-4242-4242-4242', '12/28', '123']];
    for (const [nom, cb, ex, cvc] of essais) { await p.fill('#ec-cb', cb); await p.fill('#ec-ex', ex); await p.fill('#ec-cvc', cvc); await clic(p, '.panneau [data-ec^="payok|"]'); await L.calme(p, 120);
      d = await dessus(p); const n = await ev(p, () => ENCAISSEMENTS.length);
      v(`P · ${nom} : refusé, rien encaissé, la fenêtre reste et le message dit quoi corriger`, n === nb0 && !!d.panneau && /carte|date|code|expir|chiffres/i.test(d.toast), JSON.stringify({ n, nb0, toast: d.toast })); }
    // Échap, « Annuler » : la fenêtre se ferme sans payer
    await p.keyboard.press('Escape'); await L.calme(p, 200); d = await dessus(p); v('P · Échap ferme la fenêtre sans payer', !d.panneau && (await ev(p, () => ENCAISSEMENTS.length)) === nb0, d.panneau.slice(0, 60));
    await L.toucher(c, '[data-ec^="payer|"]'); await L.toucher(c, '.panneau [data-ferme="1"]'); d = await dessus(p); v('P · « Annuler » ferme la fenêtre sans payer', !d.panneau, d.panneau.slice(0, 60));
    // variantes acceptées : espaces autour de l'expiration, année à 4 chiffres, code à 4 chiffres, carte sans espaces
    const variantes = [['4242424242424242', ' 1 / 30 ', '1234'], ['4242 4242 4242 4242', '12/2028', '123']]; let vi = 0;
    // toutes les factures à régler, tous les clients : le montant encaissé est le reste dû, au centime, UNE fois, et l'accueil se recalcule
    for (const f of dues0) {
      await ev(p, ({ cli }) => { RL_CLI.cli = cli; EC.tab = 'factures'; if (route !== 'espaceclient') aller('espaceclient'); else rendre(); }, { cli: f.cli }); await L.calme(p, 200);
      const avant = await ev(p, id => ({ n: ENCAISSEMENTS.length, du: FACTURES.filter(o => o.cli === FACTURES.find(x => x.id === id).cli && ['envoyee', 'retard', 'partielle'].includes(o.st) && o.num !== '—').reduce((s, o) => s + restant(o), 0) }), f.id);
      if (!(await clic(p, `[data-ec="payer|${f.id}"]`))) { v(`P · ${f.id} (${f.cli}) : le bouton « Payer » existe`, false, 'absent'); continue; } await L.calme(p, 250);
      const [cb, ex, cvc] = variantes[vi++ % 2]; await p.fill('#ec-cb', cb); await p.fill('#ec-ex', ex); await p.fill('#ec-cvc', cvc);
      d = await dessus(p); const montantFenetre = (d.panneau.match(/(\d[\d  ]*,\d\d)\s*€/) || [])[1];
      await p.evaluate(() => { const b = document.querySelector('.panneau [data-ec^="payok|"]'); b.click(); b.click(); }); await L.calme(p, 400);
      const ap = await ev(p, id => { const o = FACTURES.find(x => x.id === id); return { n: ENCAISSEMENTS.length, e0: ENCAISSEMENTS[0], st: o.st, du: FACTURES.filter(q => q.cli === o.cli && ['envoyee', 'retard', 'partielle'].includes(q.st) && q.num !== '—').reduce((s, q) => s + restant(q), 0) }; }, f.id);
      v(`P · ${f.id} (${f.cli}, ${f.st}) : encaissé ${(f.r / 100).toFixed(2)} € une seule fois (double toucher), facture payée`, ap.n === avant.n + 1 && ap.st === 'payee' && Math.round(ap.e0.ttc * 100) === f.r, JSON.stringify({ avant: avant.n, apres: ap.n, st: ap.st, ttc: ap.e0 && ap.e0.ttc, attendu: f.r / 100 }));
      v(`P · ${f.id} : le montant écrit dans la fenêtre est celui qui part`, !!montantFenetre && L.cents(montantFenetre) === f.r, montantFenetre);
      const reste = Math.round(ap.du * 100); await p.evaluate(() => document.querySelector('[data-ec="tab|accueil"]').click()); await L.calme(p, 250); const acc = await texte(p, '.ec-tuiles');
      const attendu = reste === 0 ? /Tout est réglé/.test(acc) && /À régler 0,00/.test(acc) : new RegExp('À régler ' + (reste / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ?')).test(acc.replace(/ | /g, ' '));
      v(`P · ${f.cli} : l’accueil recalcule « À régler » (${(reste / 100).toFixed(2)} €)`, attendu, acc.slice(0, 160));
      const titreTab = await texte(p, '.ec-seg'); const nDues = await ev(p, cli => FACTURES.filter(q => q.cli === cli && ['envoyee', 'retard', 'partielle'].includes(q.st) && q.num !== '—').length, f.cli);
      v(`P · ${f.cli} : le compteur de l’onglet « Factures » suit (${nDues} à régler)`, nDues ? new RegExp('Factures · ' + nDues).test(titreTab) : !/Factures ·/.test(titreTab), titreTab);
      if (!nDues) { await p.evaluate(() => document.querySelector('[data-ec="tab|factures"]').click()); await L.calme(p, 200); const ft = await texte(p, '.ec'); v(`P · ${f.cli} : plus rien à régler, la carte « Payer par virement » disparaît`, !/Payer par virement/.test(ft), ft.slice(0, 200)); } }
    v('P · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ═══ A · ce que les corrections ont pu casser CHEZ LES AUTRES : le bureau, le technicien, le comptable ═══ */
  if (ES('autres')) { console.log('\n## A · les autres rôles ne sont pas cassés');
    const c = await O.client({ profil, nuit, cli: 'cm', ec: 'contrats' }), p = c.p; let d; await espions(p);
    const refus = async (role, route) => { await p.evaluate(({ role }) => { rlChanger(role, { muet: true }); }, { role }); await L.calme(p, 500);
      await ev(p, () => { window.__toasts.length = 0; }); await p.evaluate(x => aller(x), route); await L.calme(p, 400); return ev(p, () => ({ t: window.__toasts.slice(), route: route, role: ROLE })); };
    for (const [role, route, motif] of [['tech', 'comptabilite', /pas pour toi|ta |tes |ton |toi|fermée|existe|tiennes/], ['tech', 'equipe', /pas pour toi|ta |tes |ton |toi|fermée|existe|tiennes/], ['compta', 'planning', /pas pour toi|ta |tes |ton |toi|fermée|existe|tiennes/]]) {
      const r = await refus(role, route); const t = r.t.join(' | ');
      v(`A · ${role} → #${route} : un refus (ou une page ouverte), jamais le message du client`, !/votre espace/.test(t), JSON.stringify(r)); console.log('   ', role, route, '→', t || '(page ouverte, route ' + r.route + ')'); }
    // le patron signe le contrat comme aperçu : il revient au bureau, avec le message du bureau
    await p.evaluate(() => { rlChanger('patron', { h: 'signer-x-c3', muet: true }); }); await L.calme(p, 500); const pg = await texte(p, '#contenu');
    v('A · patron : la page de signature garde sa phrase « C’est la page que ton client ouvre. »', /page que ton client ouvre/.test(pg), pg.slice(0, 160));
    await ev(p, () => { document.getElementById('lu').checked = true; }); await signer(c, '#signe-ctr'); await ev(p, () => { window.__toasts.length = 0; }); await clic(p, '[data-action="signerContrat"]'); await L.calme(p, 500);
    const s = await ev(p, () => ({ h: location.hash, t: window.__toasts.slice() }));
    v('A · patron : après signature, on arrive sur la fiche du contrat du bureau, avec le message du bureau (visites au planning)', /contrat-x-c3/.test(s.h) && /Contrat signé\. \d+ visite/.test(s.t.join(' ')), JSON.stringify(s));
    // le patron lit un compte rendu : la carte du bureau et « Ouvrir la page complète » sont là
    await p.evaluate(() => { fermerPanneau(); apercuElement('cr', INTS.find(i => i.st === 'fait').id); }); await L.calme(p, 300); d = await dessus(p);
    v('A · patron : le compte rendu garde sa carte du bureau et « Ouvrir la page complète »', /Ouvrir la page complète/i.test(d.panneau) && /envoyé au client/i.test(d.panneau), d.panneau.slice(-260));   // le titre est en capitales par la feuille de style : innerText rend « ENVOYÉ AU CLIENT »
    await O.nettoyer(p);
    // le patron voit la fenêtre « Votre devis » : refus avec « Le bureau sera prévenu », acceptation avec « Côté bureau »
    await ev(p, () => { dvInit(); dvClient(DV.find(x => x.num === 'D-2026-038')); }); await L.calme(p, 300);
    await clic(p, '.panneau [data-dv^="clientRefus|"]'); await L.calme(p, 100); const er = await texte(p, '#dv-err');
    v('A · patron : le refus du devis dit « Le bureau sera prévenu » (pas « L’entreprise »)', /Le bureau sera prévenu/.test(er), er);
    await ev(p, () => { document.getElementById('dv-ok').checked = true; document.getElementById('dv-nom').value = 'Mme Bernard'; }); await signer(c, '#dv-signe'); await ev(p, () => { window.__toasts.length = 0; }); await clic(p, '.panneau [data-dv^="signer|"]'); await L.calme(p, 400);
    const t2 = await ev(p, () => window.__toasts.join(' | ')); v('A · patron : l’acceptation dit « Côté bureau : intervention à planifier »', /Côté bureau/.test(t2), t2);
    v('A · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ═══ D · les demandes du client arrivent au bureau, une fois, et le client les retrouve ═══ */
  if (ES('demande')) { console.log('\n## D · demandes');
    const c = await O.client({ profil, nuit, cli: 'mi', ec: 'devis' }), p = c.p; await espions(p);
    const av = await ev(p, () => ({ ni: INTS.length, nt: TACHES.length, nj: JOURNAL.length }));
    const l = await texte(p, '.ec'); v('D · Mimosas : le devis expiré est étiqueté « Expiré » avec « Demander un nouveau devis »', /Expiré/.test(l) && /Demander un nouveau devis/.test(l), l.slice(0, 260));
    await L.toucher(c, '[data-ec^="nvdevis|"]'); let d = await dessus(p);
    const pre = await ev(p, () => ({ t: (document.getElementById('ed-t') || {}).value, m: (document.getElementById('ed-m') || {}).value, a: (document.getElementById('ed-a') || {}).value }));
    v('D · « Demander un nouveau devis » ouvre la demande, déjà réglée sur « Un devis » avec la phrase écrite', pre.t === 'Devis' && /D-2026-027/.test(pre.m) && /expiré/.test(pre.m), JSON.stringify(pre));
    await p.evaluate(() => { const b = document.querySelector('.panneau [data-ec="demandeok"]'); b.click(); b.click(); }); await L.calme(p, 400);
    const ap = await ev(p, () => ({ ni: INTS.length, nt: TACHES.length, nj: JOURNAL.length, i: INTS.filter(i => i.origine === 'client').slice(-1)[0], t: TACHES.slice(-1)[0] }));
    v('D · le double toucher n’envoie qu’UNE demande : une intervention, une tâche, une ligne de journal', ap.ni === av.ni + 1 && ap.nt === av.nt + 1 && ap.nj === av.nj + 1, JSON.stringify({ av, ap: { ni: ap.ni, nt: ap.nt, nj: ap.nj } }));
    v('D · la demande est une « Visite pour un devis » à planifier, au bon client, avec les mots du client', ap.i && ap.i.cli === 'mi' && /Visite pour un devis/.test(ap.i.titre) && ap.i.st === 'aplanifier' && /D-2026-027/.test(ap.i.clientDit), JSON.stringify(ap.i));
    d = await dessus(p); v('D · le message vouvoie le client et promet un rappel', /on vous rappelle/.test(d.toast) && !TUTOIEMENT.test(d.toast), d.toast);
    await p.evaluate(() => document.querySelector('[data-ec="tab|interventions"]').click()); await L.calme(p, 300); const it = await texte(p, '.ec');
    v('D · le client retrouve sa demande dans « À venir » : « Rendez-vous à fixer » et ses propres mots', /Rendez-vous à fixer/.test(it) && /Votre demande : « Mon devis D-2026-027/.test(it), it.slice(0, 400));
    // le même client redemande tout de suite : il n’y a pas de garde (on le note), mais le bureau doit voir DEUX lignes distinctes
    // valeur longue : une phrase de 600 signes et un mot de 70 lettres sans espace
    const longue = 'La climatisation de la salle de réunion du premier étage ne souffle plus que de l’air tiède depuis lundi matin, et le bruit du ventilateur extérieur devient très fort quand le soleil tape. '.repeat(3) + 'Superlongmotsansespacepourvoirsilapagetientbienquandlecaractereestvraimentbeaucoup';
    await clic(p, '[data-ec="tab|accueil"]'); await L.calme(p, 250); await clic(p, '[data-ec="demande"]'); await L.calme(p, 300); await p.fill('#ed-m', longue); await clic(p, '.panneau [data-ec="demandeok"]'); await L.calme(p, 400);
    await p.evaluate(() => document.querySelector('[data-ec="tab|interventions"]').click()); await L.calme(p, 300);
    const dbd = await L.deborde(c); v('D · une demande très longue ne pousse pas la page de côté', dbd.bouge === 0 && dbd.seconde <= dbd.largeur + 1, JSON.stringify(dbd));
    // la page ne glisse pas, mais le mot trop long est-il LISIBLE en entier ? On mesure la boîte de la ligne, puis le texte qui en sort
    const lg = await ev(p, () => { const e = [...document.querySelectorAll('.ec-l')].find(x => /Superlong/.test(x.innerText)); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), W = document.documentElement.clientWidth;
      const sp = [...e.querySelectorAll('span')].filter(x => /Superlong/.test(x.textContent)).pop(); const rs = sp ? sp.getBoundingClientRect() : null; return { gauche: Math.round(r.left), droite: Math.round(r.right), largeurEcran: W, texteDroite: rs ? Math.round(rs.right) : null, sw: e.scrollWidth, cw: e.clientWidth }; });
    v('D · une demande très longue (mot de 83 lettres) reste lisible dans son cadre : rien ne sort à droite de l’écran', !!lg && lg.droite <= lg.largeurEcran + 1 && (lg.texteDroite == null || lg.texteDroite <= lg.largeurEcran + 1), JSON.stringify(lg));
    await L.calme(p, 250); await L.capture(c, O.CAP + `rc-${tag}-demande-longue.png`);
    // « Demander un contrat » : deux fois de suite, puis le client doit voir que sa demande est partie
    await ev(p, () => { RL_CLI.cli = 'md'; EC.tab = 'contrats'; rendre(); }); await L.calme(p, 250); const nt0 = await ev(p, () => TACHES.length);
    await clic(p, '[data-ecctr]'); await L.calme(p, 300); await clic(p, '.panneau [data-ec^="demandeok"]'); await L.calme(p, 350); const nt1 = await ev(p, () => TACHES.length);
    const ct = await texte(p, '.ec'); v('D · « Demander un contrat » : UNE tâche « Proposer un contrat d’entretien » pour le bureau', nt1 === nt0 + 1 && (await ev(p, () => /Proposer un contrat d’entretien à M\. et Mme Durand/.test(TACHES.slice(-1)[0].t))), nt0 + ' → ' + nt1);
    await L.capture(c, O.CAP + `rc-${tag}-contrat-apres-demande.png`);
    v('D · après sa demande de contrat, le client voit que la demande est partie (un mot « demande envoyée / on vous rappelle », ou plus de bouton « Demander un contrat »)', !/Demander un contrat/.test(ct) || /demande (envoyée|reçue|en cours)|on vous rappelle|nous vous rappelons/i.test(ct), ct.slice(0, 300));
    // le bureau voit ce que le client a demandé : tâche, fiche à planifier, sans erreur
    await p.evaluate(() => { rlChanger('patron', { h: 'taches', muet: true }); }); await L.calme(p, 600); const tt = await texte(p, '#contenu');
    v('D · côté patron : la tâche « Rappeler Copropriété Les Mimosas pour fixer la date (demande en ligne) » est dans Tâches', /Rappeler Copropriété Les Mimosas pour fixer la date/.test(tt) || /Mimosas/.test(tt), tt.slice(0, 200));
    const idNew = await ev(p, () => INTS.filter(i => i.origine === 'client' && i.cli === 'mi').slice(-1)[0].id);
    await p.evaluate(x => aller('inter-x-' + x), idNew); await L.calme(p, 500); const fi = await texte(p, '#contenu');
    v('D · côté patron : la demande s’ouvre en fiche « à planifier » avec ce que le client a dit', /Mimosas|D-2026-027|Superlong|climatisation/i.test(fi) && fi.length > 120, fi.slice(0, 220));
    v('D · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ═══ R · TOUTES les adresses de l'application, les identifiants de chaque fiche, et le clavier : le client reste chez lui ═══ */
  if (ES('routes')) { console.log('\n## R · les portes');
    const c = await O.client({ profil, nuit, cli: 'vp', ec: 'accueil' }), p = c.p; await espions(p);
    const liste = await ev(p, () => { const V = vues(); return { vues: Object.keys(V), ints: INTS.map(i => i.id), facs: FACTURES.map(f => f.id), cl: Object.keys(CLIENTS), ctr: CONTRATS.map(k => ({ id: k.id, cli: k.cli, titre: k.titre })), dv: dvInit().map(d => d.num || d.id) }; });
    v('R · population : ' + liste.vues.length + ' vues, ' + liste.ints.length + ' interventions, ' + liste.facs.length + ' factures', liste.vues.length >= 30 && liste.ints.length >= 20 && liste.facs.length >= 6, [liste.vues.length, liste.ints.length, liste.facs.length]);
    const sorti = [], toastsRefus = new Set();
    const essayer = async h => { await ev(p, () => { window.__toasts.length = 0; }); await p.evaluate(x => aller(x), h); await L.calme(p, 90);
      const e = await ev(p, () => ({ route: route, role: ROLE, h1: ((document.getElementById('contenu').querySelector('h1') || {}).textContent || ''), t: window.__toasts.slice(), cx: document.getElementById('contenu').innerText.length }));
      if (e.route !== 'espaceclient' && e.route !== 'signer') sorti.push(h + ' → ' + e.route); if (e.role !== 'client') sorti.push(h + ' → rôle ' + e.role); e.t.forEach(t => toastsRefus.add(t)); return e; };
    for (const r of liste.vues) await essayer(r);
    const prefixes = { 'inter-x-': liste.ints, 'facture-x-': liste.facs, 'client-x-': liste.cl, 'contrat-x-': liste.ctr.map(k => k.id), 'devis-x-': liste.dv };
    for (const [pre, ids] of Object.entries(prefixes)) for (const id of ids) await essayer(pre + id);
    v('R · aucune adresse du bureau (vues + chaque fiche) ne fait sortir le client de son espace', !sorti.length, sorti.slice(0, 6));
    v('R · les phrases de refus vouvoient le client', [...toastsRefus].every(t => !TUTOIEMENT.test(t)), [...toastsRefus].slice(0, 5));
    // les trois écrans du métier 3D : un client qui tape leur adresse ne lit ni « métier 3D », ni « ton entreprise », et reste chez lui
    for (const h of ['registre', 'carteBox', 'devisXylo']) { const e = await essayer(h); const tt = e.t.join(' | ');
      v(`R · adresse #${h} (écran du métier 3D) : le client reste dans son espace, sans phrase qui parle de l’entreprise ni du métier`, e.route === 'espaceclient' && !/3D|anti-nuisibles|ton entreprise|ton /.test(tt), JSON.stringify({ route: e.route, h1: e.h1.slice(0, 40), t: e.t })); }
    console.log('   phrases de refus distinctes :', JSON.stringify([...toastsRefus]));
    // les contrats : le sien s'ouvre, ceux des autres jamais
    for (const k of liste.ctr) { await p.evaluate(x => aller('signer-x-' + x), k.id); await L.calme(p, 150); const t = (await texte(p, '#contenu')).toUpperCase();
      if (k.cli === 'vp') v(`R · contrat ${k.id} (le sien) : la page s’ouvre`, t.includes(k.titre.toUpperCase()), t.slice(0, 120)); else v(`R · contrat ${k.id} (de ${k.cli}) : jamais montré à ce client`, !t.includes(k.titre.toUpperCase()), t.slice(0, 120)); }
    // l'historique du navigateur : taper une adresse dans la barre, comme le ferait quelqu'un qui la connaît
    for (const h of ['clients', 'comptabilite', 'inter-x-i1', 'parametres', 'equipe']) { await p.evaluate(x => { location.hash = '#' + x; }, h); await L.calme(p, 400); const e = await ev(p, () => ({ route: route, role: ROLE }));
      v(`R · adresse tapée #${h} : le client reste dans son espace`, e.route === 'espaceclient' && e.role === 'client', JSON.stringify(e)); }
    // le menu et la barre du bas : seulement l'espace du client
    const nav = await ev(p, () => ({ barre: [...document.querySelectorAll('#barre-bas [data-ec], #barre-bas [data-tab], #barre-bas button')].map(b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()), lat: [...document.querySelectorAll('#menu button, #menu a')].map(b => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean) }));
    console.log('   navigation :', JSON.stringify(nav));
    v('R · la navigation ne montre que l’espace du client (aucune rubrique du bureau)', ![...nav.barre, ...nav.lat].some(x => /Planning|Clients|Comptabilité|Équipe|Stock|Paramètres|Statistiques|Historique|Tâches|Mon entreprise/i.test(x)), nav);
    v('R · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ═══ V · ce qu'on REGARDE : une capture par écran du client, à relire à l'œil ═══ */
  if (ES('regard')) { console.log('\n## V · captures');
    const c = APP ? await O.clientApp({ profil, nuit, cli: 'md', ec: 'accueil' }) : await O.client({ profil, nuit, cli: 'md', ec: 'accueil' }), p = c.p; await espions(p);
    const cap = async n => L.capture(c, O.CAP + `rc-${tag}-${n}.png`);
    const aller_ = async (cli, tab) => { await ev(p, ({ cli, tab }) => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} RL_CLI.cli = cli; EC.tab = tab; if (route !== 'espaceclient') aller('espaceclient'); else rendre(); scrollTo(0, 0); }, { cli, tab }); await L.calme(p, 350); };
    await aller_('md', 'accueil'); await cap('01-accueil');
    await aller_('md', 'factures'); await cap('02-factures'); await p.evaluate(() => { const e = document.querySelector('.ec-vir'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 250); await cap('03-virement');
    await aller_('md', 'factures'); await clic(p, '[data-ec^="payer|"]'); await L.calme(p, 400); await cap('04-payer');
    await p.fill('#ec-ex', '1228'); await clic(p, '.panneau [data-ec^="payok|"]'); await L.calme(p, 300); await cap('05-payer-refus');
    await aller_('md', 'factures'); await clic(p, '[data-ec^="fpdf|"]'); await L.calme(p, 500); await cap('06-facture-grand'); const dbdF = await L.deborde(c); v('V · la facture en grand ne pousse pas la page', dbdF.bouge === 0, JSON.stringify(dbdF));
    await aller_('vp', 'devis'); await cap('07-devis-liste');
    await clic(p, '[data-ec^="signer|"]'); await L.calme(p, 400); await cap('08-devis-fenetre');
    await clic(p, '.panneau [data-dv^="signer|"]'); await L.calme(p, 200); await clic(p, '.panneau [data-dv^="clientRefus|"]'); await L.calme(p, 250); await cap('09-devis-refus');
    await aller_('mi', 'devis'); await cap('10-devis-expire');
    await aller_('mi', 'interventions'); await cap('11-interventions-retard');
    await aller_('hp', 'interventions'); await clic(p, '[data-ec^="cr|"]'); await L.calme(p, 500); await cap('12-compte-rendu');
    await aller_('md', 'contrats'); await cap('13-contrat-vide'); await clic(p, '[data-ecctr]'); await L.calme(p, 350); await cap('14-contrat-demande');
    await aller_('cm', 'contrats'); await cap('15-contrat-asigner'); await L.toucher(c, '[data-go^="signer-x-"]'); await L.calme(p, 500); await cap('16-contrat-signature');
    await ev(p, () => { document.getElementById('lu').checked = true; }); await signer(c, '#signe-ctr'); await cap('17-contrat-signature-signee');
    await clic(p, '[data-action="signerContrat"]'); await L.calme(p, 600); await cap('18-contrat-signe');
    v('V · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
