// Outils communs des sondes d'injection (audit de sécurité, angle « injection », 16 novembre 2026).
// Une charge utile porte un NUMÉRO : si elle sort de son texte (balise créée, attribut ajouté, gestionnaire exécuté), le
// numéro dit QUEL champ l'a laissée sortir (table window.__champs : numéro → chemin dans les données).
const fs = require('fs'), path = require('path'), acorn = require('/opt/node-tools/node_modules/acorn');
const APERCU = path.join(__dirname, '..', '..', '..', 'apercu');
// noms déclarés au premier niveau d'une page (les données vivent dans des const/let de portée script, pas sur window)
exports.nomsPremierNiveau = f => { const src = fs.readFileSync(path.join(APERCU, f), 'utf8'), re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g, noms = new Set(); let m;
  while ((m = re.exec(src))) { if (/src=/.test(m[1])) continue; let ast; try { ast = acorn.parse(m[2], { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }); } catch (e) { continue; }
    for (const n of ast.body) if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') noms.add(d.id.name); }
  return [...noms]; };
// installé AVANT que la page charge, dans tous les cadres : note chaque exécution de charge utile
exports.INIT = `(() => { const top = window.top; top.__hits = top.__hits || []; window.__xss = k => { try { top.__hits.push(String(k)); } catch (e) {} };
  top.__puits = top.__puits || [];
  const RAW = /<i data-xss=(n\\d+)>|onerror="__xss\\('(n\\d+)'\\)"/, chk = (v, k) => { try { if (typeof v === 'string' && v.indexOf('data-xss') > -1) { const m = RAW.exec(v); if (m && top.__puits.length < 4000) top.__puits.push({ tok: m[1] || m[2], k, len: v.length, pile: new Error().stack.split('\\n').slice(2, 5).map(x => x.replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+\\/apercu\\//, '').trim()).join(' < ') }); } } catch (e) {} };
  const dI = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'); if (dI && dI.set) Object.defineProperty(Element.prototype, 'innerHTML', { ...dI, set(v) { chk(v, 'innerHTML'); return dI.set.call(this, v); } });
  const dO = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML'); if (dO && dO.set) Object.defineProperty(Element.prototype, 'outerHTML', { ...dO, set(v) { chk(v, 'outerHTML'); return dO.set.call(this, v); } });
  const iA = Element.prototype.insertAdjacentHTML; Element.prototype.insertAdjacentHTML = function (w, v) { chk(v, 'insertAdjacentHTML'); return iA.call(this, w, v); };
  window.addEventListener('error', () => {}); const _al = window.alert; window.alert = () => {}; window.confirm = () => true; window.prompt = () => ''; })();`;
// la charge : sort d'un attribut entre guillemets simples ou doubles, ferme une balise, crée un élément, exécute dans un gestionnaire
// en ligne (').__xss('n');('), et dans un gabarit de style (};…). Le « ¤n¤ » du début permet de la retrouver dans le HTML échappé.
exports.CHARGE = id => `¤${id}¤"'><i data-xss=${id}></i><img src=x onerror="__xss('${id}')">');__xss('${id}');//`;
// À exécuter DANS la page : mute les données (round 'A' = textes libres seulement, 'B' = tout sauf les identifiants)
exports.MUTER = `(({ noms, round, chargeSrc }) => { const charge = eval(chargeSrc); const champs = (window.__champs = window.__champs || {}); let n = window.__nchamps || 0; const vus = new WeakSet(); let vusNoms = [];
  const CLE_ID = round === 'A' ? /^(id|k|ids|cle|key|.*Id|.*ID|pid|cli|cid|tid|qui|tech|techs|four|lieu|int|fac|dev|ctr|lien|ref|etat|statut|status|type|metier|role|mode|col|couleur|color|bg|ic|ico|icone|icon|d|date|dt|h|heure|jour|mois|an|debut|fin|de|a|unite|tva|moment|prio|sens|onglet|vue|etape|plaque|iban|bic|siret|tel|cp)$/i : /^(id|k|ids|.*Id|.*ID|pid|cli|cid|tid)$/;
  const libre = (k, v) => { if (v.length < (round === 'A' ? 3 : 2) || v.length > 400) return false; if (CLE_ID.test(String(k))) return false; if (/^(data:|blob:|https?:)/.test(v)) return false;
    if (round === 'A') { if (/^[a-z0-9_.:\\-]{1,24}$/.test(v)) return false; if (/^[\\d\\s,.:\\/h€%+-]*$/.test(v)) return false; if (!/[A-Za-zÀ-ÿ]/.test(v)) return false; } return true; };
  const rec = (o, chemin, prof) => { if (!o || typeof o !== 'object' || vus.has(o) || prof > 9) return; if (o instanceof Node || o === window || o instanceof Event || ArrayBuffer.isView(o) || o instanceof Date || o instanceof RegExp || o instanceof Map || o instanceof Set) return; vus.add(o);
    for (const k of Object.keys(o)) { let v; try { v = o[k]; } catch (e) { continue; }
      if (typeof v === 'string') { if (!libre(k, v)) continue; const id = 'n' + (++n); champs[id] = chemin + '.' + k; try { o[k] = charge(id); } catch (e) {} }
      else if (v && typeof v === 'object') rec(v, chemin + '.' + k, prof + 1); } };
  for (const nom of noms) { let v; try { v = (0, eval)(nom); } catch (e) { continue; } if (v && typeof v === 'object' && !(v instanceof Node) && v !== window) { rec(v, nom, 0); vusNoms.push(nom); } }
  window.__nchamps = n; return { champs: n, noms: vusNoms.length }; })`;
// À exécuter DANS la page (et dans chaque cadre) : ce que le DOM contient de dangereux, et quelles charges y sont vues (échappées ou non)
exports.LIRE = `(() => { const d = document, sorti = [], vues = new Set(); 
  d.querySelectorAll('[data-xss]').forEach(e => sorti.push({ sorte: 'balise', champ: e.getAttribute('data-xss'), tag: e.parentElement ? e.parentElement.tagName + '.' + String(e.parentElement.className).slice(0, 30) : '' }));
  d.querySelectorAll('*').forEach(e => { for (const a of e.attributes) { if (a.name === 'data-xss') continue; if (/^on/i.test(a.name) && /__xss/.test(a.value)) { const m = /__xss\\(.(n\\d+)/.exec(a.value); sorti.push({ sorte: 'gestionnaire ' + a.name + ' sur ' + e.tagName, champ: m ? m[1] : '?' }); }
      if (/^(href|src|action|formaction|data|xlink:href)$/i.test(a.name) && /^\\s*(javascript|vbscript|data:text\\/html)/i.test(a.value)) { const m = /(n\\d+)/.exec(a.value); sorti.push({ sorte: 'url dangereuse ' + a.name + ' sur ' + e.tagName, champ: m ? m[1] : '?' }); }
      if (a.name === 'style' && /¤n\\d+¤/.test(a.value) && /(expression|url\\(|behavior|@import)/i.test(a.value)) { const m = /¤(n\\d+)¤/.exec(a.value); sorti.push({ sorte: 'style ' + e.tagName, champ: m ? m[1] : '?' }); } } });
  const h = d.documentElement.outerHTML, re = /¤(n\\d+)¤/g; let m; while ((m = re.exec(h))) vues.add(m[1]);
  return { sorti, vues: [...vues], hits: (window.top.__hits || []).slice() }; })()`;
