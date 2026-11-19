// Campagne « métiers » : un mot d'un AUTRE métier traîne-t-il dans les textes de l'application ? Pour un métier donné, on ouvre chaque
// écran du menu du gérant, puis chaque bouton de CRÉATION de l'écran (＋, Nouveau, Créer…), on lit le texte visible, les indications
// des champs, les choix des listes, et on relève les mots de climatisation (chez qui n'en fait pas) et de 3D (chez qui n'en fait pas).
// Usage : node metier-3d-mots.js <jeux de métiers : clés séparées par des virgules, jeux séparés par des points-virgules> [profil] [qui] [écrans]   → écrit la liste dans le dossier de captures.
// 5e argument facultatif : seulement ces écrans (clés de CATS séparées par des virgules).
// Ne conclut pas seule : les données d'exemple (clients, interventions) sont celles d'une entreprise de climatisation ; chaque
// relevé porte l'écran, la fenêtre et 90 caractères de contexte, et on classe à la main « texte » ou « donnée d'exemple ».
const fs = require('fs'), O = require('./metier-3d-outils.js'), L = O.L;
const JEUX = (process.argv[2] || 'plomberie').split(';').map(x => x.split(',')), profil = process.argv[3] || 'mac', qui = process.argv[4] || 'marc', seules = process.argv[5] ? process.argv[5].split(',') : null;
const trouver = (txt, re, estD) => { const r = [], g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = g.exec(txt))) { r.push({ mot: m[0], ctx: txt.slice(Math.max(0, m.index - 45), m.index + m[0].length + 45), donnee: estD ? estD(txt, m.index, m[0]) : false }); if (r.length > 40) break; } return r; };
(async () => { for (const packs of JEUX) {
  const avecClim = packs.includes('climatisation'), avec3d = packs.includes('3d');
  const c = await O.ouvrir({ profil, qui, packs }), p = c.p, rel = [], vus = new Set(); let ecrans = 0, boutons = 0, touches = 0;
  // le corpus des données d'exemple : toutes les chaînes des tables de démonstration, en minuscules sans accents
  const corpus = await p.evaluate(() => { const bruts = []; const marcher = (o, d) => { if (d > 5 || o == null) return; if (typeof o === 'string') { if (o.length > 4) bruts.push(o); return; } if (typeof o !== 'object') return; for (const k of Object.keys(o).slice(0, 400)) marcher(o[k], d + 1); };
    ['INTS', 'CLIENTS', 'TACHES', 'PRODUITS', 'MES_FOURN', 'FOURN_DIR', 'JOURNAL', 'DEVIS_REG', 'CONTRATS', 'COMMANDES', 'EQUIPE', 'ABSENCES', 'ACHATS', 'DEMANDES_ACHAT', 'BOXES', 'STOCK', 'VEHICULES', 'MESSAGES', 'NOTES'].forEach(n => { try { marcher(eval(n), 0); } catch (e) {} });
    return bruts.map(x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')); });
  const joint = corpus.join(' ¦ ');
  const norm = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  // un relevé est une DONNÉE si le mot, avec son voisin de gauche ou de droite, se lit tel quel dans une table de démonstration
  const dansPh = (txt, i) => { const a = txt.lastIndexOf('CHAMP[', i); if (a < 0) return false; const seg = txt.slice(a + 6, i); return !seg.includes('|') && !seg.includes(']'); };   // une indication de champ (placeholder) n'est JAMAIS une donnée d'exemple
  // « de l’unité extérieure » : l'apostrophe colle au mot ; sans ça, la donnée d'une intervention de démonstration n'était jamais reconnue (rejeu du 19/11)
  const estDonnee = (txt, i, mot) => { if (dansPh(txt, i)) return false; const g = txt.slice(0, i).match(/(\S+)\s*$/), d = txt.slice(i + mot.length).match(/^\s*(\S+)/); const f = [g && norm(g[1] + (/['’]$/.test(g[1]) ? '' : ' ') + mot), d && norm(mot + ' ' + d[1])].filter(Boolean); return f.some(x => joint.includes(x)); };
  const lire = async (ou) => { const e = await O.lire(p); const t = [e.texte, ...e.champs.map(x => 'CHAMP[' + x.ph + '|' + x.v + ']')].join(' ¦ ');
    const hits = [...trouver(t, /prototype|pour l.essai|dans ce prototype|Exemple pour|clients fictifs|données? fictives?|\bfictif/i).map(h => ({ ...h, famille: 'échafaudage' })), ...(avecClim ? [] : trouver(t, O.MOTS_CLIM, estDonnee).map(h => ({ ...h, famille: 'clim' }))), ...(avec3d ? [] : trouver(t, O.MOTS_3D, estDonnee).map(h => ({ ...h, famille: '3d' })))];
    for (const h of hits) { const cle = ou + '|' + h.famille + '|' + h.ctx; if (vus.has(cle)) continue; vus.add(cle); rel.push({ ou, ...h }); }
    return e; };
  const routes = (await p.evaluate(() => CATS.flatMap(([g, l]) => l.map(x => x[0])))).filter(r => !seules || seules.includes(r));
  for (const r of routes) {
    await p.evaluate(x => aller(x), r); await L.calme(p, 600); ecrans++; await lire(r);
    const g = await L.gestes(p, '#contenu'); const crea = g.filter(x => /^(＋|\+|Nouveau|Nouvelle|Créer|Ajouter|Saisir|Enregistrer un|Faire un|Demander)/i.test(x.lib));
    boutons += crea.length;
    for (const b of crea.slice(0, 6)) {
      await p.evaluate(x => aller(x), r); await L.calme(p, 400);
      const ok = await p.evaluate(lib => { const e = [...document.querySelectorAll('#contenu button,#contenu a,#contenu [role=button],#contenu [data-go]')].find(x => (x.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) === lib && x.offsetParent !== null); if (!e) return false; e.click(); return true; }, b.lib);
      await L.calme(p, 600); if (!ok) continue; touches++;
      await lire(r + ' ▸ ' + b.lib);
      await O.nettoyer(p);
    }
  }
  console.log(JSON.stringify({ packs, profil, ecrans, boutonsCreation: boutons, touches, erreurs: c.err.length }));
  fs.writeFileSync(O.CAP + 'mots-' + packs.join('+') + '-' + profil + '.json', JSON.stringify(rel, null, 1));
  const par = {}; console.log('relevés : ' + rel.filter(h => h.donnee).length + ' dans des données d\'exemple (écartés), ' + rel.filter(h => !h.donnee).length + ' dans des TEXTES'); rel.filter(h => !h.donnee).forEach(h => { (par[h.ou.split(' ▸ ')[0]] = par[h.ou.split(' ▸ ')[0]] || []).push(h); });
  for (const [k, v] of Object.entries(par)) { console.log('## ' + k + ' (' + v.length + ')'); v.slice(0, 8).forEach(h => console.log('   [' + h.famille + '] ' + h.ou.replace(k, '').replace(' ▸ ', '▸') + ' : …' + h.ctx.replace(/\s+/g, ' ') + '…')); }
  await L.fin(c); }
  await L.fermer();
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
