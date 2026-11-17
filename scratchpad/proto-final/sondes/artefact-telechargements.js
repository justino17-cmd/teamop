// LES SORTIES DE LA PAGE, une fonction par besoin, jouées sous le bac à sable (17 novembre 2026) :
//   telechargerFichier (le pont reçoit un fichier NON VIDE au bon nom et au bon type ; refus, échec, trop lourd, extension, cadre sans pont : l'écran le DIT),
//   copierTexte (presse-papiers, sinon le texte sélectionnable), la carte d'un lien tel:/mailto:/sms:, le visionneur d'un fichier choisi (blob:),
//   et le CÂBLAGE : les gestes réels (CSV des véhicules, FEC provisoire) passent par la fonction unique, et il n'y a PLUS qu'un `.download =` par page.
// ⛔ 127.0.0.1 seulement. Population comptée avant chaque conclusion.
const fs = require('fs'), path = require('path');
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const SRC = f => fs.readFileSync(path.join(L.RACINE, 'apercu', f), 'utf8');
const PROFILS = process.env.RAPIDE ? ['mac'] : ['mac', 'iphone'];   // RAPIDE=1 : les mutations n'ont besoin que d'un appareil
(async () => {
  for (const profil of PROFILS) {
    const T = `${profil}`;
    const c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    const toast = () => c.p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent.trim() : ''; });
    const carte = () => c.p.evaluate(() => { const z = document.getElementById('sortie-carte'); return z ? { texte: z.innerText.replace(/\s+/g, ' ').trim(), valeur: (z.querySelector('.sc-v') || {}).textContent || '', choisi: String(getSelection()).trim() } : null; });
    const faire = async (nom, f) => { await bac.zero(c); await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.textContent = ''; const z = document.getElementById('sortie-carte'); if (z) z.remove(); }); const r = await c.p.evaluate(f); await c.p.waitForTimeout(350); return { r, e: await bac.etat(c), t: await toast(), z: await carte() }; };
    // 1. le pont reçoit un fichier non vide, au bon nom et au bon type
    let x = await faire('pdf', () => telechargerFichier('devis-essai.pdf', new Blob(['%PDF-1.4\n% essai'], { type: 'application/pdf' })));
    v(`${T} pont : population (le pont a été appelé)`, x.e.essaisSave === 1 && x.e.use.includes('downloads'), x.e);
    v(`${T} pont : un fichier NON VIDE, au bon nom, au bon type`, x.e.fichiers.length === 1 && x.e.fichiers[0].nom === 'devis-essai.pdf' && x.e.fichiers[0].type === 'application/pdf' && x.e.fichiers[0].taille > 5 && x.e.fichiers[0].debut.startsWith('%PDF'), x.e.fichiers);
    v(`${T} pont : l'écran dit « enregistré » avec le nom, et aucun lien n'a été posé`, /enregistré/.test(x.t) && /devis-essai\.pdf/.test(x.t) && x.e.liensInertes.length === 0, { t: x.t, l: x.e.liensInertes });
    x = await faire('csv', () => telechargerFichier('frais-essai.csv', '﻿Date;Libellé\r\n01/11;Essai'));
    v(`${T} pont : un texte part en csv, non vide`, x.e.fichiers.length === 1 && x.e.fichiers[0].type === 'text/csv' && x.e.fichiers[0].taille > 10, x.e.fichiers);
    // 2. le visiteur refuse : rien n'est enregistré, et la page le DIT (jamais « prêt »)
    await L.fin(c);
  }
  // les scénarios où le pont dit non, un contexte par scénario (le bac se règle à l'ouverture)
  const SC = [
    ['refus du visiteur', { refuser: true }, /refus/i, 'declined'],
    ['pont indisponible', { echec: 'unavailable' }, /pas abouti/i, 'unavailable'],
    ['trop lourd', { echec: 'too_large' }, /trop lourd/i, 'too_large'],
    ['trop de demandes', { echec: 'rate_limited' }, /déjà ouverte/i, 'rate_limited'],
  ];
  for (const [nom, opts, motif, code] of SC) {
    const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, opts); await A.calmer(c.p);
    const r = await c.p.evaluate(() => telechargerFichier('rapport.pdf', new Blob(['%PDF-1.4 x'], { type: 'application/pdf' })));
    await c.p.waitForTimeout(300); const e = await bac.etat(c), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(`${nom} : population (le pont a refusé avec « ${code} »)`, e.refus.length === 1 && e.refus[0].code === code, e.refus);
    v(`${nom} : rien n'est enregistré et l'écran le DIT (« ${t.slice(0, 60)} »)`, e.fichiers.length === 0 && motif.test(t) && !/enregistré :|prêt/i.test(t) && r !== 'enregistre', { t, r });
    await L.fin(c);
  }
  { // une extension que le pont refuse
    const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, {}); await A.calmer(c.p);
    const r = await c.p.evaluate(() => telechargerFichier('fichier.xyz', 'contenu')); await c.p.waitForTimeout(300);
    const t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(`extension refusée : l'écran le dit, rien d'enregistré`, r === 'type' && /type de fichier/.test(t) && (await bac.etat(c)).fichiers.length === 0, { r, t });
    await bac.zero(c); const r2 = await c.p.evaluate(() => telechargerFichier('vide.csv', ''));
    v(`fichier vide : on le dit, le pont n'est pas appelé`, r2 === 'vide' && (await bac.etat(c)).essaisSave === 0, r2);
    await L.fin(c);
  }
  { // sans pont, page du haut : le lien (qui peut être bloqué : la phrase ne promet rien)
    const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, { pont: false }); await A.calmer(c.p);
    const r = await c.p.evaluate(() => telechargerFichier('frais-essai.csv', 'a;b\r\n1;2')); await c.p.waitForTimeout(300); const e = await bac.etat(c), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(`sans pont (page seule) : le lien est posé (compté inerte), l'écran dit « demandé » et pas « enregistré »`, r === 'lien' && e.liensInertes.length === 1 && /demandé/.test(t) && !/enregistré/.test(t), { r, t, l: e.liensInertes });
    await L.fin(c);
  }
  // les copies : le presse-papiers, sinon le texte SÉLECTIONNÉ
  for (const [nom, opts] of [['presse-papiers libre', { presse: 'ok' }], ['presse-papiers refusé', { presse: 'refuse' }], ['presse-papiers absent', { presse: 'absent' }], ['copie par sélection seule', { presse: 'sel' }]]) {
    const c = await bac.ouvrir({ profil: 'iphone', qui: 'marc' }, opts); await A.calmer(c.p);
    await c.p.evaluate(() => copierTexte('Bonjour, voici votre compte rendu : https://climservices17.teamop.fr/r/7Q2K')); await c.p.waitForTimeout(400);
    const e = await bac.etat(c), z = await c.p.evaluate(() => { const q = document.getElementById('sortie-carte'); return q ? { valeur: q.querySelector('.sc-v').textContent, choisi: String(getSelection()) } : null; }), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    if (nom === 'presse-papiers libre') v(`${nom} : le texte est dans le presse-papiers, l'écran dit « Copié »`, e.presse.length === 1 && /climservices17/.test(e.presse[0]) && /Copié/.test(t), { e: e.presse, t });
    else if (nom === 'copie par sélection seule') v(`${nom} : la copie par sélection part, l'écran dit « Copié »`, e.copiesSelection.length === 1 && /Copié/.test(t) && !z, { e: e.copiesSelection, t, z });
    else v(`${nom} : le texte est SÉLECTIONNÉ dans une carte, avec la phrase qui dit quoi faire`, !!z && /climservices17/.test(z.valeur) && /climservices17/.test(z.choisi), { z, t });
    v(`${nom} : on ne LIT jamais le presse-papiers`, !e.presse.includes('⚠ LECTURE'), e.presse);
    await L.fin(c);
  }
  // un lien tel: mailto: sms: : annulé par le bac, compté ; la carte donne le numéro/l'adresse en texte sélectionnable ; rien n'annonce « appel lancé »
  for (const profil of PROFILS) {
    const c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    for (const [k, h, lu] of [['tel', 'tel:0546121212', '05 46 12 12 12'], ['mailto', 'mailto:cabinet@drmartin.fr', 'cabinet@drmartin.fr'], ['sms', 'sms:0600000001?&body=Bonjour', '06 00 00 00 01']]) {
      await bac.zero(c);
      await c.p.evaluate(({ h }) => { const a = document.createElement('a'); a.href = h; a.textContent = 'lien essai'; a.id = 'essai-lien'; a.style.cssText = 'position:fixed;top:80px;left:20px;z-index:99999;padding:12px;background:#fff'; document.body.appendChild(a); }, { h });
      await c.p.locator('#essai-lien').click(); await c.p.waitForTimeout(500);
      const e = await bac.etat(c), z = await c.p.evaluate(() => { const q = document.getElementById('sortie-carte'); return q ? { texte: q.innerText.replace(/\s+/g, ' '), valeur: q.querySelector('.sc-v').textContent, choisi: String(getSelection()) } : null; }), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
      v(`${profil} ${k} : population (le bac a compté et annulé la navigation)`, e.navigations.length === 1 && e.navigations[0].schema === k, e.navigations);
      v(`${profil} ${k} : la carte donne « ${lu} » en texte sélectionnable`, !!z && z.valeur === lu && z.choisi === lu, z);
      v(`${profil} ${k} : rien n'annonce un appel ou un envoi`, !/(appel lancé|appel de|message envoyé|e-?mail envoyé|sms envoyé)/i.test((z ? z.texte : '') + ' ' + t), { z, t });
      await c.p.evaluate(() => { document.getElementById('essai-lien').remove(); const q = document.getElementById('sortie-carte'); if (q) q.remove(); });
    }
    // la carte se ferme, et ne couvre pas la barre du bas d'un téléphone
    await c.p.evaluate(() => sortieCarte('Pour appeler', '05 46 12 12 12', {})); await L.calme(c.p, 300);
    const g = await c.p.evaluate(() => { const q = document.getElementById('sortie-carte').getBoundingClientRect(), b = document.getElementById('barre-bas'), r = b && getComputedStyle(b).display !== 'none' ? b.getBoundingClientRect() : null; return { carte: [q.left, q.top, q.right, q.bottom].map(Math.round), barre: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null, L: innerWidth, H: innerHeight }; });
    v(`${profil} la carte tient dans l'écran (largeur ${c.largeur})`, g.carte[0] >= 0 && g.carte[2] <= c.largeur && g.carte[1] >= 0 && g.carte[3] <= g.H, g);
    v(`${profil} la carte ne recouvre pas la barre du bas`, !g.barre || g.carte[3] <= g.barre[1] + 1, g);
    await c.p.locator('#sortie-carte .sc-x').click(); await c.p.waitForTimeout(200);
    v(`${profil} la croix ferme la carte`, !(await carte2(c)), '');
    v(`${profil} aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // le visionneur d'un fichier choisi : l'image se montre dans la page, « Enregistrer » passe par le pont
  { const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, {}); await A.calmer(c.p);
    await c.p.evaluate(() => { const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), x => x.charCodeAt(0)); const f = new File([png], 'ticket.png', { type: 'image/png' }); const u = URL.createObjectURL(f); const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.id = 'essai-blob'; a.textContent = 'voir'; a.style.cssText = 'position:fixed;top:80px;left:20px;z-index:99999;padding:12px;background:#fff'; document.body.appendChild(a); });
    await c.p.locator('#essai-blob').click(); await c.p.waitForTimeout(500);
    let e = await bac.etat(c); const img = await c.p.evaluate(() => !!document.querySelector('#calque .vfl-img'));
    v(`fichier choisi : l'image s'ouvre DANS la page (aucune fenêtre, aucun lien inerte)`, img && e.popups.length === 0 && e.liensInertes.length === 0, { img, e: e.liensInertes });
    await c.p.locator('#calque [data-sortie="enregistrer"]').click(); await c.p.waitForTimeout(500); e = await bac.etat(c);
    v(`fichier choisi : « Enregistrer sur cet appareil » envoie le fichier au pont`, e.fichiers.length === 1 && e.fichiers[0].nom === 'ticket.png' && e.fichiers[0].type === 'image/png' && e.fichiers[0].taille > 20, e.fichiers);
    await L.fin(c); }
  // le CÂBLAGE : plus qu'une seule fabrique de lien « download » par page, et chaque geste réel passe par la fonction unique
  const comptes = f => (SRC(f).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').match(/\.download\s*=/g) || []).length;
  v('population : les pages sont lues', SRC('prototype-op-gestion.html').length > 1e6 && SRC('prototype-courrier.js').length > 3e5);
  v(`prototype-op-gestion.html : UNE seule fabrique de lien « download » (${comptes('prototype-op-gestion.html')})`, comptes('prototype-op-gestion.html') === 1);
  v(`prototype-courrier.js : UNE seule fabrique de lien « download » (${comptes('prototype-courrier.js')})`, comptes('prototype-courrier.js') === 1);
  // la Comptabilité (cadre) a UNE fabrique, et elle n'est atteinte que HORS artefact (restes tour 1) : `dansArtefact()` la garde, par indexOf (temps linéaire)
  { const t = SRC('prototype-comptabilite.html').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' '), g = t.indexOf('if (!dl && !dansArtefact())'), d = t.indexOf('.download', g < 0 ? 0 : g);
    v(`prototype-comptabilite.html : UNE seule fabrique de lien « download » (${comptes('prototype-comptabilite.html')}), gardée par dansArtefact() (garde trouvée : ${g >= 0}, écart ${d - g})`, comptes('prototype-comptabilite.html') === 1 && g > 0 && d > g && d - g < 400); }
  { const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, {}); await A.calmer(c.p);
    // le CSV du coût des véhicules et celui des frais d'un véhicule, par leurs vraies fonctions
    await bac.zero(c); await c.p.evaluate(() => vhCsvFlotte()); await c.p.waitForTimeout(500); let e = await bac.etat(c);
    v(`câblage : le coût des véhicules part au pont (csv non vide, nom exact)`, e.fichiers.length === 1 && e.fichiers[0].nom === 'cout-des-vehicules.csv' && e.fichiers[0].taille > 80 && e.liensInertes.length === 0, e);
    await bac.zero(c); await c.p.evaluate(() => vxCsv(VEHICULES[0].id)); await c.p.waitForTimeout(500); e = await bac.etat(c);
    v(`câblage : les frais d'un véhicule partent au pont`, e.fichiers.length === 1 && /^frais-.*\.csv$/.test(e.fichiers[0].nom) && e.fichiers[0].taille > 40 && e.liensInertes.length === 0, e);
    await bac.zero(c); await c.p.evaluate(() => cpFecTelecharger()); await c.p.waitForTimeout(500); e = await bac.etat(c);
    v(`câblage : le FEC provisoire part au pont (txt non vide)`, e.fichiers.length === 1 && /_format-FEC\.txt$/.test(e.fichiers[0].nom) && e.fichiers[0].taille > 500 && e.liensInertes.length === 0, e);
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
async function carte2(c) { return c.p.evaluate(() => !!document.getElementById('sortie-carte')); }
