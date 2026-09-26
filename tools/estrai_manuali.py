#!/usr/bin/env python3
"""Estrazione di testo e tabelle dai PDF dei manuali (docs/roadmap-equipaggiamento-e-scheda.md, §1.5).

Non fa parte dell'app: l'app non carica nulla da tools/. Serve a preparare i dati (CSV grezzi da
controllare e trasformare in JSON) e i testi per il confronto fra edizioni dei manuali.

Uso:
  python tools/estrai_manuali.py --prosa   <pdf> <cartella>                   [--scrivi]
  python tools/estrai_manuali.py --tabelle <pdf> <cartella> [--pagine a-b]    [--scrivi]

Senza --scrivi è una prova a vuoto: elenca i file che scriverebbe, senza toccare il disco.

--prosa    Un .txt UTF-8 per paragrafo numerato di primo livello (es. «7.1 Dati fondamentali
           delle armi»), con il testo in modalità prosa (non layout). Le righe che si ripetono
           in cima o in fondo a molte pagine (intestazioni e piè di pagina) sono tolte.
--tabelle  Un CSV per ogni tabella trovata da pdfplumber (impostazioni predefinite), con nome
           <pagina>_<n>.csv. La prima riga è un commento con pagina e prime celle
           dell'intestazione; le celle andate a capo sono unite con uno spazio.

Dipendenza: pdfplumber (tools/requirements.txt).
"""
import argparse
import csv
import io
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:  # messaggio leggibile invece di un traceback
    sys.exit('Manca pdfplumber: installalo con  python -m pip install -r tools/requirements.txt')

# Paragrafo numerato di primo livello: «7.1 Titolo», «5.14 Titolo» (non «7.1.1», non l'indice con i puntini)
TITOLO_PRIMO_LIVELLO = re.compile(r'^(\d+\.\d+)\s+([A-ZÀ-Ý].*)$')
PUNTINI_INDICE = re.compile(r'\.{5,}')


def intervallo_pagine(testo, totale):
    """'5-7' → range(5, 8); '5' → range(5, 6). Pagine numerate da 1, come nel PDF."""
    if not testo:
        return range(1, totale + 1)
    m = re.fullmatch(r'\s*(\d+)\s*(?:-\s*(\d+))?\s*', testo)
    if not m:
        sys.exit(f'--pagine: formato non valido "{testo}" (atteso a-b oppure un numero)')
    a = int(m.group(1))
    b = int(m.group(2) or a)
    if not (1 <= a <= b <= totale):
        sys.exit(f'--pagine: {a}-{b} fuori dal PDF (1-{totale})')
    return range(a, b + 1)


def nome_file_sicuro(testo, massimo=80):
    t = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', testo).strip().rstrip('.')
    return re.sub(r'\s+', ' ', t)[:massimo].rstrip()


def cella(v):
    """Cella del CSV: None → vuota, righe a capo unite con uno spazio."""
    if v is None:
        return ''
    return re.sub(r'\s*\n\s*', ' ', str(v)).strip()


# ---------------------------------------------------------------------------
# Prosa

def righe_ricorrenti(pagine_testo, soglia=0.5):
    """Righe (con le cifre normalizzate) presenti in cima o in fondo ad almeno metà delle pagine:
    intestazioni e piè di pagina, da non ripetere in ogni sezione."""
    conta = Counter()
    for testo in pagine_testo:
        righe = [r.strip() for r in testo.split('\n') if r.strip()]
        bordi = set(righe[:2] + righe[-2:])
        conta.update({re.sub(r'\d+', '#', r) for r in bordi})
    minimo = max(2, int(len(pagine_testo) * soglia))
    return {r for r, n in conta.items() if n >= minimo}


