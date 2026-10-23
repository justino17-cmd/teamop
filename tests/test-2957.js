/* ⛔ TEST-2957 — LA SENTINELLE NE PARLE À LA CONSOLE QUE DEPUIS teamop.fr (23 octobre 2026).
   21 « api.teamop.fr injoignable sur /api/devis/etat » sont arrivés dans la Tour en v772-beta, une version qu'aucun client n'avait :
   une sonde au navigateur jouait une copie locale de la bêta sur 127.0.0.1, sans réseau vers api.teamop.fr, et la balise de la
   sentinelle (sendBeacon, sans requête préalable CORS) remontait chaque « Failed to fetch ». On exécute ici la VRAIE ligne de garde
   d'app.html et de beta.html avec plusieurs adresses, et on vérifie qu'elle passe AVANT tout le reste de la sentinelle. */
'use strict';
const fs = require('fs'), path = require('path');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : ' — ' + d)); };
for (const nom of ['app.html', 'beta.html']) {
  console.log('\n' + nom);
  const src = fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
  const debut = src.indexOf("try{ if(localStorage.getItem('top_monitor_off')==='1') return; }catch(_){ }");
  const tm = src.indexOf("var TM_APP='opgestion'", debut);
  vrai('(population) la sentinelle est trouvée', debut > 0 && tm > debut);
  const entre = src.slice(debut, tm).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  const garde = (entre.match(/try\{ if\(!\/[^\n]*teamop[^\n]*\) return; \}catch\(_\)\{ return; \}/) || [''])[0];
  vrai('la garde de l’adresse est posée avant tout le reste de la sentinelle', !!garde, entre.slice(0, 300));
  const joue = h => Function('location', garde + "\nreturn 'parle';")({ hostname: h });
  const parle = h => { try { return joue(h) === 'parle'; } catch (e) { return 'jette'; } };
  for (const h of ['teamop.fr', 'www.teamop.fr']) vrai('depuis ' + h + ' : elle parle', parle(h) === true);
  for (const h of ['127.0.0.1', 'localhost', '', 'teamop.fr.exemple.com', 'faux-teamop.fr.evil.com', 'nonteamop.fr']) vrai('depuis « ' + h + ' » : elle se tait', parle(h) === false);
  vrai('sans `location` (page étrange) : elle se tait au lieu de jeter', (() => { try { return Function(garde + "\nreturn 'parle';")() === undefined; } catch (e) { return false; } })());
}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
