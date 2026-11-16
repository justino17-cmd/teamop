// SONDE « contrat de bout en bout » : un contrat se compose DANS l'atelier (client, titre, prix annuel, modèle d'articles), il paraît dans la liste et les quatre chiffres de
// Contrats, dans la fiche du client ; ouvert depuis la fiche, il part avec son client déjà choisi et se ferme sans confirmation. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const nb = t => parseInt(String(t).replace(/\s/g, '').match(/^\d+/)[0], 10);
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', qui: 'marc' }), p = c.p;
  await L.aller(p, 'contrats');
  const kp = () => p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ b: k.querySelector('b').textContent, s: k.querySelector('span').textContent })));
  const k0 = await kp(); v('population : quatre chiffres en haut de Contrats', k0.length === 4, k0);
  const av = await p.evaluate(() => ({ n: CONTRATS.length, max: Math.max(...CONTRATS.map(k => +k.num.slice(9))) }));
  v('population : des contrats côté prototype', av.n >= 3, av);
  v('les deux boutons de création portent leurs mots', (await p.locator('[data-opd="contrat"]').first().textContent()).trim() === 'Composer un contrat' && (await p.locator('[data-go="contrat-nouveau"]').first().textContent()).trim() === 'Contrat rapide');
  const f = await A.ouvrirAtelier(c, 'contrat', null);
  v('l\'atelier s\'ouvre sur « Nouveau contrat »', !!f && /Nouveau contrat/.test(await f.evaluate(() => (document.querySelector('.fenetre') || {}).textContent || '')));
  const clic = async s => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(200); };
  await clic('[data-vv="client"][data-id="mi"]');
  await f.locator('#vv-titre').fill('Entretien annuel — Les Mimosas'); await f.locator('#vv-v-prix').fill('280'); await f.locator('#vv-v-adresse').fill('21 bd Joffre, 17000 La Rochelle');
  await f.locator('#vv-v-prestation').fill('l’entretien de 12 climatiseurs'); await f.locator('#vv-v-frequence').fill('4 visites par an'); await f.locator('#vv-v-duree').fill('1 an'); await f.locator('#vv-v-debut').fill('2026-11-02'); await f.locator('#vv-v-paiement').fill('par prélèvement'); await p.waitForTimeout(300);
  await clic('[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(400);
  await clic('[data-act="vierge-creer"]'); await p.waitForTimeout(900);
  const d = await f.evaluate(() => ({ vue: S.vue, n: S.docs.length, t: D().type, num: D().meta.numero, prix: D().vars.prix, cl: (D().blocs.find(b => b.type === 'client') || {}).client, arts: D().blocs.filter(b => b.type === 'article').length }));
  v('l\'éditeur s\'ouvre sur le contrat créé, avec des articles', d.vue === 'editeur' && d.t === 'contrat' && d.arts >= 3, d);
  v('le prix annuel saisi (280 €) est rangé au centime (28000)', d.prix === 28000, d.prix);
  v('le numéro suit la série du prototype : CTR-2026-' + String(av.max + 1).padStart(3, '0'), d.num === 'CTR-2026-' + String(av.max + 1).padStart(3, '0'), d.num);
  v('le client choisi est celui du prototype (Copropriété Les Mimosas)', d.cl && d.cl.id === 'mi');
  await L.capture(c, A.CAP + 'contrat-editeur-' + c.profil + '.png');
  v('un contrat pour une copropriété dont le contact est une société (« Syndic Foncia ») : le message salue « Bonjour, » (jamais le nom de la société)', await (async () => { const feuille = f.locator('.fen-v.souple [data-fen-x]:visible'); if (await feuille.count()) { await feuille.first().click(); await p.waitForTimeout(400); }      // au téléphone, un contrat neuf ouvre sa feuille « Contrat » (ce qui manque) : on la ferme avant d'envoyer
    await f.locator('[data-act="envoyer"]:visible').first().click(); await p.waitForTimeout(500); const m = await f.locator('#env-msg').inputValue(); await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(400); return /^Bonjour,\n/.test(m); })());
  await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  const R = () => p.evaluate(() => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  let rows = await R(); const k1 = await kp();
  v('Contrats : « Composés dans l\'atelier » : 1 ligne', rows.length === 1, rows);
  v('la ligne dit numéro, client, titre, date, prix par an, état', /CTR-2026-\d{3}/.test(rows[0] || '') && /Copropriété Les Mimosas/.test(rows[0]) && /Entretien annuel/.test(rows[0]) && !/ — Copropriété/.test(rows[0]) && /31\/10/.test(rows[0]) && /par an/.test(rows[0]) && /Brouillon/.test(rows[0]), rows[0]);
  v('le prix par an de la ligne est 280,00 € au centime', L.cents(await p.locator('#contenu .opd-l .dv-m b').first().textContent()) === 28000);
  v('chiffres : un brouillon ne change ni « signés », ni « rapporte », ni « en attente »', k1.map(x => x.b).join('|') === k0.map(x => x.b).join('|'), [k0.map(x => x.b), k1.map(x => x.b)]);
  // ── envoyé à signer, puis signé ──
  await L.toucher(c, '#contenu .opd-l[data-opd="doc"]'); let g = await A.attendreAtelier(c);
  await g.locator('[data-act="envoyer"]:visible').first().click(); await p.waitForTimeout(500); await g.locator('[data-act="env-go"]:visible').first().click(); await p.waitForTimeout(1400);
  const et = await g.evaluate(() => D().etat); v('l\'envoi passe le contrat à un état « en attente »', /^(envoye|attente)$/.test(et), et);
  await g.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  const k2 = await kp(); rows = await R();
  v('chiffre 4 « en attente de signature » : +1', nb(k2[3].b) === nb(k0[3].b) + 1, [k0[3].b, k2[3].b]);
  v('la pastille dit l\'attente (« En attente de signature » ou « Envoyé »)', /(En attente de signature|Envoyé)/.test(rows[0]), rows[0]);
  await L.toucher(c, '#contenu .opd-l[data-opd="doc"]'); g = await A.attendreAtelier(c);
  await g.evaluate(() => { const d = D(); d.etat = 'signe'; toucher(); sauverStock(); });   // raccourci, DIT : la signature au doigt n'est pas rejouée ici
  await g.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  const k3 = await kp(); rows = await R();
  v('chiffre 1 « contrats signés » : +1 ; chiffre 2 « rapporte » : + 280,00 € ; chiffre 4 revient', nb(k3[0].b) === nb(k0[0].b) + 1 && L.cents(k3[1].b) === L.cents(k0[1].b) + 28000 && nb(k3[3].b) === nb(k0[3].b), [k0.map(x => x.b), k3.map(x => x.b)]);
  v('pastille « Signé »', /Signé/.test(rows[0]), rows[0]);
  // ── la fiche du client ──
  await L.aller(p, 'client-x-mi');
  const fiche = await p.evaluate(() => ({ lignes: [...document.querySelectorAll('#contenu .opd-cl')].map(e => e.innerText), btn: !!document.querySelector('#contenu [data-opd="contrat"][data-cli="mi"]') }));
  v('la fiche du client montre son contrat composé et propose « Composer un contrat »', fiche.lignes.some(t => /CTR-2026-/.test(t)) && fiche.btn, fiche);
  // ── depuis la fiche : le client est déjà choisi ; fermer ne demande rien ──
  const g2 = await A.ouvrirAtelier(c, 'contrat', null, '#contenu [data-opd="contrat"][data-cli="mi"]');
  const pre = g2 && await g2.evaluate(() => ({ cl: VV && VV.clientId, titre: document.querySelector('.fenetre h3,.fen-tete h3') && document.querySelector('.fenetre h3,.fen-tete h3').textContent, repris: !!document.querySelector('.toast') }));
  v('ouvert depuis la fiche : le client (Mimosas) est déjà choisi', !!pre && pre.cl === 'mi', pre);
  await g2.locator('[data-fen-x]').first().click(); await p.waitForTimeout(700);
  v('« Annuler » sans rien avoir écrit : aucune confirmation, l\'atelier se ferme', (await L.etat(p)).atelier === false && !(await g2.evaluate(() => !!document.querySelector('.voile'))), await L.etat(p));
  v('le focus revient au bouton d\'origine (« Composer un contrat » de la fiche)', await p.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.opd === 'contrat' && document.activeElement.dataset.cli === 'mi'), await p.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 90)));
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