def estrai_prosa(pdf_path):
    """Restituisce [(titolo, testo)] per paragrafo di primo livello, più l'eventuale testo iniziale."""
    with pdfplumber.open(pdf_path) as pdf:
        pagine = [p.extract_text() or '' for p in pdf.pages]
    ricorrenti = righe_ricorrenti(pagine)
    sezioni = [['(prima delle sezioni numerate)', []]]
    for testo in pagine:
        for riga in testo.split('\n'):
            r = riga.strip()
            if not r or re.sub(r'\d+', '#', r) in ricorrenti:
                continue
            m = TITOLO_PRIMO_LIVELLO.match(r)
            if m and not PUNTINI_INDICE.search(r):
                sezioni.append([f'{m.group(1)} {m.group(2)}', []])
            sezioni[-1][1].append(r)
    return [(t, '\n'.join(righe) + '\n') for t, righe in sezioni if righe]


def comando_prosa(pdf_path, cartella, scrivi):
    sezioni = estrai_prosa(pdf_path)
    visti = Counter()
    for titolo, testo in sezioni:
        nome = '00 prima delle sezioni' if titolo.startswith('(') else nome_file_sicuro(titolo)
        visti[nome] += 1
        if visti[nome] > 1:  # stesso titolo due volte (per esempio richiamato nel testo)
            nome = f'{nome} ({visti[nome]})'
        dest = cartella / f'{nome}.txt'
        righe = testo.count('\n')
        if scrivi:
            dest.write_text(testo, encoding='utf-8', newline='\n')
            print(f'scritto   {dest}  ({righe} righe)')
        else:
            print(f'scriverei {dest}  ({righe} righe)')
    print(f'{len(sezioni)} sezioni.')


# ---------------------------------------------------------------------------
# Tabelle

def comando_tabelle(pdf_path, cartella, pagine, scrivi):
    trovate = 0
    with pdfplumber.open(pdf_path) as pdf:
        for n in intervallo_pagine(pagine, len(pdf.pages)):
            tabelle = pdf.pages[n - 1].extract_tables()
            for k, tabella in enumerate(tabelle, start=1):
                trovate += 1
                righe = [[cella(v) for v in riga] for riga in tabella]
                # prima riga con del testo: pdfplumber può restituire righe vuote in cima
                prima = next((r for r in righe if any(r)), [])
                intestazione = ' | '.join(c for c in prima if c)[:120]
                dest = cartella / f'{n:03d}_{k}.csv'
                colonne = max((len(r) for r in righe), default=0)
                if scrivi:
                    buf = io.StringIO()
                    buf.write(f'# pagina {n}, tabella {k}: {intestazione}\n')
                    csv.writer(buf, lineterminator='\n').writerows(righe)
                    dest.write_text(buf.getvalue(), encoding='utf-8', newline='\n')
                    print(f'scritto   {dest}  ({len(righe)} righe x {colonne} colonne)  {intestazione[:60]}')
                else:
                    print(f'scriverei {dest}  ({len(righe)} righe x {colonne} colonne)  {intestazione[:60]}')
    print(f'{trovate} tabelle trovate.')


def main():
    ap = argparse.ArgumentParser(description='Estrazione di prosa e tabelle dai manuali (strumento, non app).')
    modo = ap.add_mutually_exclusive_group(required=True)
    modo.add_argument('--prosa', action='store_true', help='un .txt per paragrafo di primo livello')
    modo.add_argument('--tabelle', action='store_true', help='un CSV per tabella trovata')
    ap.add_argument('pdf', type=Path)
    ap.add_argument('cartella', type=Path)
    ap.add_argument('--pagine', help='solo con --tabelle: intervallo a-b (pagine del PDF, da 1)')
    ap.add_argument('--scrivi', action='store_true', help='scrive davvero (senza: prova a vuoto)')
    a = ap.parse_args()

    if not a.pdf.is_file():
        sys.exit(f'PDF non trovato: {a.pdf}')
    if a.pagine and not a.tabelle:
        sys.exit('--pagine vale solo con --tabelle')
    if a.scrivi:
        a.cartella.mkdir(parents=True, exist_ok=True)
    else:
        print('Prova a vuoto: nessun file scritto (aggiungi --scrivi per scrivere).')
    if a.prosa:
        comando_prosa(a.pdf, a.cartella, a.scrivi)
    else:
        comando_tabelle(a.pdf, a.cartella, a.pagine, a.scrivi)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
