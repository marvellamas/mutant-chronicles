#!/usr/bin/env python3
"""Catalogo dei rinforzi (Manuale degli Armamenti v0.53, §7.23).

Uso:  python tools/lotti/lotto_rinforzi_723.py
Riscrive data/equipaggiamento/rinforzi.json dal testo del Doc (docs/manuali-txt/armamenti.md):
- i due profili di categoria del §7.23.1 (Rinforzo Leggero e Pesante, gli oggetti del lotto 9, stessi id);
- i quattro modelli commerciali del §7.23.2 (profilo della categoria, descrizione dalla tabella);
- i soprabiti corporativi di base del §7.23.3 (stessi id del lotto 9, nomi del §7.23.3);
- i 14 rinforzi specialistici del §7.23.6: Qualità Non comune, PS Integrità 12, REP e costo della
  tabella, proprietà del §7.23.7 tradotte in effetti con la funzione del lotto delle armature
  (tools/lotti/lotto_proprieta_armature.py), così armatura e rinforzo condividono le chiavi di cumulo.
La compatibilità segue il §7.23.4 e il §7.23.9: la categoria ammessa dall'armatura («rinforzi_ammessi»);
i soprabiti BLEU e ASA (anche l'ASA riservato) valgono solo sulle armature indicate («compatibile_con»).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lotto_proprieta_armature import effetti_di, base, norm, TESTO_DOC, GESTITE, TESTUALI  # noqa: E402

# lotto storico (tools/lotti/superato.mjs): i dati sono poi cambiati con i lotti successivi; un
# rilancio li riporterebbe indietro. Si esegue solo con --forza.
import sys as _sys  # noqa: E402
if __name__ == '__main__' and '--forza' not in _sys.argv:
    _sys.exit('lotto_rinforzi_723.py: lotto storico, i dati che scrive sono stati aggiornati dai lotti successivi (Armamenti 0.55–0.58, Equipaggiamento 0.5): non rilanciarlo. Per forzare: --forza.')

RADICE = Path(__file__).resolve().parent.parent.parent
CART = RADICE / 'data' / 'equipaggiamento'
VERSIONE = 'Armamenti 0.53'
DOC = (RADICE / 'docs' / 'manuali-txt' / 'armamenti.md').read_text(encoding='utf-8')


def sezione(titolo, fine):
    i = DOC.index(titolo)
    j = DOC.index(fine, i + len(titolo))
    return DOC[i:j]


def righe(testo):
    """Righe di dati delle tabelle Markdown della sezione (senza intestazione e separatore)."""
    out = []
    for r in testo.splitlines():
        if not r.startswith('|') or re.match(r'^\|\s*:?-', r):
            continue
        out.append([norm(c) for c in r.strip().strip('|').split('|')])
    return [r for r in out if r[0] not in ('Categoria', 'Modello', 'Catalogo')]


def frasi(testo):
    return [f.strip() for f in re.split(r'(?<=[.;])\s+', norm(testo)) if f.strip()]


def num(s):
    return int(str(s).replace('.', '').replace('+', '').strip())


def slug(t):
    t = t.lower().replace('’', '-').replace("'", '-')
    t = re.sub(r'[àá]', 'a', t)
    t = re.sub(r'[èé]', 'e', t)
    t = re.sub(r'[ìí]', 'i', t)
    t = re.sub(r'[òó]', 'o', t)
    t = re.sub(r'[ùú]', 'u', t)
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


S1 = sezione('### **7.23.1 Profili comuni**', '### **7.23.2')
S2 = sezione('### **7.23.2 Catalogo commerciale**', '### **7.23.3')
S3 = sezione('### **7.23.3 Soprabiti corporativi di base**', '### **7.23.4')
S4 = sezione('### **7.23.4 Regole generali**', '### **7.23.5')
S6 = sezione('### **7.23.6 Rinforzi corporativi specialistici**', '#### **Modelli e impieghi**')
S6b = sezione('#### **Modelli e impieghi**', '### **7.23.7')
S7 = sezione('### **7.23.7 Proprietà specialistiche**', '### **7.23.8')
S8 = sezione('### **7.23.8 Alimentazione del CS-R20**', '### **7.23.9')
S9 = DOC[DOC.index('### **7.23.9 Compatibilità e cumulo delle proprietà**'):]

# §7.23.1: profili di categoria
PROFILI = {}
for cat, ar, forz, pi, qual, ps, rep, costo in righe(S1):
    k = cat.replace('Rinforzo ', '')
    PROFILI[k] = {'ar': num(ar), 'for': num(forz), 'pi': num(pi), 'qualita': qual, 'ps_int': num(ps), 'reperibilita': rep, 'costo': num(costo)}
assert set(PROFILI) == {'Leggero', 'Pesante'}, PROFILI

# §7.23.7: testo di ogni proprietà (il paragrafo che inizia con il nome in grassetto)
PARAGRAFI = {}
for par in S7.split('\n\n'):
    m = re.match(r'\*\*(.+?)\*\*\s*(.*)', par.strip(), re.S)
    if m:
        PARAGRAFI[norm(m.group(1)).rstrip('.')] = norm(m.group(2))


def paragrafo_di(nome):
    b = base(nome)
    for k, v in PARAGRAFI.items():
        nomi = [base(x.strip()) for x in re.split(r',| e ', k)]
        if b in nomi or k.startswith(b) or (b == 'SIN' and k.startswith('SIN')):
            return v
    raise KeyError(f'proprietà «{nome}» senza paragrafo nel §7.23.7')


def proprieta_da(cella):
    """«Struttura robusta: 10 PI totali; Stabile 1» → ['Struttura robusta', 'Stabile 1']."""
    out = []
    for parte in re.split(r';| e (?=[A-Z])', cella):
        p = parte.split(':')[0].strip()
        p = re.sub(r'\s+alle Prove.*$', '', p)
        if p:
            out.append(p)
    return out


def voce_proprieta(nome):
    testo = paragrafo_di(nome)
    v = {'nome': nome, 'testo': testo}
    if base(nome) == 'Articolazione d’assalto':
        # §7.23.7: «Riduce di 1, fino a 0, la penalità della propria armatura agli attacchi ravvicinati»
        v['effetto'] = {'penalita': {'riduce': {'attacchi_ravvicinati': 1}}}
    return v


def effetti_proprieta(nome, oggetto, paragrafo):
    b = base(nome)
    if b in GESTITE or b in TESTUALI:
        return []
    ee = effetti_di(nome)
    assert ee is not None, f'proprietà non classificata: {nome}'
    cond = CONDIZIONI.get(oggetto) or next(f for f in frasi(paragrafo_di(nome)) if len(f) > 20)
    assert norm(cond) in TESTO_DOC, cond
    return [{**e, 'condizione': cond, 'fonte': f'Armamenti {paragrafo}', 'proprieta': nome} for e in ee]


# Condizioni più precise della prima frase del paragrafo, dove il modello ne ha una propria
CONDIZIONI = {
    'Mantello Ranger': 'Il Ranger richiede anche l’ambiente previsto; il Kasumi non è legato a una sola livrea ambientale.',
    'Piastre reattive CS-R20': 'Richiede un Innesto di Interfaccia Neurale compatibile e attivo, acquistato e installato separatamente.',
}

REGOLE = norm(' '.join(frasi(S4)[1:]))
NOTA_CUMULO = 'Proprietà uguali o benefici equivalenti presenti su più oggetti non si sommano: si usa il maggiore applicabile.'
assert NOTA_CUMULO in norm(S9)


def oggetto(id_, nome, catalogo, categoria, paragrafo, note, extra=None, profilo=None):
    p = {**PROFILI[categoria], **(profilo or {})}
    o = {
        'id': id_, 'nome': nome, 'tipo': 'accessorio', 'catalogo': catalogo, 'famiglia': 'Rinforzi',
        'nomi_alternativi': [], 'note_manuale': note, 'paragrafo': paragrafo, 'versione_manuale': VERSIONE,
        'pi': p['pi'], 'qualita': p['qualita'], 'ps_int': p['ps_int'], 'reperibilita': p['reperibilita'], 'costo': p['costo'],
        'si_monta_su': ['armatura'], 'rinforzo': {'kit': categoria, 'ar': p['ar'], 'for': p['for']}, 'proprieta': [],
    }
    o.update(extra or {})
    return o


def main():
    dest = CART / 'rinforzi.json'
    vecchio = {o['id']: o for o in json.loads(dest.read_text(encoding='utf-8'))['oggetti']}
    armature = json.loads((CART / 'armature_corporative.json').read_text(encoding='utf-8'))['oggetti']
    rif = lambda nome: f"armature_corporative:{next(a['id'] for a in armature if a['nome'] == nome)}"

    oggetti = []
    # §7.23.1: i profili di categoria restano acquistabili come voce generica (id del lotto 9)
    for k in ('Leggero', 'Pesante'):
        o = vecchio[f'rinforzo-{k.lower()}']
        oggetti.append(oggetto(o['id'], o['nome'], 'Commerciale', k, '§7.23.1',
                               f"{norm(S1.split(chr(10)*2)[1])} {REGOLE}", {'nomi_alternativi': o['nomi_alternativi']}))
    # §7.23.2: modelli commerciali
    for modello, cat, descr, costo in righe(S2):
        assert num(costo) == PROFILI[cat]['costo'], modello
        oggetti.append(oggetto(slug(modello), modello, 'Commerciale', cat, '§7.23.2', descr))
    # §7.23.3: soprabiti corporativi di base (stessi id del lotto 9)
    nota3 = norm(S3.split('\n\n')[-2])
    for modello, cat_, categoria, compat, costo in righe(S3):
        id_ = 'soprabito-blu-di-ordinanza' if 'BLEU' in modello else 'soprabito-asa'
        armi = [rif(n.strip()) for n in re.split(r' e ', compat.rstrip('.'))]
        oggetti.append(oggetto(id_, modello, cat_, categoria, '§7.23.3', nota3, {
            'nomi_alternativi': sorted(set(vecchio[id_]['nomi_alternativi'] + ([vecchio[id_]['nome']] if vecchio[id_]['nome'] != modello else [])) ),
            'compatibile_con': armi,
        }))
    asa = next(o for o in oggetti if o['id'] == 'soprabito-asa')
    # §7.23.6: specialistici — Qualità Non comune e PS Integrità 12; Eisenwall 10 PI
    impieghi = {m.group(1): norm(m.group(2)) for m in re.finditer(r'\*\*(\w+)\.\*\*\s*(.+)', S6b)}
    for cat_, modello, tipo, props, rep, costo in righe(S6):
        nomi = proprieta_da(props)
        prof = {'qualita': 'Non comune', 'ps_int': 12, 'reperibilita': rep, 'costo': num(costo)}
        if 'Struttura robusta' in nomi:
            prof['pi'] = num(re.search(r'(\d+) PI totali', props).group(1))
        note = impieghi[cat_]
        if modello == 'Piastre reattive CS-R20':
            note = f"{note} {norm(S8.split(chr(10)*2)[1])} {norm(S8.split(chr(10)*2)[2])}"
        extra = {'proprieta': [voce_proprieta(n) for n in nomi]}
        if modello == 'Soprabito ASA riservato':
            extra['compatibile_con'] = asa['compatibile_con']  # §7.23.9
        o = oggetto(slug(modello), modello, cat_, tipo, '§7.23.6', note, extra, prof)
        eff = [e for n in nomi for e in effetti_proprieta(n, modello, '§7.23.7')]
        if eff:
            o['effetti'] = eff
        oggetti.append(o)

    ids = [o['id'] for o in oggetti]
    assert len(ids) == len(set(ids)), ids
    assert len(oggetti) == 2 + 4 + 2 + 14, len(oggetti)
    d = {
        'versione_manuale': VERSIONE,
        'fonte': 'Manuale degli Armamenti v0.53, §7.23 Catalogo dei rinforzi (regole del §7.11.2)',
        '_nota': ('Generato da tools/lotti/lotto_rinforzi_723.py. Un rinforzo «in uso» e montato su un’armatura indossata ne aumenta AR e FOR richiesta, '
                  'se l’armatura ammette la sua categoria («rinforzi_ammessi», e «compatibile_con» del rinforzo); le sue proprietà valgono solo in quel caso. '
                  'Una Leggera portata fisicamente ad AR 3 o più usa le penalità della Media (§7.11.2, §7.23.4). ' + NOTA_CUMULO + ' (§7.23.9)'),
        'oggetti': oggetti,
    }
    dest.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(f'{len(oggetti)} rinforzi scritti; con effetti: {sum(1 for o in oggetti if o.get("effetti"))}')


if __name__ == '__main__':
    main()
