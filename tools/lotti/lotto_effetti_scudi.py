#!/usr/bin/env python3
"""Effetti di AR degli scudi (docs/ricognizione-ar-pi.md; Armamenti v0.52 §7.4.3, §7.4.10).

Uso:  python tools/lotti/lotto_effetti_scudi.py   (dopo tools/lotti/lotto3_scudi.mjs, che riscrive il file)
Scrive il campo «effetti» di data/equipaggiamento/scudi.json (stesso file, stesso ordine):
- Antiesplosione 1 → effetto «ar_contro» esplosioni +1 (come le armature, §7.11.4);
- Scudo Magico delle Guardie Sacre → effetto «ar» situazionale +2, di cui 2 magica (da AR +2 a AR +4,
  di cui 2 magica, con l'interruttore al tavolo).
Ogni «condizione» è una frase del manuale: lo script controlla che esista nel testo del Doc.
"""
import json
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent.parent
FILE = RADICE / 'data' / 'equipaggiamento' / 'scudi.json'
DOC = (RADICE / 'docs' / 'manuali-txt' / 'armamenti.md').read_text(encoding='utf-8')


def norm(t):
    return re.sub(r'\s+', ' ', str(t).replace('\\', '').replace('**', '')).strip()


TESTO = norm(DOC)

FRASE_ANTIESPLOSIONE = 'Contro danni Naturali o Magici da esplosione aggiunge 1 all’AR applicabile: su uno Scudo enorme il contributo passa da +3 a +4.'
FRASE_SCUDO_MAGICO = 'Dopo Sintonizzazione, 1 AzP e 1 PM della riserva attivano Scudo Magico per 5 Round: il contributo dello Scudo diventa AR +4, di cui 2 magica, e concede +2 VA alla Parata ravvicinata e +1 VA a quella a distanza, che passa a −3 VA complessivo.'


def main():
    for f in (FRASE_ANTIESPLOSIONE, FRASE_SCUDO_MAGICO):
        assert norm(f) in TESTO, f'frase non trovata nel Doc: {f}'
    d = json.loads(FILE.read_text(encoding='utf-8'))
    n = 0
    for o in d['oggetti']:
        effetti = [e for e in o.get('effetti', []) if e.get('tipo') not in ('ar', 'ar_contro')]
        for p in o.get('proprieta', []):
            m = re.match(r'Antiesplosione (\d+)$', p['nome'])
            if m:
                effetti.append({'tipo': 'ar_contro', 'contro': 'esplosioni', 'valore': int(m.group(1)), 'ambito': 'generale',
                                'condizione': FRASE_ANTIESPLOSIONE, 'fonte': 'Armamenti §7.4.3', 'proprieta': p['nome']})
        if o['id'] == 'scudo-delle-guardie-sacre':
            alt = next(a for a in o['profili_alternativi'] if a.get('ar'))
            effetti.append({'tipo': 'ar', 'valore': alt['ar']['totale'] - o['ar']['totale'], 'magica': alt['ar']['magica'] - o['ar']['magica'],
                            'ambito': 'situazionale', 'condizione': FRASE_SCUDO_MAGICO, 'fonte': 'Armamenti §7.4.10', 'proprieta': 'Scudo Magico'})
        o.pop('effetti', None)
        if effetti:
            o['effetti'] = effetti
            n += 1
    FILE.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(f'effetti di AR su {n} scudi')


if __name__ == '__main__':
    main()
