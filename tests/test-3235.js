/* ⛔ CE QUE CE FICHIER GARDE — LA PASTILLE « Messagerie » DE LA TOUR EST UN ROND QUI SUIT OP MESSAGES (30 octobre 2026, Tour v2.127).

   Justin : « ça m'affiche 13 messages alors que pas du tout ; un petit rond quand j'ai une notification dans OP MESSAGES, et quand il n'y a plus rien,
   que ça n'affiche rien ». Le 13 additionnait les non-lus de l'ANCIENNE messagerie de la Tour. Les VRAIES `msBadge` et `opmsgNonLusCharger` de tour.html :
     1. pont présent : un ROND (classe `bdg-point`, aucun chiffre) s'il reste un non-lu dans OP MESSAGES ou un mail de Pauline ; RIEN sinon — l'ancien compteur
        ne compte plus ;
     2. « on ne sait pas » (nonLus null) garde l'état d'avant, n'allume ni n'éteint rien ;
     3. sans pont : l'ancien compteur, inchangé. Le côté serveur (OP MESSAGES → Tour) est joué de bout en bout par test-3095. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const corps = nom => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return ''; let p = SRC.indexOf('{', i), n = 0, j = p; for (; j < SRC.length; j++) { if (SRC[j] === '{') n++; else if (SRC[j] === '}' && --n === 0) break; } return SRC.slice(i, j + 1); };
console.log('\n── 3235 · la pastille Messagerie suit OP MESSAGES ──');
const src = ['msBadge', 'opmsgNonLusCharger', 'setBdg'].map(corps).join('\n');
v('(population) les trois fonctions sont trouvées dans tour.html', ['msBadge', 'opmsgNonLusCharger', 'setBdg'].every(n => src.includes('function ' + n + '(')), true);
function monter(reponse) {
  const el = id => ({ id, textContent: '0', style: { display: 'none' }, cls: new Set(), attrs: {}, classList: { toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, remove(c) { this._s.delete(c); }, add(c) { this._s.add(c); }, _s: null }, setAttribute(k, x) { this.attrs[k] = x; }, get offsetWidth() { return 0; } });
  const E = { 'bdg-msgr': el('bdg-msgr'), 'bdg-msgr-bas': el('bdg-msgr-bas') };
  Object.values(E).forEach(e => { e.classList._s = e.cls; });
  const W = { $: id => E[id] || null, MYROLE: 'patron', MS: { nonLus: 13 }, MS_PA: { n: 0 }, attendCompte: () => 0, renderBarreBas() {}, majHaut() {}, majBarreBas() {}, tiroirRafraichir() {},
    apiGet: async () => reponse.d, console };
  vm.createContext(W); vm.runInContext(src, W);
  return { W, E };
}
const etat = e => ({ visible: e.style.display !== 'none', rond: e.cls.has('bdg-point'), texte: String(e.textContent) });
(async () => {
  const R = { d: { ok: true, pont: true, nonLus: 2 } }, { W, E } = monter(R);
  W.msBadge();
  v('sans réponse encore : l’ancien compteur (13) — c’est lui qui s’affichait à tort', etat(E['bdg-msgr']), { visible: true, rond: false, texte: '13' });
  W.opmsgNonLusCharger(); await new Promise(r => setTimeout(r, 5));
  v('⛔ pont présent, 2 non-lus dans OP MESSAGES : un ROND, sans chiffre (le 13 ne compte plus)', [etat(E['bdg-msgr']).visible, etat(E['bdg-msgr']).rond, /\d/.test(E['bdg-msgr'].textContent)], [true, true, false]);
  v('… et le rond de la barre du bas aussi', E['bdg-msgr-bas'].cls.has('bdg-point'), true);
  R.d = { ok: true, pont: true, nonLus: null }; W.opmsgNonLusCharger(); await new Promise(r => setTimeout(r, 5));
  v('⛔ « on ne sait pas » (OP MESSAGES muet) : le rond reste comme il était', etat(E['bdg-msgr']).rond, true);
  R.d = { ok: true, pont: true, nonLus: 0 }; W.opmsgNonLusCharger(); await new Promise(r => setTimeout(r, 5));
  v('⛔ tout lu dans OP MESSAGES : RIEN ne s’affiche', [etat(E['bdg-msgr']).visible, etat(E['bdg-msgr']).rond], [false, false]);
  W.MS_PA.n = 1; W.msBadge();
  v('un mail de Pauline à valider rallume le rond', [etat(E['bdg-msgr']).visible, etat(E['bdg-msgr']).rond], [true, true]);
  const S = monter({ d: { ok: true, pont: false, nonLus: null } }); S.W.opmsgNonLusCharger(); await new Promise(r => setTimeout(r, 5));
  v('sans pont : l’ancien compteur, inchangé', etat(S.E['bdg-msgr']), { visible: true, rond: false, texte: '13' });
  v('le style du rond existe (9 px, sans chiffre)', /\.bdg-r\.bdg-point,\.bdg-b\.bdg-point\{min-width:0;width:9px;height:9px;padding:0;font-size:0/.test(SRC), true);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
