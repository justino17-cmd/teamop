// Surveillance TeamOP — vérifie toutes les heures que la plateforme est saine.
// Échoue (exit 1) dès qu'un problème est détecté → GitHub ouvre une issue et prévient par e-mail.
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TeamOP-Surveillance' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(new Error('délai dépassé (25 s)')); });
  });
}

(async () => {
  const problems = [];
  const pages = ['index.html', 'app.html', 'messages.html', 'espace.html', 'elan.html', 'opmessages.html', 'confidentialite.html', 'sw.js', 'manifest.webmanifest', 'manifest-teamop.webmanifest', 'manifest-opmsg.webmanifest', '.well-known/assetlinks.json'];

  // 1. Chaque page répond et son JavaScript est valide
  for (const p of pages) {
    try {
      const r = await get('https://teamop.fr/' + p);
      if (r.status !== 200) { problems.push(p + ' : HTTP ' + r.status); continue; }
      if (p.endsWith('.html')) {
        const blocks = [...r.body.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
          .filter(m => !/type\s*=\s*["'](?:application\/(?:ld\+)?json|module)["']/.test(m[0].slice(0, 120)))
          .map(m => m[1]).filter(s => s.trim());
        for (const b of blocks) { try { new Function(b); } catch (e) { problems.push(p + ' : erreur JavaScript — ' + e.message); } }
      }
      if (p === 'sw.js') { try { new Function(r.body); } catch (e) { problems.push('sw.js : erreur JavaScript — ' + e.message); } }
      if (p.includes('manifest') || p.includes('assetlinks')) { try { JSON.parse(r.body); } catch (e) { problems.push(p + ' : JSON invalide'); } }
    } catch (e) { problems.push(p + ' : injoignable — ' + e.message); }
  }

  // 2. Marqueurs de version présents (app + service worker)
  try {
    const app = await get('https://teamop.fr/app.html');
    const sw = await get('https://teamop.fr/sw.js');
    const va = (app.body.match(/APP_VERSION = '(\d+)'/) || [])[1];
    const vs = (sw.body.match(/elan-gestion-v(\d+)/) || [])[1];
    if (!va) problems.push('app.html : marqueur APP_VERSION introuvable');
    if (!vs) problems.push('sw.js : marqueur de cache introuvable');
    if (va && vs) console.log('Versions en ligne : app v' + va + ' · cache v' + vs);
  } catch (e) { problems.push('vérification des versions impossible — ' + e.message); }

  // 3. Serveur api.teamop.fr (push, codes de sécurité, e-mails, pièces jointes)
  try {
    const h = await get('https://api.teamop.fr/health');
    const j = JSON.parse(h.body);
    if (!j.ok) problems.push('api.teamop.fr : réponse anormale (ok=' + j.ok + ')');
    if (!j.email) problems.push('api.teamop.fr : envoi d\'e-mails désactivé (email:false) — codes de sécurité HS');
    if (!j.atts) problems.push('api.teamop.fr : pièces jointes désactivées (atts:false) — bons de commande sans PDF');
    if (typeof j.bugs1h === 'number' && j.bugs1h > 0) problems.push(j.bugs1h + ' erreur(s) signalée(s) par les applications des entreprises dans la dernière heure (vigie) — voir l\'e-mail d\'alerte et corriger au plus vite');
  } catch (e) { problems.push('api.teamop.fr/health : injoignable — ' + e.message); }

  /* ⛔ 4. LE PLANCHER CRITIQUE — la seule chose qui manquait le 15 septembre 2026 au soir.
     Ce jour-là, un défaut de synchro faisait effacer le travail d'un collègue par un appareil
     qui écrivait un instantané périmé. Le correctif a été publié dans l'heure — mais un
     correctif de ce genre ne protège QUE l'appareil qui le porte : tant qu'un seul téléphone
     de l'équipe tourne en version antérieure, il peut encore effacer les données de TOUS les
     autres. Refermer le trou demande un second geste, dans la Tour : exiger la version.
     Ce geste est manuel, il se prend trois fois par an, et rien ne rappelait de le faire.
     D'où ce plancher. Il ne dit pas « la dernière version » — ça hurlerait après chaque
     publication. Il dit : EN DESSOUS DE CE NUMÉRO, UN APPAREIL PEUT ABÎMER LES DONNÉES DES
     AUTRES. On ne le monte donc que pour un correctif de cette nature, jamais pour une
     amélioration, et la surveillance ne se tait qu'une fois la Tour à jour. */
  const PLANCHER = 693;
  const PLANCHER_POURQUOI = 'v693 : en dessous, un appareil peut écrire un instantané périmé par-dessus le document de l\'équipe et effacer le travail des autres (course de synchro du 15 septembre 2026)';
  try {
    const rv = await get('https://api.teamop.fr/api/version');
    const jv = JSON.parse(rv.body);
    const min = parseInt(jv && jv.min, 10) || 0;
    if (!min) problems.push('aucun minimum de version n\'est exigé : toutes les vieilles versions écrivent encore dans le nuage');
    else if (min < PLANCHER) problems.push('minimum exigé v' + min + ', plancher critique v' + PLANCHER + ' — ' + PLANCHER_POURQUOI + '. À corriger dans la Tour : console OP GESTION → Surveillance → VERSIONS → « Exiger la dernière version »');
    else console.log('Minimum exigé : v' + min + ' (plancher critique v' + PLANCHER + ') — conforme');
  } catch (e) { problems.push('api.teamop.fr/api/version : illisible — ' + e.message); }

  if (problems.length) {
    console.error('PROBLÈMES DÉTECTÉS :\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('✅ Tout est OK — ' + pages.length + ' fichiers en ligne + serveur vérifiés.');
})();
