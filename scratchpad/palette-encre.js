const src=require('fs').readFileSync(__dirname+'/palette-techs.js','utf8');
eval(src.split('const NA=')[0].replace(/const (lum|cr)=/g,'var $1='));
function hsl2hex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
 return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('').toUpperCase();}
const NA='#E8A33D', L=lab, encre=c=>Math.max(cr(c,'#FFFFFF'),cr(c,'#12202F'));
const ok=c=>encre(c)>=4.5&&cr(c,'#FFFFFF')>=3&&cr(c,'#2C2C2E')>=2.2;
const R1=[["#1E7A4E","Vert"],["#2563EB","Bleu"],["#7C3AED","Violet"],["#EA580C","Orange"],["#DC2626","Rouge"],["#0891B2","Cyan"],["#DB2777","Rose"]];
const cands=[];
for(let h=0;h<360;h+=3)for(const s of [35,45,55,65,75])for(let l=20;l<=75;l+=1.5){const c=hsl2hex(h,s,l);if(ok(c))cands.push(c);}
console.log('candidats admissibles :',cands.length);
const md=(c,set)=>Math.min(...set.map(x=>de00(L(c),L(x))));
let pal=R1.map(x=>x[0]);
while(pal.length<16){let best=null,bd=-1;for(const c of cands){if(pal.includes(c))continue;const d=Math.min(md(c,pal),de00(L(c),L(NA)));if(d>bd){bd=d;best=c;}}pal.push(best);
 const [Lc,a,b]=L(best);const hue=(Math.atan2(b,a)*180/Math.PI+360)%360;
 console.log(String(pal.length).padStart(2)+' '+best+'  écart '+bd.toFixed(1)+'  L*'+Lc.toFixed(0)+' C*'+Math.hypot(a,b).toFixed(0)+' h°'+hue.toFixed(0)+'  encre '+encre(best).toFixed(2)+' jour '+cr(best,'#FFFFFF').toFixed(1)+' nuit '+cr(best,'#2C2C2E').toFixed(1));}
console.log(JSON.stringify(pal));
