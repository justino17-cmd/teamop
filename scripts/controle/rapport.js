/* Le carnet de bord du contrôle : chaque ÉTAPE du parcours (ce que le client fictif a fait, ce qu'il a vu), et les
   CONSTATS qu'on en tire, rangés par gravité. Il écrit `rapport.json` (pour un agent ou un banc) et `rapport.md`
   (pour Justin, en français, lisible sur un téléphone).

   Trois gravités, pas plus — un rapport qui crie pour tout se fait ignorer, puis désactiver (CLAUDE.md) :
     · bloquant  : le client ne peut pas aller plus loin (une page qui ne s'ouvre pas, un paiement qui n'aboutit pas) ;
     · défaut    : il avance, mais quelque chose est faux (une erreur JavaScript, un texte « undefined », une route en 500) ;
     · à regarder : rien n'est cassé, mais un humain doit trancher (une cible petite au doigt, un appel coupé vers l'extérieur).
   Une étape qui n'a pas pu se JOUER se dit « non jouée », jamais « réussie » : un vert sur un geste qui n'a pas eu lieu
   est la panne type de ce dépôt (« une sonde qui clique doit compter ses frappes qui ont vraiment porté »). */
'use strict';
const fs = require('fs'), path = require('path');

function carnet(sortie, entete) {
  const etapes = [], constats = [];
  const t0 = Date.now();
  const constat = (gravite, titre, detail, etape) => { constats.push({ gravite, titre, detail: detail === undefined ? '' : String(detail).slice(0, 1200), etape: etape || '' }); };
  /* Joue une étape : son verdict est CE QUE LA FONCTION REND (vrai = réussie). Une exception, ou un rendu faux, la
     marque échouée ; `bloquante` arrête le parcours (on ne fait pas semblant de continuer sur un écran qui n'existe pas). */
  async function etape(nom, fn, opts) {
    const o = opts || {}; const d = Date.now(); const e = { nom, statut: 'non jouée', ms: 0, notes: [], captures: [] };
    etapes.push(e);
    if (o.si === false) { e.notes.push(o.pourquoi || 'condition non remplie'); return null; }
    /* après un bloquant, la suite n'est PAS jouée : la dire « échouée » en cascade noierait la vraie cause */
    const avant = constats.find(c => c.gravite === 'bloquant');
    if (avant && !o.toujours) { e.notes.push('arrêtée : « ' + avant.etape + ' » a bloqué le parcours'); return null; }
    try {
      const r = await fn({ note: t => e.notes.push(String(t).slice(0, 400)), capture: f => f && e.captures.push(path.basename(f)) });
      e.statut = r === false || r === null || r === undefined ? 'échouée' : 'réussie';
      e.ms = Date.now() - d;
      if (e.statut === 'échouée') constat(o.bloquante ? 'bloquant' : 'défaut', 'Étape échouée : ' + nom, e.notes.slice(-2).join(' · '), nom);
      return r;
    } catch (x) {
      e.statut = 'échouée'; e.ms = Date.now() - d; e.notes.push('exception : ' + String(x && x.message || x).slice(0, 400));
      constat(o.bloquante ? 'bloquant' : 'défaut', 'Étape échouée : ' + nom, String(x && x.message || x), nom);
      return null;
    }
  }
  const bloque = () => constats.some(c => c.gravite === 'bloquant');

  function ecrire(extra) {
    const ordre = { bloquant: 0, 'défaut': 1, 'à regarder': 2 };
    constats.sort((a, b) => ordre[a.gravite] - ordre[b.gravite]);
    const n = g => constats.filter(c => c.gravite === g).length;
    const json = Object.assign({ entete, duree_s: Math.round((Date.now() - t0) / 1000), resume: { etapes: etapes.length,
      reussies: etapes.filter(e => e.statut === 'réussie').length, echouees: etapes.filter(e => e.statut === 'échouée').length,
      non_jouees: etapes.filter(e => e.statut === 'non jouée').length, bloquants: n('bloquant'), defauts: n('défaut'), a_regarder: n('à regarder') },
      etapes, constats }, extra || {});
    fs.writeFileSync(path.join(sortie, 'rapport.json'), JSON.stringify(json, null, 2));
    const icone = { 'réussie': '✅', 'échouée': '❌', 'non jouée': '⏸️' }, gIcone = { bloquant: '⛔', 'défaut': '❌', 'à regarder': '⚠️' };
    const r = json.resume;
    const md = ['# Contrôle — client mystère', '',
      entete.date + ' · ' + entete.source + ' · profil ' + entete.profil + ' · ' + json.duree_s + ' s', '',
      '**Verdict : ' + (r.bloquants ? '⛔ BLOQUÉ' : r.defauts ? '❌ DÉFAUTS' : r.a_regarder ? '⚠️ À REGARDER' : '✅ RAS') + '** — ' +
        r.reussies + '/' + r.etapes + ' étapes réussies, ' + r.bloquants + ' bloquant(s), ' + r.defauts + ' défaut(s), ' + r.a_regarder + ' à regarder.', '',
      '## Le parcours', '', ...etapes.map((e, i) => (i + 1) + '. ' + icone[e.statut] + ' ' + e.nom + (e.ms ? ' (' + (e.ms / 1000).toFixed(1) + ' s)' : '') +
        (e.notes.length ? '\n   ' + e.notes.join('\n   ') : '') + (e.captures.length ? '\n   📷 ' + e.captures.join(', ') : '')), '',
      '## Les constats', '', ...(constats.length ? constats.map(c => '- ' + gIcone[c.gravite] + ' **' + c.titre + '**' + (c.etape ? ' — _' + c.etape + '_' : '') + (c.detail ? '\n  ' + c.detail.replace(/\n/g, '\n  ') : '')) : ['Aucun.']), '',
      '## Ce que ce contrôle ne voit pas', '', ...(entete.limites || []).map(l => '- ' + l), ''];
    fs.writeFileSync(path.join(sortie, 'rapport.md'), md.join('\n'));
    return json;
  }
  return { etape, constat, ecrire, bloque, etapes, constats };
}

module.exports = { carnet };
