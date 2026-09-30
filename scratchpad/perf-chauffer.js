/* ══ CHAUFFER UNE BASE DE MESURE — la faire passer une fois par la page, comme un appareil qui travaille ═══════
   Une base synthétique n'a jamais vu les migrations UNIQUES (dashV2, registres, cartons…) : ouverte telle quelle,
   la page les joue et enregistre — autant de save() qu'aucun appareil d'ELAN ne paie plus (repéré au premier
   profil du démarrage : dashLayout → save, regMigration → save). On l'ouvre donc une fois, on laisse la page finir
   son démarrage, et on reprend la base telle qu'elle l'a rangée.
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. Usage : node scratchpad/perf-chauffer.js <base.json> <sortie.json> */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, SORTIE] = process.argv.slice(2);
if (!BASE || !SORTIE) { console.error('usage : node perf-chauffer.js <base.json> <sortie.json>'); process.exit(2); }
(async () => {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); window.confirm=()=>true; window.alert=()=>{};` });
  for (let tour = 1; tour <= 2; tour++) {
    await S.c.envoyer('Page.reload', {});
    for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
    await dormir(6000);   // les minuteries de démarrage (annuaire à 4 s, veille à 5 s) passent aussi
  }
  const r = await S.ev(`return { base: localStorage.getItem(STORE_KEY), dashV2: db.dashV2, regMigre: db._regMigre };`);
  fs.writeFileSync(SORTIE, r.base);
  console.log(`base chauffée : ${Math.round(r.base.length / 1024)} Ko (dashV2=${r.dashV2}, _regMigre=${r.regMigre}) → ${SORTIE}`);
  console.log('exceptions : ' + S.exceptions.length);
  S.fermer(); process.exit(0);
})().catch(e => { console.error('CHAUFFE MORTE :', e.message); process.exit(2); });
