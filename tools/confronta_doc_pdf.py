#!/usr/bin/env python3
"""Confronto fra un PDF dei manuali e il testo del Google Doc salvato in docs/manuali-txt/ (Markdown).

Non fa parte dell'app. Serve a controllare che cosa è cambiato passando dal PDF al Google Doc
(docs/manuali-drive.md). Per i confronti fra due versioni dello stesso Doc basta `git diff` sul file
di docs/manuali-txt/.

Uso:
  python tools/confronta_doc_pdf.py <pdf> <doc.md> <uscita.txt>

Metodo:
- PDF: testo di ogni pagina con pdfplumber, tolte intestazioni e piè di pagina come in
  tools/estrai_manuali.py; le parole spezzate a fine riga («sol-» + «levare») si uniscono.
- Doc: Markdown senza segni di formattazione, righe di separazione delle tabelle e segnalibri.
- Entrambi diventano una sequenza di parole e numeri in minuscolo (la punteggiatura non conta;
  «−», «–» e «—» valgono «-», «×» vale «x»), confrontata con difflib.
- Le differenze si raggruppano per paragrafo del Doc. Nello stesso paragrafo le parole tolte in un
  punto e aggiunte in un altro si annullano: sono celle di tabella che il PDF spezza su più righe o
  intestazioni ripetute a cambio pagina. Resta il residuo. Limite: lo scambio di due valori identici
  nello stesso paragrafo non si vede; un numero cambiato sì.

Scrive <uscita.txt> (una riga per differenza, con pagina del PDF) e <uscita.txt>.json.
Dipendenza: pdfplumber (tools/requirements.txt).
"""
import difflib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import estrai_manuali as em  # noqa: E402  (stessa pulizia delle righe ricorrenti)

try:
    import pdfplumber
except ImportError:
    sys.exit('Manca pdfplumber: installalo con  python -m pip install -r tools/requirements.txt')

TOKEN = re.compile(r"[+\-]?\d+(?:[.,]\d+)*%?|[^\W\d_]+(?:'[^\W\d_]+)?", re.U)
TITOLO = re.compile(r'^#+\s*\**\s*((?:[A-Z]\.)?\d+(?:\.\d+)*)\b\s*(.*?)\**\s*$')


def normalizza(s):
    s = s.replace('­', '').replace('’', "'").replace('‘', "'")
    s = s.replace('−', '-').replace('–', '-').replace('—', '-').replace('×', 'x')
    s = re.sub(r'\]\(#[^)]*\)', ']', s)  # segnalibri dell'indice del Doc
    return s.replace('\\', '').replace('*', '')


def parole_pdf(pdf):
    with pdfplumber.open(pdf) as p:
        pagine = [pg.extract_text() or '' for pg in p.pages]
    ricorrenti = em.righe_ricorrenti(pagine)
    parole, pagina_di = [], []
    sospesa = None
    for n, testo in enumerate(pagine, 1):
        for riga in testo.split('\n'):
            r = riga.strip()
            if not r or re.sub(r'\d+', '#', r) in ricorrenti:
                continue
            r = normalizza(r)
            if sospesa:
                r, sospesa = sospesa + r, None
            m = re.search(r'([^\W\d_]+)-$', r)
            if m:
                sospesa, r = m.group(1), r[:m.start()]
            for t in TOKEN.findall(r):
                parole.append(t.lower())
                pagina_di.append(n)
    return parole, pagina_di


def parole_doc(md):
    parole, paragrafo_di = [], []
    paragrafo = '(inizio)'
    for riga in Path(md).read_text(encoding='utf-8').split('\n'):
        if re.fullmatch(r'\|?\s*:?-{2,}.*', riga.strip()):
            continue
        m = TITOLO.match(riga)
        if m:
            paragrafo = f'{m.group(1)} {m.group(2).replace("*", "")}'.strip()
        for t in TOKEN.findall(normalizza(riga)):
            parole.append(t.lower())
            paragrafo_di.append(paragrafo)
    return parole, paragrafo_di


def residuo(parole, da_togliere):
    """Le parole non annullate: ognuna di `da_togliere` (Counter) si toglie una volta sola."""
    out = []
    for t in parole:
        if da_togliere[t] > 0:
            da_togliere[t] -= 1
        else:
            out.append(t)
    return out


def main(pdf, md, uscita):
    tp, pagina_di = parole_pdf(pdf)
    td, paragrafo_di = parole_doc(md)
    sm = difflib.SequenceMatcher(None, tp, td, autojunk=False)
    blocchi = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            continue
        blocchi.append({
            'paragrafo': paragrafo_di[min(j1, len(paragrafo_di) - 1)],
            'pagina_pdf': pagina_di[min(i1, len(pagina_di) - 1)],
            'contesto': ' '.join(td[max(0, j1 - 6):j1]),
            'pdf': tp[i1:i2], 'doc': td[j1:j2],
        })
    per_paragrafo = defaultdict(list)
    for b in blocchi:
        per_paragrafo[b['paragrafo']].append(b)
    for bl in per_paragrafo.values():
        comuni = Counter(t for b in bl for t in b['pdf']) & Counter(t for b in bl for t in b['doc'])
        da_togliere_pdf, da_togliere_doc = Counter(comuni), Counter(comuni)
        for b in bl:
            b['residuo_pdf'] = residuo(b['pdf'], da_togliere_pdf)
            b['residuo_doc'] = residuo(b['doc'], da_togliere_doc)
    restanti = [b for b in blocchi if b['residuo_pdf'] or b['residuo_doc']]
    print(f'somiglianza {sm.ratio():.4f} · parole PDF {len(tp)} · Doc {len(td)} · differenze {len(blocchi)} · dopo i riordini {len(restanti)}')
    with open(uscita, 'w', encoding='utf-8') as f:
        corrente = None
        for b in restanti:
            if b['paragrafo'] != corrente:
                corrente = b['paragrafo']
                f.write(f'\n## {corrente}\n')
            f.write(f"[p.{b['pagina_pdf']}] …{b['contesto']} | PDF: «{' '.join(b['residuo_pdf'])[:500]}» → DOC: «{' '.join(b['residuo_doc'])[:500]}»\n")
    Path(str(uscita) + '.json').write_text(json.dumps(restanti, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
