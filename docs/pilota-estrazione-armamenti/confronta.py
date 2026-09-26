#!/usr/bin/env python3
"""Pilota di estrazione: confronta i CSV grezzi di pdfplumber con i CSV puliti controllati a mano.

Non corregge nulla: misura. Per ogni record del CSV pulito dice se il grezzo lo conteneva
  - al primo colpo: dopo la sola compattazione (via righe e celle vuote) le celle coincidono;
  - con conversione numerica: coincidono dopo aver tolto il punto delle migliaia ("1.500");
  - riga spezzata: il testo di una cella andata a capo è finito in una riga a parte;
  - altro: da correggere a mano in altro modo.
Stampa anche le statistiche strutturali del grezzo (righe vuote, colonne, posizioni delle celle).

Uso: python docs/pilota-estrazione-armamenti/confronta.py   (solo libreria standard)
"""
import csv
import re
import sys
from pathlib import Path

QUI = Path(__file__).parent
TABELLE = [
    # (nome, CSV grezzi in ordine, righe di intestazione nel grezzo per file, CSV pulito)
    ('§7.1.1 profili delle armi ravvicinate', ['005_2.csv', '006_1.csv'], 1, '7.1.1_armi_ravvicinate.csv'),
    ('§7.1.1 requisiti e dati economici', ['006_2.csv', '007_1.csv'], 2, '7.1.1_requisiti_economici.csv'),
    ('§7.11.3 armature civili (AR, FOR, PI)', ['062_4.csv'], 1, '7.11.3_armature_civili.csv'),
    ('§7.11.3 armature civili (dati economici)', ['063_1.csv'], 1, '7.11.3_armature_civili_economici.csv'),
]


def leggi_grezzo(nome):
    with open(QUI / 'grezzo' / nome, encoding='utf-8', newline='') as f:
        return [r for r in csv.reader(f) if not (r and r[0].startswith('#'))]


def leggi_pulito(nome):
    with open(QUI / 'pulito' / nome, encoding='utf-8', newline='') as f:
        righe = list(csv.reader(f))
    return righe[0], righe[1:]


def compatta(riga):
    return [c for c in riga if c.strip()]


def senza_migliaia(celle):
    return [re.sub(r'^(\d{1,3})\.(\d{3})$', r'\1\2', c) for c in celle]


def unisci_per_colonna(principale, seguito):
    """Unisce una riga di continuazione alla precedente cella per cella, per indice di colonna."""
    out = list(principale)
    for i, c in enumerate(seguito):
        if c.strip():
            out[i] = f'{out[i]} {c}'.strip() if i < len(out) and out[i].strip() else c
    return out


def analizza(nome, grezzi, intestazione, pulito):
    colonne, attesi = leggi_pulito(pulito)
    stat = {'righe_grezze': 0, 'righe_vuote': 0, 'colonne_grezze': set(), 'schemi_posizione': set(), 'intestazione': []}
    dati = []  # righe grezze con dati (non vuote), senza intestazione
    for nome_file in grezzi:
        righe = leggi_grezzo(nome_file)
        stat['righe_grezze'] += len(righe)
        piene = []
        for r in righe:
            stat['colonne_grezze'].add(len(r))
            if not any(c.strip() for c in r):
                stat['righe_vuote'] += 1
                continue
            piene.append(r)
        stat['intestazione'].append([compatta(r) for r in piene[:intestazione]])
        for r in piene[intestazione:]:
            stat['schemi_posizione'].add(tuple(i for i, c in enumerate(r) if c.strip()))
            dati.append(r)

    esiti = []
    i = 0
    for atteso in attesi:
        if i >= len(dati):
            esiti.append((atteso, 'mancante', None))
            continue
        r = dati[i]
        c = compatta(r)
        if c == atteso:
            esiti.append((atteso, 'primo colpo', c)); i += 1; continue
        if senza_migliaia(c) == atteso:
            esiti.append((atteso, 'conversione numerica', c)); i += 1; continue
        # riga di continuazione: la successiva ha meno celle e completa quelle andate a capo
        if i + 1 < len(dati) and len(compatta(dati[i + 1])) < len(atteso):
            unita = compatta(unisci_per_colonna(r, dati[i + 1]))
            if unita == atteso:
                esiti.append((atteso, 'riga spezzata', c)); i += 2; continue
        esiti.append((atteso, 'altro', c)); i += 1
    avanzate = dati[i:]
    return colonne, stat, esiti, avanzate


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    for nome, grezzi, intestazione, pulito in TABELLE:
        colonne, stat, esiti, avanzate = analizza(nome, grezzi, intestazione, pulito)
        conta = {}
        for _, e, _ in esiti:
            conta[e] = conta.get(e, 0) + 1
        print(f'## {nome}')
        print(f'grezzi: {", ".join(grezzi)} → pulito: {pulito}')
        print(f'record: {len(esiti)}; colonne attese {len(colonne)}; colonne nel grezzo {sorted(stat["colonne_grezze"])}')
        print(f'righe grezze {stat["righe_grezze"]}, di cui vuote {stat["righe_vuote"]}; '
              f'schemi di posizione delle celle nelle righe di dati: {len(stat["schemi_posizione"])}')
        print(f'intestazione (per file): {stat["intestazione"]}')
        print('esiti: ' + ', '.join(f'{k} {v}' for k, v in sorted(conta.items())))
        for atteso, e, c in esiti:
            if e != 'primo colpo':
                print(f'  - {e}: {atteso[:2]} ← grezzo {c}')
        if avanzate:
            print(f'  righe grezze non usate: {[compatta(r) for r in avanzate]}')
        print()


if __name__ == '__main__':
    main()
