/* test-3248 — LA RECHERCHE DE LA BOÎTE MAIL FILTRE VRAIMENT (4 novembre 2026, Justin : « dans Boîte mail, la barre de recherche ne marche pas »).
 *
 * Mesuré au navigateur avant toute hypothèse : la frappe arrivait dans le champ, l'écouteur `input` tournait (la ligne prenait `has-q`),
 * et la liste ne bougeait pas — sans une erreur. La cause : le module vit dans un ARBRE D'OMBRE, et à la fin de la diffusion le
 * navigateur vide `e.target` d'un événement né dans une ombre (spécification DOM, « clear targets ») ; l'écouteur lisait
 * `e.target.value` 120 ms plus tard, dans un `setTimeout` : `undefined`, donc `state.query` jamais posé. La valeur se lit désormais
 * pendant l'événement.
 * Ce banc monte le VRAI `opcourrier.js` dans Chromium, avec une source fictive (reçus, dont une réponse de fournisseur rattachée à un
 * bon), tape au clavier, et compte les lignes ; il joue aussi la vraie `courrierCorps` d'app.html (le n° de bon devient trouvable).
 * Contre-épreuve : `MUTER=1` remet la lecture différée — le banc doit tomber. */
const fs = require('fs'), path = require('path'), http = require('http');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const r = JSON.stringify(a) === JSON.stringify(b); r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d).slice(0, 300))); };

let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('  … SAUTÉ : playwright absent'); console.log('\n0 ✓  0 ✗'); process.exit(0); }
let OPC = fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8');
if (process.env.MUTER) OPC = OPC.replace(/var champ=e\.currentTarget\|\|e\.target, v=String\(champ\.value\|\|""\);([^\n]*?)state\.query=v;/, (m, mid) => 'var champ=e.currentTarget||e.target, v=String(champ.value||"");' + mid + 'state.query=e.target&&e.target.value;');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const corps = (() => { const i = APP.indexOf('function courrierCorps('); return i < 0 ? '' : APP.slice(i, APP.indexOf('\n', i)); })();

console.log('\n── 3248 · 0. la vraie courrierCorps (app.html) ──');
vrai('courrierCorps est trouvée', corps.length > 40, corps.length);
const courrierCorps = corps ? new Function(corps + '; return courrierCorps;')() : () => '';
v('le n° de bon s\'ajoute au texte lu (donc à la recherche)', courrierCorps({ text: 'Livraison mardi', bonNum: 'BC-2026-012' }), 'Livraison mardi\n\nBon de commande BC-2026-012');
v('… sans doublon quand le texte le porte déjà', courrierCorps({ text: 'Votre BC-2026-012 part', bonNum: 'BC-2026-012' }), 'Votre BC-2026-012 part');
v('… et sans rien quand il n\'y a pas de bon', courrierCorps({ text: 'Bonjour' }), 'Bonjour');

const REPS = [
  { id: 'm1', de: { nom: 'Zoé Kwazulu', email: 'zoe@client-kwzyx.fr' }, a: 'Ent', objet: 'Re: Devis DV-77', corps: 'Je valide le devis climatiseur', date: Date.now() - 1000, lu: false, pj: [] },
  { id: 'm2', de: { nom: 'Fournisseur Wyzk', email: 'commandes@fourn-wyzk.fr' }, a: 'Ent', objet: 'Re: Bon de commande', corps: courrierCorps({ text: 'Livraison mardi', bonNum: 'BC-2026-012' }), date: Date.now() - 2000, lu: false, pj: [], automatique: false },
  { id: 'm3', de: { nom: 'Paul Qzx', email: 'paul@autre-qzx.fr' }, a: 'Ent', objet: 'Question facture', corps: 'Merci pour la facture', date: Date.now() - 3000, lu: false, pj: [], automatique: false }];
