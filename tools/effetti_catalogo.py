#!/usr/bin/env python3
"""Effetti numerici degli oggetti del catalogo sui VA (campo «effetti» degli oggetti).

Uso:  python tools/effetti_catalogo.py
Riscrive il campo «effetti» degli oggetti elencati qui sotto in data/equipaggiamento/*.json
(idempotente: gli altri campi non cambiano). La frase del manuale che dà il bonus si cerca nel
testo dell'oggetto (effetto breve, note, proprietà) e si copia intera nella «condizione»; se non
c'è, lo script si ferma. Il controllo che la frase esista nei Doc sta in tools/verifica_frasi.mjs.

Ambiti (docs/effetti-oggetti.md):
- generale: vale per ogni uso dell'Abilità quando l'oggetto è in uso;
- situazionale: vale per gli usi ordinari quando ricorre una circostanza della scena (ambiente,
  formalità, osservazione a distanza): al tavolo il giocatore accende la condizione;
- uso_specifico: vale solo per un tipo di Prova nominato dal manuale (tracce, pronto soccorso,
  riparazioni…): il VA generale non cambia, accanto compare il valore per quell'uso.
"""
import json
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
CARTELLA = RADICE / 'data' / 'equipaggiamento'


def va(abilita, valore, ambito, chiave, uso=None):
    """Un effetto: `chiave` è una regex che individua la frase del manuale nel testo dell'oggetto."""
    return {'abilita': abilita, 'valore': valore, 'ambito': ambito, 'uso': uso, 'chiave': chiave}


INVESTIGAZIONE = [va('Percezione', 2, 'uso_specifico', r'\+2 VA a Percezione', 'tracce'),
                  va('Scienza', 2, 'uso_specifico', r'\+2 VA a Percezione', 'analisi')]
INTRUSIONE = [va('Tecnologia', 2, 'uso_specifico', r'\+2 VA a Tecnologia per intervenire', 'serrature e allarmi')]
CONTROSORVEGLIANZA = [va('Tecnologia', 2, 'uso_specifico', r'\+2 VA a Tecnologia per cercare', 'controsorveglianza')]
ARTIFICIERE = [va('Tecnologia', 2, 'uso_specifico', r'\+2 VA a Tecnologia per preparare', 'esplosivi')]
KIT_TRAUMA = [va('Medicina', 2, 'uso_specifico', r'\+2 VA a Medicina', 'pronto soccorso')]
RICOGNIZIONE = [va('Percezione', 2, 'situazionale', r'\+2 VA a Percezione per osservazion')]
SOPRAVVIVENZA = [va('Sopravvivenza', 2, 'situazionale', r'\+2 VA a Sopravvivenza')]
ASSALTO = [va('Atletica', 2, 'uso_specifico', r'\+2 VA ad Atletica per arrampicarsi', 'arrampicata')]
MANUTENZIONE = [va('Tecnologia', 2, 'uso_specifico', r'\+2 VA a Tecnologia per diagnosi', 'riparazioni sul campo')]

