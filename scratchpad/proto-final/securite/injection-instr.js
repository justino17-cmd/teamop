// Fabrique une COPIE INSTRUMENTÉE des pages (jamais les pages elles-mêmes) : chaque ${…} d'un gabarit est enveloppé dans
// __t(expr, ligne). __t rend la valeur telle quelle ; si elle contient une charge d'injection NON échappée, elle note la ligne.
// C'est ce qui permet de dire « la charge du champ n47 sort à la ligne 5 213 » sans lire 11 000 interpolations à la main.
// Les numéros de ligne sont ceux du fichier d'origine (on n'ajoute aucun retour à la ligne).
const fs = require('fs'), path = require('path'), acorn = require('/opt/node-tools/node_modules/acorn'), walk = require('/opt/node-tools/node_modules/acorn-walk');
const REPO = path.join(__dirname, '..', '..', '..'), OUT = process.env.OPG_INSTR || '/tmp/opg-instr';
const PAGES = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html', 'prototype-courrier.js'];
const TETE = `(function(){ var T = window.top; T.__orig = T.__orig || []; var RAW = /<i data-xss=(n\\d+)>|onerror="__xss\\('(n\\d+)'\\)"/;
  window.__t = function (v, l) { try { var s = typeof v === 'string' ? v : (Array.isArray(v) ? v.join(',') : null); if (s && s.length < 400000 && s.indexOf('data-xss') > -1) { var m = RAW.exec(s); if (m) T.__orig.push({ tok: m[1] || m[2], l: l, len: s.length, pg: location.pathname.split('/').pop() }); } } catch (e) {} return v; }; })();\n`;
function instrumenter(code, f, decal) { decal = decal || 0; const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, locations: true }); const tagues = new Set(); walk.simple(ast, { TaggedTemplateExpression(n) { tagues.add(n.quasi); } }); const ins = [];
  walk.full(ast, n => { if (n.type !== 'TemplateLiteral' || tagues.has(n)) return; n.expressions.forEach(x => { ins.push({ pos: x.start, t: '__t(', o: 0 }); ins.push({ pos: x.end, t: ',' + (x.loc.start.line + decal) + ')', o: 1 }); }); });
  ins.sort((a, b) => b.pos - a.pos || b.o - a.o); let out = code; for (const i of ins) out = out.slice(0, i.pos) + i.t + out.slice(i.pos); return out; }
// CONTRE-ÉPREUVE (OPG_CORRECTIFS=1) : la plus petite correction proposée dans injection.json est posée dans la COPIE instrumentée (jamais dans la page),
// et la même sonde doit alors tomber à zéro. Chaque remplacement doit trouver sa cible, sinon la sonde le dit : un correctif qui ne s'applique pas ne prouve rien.
const CORRECTIFS = [
  ['injection-01 : le nom d\'une personne sort échappé', "const eqNom = p => p.prenom + ' ' + p.nom;", "const eqNom = p => esc(p.prenom + ' ' + p.nom);"],
  ['injection-02 : l\'unité d\'un article sort échappée', "prU(q, (x || {}).u || 'u')", "esc(prU(q, (x || {}).u || 'u'))"],
];
exports.preparer = () => { fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'apercu'), { recursive: true });
  for (const e of fs.readdirSync(REPO)) { if (e === 'apercu' || e === '.git') continue; try { fs.symlinkSync(path.join(REPO, e), path.join(OUT, e)); } catch (x) {} }
  for (const e of fs.readdirSync(path.join(REPO, 'apercu'))) { if (PAGES.includes(e)) continue; try { fs.symlinkSync(path.join(REPO, 'apercu', e), path.join(OUT, 'apercu', e)); } catch (x) {} }
  for (const f of PAGES) { let src = fs.readFileSync(path.join(REPO, 'apercu', f), 'utf8'); let res;
    if (f.endsWith('.js')) res = TETE + instrumenter(src, f).replace(/^\uFEFF/, '');
    else { if (process.env.OPG_CORRECTIFS && f === 'prototype-op-gestion.html') for (const [nom, de, vers] of CORRECTIFS) { if (!src.includes(de)) throw new Error('correctif sans cible : ' + nom); src = src.split(de).join(vers); }
      const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g; let last = 0; res = ''; let m;
      while ((m = re.exec(src))) { const ouv = m[0].slice(0, m[0].indexOf('>') + 1); res += src.slice(last, m.index); last = m.index + m[0].length;
        if (/src=/.test(m[1]) || /type="?(application\/json|text\/template)/.test(m[1])) { res += m[0]; continue; }
        // deux lignes de tête dans le MÊME retour à la ligne : on ne décale rien
        res += ouv + instrumenter(m[2], f, src.slice(0, m.index + ouv.length).split('\n').length - 1) + '</script>'; }
      res += src.slice(last); res = res.replace(/<head[^>]*>/i, h => h + '<script>' + TETE.replace(/\n/g, ' ') + '</script>'); if (!/__t = function/.test(res)) res = '<script>' + TETE.replace(/\n/g, ' ') + '</script>' + res; }
    fs.writeFileSync(path.join(OUT, 'apercu', f), res); }
  // le module de courrier se charge par <script src> : son en-tête ne doit pas manquer à la page qui le charge
  return OUT; };
if (require.main === module) console.log(exports.preparer());
