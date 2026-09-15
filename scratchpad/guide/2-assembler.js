/* Assemble les quatre captures réelles en UNE image, pensée pour être transférée sur un
   téléphone : gros numéros, une phrase par étape, une seule couleur d'accent. */
const fs=require('fs'), path=require('path');
const G='/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/guide';
const b64=n=>'data:image/png;base64,'+fs.readFileSync(path.join(G,n)).toString('base64');
/* Espace fine insécable devant : ; ! ? et dans les guillemets — règle typographique française,
   sans elle le navigateur renvoie le « : » seul en début de ligne. */
const N='&#8239;';
/* ⛔ TROIS ÉTAPES, PAS QUATRE. Premier montage : un écran « modale vide » PUIS un écran
   « modale remplie » — deux images quasi identiques à la suite, et c'est exactement ce qui
   perd quelqu'un qui survole. On ne garde que l'écran REMPLI : il montre ce qu'il faut faire,
   pas seulement ce qu'on voit. Moins d'étapes = plus de chances d'être lu jusqu'au bout. */
const etapes=[
 { n:1, img:'1-connexion.png', h:1560,
   t:'Connecte-toi avec ce qu’on t’a donné',
   d:'Ton <b>identifiant</b> (souvent ton prénom) et le <b>mot de passe provisoire</b> reçu par message. Puis&nbsp;: <b>Se&nbsp;connecter</b>.' },
 { n:2, img:'3-rempli.png', h:1400,
   t:'Choisis TON mot de passe et mets ton e-mail',
   d:'L’application le demande tout de suite, et <b>une seule fois</b>. Ton mot de passe <b>deux fois</b>, ton <b>adresse e-mail</b>, puis <b>Enregistrer mon mot de passe</b>.' },
 { n:3, img:'4-apres.png', h:1030,   /* on coupe APRÈS une rangée entière : une carte tranchée en deux fait croire à un bogue */
   t:'C’est fini',
   d:'Tu es dans l’application. <b>La prochaine fois</b>&nbsp;: ton identifiant + <b>TON</b> mot de passe, celui que tu viens de choisir.' },
];
const html=`<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{width:960px;background:#EEF1F6;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F1B2D;padding:0 0 52px}
 .tete{background:#10331F;color:#fff;padding:44px 52px 40px;text-align:center}
 .tete .marque{font-size:14px;letter-spacing:.24em;font-weight:800;color:#6FE0A6;text-transform:uppercase}
 .tete h1{font-size:46px;line-height:1.08;letter-spacing:-.02em;margin:14px 0 12px;font-weight:800}
 .tete p{font-size:20px;color:#C9DED3;max-width:620px;margin:0 auto}
 .duree{display:inline-block;margin-top:20px;background:#2EB872;color:#06301C;font-weight:800;font-size:17px;padding:9px 22px;border-radius:100px}
 .etape{padding:40px 52px 0}
 .titre{display:flex;align-items:flex-start;gap:20px;margin-bottom:22px}
 .num{flex:none;width:58px;height:58px;border-radius:18px;background:#1E7A4E;color:#fff;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center}
 .titre h2{font-size:29px;line-height:1.2;letter-spacing:-.015em;font-weight:800;margin-bottom:6px}
 .titre p{font-size:18.5px;color:#41566B}
 .ecran{width:430px;margin:0 auto;border-radius:26px;overflow:hidden;border:3px solid #CBD5E1;background:#fff;box-shadow:0 12px 34px rgba(15,27,45,.13)}
 .ecran img{display:block;width:100%;height:auto;object-fit:cover;object-position:top}
 .pied{margin:44px 52px 0;background:#FDF2E2;border:2px solid #E79A3C;border-radius:20px;padding:28px 32px}
 .pied .g{font-size:25px;font-weight:800;color:#8A4B00;margin-bottom:10px;line-height:1.25}
 .pied p{font-size:18px;color:#5C4326}
 .note{margin:22px 52px 0;background:#fff;border:2px solid #D7E3EC;border-radius:20px;padding:26px 32px}
 .note b{color:#1E7A4E}
 .note p{font-size:17.5px;color:#41566B}
 .note p+p{margin-top:12px}
 .sign{text-align:center;margin-top:34px;font-size:15px;color:#7D8FA3;letter-spacing:.04em}
</style>
<div class="tete">
 <div class="marque">OP GESTION</div>
 <h1>Ta première connexion</h1>
 <p>Trois étapes, dans l’ordre. Tu ne le feras qu’une seule fois.</p>
 <div class="duree">⏱ 30 secondes</div>
</div>
${etapes.map(e=>`<div class="etape">
 <div class="titre"><div class="num">${e.n}</div><div><h2>${e.t}</h2><p>${e.d}</p></div></div>
 <div class="ecran" style="height:${Math.round(e.h*430/800)}px"><img src="${b64(e.img)}" style="height:${Math.round(e.h*430/800)}px"></div>
</div>`).join('')}
<div class="pied">
 <div class="g">⚠️ Tant que ce n’est pas fait, ton accès n’est pas activé.</div>
 <p>Tu ne peux pas sauter cette étape&#8239;: l’application te la redemandera à chaque fois. Autant la faire tout de suite.</p>
</div>
<div class="note">
 <p><b>Pourquoi une adresse e-mail&#8239;?</b> Uniquement pour te dépanner. Si tu oublies ton mot de passe, tu touches «&nbsp;Mot de passe oublié&#8239;?&nbsp;» sur l’écran de connexion et tu reçois un code <b>chez toi</b>, sans déranger personne.</p>
 <p><b>Ton mot de passe n’appartient qu’à toi.</b> Personne dans l’entreprise ne peut le lire — ni ton responsable, ni nous.</p>
 <p><b>Tu as perdu ton mot de passe provisoire&#8239;?</b> Demande-le à ton responsable&#8239;: il peut t’en redonner un neuf.</p>
</div>
<div class="sign">TEAM OP · teamop.fr</div>`;
fs.writeFileSync(G+'/guide.html',html);
console.log('guide.html écrit');