const PAGE = `<!doctype html><meta charset="utf-8"><div id="z" style="width:1440px;height:860px"></div><script src="/opc.js"></script><script>
  const reps=${JSON.stringify(REPS)};
  window.__inst=OPCourrier.monter(document.getElementById('z'),{cotes:['pro'],cleStockage:'banc3247',source:{
    async capacites(){ return {dossiers:['inbox'],destinataires:1,pj:{nombre:3,octets:1e6}}; },
    async boites(){ return [{id:'b1',email:'contact@ent-qzx.fr',nom:'Ent',cote:'pro'}]; },
    async messages({dossier}){ return dossier==='inbox'?reps:[]; },
    async envoyer(){}, async ajouterBoite(){ throw new Error('non'); }, async retirerBoite(){} }});
</script>`;

(async () => {
  const srv = http.createServer((q, r) => { if (q.url.startsWith('/opc.js')) { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(OPC); } r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); r.end(PAGE); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch();
  try {
    for (const [nom, vp] of [['bureau', { width: 1440, height: 900 }], ['téléphone', { width: 390, height: 844 }]]) {
      console.log('\n── 3248 · ' + nom + (process.env.MUTER ? ' (MUTÉ)' : '') + ' ──');
      const p = await b.newPage({ viewport: vp, isMobile: nom !== 'bureau', hasTouch: nom !== 'bureau' }); const err = [];
      p.on('pageerror', e => err.push(e.message));
      await p.goto('http://127.0.0.1:' + srv.address().port + '/', { timeout: 30000 }); await p.waitForTimeout(1500);
      const etat = () => p.evaluate(() => { const sr = document.querySelector('[data-opcourrier]').shadowRoot;
        return { lignes: [...new Set([...sr.querySelectorAll('#rows [data-id]')].map(e => e.getAttribute('data-id').split(':').pop()))].sort(), vide: (sr.querySelector('#rows .empty') || {}).innerText || '' }; });
      const taper = async (txt) => { const pos = await p.evaluate(() => { const s = document.querySelector('[data-opcourrier]').shadowRoot.querySelector('#search'); const r = s.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; });
        await p.mouse.click(pos[0], pos[1]); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace'); if (txt) await p.keyboard.type(txt, { delay: 15 }); await p.waitForTimeout(450); return pos[2]; };
      const avant = await etat();
      vrai('population : la réception montre des messages avant la recherche', avant.lignes.length >= 2, avant);
      vrai('le champ de recherche est visible', (await taper('')) > 0);
      await taper('kwazulu'); v('par expéditeur (nom) : « kwazulu » → le seul message de Zoé', (await etat()).lignes, ['m1']);
      await taper('fourn-wyzk'); v('par adresse : « fourn-wyzk » → le fournisseur', (await etat()).lignes, ['m2']);
      await taper('DV-77'); v('par objet : « DV-77 »', (await etat()).lignes, ['m1']);
      await taper('climatiseur'); v('par texte : « climatiseur »', (await etat()).lignes, ['m1']);
      await taper('BC-2026-012'); v('par numéro de bon : « BC-2026-012 » → la réponse du fournisseur', (await etat()).lignes, ['m2']);
      await taper('zzznada'); const e0 = await etat();
      vrai('rien ne correspond : la liste est vide et dit « Aucun message pour « zzznada » »', e0.lignes.length === 0 && /Aucun message/.test(e0.vide) && /zzznada/.test(e0.vide), e0);
      await taper(''); vrai('le champ vidé : tout revient', (await etat()).lignes.length >= avant.lignes.length, await etat());
      await taper('facture'); await p.evaluate(() => window.__inst && window.__inst.rafraichir && window.__inst.rafraichir()); await p.waitForTimeout(800);
      v('la recherche tient après un rafraîchissement', (await etat()).lignes, ['m3']);
      v('aucune erreur JavaScript', err, []);
      await p.close();
    }
  } catch (e) { ko++; console.log('  ✗ ' + e.stack); }
  await b.close(); srv.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