SPEC = {
    'corredi_dispositivi': {
        **{k: INVESTIGAZIONE for k in ['valigetta-investigativa-asa', 'valigetta-investigativa-capitol', 'valigetta-investigativa-isc', 'investigazione-mishima', 'investigazione-fratellanza']},
        **{k: INTRUSIONE for k in ['corredo-d-intrusione-asa', 'corredo-d-intrusione-capitol', 'corredo-d-intrusione-isc', 'intrusione-mishima', 'intrusione-fratellanza']},
        **{k: CONTROSORVEGLIANZA for k in ['kit-di-controsorveglianza-asa', 'kit-di-controsorveglianza-capitol', 'kit-di-controsorveglianza-isc', 'controsorveglianza-mishima', 'controsorveglianza-fratellanza']},
        **{k: ARTIFICIERE for k in ['corredo-da-artificiere-dell-alleanza', 'corredo-da-artificiere-capitol', 'corredo-da-artificiere-imperial', 'artificiere-mishima', 'artificiere-fratellanza']},
        **{k: KIT_TRAUMA for k in ['kit-trauma-dell-alleanza', 'kit-trauma-capitol', 'kit-trauma-imperial', 'kit-trauma-mishima', 'kit-trauma-fratellanza']},
        **{k: RICOGNIZIONE for k in ['corredo-da-ricognizione-rangers', 'corredo-da-ricognizione-imperial', 'ricognizione-mishima', 'ricognizione-fratellanza']},
        **{k: SOPRAVVIVENZA for k in ['corredo-di-sopravvivenza-ambientale-capitol', 'corredo-di-sopravvivenza-ambientale-imperial', 'sopravvivenza-ambientale-mishima', 'sopravvivenza-ambientale-fratellanza']},
        **{k: ASSALTO for k in ['corredo-da-assalto-verticale-capitol', 'corredo-da-assalto-verticale-imperial', 'assalto-verticale-mishima', 'assalto-verticale-fratellanza']},
        **{k: MANUTENZIONE for k in ['corredo-di-manutenzione-da-campo', 'corredo-di-manutenzione-imperial', 'manutenzione-mishima', 'manutenzione-fratellanza']},
        'corredo-per-operazioni-subacquee': [va('Atletica', 2, 'uso_specifico', r'\+2 VA ad Atletica nelle Prove di Nuoto', 'nuoto con le pinne'),
                                            va('Sopravvivenza', 2, 'uso_specifico', r'\+2 VA ad Atletica nelle Prove di Nuoto', 'orientamento sott’acqua')],
        'consultazione-occultistica': [va('Occultismo', 2, 'uso_specifico', r'\+2 VA a Occultismo', 'consultazione di testi')],
        'corredo-di-assistenza-dr-diana': [va('Medicina', 2, 'uso_specifico', r'\+2 VA a Medicina per pronto soccorso', 'pronto soccorso'),
                                           va('Tecnologia', 2, 'uso_specifico', r'\+2 VA a Medicina per pronto soccorso', 'riparazione cibernetica')],
        'ias3300-mirrorshard': [va('Furtività', 2, 'situazionale', r'concede \+2 VA alla Prova unica di Furtività')],
    },
    'sanitario': {
        'scanner-diagnostico-portatile': [va('Medicina', 2, 'uso_specifico', r'Prova di Medicina con \+2 VA', 'diagnosi')],
        'scanner-diagnostico-cybertronic': [va('Medicina', 2, 'uso_specifico', r'\+2 VA diagnostico', 'diagnosi')],
        'kit-chirurgico-da-campo': [va('Medicina', 2, 'uso_specifico', r'\+2 VA a Medicina per interventi chirurgici', 'chirurgia')],
        'postazione-medica-da-campo': [va('Medicina', 3, 'uso_specifico', r'\+3 VA a Medicina', 'chirurgia e Ferite')],
    },
}

# Il Kit di pronto soccorso Professionale (§7.19) non dichiara il bonus nella propria scheda: lo dà
# il Manuale del Giocatore (§2.16.6, «Kit trauma») e il Manuale degli Armamenti nei corredi
# («Il Kit trauma è il Kit di pronto soccorso Professionale del §7.19. Concede +2 VA a Medicina»).
ESTERNI = {
    ('sanitario', 'kit-di-pronto-soccorso-professionale'): [{
        'abilita': 'Medicina', 'valore': 2, 'ambito': 'uso_specifico', 'uso': 'pronto soccorso',
        'condizione': 'Il Kit trauma concede +2 VA alle Prove di Medicina per il pronto soccorso.', 'fonte': 'Giocatore §2.16.6',
    }],
}


def pulisci(t):
    return re.sub(r'\s+', ' ', str(t).replace('\\', '').replace('**', '')).strip()


def frasi(o):
    testi = [o.get('effetto_breve') or '', o.get('note_manuale') or ''] + [p.get('testo', '') for p in o.get('proprieta', [])]
    out = []
    for t in testi:
        out += [f.strip() for f in re.split(r'(?<=[.;])\s+(?=[A-ZÈÉÀ+])', pulisci(t)) if f.strip()]
    return out


def main():
    totale = 0
    for file, spec in SPEC.items():
        p = CARTELLA / f'{file}.json'
        dati = json.loads(p.read_text(encoding='utf-8'))
        per_id = {o['id']: o for o in dati['oggetti']}
        for oid in list(spec) + [k[1] for k in ESTERNI if k[0] == file]:
            assert oid in per_id, f'{file}: nessun oggetto {oid}'
        for o in dati['oggetti']:
            o.pop('effetti', None)
            if (file, o['id']) in ESTERNI:
                o['effetti'] = ESTERNI[(file, o['id'])]
            if o['id'] not in spec:
                continue
            effetti = []
            for e in spec[o['id']]:
                trovate = [f for f in frasi(o) if re.search(e['chiave'], f)]
                assert trovate, f"{file}:{o['id']}: nessuna frase per {e['chiave']}"
                x = {'abilita': e['abilita'], 'valore': e['valore'], 'ambito': e['ambito']}
                if e['uso']:
                    x['uso'] = e['uso']
                x['condizione'] = trovate[0].rstrip(';')
                x['fonte'] = f"Armamenti {o.get('paragrafo', '')}".strip()
                effetti.append(x)
            o['effetti'] = effetti
            totale += 1
        p.write_bytes((json.dumps(dati, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(f'effetti scritti su {totale + len(ESTERNI)} oggetti del catalogo')


if __name__ == '__main__':
    main()
