/* Sonde navigateur : le Courrier, avec trois boîtes et de vrais messages.
   On remplace apiGet pour servir des fixtures — la Tour ne parle à aucun vrai serveur. */
const { chromium } = require('/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/node_modules/playwright-core');

const BOITES = [
  { boite:{id:'b-sup', email:'support@teamop.fr'}, nonLus:78 },
  { boite:{id:'b-ctl', email:'controle@teamop.fr'}, nonLus:3 },
  { boite:{id:'b-con', email:'contact@teamop.fr'}, nonLus:0 },
];
const MSGS = {
  toutes: [
    {uid:1,boite:'b-sup',de:'florent@elan.fr',deNom:'Florent',objet:'Stock manquant',ts:Date.now(),lu:false,auto:false,pieces:0,mid:'m1'},
    {uid:2,boite:'b-ctl',de:'x@autre.fr',deNom:'Autre',objet:'Question facture',ts:Date.now()-3600000,lu:false,auto:false,pieces:1,mid:'m2'},
    {uid:3,boite:'b-con',de:'z@inconnu.fr',deNom:'Inconnu',objet:'Demande de devis',ts:Date.now()-7200000,lu:true,auto:false,pieces:0,mid:'m3'},
  ],
  'b-sup': [{uid:1,boite:'b-sup',de:'florent@elan.fr',deNom:'Florent',objet:'Stock manquant',ts:Date.now(),lu:false,auto:false,pieces:0,mid:'m1'}],
  'b-ctl': [{uid:2,boite:'b-ctl',de:'x@autre.fr',deNom:'Autre',objet:'Question facture',ts:Date.now()-3600000,lu:false,auto:false,pieces:1,mid:'m2'}],
  'b-con': [{uid:3,boite:'b-con',de:'z@inconnu.fr',deNom:'Inconnu',objet:'Demande de devis',ts:Date.now()-7200000,lu:true,auto:false,pieces:0,mid:'m3'}],
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'] });
  const page = await nav.newPage({ viewport:{width:1400,height:900} });

  await page.addInitScript(({BOITES,MSGS}) => {
    window.__URLS = [];
    window.__FIX = { BOITES, MSGS };
  }, {BOITES, MSGS});
  page.on('console', m => { if(m.type()==='error') console.log('  ⚠ console:', m.text().slice(0,120)); });
  await page.goto('http://127.0.0.1:8124/tour.html', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForTimeout(800);
  /* La console garde son voile de connexion par-dessus tout : on le lève AVANT de charger,
     pour que le flux normal rende dans un écran visible. C'est l'écran réel, pas une maquette. */
  await page.evaluate(() => { var l=document.getElementById('login'); if(l) l.remove();
    var a=document.getElementById('app'); if(a){ a.style.display='flex'; a.hidden=false; } });

  // On détourne apiGet APRÈS chargement : la Tour est déjà définie, on la nourrit.
  const res = await page.evaluate(() => {
    const out = { urls: [] };
    window.apiGet = function(u){
      out.urls.push(u);
      if(u.indexOf('/mail/dossiers')>=0) return Promise.resolve({ boites: window.__FIX.BOITES });
      if(u.indexOf('/mail/liste')>=0){
        const m = u.match(/[?&]boite=([^&]+)/);
        const cle = m ? decodeURIComponent(m[1]) : 'toutes';
        const L = window.__FIX.MSGS[cle] || [];
        return Promise.resolve({ messages: L, total: L.length });
      }
      if(u.indexOf('/monitor/mails')>=0) return Promise.resolve({ mails: [{ts:Date.now(), a:'client@x.fr', sujet:'Votre devis', txt:'…'}] });
      return Promise.resolve({});
    };
    window.__OUT = out;
    TAB = 'support';
    chargerMail();
    return new Promise(r => setTimeout(() => r(out), 600));
  });

  const lire = async () => page.evaluate(() => {
    const dos = document.querySelector('.dos-bar, [class*="dos"]')?.closest('div');
    const boutons = [...document.querySelectorAll('button.dos')].map(b => ({
      txt: b.querySelector('.dos-n')?.textContent || '',
      n: b.querySelector('.n')?.textContent || '',
      actif: b.classList.contains('on'),
      clic: b.getAttribute('onclick') || ''
    }));
    return {
      titre: document.querySelector('.ttl-page')?.textContent || '',
      sous: (document.querySelector('.page-tete .desc')?.textContent || '').slice(0,150),
      boutons,
      lignes: document.querySelectorAll('.mail-rows .sup-row, .mail-rows [class*="row"]').length,
      texteListe: (document.querySelector('.mail-rows')?.textContent || '').replace(/\s+/g,' ').slice(0,260)
    };
  });

  console.log('\n── 1) À l\'ouverture : toutes les boîtes ──');
  let v = await lire();
  console.log('   titre  :', v.titre);
  console.log('   boîtes :', v.boutons.filter(b=>/@|Toutes les boîtes/.test(b.txt)).map(b=>b.txt+(b.n?' ('+b.n+')':'')+(b.actif?' ←ACTIF':'')).join(' | '));
  console.log('   liste  :', v.texteListe.slice(0,120));

  console.log('\n── 2) Je clique sur controle@teamop.fr ──');
  await page.evaluate(() => mailChoisirBoite('b-ctl','controle@teamop.fr'));
  await page.waitForTimeout(500);
  v = await lire();
  console.log('   titre  :', v.titre);
  console.log('   sous   :', v.sous);
  console.log('   boîtes :', v.boutons.filter(b=>/@|Toutes les boîtes/.test(b.txt)).map(b=>b.txt+(b.actif?' ←ACTIF':'')).join(' | '));
  console.log('   liste  :', v.texteListe.slice(0,160));
  const reqs = await page.evaluate(() => window.__OUT.urls);
  console.log('   requêtes serveur :', reqs.filter(u=>u.indexOf('liste')>=0).join('  '));

  console.log('\n── 2bis) Filtre « À traiter », toutes entreprises, dans support@ ──');
  await page.evaluate(() => mailChoisirBoite('b-sup','support@teamop.fr'));
  await page.waitForTimeout(400);
  await page.evaluate(() => mailChoisirCat('traiter'));
  await page.waitForTimeout(300);
  v = await lire();
  console.log('   filtres :', v.boutons.filter(b=>/Tous les messages|À traiter|Marqués|Pièces|Envoyés/.test(b.txt)).map(b=>b.txt+(b.n?' ('+b.n+')':'')+(b.actif?' ←ACTIF':'')).join(' | '));
  console.log('   liste   :', v.texteListe.slice(0,140));
  await page.evaluate(() => mailChoisirCat('marques'));
  await page.waitForTimeout(300);
  v = await lire();
  console.log('   « Marqués » (aucun attendu) :', v.texteListe.slice(0,120));
  await page.evaluate(() => mailChoisirCat('tout'));
  await page.waitForTimeout(300);

  console.log('\n── 3) Retour à toutes les boîtes ──');
  await page.evaluate(() => mailChoisirBoite(''));
  await page.waitForTimeout(500);
  v = await lire();
  console.log('   titre  :', v.titre);
  console.log('   liste  :', v.texteListe.slice(0,160));

  /* La console garde son voile de connexion par-dessus tout : on le lève pour la photo,
     sans rien changer au reste — c'est l'écran réel qui est dessous, pas une maquette. */
  const shot = async (nom) => {
    await page.evaluate(() => { TAB='support'; render(); });
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => ({ vue:(document.getElementById('vue')||{}).innerHTML?.length||0,
                                            h:(document.getElementById('vue')||{}).offsetHeight||0 }));
    console.log('   #vue :', d.vue, 'signes,', d.h, 'px de haut');
    await page.locator('#app').screenshot({ path:'/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/'+nom });
  };
  await page.evaluate(() => mailChoisirBoite(''));
  await shot('courrier-toutes.png');
  await page.evaluate(() => mailChoisirBoite('b-sup','support@teamop.fr'));
  await shot('courrier-une-boite.png');
  await page.evaluate(() => mailChoisirCat('traiter'));
  await shot('courrier-filtre.png');
  await nav.close();
})();
