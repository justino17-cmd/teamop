// Outils de la campagne « métiers » (17 novembre 2026) : ouvrir le prototype EN MODE APPLICATION, poser les métiers de l'entreprise
// comme le ferait TEAM OP à l'ouverture du compte (mchPoser : l'application n'offre aucun écran pour les choisir), puis lire ce que
// chaque rôle voit. ⚠️ Les données de démonstration (clients, interventions, stock) sont celles d'« Clim Services 17 » : un mot de
// climatisation dans une DONNÉE d'exemple est noté à part d'un mot de climatisation dans un TEXTE de l'application.
const L = require('../../lib.js');
exports.L = L;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-metier-3d/';
exports.METIERS = { clim:['climatisation'], demo:['climatisation', 'chauffage', 'plomberie'], d3:['3d'], d3clim:['3d', 'climatisation'], plomb:['plomberie'], chauf:['chauffage'], nett:['nettoyage'], elec:['electricite'] };
// ouvre l'application pour une personne et pose les métiers (liste de clés de PACKS)
exports.ouvrir = async o => { o = o || {}; const c = await L.ouvrir({ profil: o.profil || 'mac', nuit: !!o.nuit, qui: o.qui === undefined ? 'marc' : o.qui, app: true, attente: 1500 });
  if (o.packs) await exports.poser(c.p, o.packs); return c; };
exports.poser = async (p, packs) => { await p.evaluate(l => { mchPoser(l); }, packs); await L.calme(p, 500); };
// les lignes de menu que la personne voit, par groupe (CATS est la table qui nourrit menu, feuille « Menu », recherche et barre)
exports.menu = p => p.evaluate(() => CATS.map(([g, l]) => [g, l.map(x => x[0] + ':' + x[2])]));
// lit l'écran : titre, texte visible, champs (placeholder, valeur), options des listes
exports.lire = p => p.evaluate(() => { const c = document.getElementById('contenu'); const q = document.querySelector('#calque .panneau') || [...document.querySelectorAll('.fen')].find(x => x.offsetParent !== null || getComputedStyle(x).position === 'fixed');   // la fenêtre de création (.fen) est une autre pièce que le panneau
  const zone = q || c; const champs = [...zone.querySelectorAll('input,textarea,select')].map(e => ({ t: e.tagName, ph: e.getAttribute('placeholder') || '', v: (e.tagName === 'SELECT' ? [...e.options].map(o => o.textContent.trim()).join(' | ') : (e.value || '')).slice(0, 300) }));
  return { route: typeof route !== 'undefined' ? route : '', h1: ((c.querySelector('h1') || {}).textContent || '').trim(), texte: (zone.innerText || '').replace(/\s+/g, ' ').trim(), champs, panneau: !!q }; });
exports.nettoyer = async p => { await p.evaluate(() => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 150); };
// mots qui n'ont rien à faire dans un texte d'un métier qui n'est pas le leur
exports.MOTS_CLIM = /clim(?:atisation|atiseur)?\b|\bsplit\b|frigorig|\bR-?32\b|R-?410|daikin|pompe à chaleur|groupe froid|unité extérieure|unité intérieure|\bPAC\b|gainable|cassette/i;
exports.MOTS_3D = /rongeur|\brats?\b|nuisible|biocide|xylophage|dératis|deratis|appât|appat|cafard|punaise|capricorne|vrillette|termite|désinsect|desinsect|\b3D\b|hygiène anti/i;
exports.bilan = (nom, ok, ko, notes) => { console.log('\n' + nom + ' : ' + ok + ' ✓ · ' + ko + ' ✗'); (notes || []).forEach(n => console.log('  · ' + n)); return ko ? 1 : 0; };
// le corpus des DONNÉES d'exemple (tables de démonstration) : un relevé est une donnée si le mot, avec son voisin de gauche ou de droite, s'y lit tel quel
// « Clim Services 17 » est le NOM de l'entreprise de démonstration : jamais un mot de climatisation à relever
exports.donnees = async p => { const corpus = await p.evaluate(() => { const bruts = []; const marcher = (o, d) => { if (d > 5 || o == null) return; if (typeof o === 'string') { if (o.length > 4) bruts.push(o); return; } if (typeof o !== 'object') return; for (const k of Object.keys(o).slice(0, 400)) marcher(o[k], d + 1); };
    ['INTS', 'CLIENTS', 'TACHES', 'PRODUITS', 'MES_FOURN', 'FOURN_DIR', 'JOURNAL', 'DEVIS_REG', 'CONTRATS', 'COMMANDES', 'EQUIPE', 'ABSENCES', 'ACHATS', 'DEMANDES_ACHAT', 'BOXES', 'STOCK', 'VEHICULES', 'MESSAGES', 'NOTES', 'FICHES'].forEach(n => { try { marcher(eval(n), 0); } catch (e) {} });
    return bruts.map(x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')); });
  const joint = corpus.join(' ¦ '), norm = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  const dansPh = (txt, i) => { const a = txt.lastIndexOf('CHAMP[', i); if (a < 0) return false; const seg = txt.slice(a + 6, i); return !seg.includes('|') && !seg.includes(']'); };
  const estDonnee = (txt, i, mot) => { if (dansPh(txt, i)) return false; const g = txt.slice(0, i).match(/(\S+)\s*$/), d = txt.slice(i + mot.length).match(/^\s*(\S+)/); return [g && norm(g[1] + ' ' + mot), d && norm(mot + ' ' + d[1])].filter(Boolean).some(x => joint.includes(x)); };
  const trouver = (txt, re) => { const r = [], g = new RegExp(re.source, 'gi'); let m; while ((m = g.exec(txt))) { r.push({ mot: m[0], ctx: txt.slice(Math.max(0, m.index - 45), m.index + m[0].length + 45), donnee: estDonnee(txt, m.index, m[0]) || /^clim(\s+services|services17)/i.test(txt.slice(m.index)) }); if (r.length > 40) break; } return r; };
  return { estDonnee, trouver, taille: corpus.length }; };
