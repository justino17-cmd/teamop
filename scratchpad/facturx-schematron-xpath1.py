"""Usage : FX_SCH=<.../schematron/ZF_250/FACTUR-X_EN16931.sch> python3 -I scratchpad/facturx-schematron-xpath1.py fichier.xml [...]
Rejoue, avec lxml (XPath 1.0), celles des règles du Schematron Factur-X EN16931 (1.09.2) qui n'ont besoin NI d'XPath 2 NI des listes de
codes externes. Ce n'est PAS le validateur : c'est une lecture indépendante d'une partie de ses règles, sur nos XML."""
import sys, re, glob
from lxml import etree
import os
SCH=os.environ['FX_SCH']   # chemin de FACTUR-X_EN16931.sch, extrait du jar de Mustang (unzip, sans l'exécuter)
NS={'rsm':'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100','qdt':'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
    'ram':'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100','udt':'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100'}
sch=etree.parse(SCH); S='{http://purl.oclc.org/dsdl/schematron}'
regles=[]; sautees=0
for rule in sch.iter(S+'rule'):
    ctx=rule.get('context')
    for a in rule.iterfind(S+'assert'):
        t=a.get('test')
        if re.search(r'document\(|\$|xs:|upper-case|lower-case|matches\(|tokenize|replace\(|abs\(|round\(|exists\(|string-join|format-number|number\(|ends-with|distinct-values|every |some |if\s*\(|index-of|empty\(|not\(exists', t or ''):
            sautees+=1; continue
        try:
            etree.XPath(ctx if ctx.startswith('/') else ctx,namespaces=NS); etree.XPath(t,namespaces=NS)
        except Exception: sautees+=1; continue
        regles.append((a.get('id'),a.get('flag','fatal'),ctx,t,' '.join((a.text or '').split())))
print('règles rejouables en XPath 1.0 :',len(regles),'· non rejouées (XPath 2, listes externes) :',sautees)
total_contextes=0; echecs=[]
for f in sys.argv[1:]:
    doc=etree.parse(f)
    for (i,fl,ctx,t,msg) in regles:
        try: noeuds=doc.xpath(ctx,namespaces=NS)
        except Exception: continue
        for n in noeuds:
            total_contextes+=1
            try: r=n.xpath(t,namespaces=NS)
            except Exception as e: continue
            if not r: echecs.append((f.split('/')[-1],i,fl,msg[:160]))
print('contextes évalués :',total_contextes)
print('règles en échec :',len(echecs))
for e in echecs[:30]: print('  ✗',e)
