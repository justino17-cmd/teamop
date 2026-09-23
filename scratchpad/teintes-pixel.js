/* ══ LES RESTES DE L'AUDIT DES TEINTES, RELUS AU PIXEL ════════════════════════════════════
   audit-teintes.js compose les fonds des ancêtres jusqu'à un fond opaque. Sous le VERRE
   (Mac et iPhone en Safari 26), c'est faux par construction : la vitre laisse passer ce qui
   est derrière, flouté — la page, ses halos, le voile d'une fenêtre. Le calcul trie donc les
   SUSPECTS ; cette sonde les tranche sur ce que Chrome a vraiment peint.

   Pour chaque reste de audit-teintes[-…].json : on remet l'écran dans le même état (thème,
   teinte, rubrique ou fenêtre, pastilles cochées — la liste des fenêtres est LUE dans
   audit-teintes.js, pas recopiée), on retrouve l'élément par sa classe et son texte, on
   capture SON rectangle, et on prend pour fond la couleur la plus fréquente parmi les pixels
   éloignés de l'encre (les glyphes et leur lissage sont écartés).

   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/teintes-pixel.js [audit-teintes.json] [plateforme]
           TEL=1 node scratchpad/teintes-pixel.js audit-teintes-tel-chrome.json            */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { decoder, contraste, lireCouleur } = require(path.join(__dirname, 'png.js'));
const FICHIER = path.join(__dirname, process.argv[2] || 'audit-teintes.json');
const TEL = process.env.TEL === '1';                 /* profil téléphone, comme audit-teintes.js */
const PLAT = process.argv[3] || (TEL ? 'iosweb' : 'macweb');
const A = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const srcAudit = fs.readFileSync(path.join(__dirname, 'audit-teintes.js'), 'utf8');
const mF = srcAudit.match(/const FENETRES=(\[[\s\S]*?\n  \]);/);
if (!mF) { console.error('liste des fenêtres introuvable dans audit-teintes.js'); process.exit(3); }
const FENETRES = eval(mF[1]);

(async () => {
  const S = await ouvrir();
  console.log('  page mesurée : ' + S.version + ' · restes relus : ' + A.faibles.length + ' (audit ' + A.version + ')');
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', TEL ? { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } : { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  if (TEL) await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`window.confirm=()=>false; try{ setPlatForce('${PLAT}'); }catch(e){} return 1;`); await dormir(5000);
  console.log('  plateforme : ' + PLAT + ' · verre ' + (await S.ev(`return document.documentElement.getAttribute('data-verre')||'éteint';`)) + '\n');
  let passe = 0, reste = 0, introuvable = 0;
  for (const f of A.faibles) {
    const [th, ac, ou] = f.ou.split('/');
    const F = ou.startsWith('fenêtre ') ? FENETRES.find(x => x.nom === ou.slice(8)) : null;
    await S.ev(`try{ closeSub(); }catch(e){} try{ closeModal(); }catch(e){} try{ setThemePref('${th}'); }catch(e){} try{ setAccent('${ac}'); }catch(e){} return 1;`); await dormir(300);
    if (F) { await S.ev(`try{ go('dashboard'); }catch(e){} return 1;`); await dormir(400);
      await S.ev(F.ouvrir + ' return 1;'); await dormir(600); try { await S.ev(F.puis + ' return 1;'); } catch (e) {} await dormir(400); }
    else { await S.ev(`try{ go('${ou}'); }catch(e){} return 1;`); await dormir(700); }
    const [tag, ...cls] = f.n.split('.');
    const zone = F ? JSON.stringify(F.zone) : 'null';
    const r = await S.ev(`const Z=${zone}; const racine=Z?document.querySelector(Z):document;
      if(!racine) return null;
      const c=[...racine.querySelectorAll(${JSON.stringify(tag + cls.map(x => '.' + x).join(''))})].filter(e=>{
        const b=e.getBoundingClientRect(); return b.width>2&&b.height>2&&(e.textContent||'').trim().startsWith(${JSON.stringify(f.t.slice(0, 12))}); });
      if(!c.length) return null; const e=c[0]; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void e.offsetWidth; await new Promise(r=>setTimeout(r,250));
      const b=e.getBoundingClientRect();
      return {x:b.left+scrollX, y:b.top+scrollY, w:b.width, h:b.height, encre:getComputedStyle(e).color};`);
    if (!r) { introuvable++; console.log('  ?  ' + f.ou.padEnd(34) + f.n + ' « ' + f.t + ' » : introuvable'); continue; }
    const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: Math.max(1, r.w), height: Math.max(1, r.h), scale: 1 } });
    const img = decoder(Buffer.from(cap.data, 'base64'));
    const encre = lireCouleur(r.encre);
    const compte = new Map();
    for (let i = 0; i < img.w * img.h; i++) {
      const p = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]];
      if (encre && Math.abs(p[0] - encre[0]) + Math.abs(p[1] - encre[1]) + Math.abs(p[2] - encre[2]) < 90) continue;
      const k = p.map(v => v >> 2 << 2).join(','); compte.set(k, (compte.get(k) || 0) + 1);
    }
    const mode = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!mode || !encre) { introuvable++; console.log('  ?  ' + f.ou + ' : fond illisible'); continue; }
    const fond = mode[0].split(',').map(Number);
    const c = contraste(encre, fond);
    const ok = c >= f.seuil; ok ? passe++ : reste++;
    console.log('  ' + (ok ? '✓' : '✗') + '  ' + f.ou.padEnd(34) + (f.n + ' « ' + f.t + ' »').padEnd(52) + ' calcul ' + f.c.toFixed(2) + ' → pixel ' + c.toFixed(2)
      + '   (fond ' + fond.join(',') + ', encre ' + encre.map(Math.round).join(',') + ')');
  }
  console.log('\n  ══ au pixel : ' + passe + ' passent, ' + reste + ' restent sous le seuil, ' + introuvable + ' introuvables ══');
  S.fermer(); process.exit(0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
