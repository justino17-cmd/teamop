// Compréhension : relève le texte de chaque écran de la partie « Devis » en mode application, signale les restes d'échafaudage, les mots anglais,
// les sigles, et sort le texte pour qu'on le RELISE comme un artisan de 55 ans. usage : node devis-atelier-mots.js [qui] [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v, fs = require('fs');
const ECHAF = /prototype|pour l.essai|exemple|démo|bientôt|à venir|simul|fictif|TODO|lorem|undefined|NaN|\[object|null\b/i;
const ANGLAIS = /\b(draft|submit|send|loading|error|click|save|cancel|delete|edit|view|download|upload|email|mail|pdf|ok|devis rapide)\b/i;
(async () => {
  const qui = process.argv[2] || 'marc', profil = process.argv[3] || 'mac';
  const c = await L.ouvrir({ profil, qui, hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const ecrans = [['liste-aenvoyer', 'devis', 'dvFiltre="aenvoyer"; rendre()'], ['liste-attente', 'devis', 'dvFiltre="attente"; rendre()'], ['liste-acceptes', 'devis', 'dvFiltre="accepte"; rendre()'], ['liste-perdus', 'devis', 'dvFiltre="perdu"; rendre()'], ['liste-tous', 'devis', 'dvFiltre="tous"; rendre()'],
    ['fiche-brouillon', 'devis-x-BR1'], ['fiche-attente-031', 'devis-x-D-2026-031'], ['fiche-attente-suite', 'devis-x-D-2026-041'], ['fiche-accepte-034', 'devis-x-D-2026-034'], ['fiche-accepte-040', 'devis-x-D-2026-040'], ['fiche-refuse-036', 'devis-x-D-2026-036'], ['fiche-expire-027', 'devis-x-D-2026-027'],
    ['p-rapide', 'devis', 'dvNouveau()'], ['p-rapide-neuf', 'devis', 'dvNouveau(); DVN_F.nv = true; dvNouveau()'], ['p-dicter', 'devis', 'dvDicter()'], ['p-client-voit', 'devis-x-D-2026-031', 'dvClient(DEVIS_REG["D-2026-031"])'], ['p-reponse', 'devis-x-D-2026-031', 'dvReponse(DEVIS_REG["D-2026-031"])'], ['p-relance', 'devis-x-D-2026-031', 'dvRelancer(DEVIS_REG["D-2026-031"])'], ['p-envoi', 'devis-x-BR1', 'DEVIS_REG["BR1"].lignes[0][2] = 1500; dvEnvoyer(DEVIS_REG["BR1"])']];
  const sortie = {}; let n = 0;
  for (const [nom, route, prep] of ecrans) {
    await O.neuf(c, route); if (prep) { await p.evaluate(prep); await L.calme(p, 400); }
    const t = await p.evaluate(() => { const ce = document.getElementById('contenu'), ca = document.querySelector('#calque .panneau'); return { page: ce ? ce.innerText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n') : '', fenetre: ca ? ca.innerText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n') : '' }; });
    sortie[nom] = t; n++;
    const tout = t.page + '\n' + t.fenetre; const e = (tout.match(new RegExp(ECHAF.source, 'gi')) || []);
    v('mots ' + nom + ' : aucun reste d’échafaudage ni valeur brute (' + (e.join(', ') || 'aucun') + ')', e.length === 0, e);
  }
  fs.writeFileSync(O.CAP + `mots-${qui}-${profil}.json`, JSON.stringify(sortie, null, 1));
  console.log('écrans lus :', n, ' erreurs de la page :', c.err.length);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
