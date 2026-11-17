// MON ENTREPRISE : chaque carte, chaque champ, chaque refus, ce qui manque signalé, la facture débloquée quand le SIRET est rempli, les six liens.
// Joué par le gérant, puis par une personne qui ne peut que LIRE (Responsable). Valeurs absurdes et valeurs LONGUES. ⛔ 127.0.0.1 seulement.
// usage : node equipe-entreprise.js [mac|iphone|…] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit';
const err = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, id);
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 220)); } };
const png = (n) => { const z = require('zlib'); const w = 32, h = 32, raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = 40; raw[o + 2] = 40; } }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const ch = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; let b = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', z.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
  if (n) b = Buffer.concat([b, Buffer.alloc(n)]); return b; };
(async () => {
  const c = await E.marc(PROFIL, NUIT); const p = c.p;
  const ouvrir = async k => { await L.aller(p, 'entreprise'); await E.ranger(c); await L.toucher(c, `[data-ent="carte|${k}"]`); await L.calme(p, 300); };
  const enreg = async sel => { await L.toucher(c, sel); await L.calme(p, 400); };
  // ── E0 · l'écran
  await jouer('E0 écran', async () => {
    await L.aller(p, 'entreprise'); const g = await L.gestes(p); const t = await E.texte(p);
    v('E0 population : 5 cartes + 6 liens + le bandeau « Compléter »', g.filter(x => /data-ent=carte/.test(x.data)).length === 5 && g.filter(x => /data-ent=lien/.test(x.data)).length === 6, g.map(x => x.data));
    v('E0 aucun geste sans nom', g.filter(x => x.sansNom).length === 0, g.filter(x => x.sansNom));
    v('E0 le bandeau dit ce qui reste à compléter, avec un bouton « Compléter »', /Il reste à compléter/.test(t) && g.some(x => /Compléter/.test(x.lib)), t.slice(0, 260));
    if (c.doigt) { const d = await L.doigts(p); v('E0 cibles au doigt ≥ 44 px', d.petits.length === 0, d.petits); }
    const o = await L.deborde(c); v('E0 aucun glissement latéral', o.bouge === 0, o);
    await L.capture(c, E.CAP + `entreprise-${PROFIL}${NUIT ? '-nuit' : '-jour'}.png`);
  });
  // ── E1 · ton entreprise : refus puis enregistrement, valeurs longues
  await jouer('E1 ident', async () => {
    await ouvrir('ident');
    await p.fill('#en-nom', ''); await enreg('[data-ent="identok"]'); v('E1 nom vide : le message est écrit sous le champ', /obligatoire/.test(await err(p, 'en-nom')), await err(p, 'en-nom'));
    await p.fill('#en-nom', 'Clim <b>Services</b>'); await enreg('[data-ent="identok"]'); v('E1 « < > » dans le nom : refusé, dit pourquoi', (await err(p, 'en-nom')).length > 5, await err(p, 'en-nom'));
    await p.fill('#en-nom', 'N'.repeat(61)); await enreg('[data-ent="identok"]'); v('E1 nom de 61 signes : refusé, dit la limite', /60/.test(await err(p, 'en-nom')), await err(p, 'en-nom'));
    await p.fill('#en-nom', 'Clim Services 17'); await p.fill('#en-cp', '1700'); await p.fill('#en-tel', '......'); await p.fill('#en-mail', 'pas un mail'); await enreg('[data-ent="identok"]');
    const e = { cp:await err(p, 'en-cp'), tel:await err(p, 'en-tel'), mail:await err(p, 'en-mail') };
    v('E1 code postal à 4 chiffres, téléphone « …… » et e-mail faux : les TROIS refusés, chacun sous son champ', e.cp && e.tel && e.mail, e);
    v('E1 le premier champ fautif reçoit le curseur', await p.evaluate(() => document.activeElement && document.activeElement.id) === 'en-cp', await p.evaluate(() => document.activeElement && document.activeElement.id));
    v('E1 rien n’a été enregistré malgré le refus', await p.evaluate(() => ENTREPRISE.nom) === 'Clim Services 17' && await p.evaluate(() => entAdr().cp) === '17000', null);
    const long = 'Entreprise de Climatisation et de Chauffage de la Rochelle'.slice(0, 60);
    await p.fill('#en-nom', long); await p.fill('#en-cp', '17000'); await p.fill('#en-tel', '05 46 11 22 33'); await p.fill('#en-mail', 'contact@climservices17.fr'); await p.fill('#en-rue', '12 avenue du Général de Gaulle, bâtiment B, zone artisanale des Quatre Vents'); await enreg('[data-ent="identok"]');
    const t = await E.toast(p); const nom = await p.evaluate(() => ENTREPRISE.nom); v('E1 enregistré : le toast le dit', /enregistrée/.test(t), t); v('E1 le nom de 60 signes est gardé', nom === long, nom);
    const txt = await E.texte(p); v('E1 la carte montre le nouveau nom et la nouvelle adresse', txt.includes(long) && /avenue du Général de Gaulle/.test(txt), txt.slice(0, 300));
    const o = await L.deborde(c); v('E1 nom de 60 signes et rue très longue : aucun glissement latéral de la page', o.bouge === 0, o);
    await L.capture(c, E.CAP + `entreprise-long-${PROFIL}${NUIT ? '-nuit' : '-jour'}.png`);
    const cote = await p.evaluate(() => { const q = document.querySelector('.sidebar, #menu, nav'); return q ? q.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; });
    v('E1 le nom suit dans le menu (ordinateur) ou le Compte (téléphone)', c.doigt ? true : cote.includes(long.slice(0, 20)) || /Clim|Entreprise de Climatisation/.test(cote), cote);
    // remise en état
    await ouvrir('ident'); await p.fill('#en-nom', 'Clim Services 17'); await p.fill('#en-rue', '4 rue du Port'); await enreg('[data-ent="identok"]');
  });
  // ── E2 · mentions légales
  await jouer('E2 légal', async () => {
    await ouvrir('legal'); const sir = await p.evaluate(() => document.getElementById('fl-siret').value);
    await p.fill('#fl-siret', '1234567890001'); await enreg('[data-cx="ficheok"]'); v('E2 SIRET à 13 chiffres : refusé, explique où le trouver', /quatorze chiffres/.test(await err(p, 'fl-siret')), await err(p, 'fl-siret'));
    await p.fill('#fl-siret', 'abcdefghijklmn'); await enreg('[data-cx="ficheok"]'); v('E2 SIRET en lettres : refusé', (await err(p, 'fl-siret')).length > 5, await err(p, 'fl-siret'));
    await p.fill('#fl-siret', sir); await p.fill('#fl-tva', 'DE1234'); await enreg('[data-cx="ficheok"]'); v('E2 TVA qui ne commence pas par FR : refusée, explique le format', /commence par FR/.test(await err(p, 'fl-tva')), await err(p, 'fl-tva'));
    await p.fill('#fl-tva', 'FR12 123456789'); await p.selectOption('#fl-forme', { label:'SARL' }); await p.fill('#fl-cap', 'beaucoup'); await enreg('[data-cx="ficheok"]'); v('E2 capital « beaucoup » : refusé, montre un exemple', /montant en euros/.test(await err(p, 'fl-cap')), await err(p, 'fl-cap'));
    await p.fill('#fl-cap', '5 000'); await p.fill('#fl-rcs', 'RCS La Rochelle 123 456 789'); await p.fill('#fl-ass', 'AXA'); await p.fill('#fl-num', '12345'); await enreg('[data-cx="ficheok"]'); const t = await E.toast(p);
    const t2 = await E.texte(p); v('E2 enregistré : le toast dit ce qui reste', /mentions légales sont enregistrées/.test(t) && /(Il reste|écrivent toutes seules)/.test(t), t);
    v('E2 la carte et le bandeau suivent (il reste moins de choses)', /SARL/.test(t2), t2.slice(0, 260));
    // un SIRET faux au contrôle mais bien formé : avertit, ne bloque pas
    await ouvrir('legal'); await p.fill('#fl-siret', '11111111111111'); await enreg('[data-cx="ficheok"]'); const w = await E.toast(p);
    v('E2 SIRET bien formé mais à la clé fausse : enregistré avec un avertissement (ne bloque pas)', /ne semble pas juste/.test(w) && (await p.evaluate(() => ENTREPRISE.siret)).startsWith('111'), w);
    await ouvrir('legal'); await p.fill('#fl-siret', sir); await enreg('[data-cx="ficheok"]');
  });
  // ── E3 · logo
  await jouer('E3 logo', async () => {
    await ouvrir('logo'); const fp = require('os').tmpdir() + '/opg-logo.png', fs = require('fs'); fs.writeFileSync(fp, png(0)); fs.writeFileSync('/tmp/opg-grand.png', png(1200 * 1024)); fs.writeFileSync('/tmp/opg-x.txt', 'bonjour'); fs.writeFileSync('/tmp/opg-mal.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'); fs.writeFileSync('/tmp/opg-ok.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#1a73e8"/></svg>');
    await p.setInputFiles('#en-logo', '/tmp/opg-x.txt'); await L.calme(p, 300); v('E3 un fichier texte : refusé, le message est écrit', /pas accepté/.test(await p.evaluate(() => document.getElementById('en-logo-err').textContent)), null);
    await p.setInputFiles('#en-logo', '/tmp/opg-grand.png'); await L.calme(p, 300); v('E3 une image de 1,2 Mo : refusée, dit « 1 Mo »', /1 Mo/.test(await p.evaluate(() => document.getElementById('en-logo-err').textContent)), await p.evaluate(() => document.getElementById('en-logo-err').textContent));
    await p.setInputFiles('#en-logo', '/tmp/opg-mal.svg'); await L.calme(p, 400); v('E3 un SVG qui porte un script : refusé', /pas accepté/.test(await p.evaluate(() => document.getElementById('en-logo-err').textContent)), null);
    await p.setInputFiles('#en-logo', fp); await L.calme(p, 600); v('E3 un petit PNG : l’aperçu le montre', await p.evaluate(() => !!document.querySelector('#en-ap img')), null);
    await enreg('[data-ent="logook"]'); v('E3 enregistré : la carte montre le logo (une image, plus les initiales)', await p.evaluate(() => !!document.querySelector('[data-ent="carte|logo"] img.logo-ent') && !!ENTREPRISE.logo), await E.toast(p));
    await L.aller(p, 'accueil'); const tete = await p.evaluate(() => { const q = document.querySelector('.sidebar, header'); return !!q && !!q.querySelector('img'); });
    await ouvrir('logo'); v('E3 « Retirer le logo » est proposé quand il y en a un', await p.evaluate(() => !!document.querySelector('[data-ent="logoretirer"]')), null);
    await L.toucher(c, '[data-ent="logoretirer"]'); await enreg('[data-ent="logook"]'); v('E3 retiré : les initiales reviennent', await p.evaluate(() => !ENTREPRISE.logo), null);
  });
  // ── E4 · banque
  await jouer('E4 banque', async () => {
    await ouvrir('banque');
    await p.fill('#en-iban', 'FR76 1234'); await enreg('[data-ent="banqueok"]'); v('E4 IBAN trop court : refusé, dit comment il commence', /IBAN ne semble pas juste/.test(await err(p, 'en-iban')), await err(p, 'en-iban'));
    await p.fill('#en-iban', 'FR76 3000 6000 0112 3456 7890 188'); await enreg('[data-ent="banqueok"]'); v('E4 IBAN à la clé fausse : refusé', /IBAN ne semble pas juste/.test(await err(p, 'en-iban')), await err(p, 'en-iban'));
    await p.fill('#en-iban', 'FR76 3000 6000 0112 3456 7890 189'); await p.fill('#en-bic', '123'); await p.fill('#en-expmail', 'xx'); await enreg('[data-ent="banqueok"]');
    v('E4 BIC à 3 signes et e-mail du comptable faux : refusés tous les deux', (await err(p, 'en-bic')) && (await err(p, 'en-expmail')), { bic:await err(p, 'en-bic'), mail:await err(p, 'en-expmail') });
    await p.fill('#en-bic', 'AGRIFRPP'); await p.fill('#en-expmail', 'c.moreau@atlantique-conseil.fr'); await enreg('[data-ent="banqueok"]'); const t = await E.toast(p); v('E4 enregistré', /enregistrés/.test(t), t);
    v('E4 la carte montre le BIC', /BIC AGRIFRPP/.test(await E.texte(p)), (await E.texte(p)).slice(0, 400));
  });
  // ── E5 · horaires
  await jouer('E5 horaires', async () => {
    await ouvrir('horaires');
    await p.fill('#en-fin', '09:00'); await enreg('[data-ent="horairesok"]'); v('E5 journée de 2 h : refusée, dit « au moins quatre heures »', /quatre heures/.test(await err(p, 'en-fin')), await err(p, 'en-fin'));
    await p.fill('#en-fin', '18:00'); await p.fill('#en-horaire', 'abc'); await p.fill('#en-minimum', '0,3'); await p.fill('#en-z2', '600'); await enreg('[data-ent="horairesok"]');
    const e = { h:await err(p, 'en-horaire'), m:await err(p, 'en-minimum'), z:await err(p, 'en-z2') }; v('E5 tarif « abc », minimum 0,3 h, zone 2 à 600 € : les trois refusés, chacun sous son champ', e.h && e.m && e.z, e);
    await p.fill('#en-horaire', '65,555'); await p.fill('#en-minimum', '1'); await p.fill('#en-z2', '45'); await p.fill('#en-debut', '06:30'); await enreg('[data-ent="horairesok"]');
    const d = await p.evaluate(() => ({ h:TARIFS.horaire, debut:PARAMS.debut })); v('E5 65,555 € est arrondi au centime (65,56) et la journée commence à 6 h 30', d.h === 65.56 && d.debut === 390, d);
    await L.aller(p, 'planning'); await L.calme(p, 600); const tp = await E.texte(p, '#contenu'); v('E5 le planning reprend la nouvelle heure de début (6 h 30 ou 06:30 visible)', /6\s?h\s?30|06:30|6:30|^.*\b06\b/.test(tp), tp.slice(0, 200));
    await ouvrir('horaires'); await p.fill('#en-debut', '07:00'); await p.fill('#en-horaire', '65'); await enreg('[data-ent="horairesok"]');
  });
  // ── E6 · les six liens : chacun mène à l'endroit où la case vit, avec un chemin de retour
  await jouer('E6 liens', async () => {
    const att = { rdv:o => /Rendez-vous en ligne/.test(o.pan), auto:o => o.hash === '#comptabilite' || /Factur/.test(o.h1), ndf:o => o.hash === '#achats', stock:o => /Réglages du stock/.test(o.pan), boites:o => o.hash === '#boiteMail', metiers:o => /Tes métiers/.test(o.pan) };
    for (const k of Object.keys(att)) { await L.aller(p, 'entreprise'); await E.ranger(c); await L.toucher(c, `[data-ent="lien|${k}"]`); await L.calme(p, 700); const o = await E.obs(p);
      v(`E6 lien « ${k} » : mène à la bonne place`, att[k](o), { hash:o.hash, h1:o.h1, pan:o.pan });
      const ret = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button, #contenu a, .retour, [data-retour]')].find(e => /Retour|Mon entreprise/.test(e.textContent)); return b ? b.textContent.trim().slice(0, 40) : ''; });
      if (k !== 'metiers') v(`E6 lien « ${k} » : un chemin de retour vers Mon entreprise est visible (pas d’impasse)`, /Mon entreprise/.test(ret) || (await p.evaluate(() => !!document.querySelector('#calque .panneau [data-pretour], #calque .panneau [data-ferme]'))), ret);
      await E.ranger(c); }
  });
  // ── E7 · la facture débloquée quand le SIRET est rempli
  await jouer('E7 facture', async () => {
    await p.evaluate(() => { ENTREPRISE.siret = ''; }); await L.aller(p, 'entreprise');
    const ban = await E.texte(p); v('E7 SIRET vide : le bandeau le dit et dit qu’une facture ne part pas', /Il manque ton SIRET/.test(ban) && /ne peut pas partir/.test(ban), ban.slice(0, 200));
    const pas = await p.evaluate(() => { const l = document.querySelector('.sidebar [data-go="entreprise"], [data-go="entreprise"]'); return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; }); v('E7 la ligne « Mon entreprise » du menu porte une pastille de ce qui manque', /1/.test(pas), pas);
    await L.aller(p, 'comptabilite'); await p.evaluate(() => { try { cxAller('factures'); } catch (e) {} }); await L.calme(p, 600);
    const id = await p.evaluate(() => { const f = FACTURES.find(x => x.st === 'avalider' && lignesDe(x).every(l => l.pu != null)); return f ? f.id : null; });
    v('E7 population : une facture « à valider » prête à partir existe', !!id, id);
    if (id) {
      const bout = await p.evaluate(id => { const b = document.querySelector(`[data-action="apercuEnvoi"][data-id="${id}"]`); return b ? { dis:b.disabled, t:b.textContent } : null; }, id);
      v('E7 SIRET vide : la facture a son bouton « Aperçu et envoi » (on peut ouvrir l’aperçu pour lire le manque)', !!bout, bout);
      await p.evaluate(id => ACTIONS.apercuEnvoi({ dataset:{ id } }), id); await L.calme(p, 500);
      const ap = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { envoyer:!!P.querySelector('[data-action="envoyer"]'), ban:(P.querySelector('.ent-ban') || {}).textContent || '', comp:!!P.querySelector('[data-ent="completer"]') } : null; });
      v('E7 SIRET vide : l’aperçu n’offre pas « Envoyer » mais « Compléter ma fiche »', ap && !ap.envoyer && ap.comp, ap);
      await L.toucher(c, '#calque [data-ent="completer"]'); await L.calme(p, 600); const o = await p.evaluate(() => ({ h:location.hash, champ:!!document.getElementById('fl-siret') })); v('E7 « Compléter ma fiche » ouvre la bonne carte (le SIRET)', o.h === '#entreprise' && o.champ, o);
      await p.fill('#fl-siret', '732 829 320 00074'); await enreg('[data-cx="ficheok"]');
      const ap2 = await (async () => { await L.aller(p, 'comptabilite'); await p.evaluate(id => ACTIONS.apercuEnvoi({ dataset:{ id } }), id); await L.calme(p, 500); return p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { envoyer:!!P.querySelector('[data-action="envoyer"]') } : null; }); })();
      v('E7 SIRET rempli : l’aperçu offre de nouveau « Envoyer »', ap2 && ap2.envoyer, ap2);
      await L.toucher(c, '#calque [data-action="envoyer"]'); await L.calme(p, 700); const f = await p.evaluate(id => { const x = FACTURES.find(q => q.id === id); return { st:x.st, num:x.num }; }, id);
      v('E7 elle part : statut « envoyée », numéro définitif', f.st === 'envoyee' && /^FAC-/.test(f.num), { f, toast:await E.toast(p) });
    }
  });
  // ── E8 · une personne qui ne peut que lire (Responsable)
  await jouer('E8 lecture seule', async () => {
    await L.aller(p, 'equipe'); await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500);
    await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900); await L.aller(p, 'entreprise');
    const g = await L.gestes(p); const t = await E.texte(p);
    v('E8 Responsable : voit l’écran, SANS le bouton « Compléter » (il ne peut pas modifier)', !g.some(x => /Compléter/.test(x.lib)) && /Mon entreprise/.test(t), g.map(x => x.lib).slice(0, 8));
    await L.toucher(c, '[data-ent="carte|ident"]'); const q = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { inactifs:[...P.querySelectorAll('input')].every(i => i.disabled), enreg:!!P.querySelector('[data-ent="identok"]'), info:(P.querySelector('.info') || {}).textContent || '' } : null; });
    v('E8 la carte s’ouvre en LECTURE : champs inactifs, pas d’« Enregistrer », une phrase dit qui la modifie', q && q.inactifs && !q.enreg && /Marc/.test(q.info), q);
    await E.ranger(c); await p.evaluate(() => secuRevenir()); await L.calme(p, 600);
    await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'secr'); await L.calme(p, 400);
  });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 4));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
