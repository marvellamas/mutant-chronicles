#!/usr/bin/env python3
"""Lotto proprietà delle armature corporative (Armamenti v0.52 §7.11–§7.17, §7.22.5).

Uso:  python tools/lotti/lotto_proprieta_armature.py
Scrive il campo «effetti» delle armature di data/equipaggiamento/armature_corporative.json
(stesso file, stesso ordine, nessun campo tolto) e l'elenco «proprieta_gestite» in armature.json.
Censimento e classificazione: docs/proprieta-armature.md. Schema: docs/effetti-oggetti.md.

Per ogni effetto la «condizione» è una frase del manuale presa dal testo della proprietà; lo script
controlla che esista nel testo del Doc (docs/manuali-txt/armamenti.md) e si ferma se non la trova.
"""
import json
import re
from pathlib import Path

# lotto storico (tools/lotti/superato.mjs): i dati sono poi cambiati con i lotti successivi; un
# rilancio li riporterebbe indietro. Si esegue solo con --forza.
import sys as _sys  # noqa: E402
if __name__ == '__main__' and '--forza' not in _sys.argv:
    _sys.exit('lotto_proprieta_armature.py: lotto storico, i dati che scrive sono stati aggiornati dai lotti successivi (Armamenti 0.55–0.58, Equipaggiamento 0.5): non rilanciarlo. Per forzare: --forza.')

RADICE = Path(__file__).resolve().parent.parent.parent
CART = RADICE / 'data' / 'equipaggiamento'
DOC = (RADICE / 'docs' / 'manuali-txt' / 'armamenti.md').read_text(encoding='utf-8')


def norm(t):
    return re.sub(r'\s+', ' ', str(t).replace('\\', '').replace('**', '')).strip()


TESTO_DOC = norm(DOC)

# Proprietà già gestite altrove: penalità effettive del modello (penalita), PI della tabella.
GESTITE = [
    'Struttura robusta',            # +2 PI già nei valori tabellari
    'Articolazione d’assalto', 'Articolazione di tiro', 'Articolazione da tiro', 'Articolazione da ricognizione',
    'Assetto da incursione', 'Assetto da pattuglia', 'Assetto mistico',
]
# Solo testo: nessun numero, oppure un numero legato a un'arma agganciata o all'ambiente
# Assetto anfibio: il MOV è già nelle penalità, la parte sul nuoto resta promemoria
TESTUALI = ['Discreta', 'Tenuta subacquea', 'Imbracatura da artigliere', 'Assetto anfibio']


def base(nome):
    return re.sub(r'\s+\d+$', '', nome)


def valore(nome):
    m = re.search(r'(\d+)$', nome)
    return int(m.group(1)) if m else None


def effetti_di(nome):
    """Effetti tipizzati di una proprietà (lista vuota = testuale o gestita)."""
    b, x = base(nome), valore(nome)
    va = lambda abilita, v, ambito, uso=None, **k: {'abilita': abilita, 'valore': v, 'ambito': ambito, **({'uso': uso} if uso else {}), **k}
    sal = lambda s, v, uso, **k: {'tipo': 'salvezza', 'salvezza': s, 'valore': v, 'ambito': 'uso_specifico', 'uso': uso, **k}
    # §7.23.9: proprietà uguali o equivalenti su più oggetti (armatura, rinforzo) non si sommano:
    # vale la maggiore → stessa chiave «beneficio»
    if b == 'Imbottita':
        return [{'tipo': 'contromisura', 'effetto': 'Concussivo', 'valore': x, 'ambito': 'generale', 'beneficio': 'contromisura_concussivo'}]
    if b == 'Isolante':
        return [{'tipo': 'contromisura', 'effetto': 'Elettricità', 'valore': x, 'ambito': 'generale', 'beneficio': 'contromisura_elettricita'}]
    if b == 'Ignifuga':
        return [{'tipo': 'contromisura', 'effetto': 'Fuoco', 'valore': x, 'ambito': 'generale', 'beneficio': 'contromisura_fuoco'}]
    if b == 'Antiesplosione':
        return [{'tipo': 'ar_contro', 'contro': 'esplosioni', 'valore': x, 'ambito': 'generale'}]
    if b == 'Filtro respiratorio':
        return [sal('tempra', x, 'contro veleni e agenti patogeni inalati', beneficio='filtro_respiratorio')]
    if b == 'Protezione occulta':
        return [sal('magia', x, 'contro Oscura Simmetria, Corruzione e Paura', beneficio='protezione_occulta')]
    if b == 'Sigilli d’interdizione':
        return [sal('magia', x, 'contro l’Oscura Simmetria')]
    if b == 'Termoregolazione':
        return [sal('tempra', x, 'contro caldo e freddo ambientali')]
    if b == 'Protezione climatica':
        return [sal('tempra', x, 'contro il caldo ambientale')]
    if b == 'Protezione acustica':
        return [sal(None, x, 'contro effetti sonori o rumori dannosi', beneficio='protezione_acustica')]
    if b in ('Mimetismo', 'Mimetica ambientale'):
        return [va('Furtività', x, 'situazionale', beneficio='mimetismo')]
    if b == 'SIN':
        return [va('Difese', x, 'uso_specifico', 'Schivata', beneficio='sin_schivata')]
    if b == 'Stabile':
        return [{'tipo': 'caratteristica', 'caratteristiche': ['FOR', 'DES'], 'valore': x, 'ambito': 'uso_specifico', 'uso': 'contro Sbilanciante', 'beneficio': 'stabile'}]
    if b == 'Assistenza muscolare':
        u = 'sollevare, spingere, trascinare o sfondare'
        return [va('Atletica', x, 'uso_specifico', u),
                {'tipo': 'caratteristica', 'caratteristiche': ['FOR'], 'valore': x, 'ambito': 'uso_specifico', 'uso': u}]
    if b == 'Colpo assistito':
        return [{'tipo': 'danno', 'attacchi': 'ravvicinati', 'valore': x, 'ambito': 'generale'}]
    if nome in ('Manutenzione semplice', 'Manutenzione agevolata'):
        return [va('Tecnologia', 1, 'uso_specifico', 'riparare l’armatura', beneficio='manutenzione')]
    if b == 'Imbracatura tecnica':
        return [va('Atletica', x, 'uso_specifico', 'arrampicarsi o calarsi con corde')]
    if b == 'Articolazione da arrampicata':
        return [va('Atletica', x, 'uso_specifico', 'arrampicarsi')]
    if b == 'Passo sicuro':
        return [va('Atletica', x, 'uso_specifico', 'equilibrio su terreni instabili')]
    if b == 'Interfaccia da equipaggio':
        return [va('Pilotare', x, 'uso_specifico', 'mezzi terrestri corazzati')]
    if b == 'Imbracatura da sella':
        return [va('Pilotare', x, 'uso_specifico', 'controllo della motocicletta')]
    if b == 'Imbracatura da lancio':
        return [va('Pilotare', x, 'uso_specifico', 'paracadute')]
    if b in ('Interfaccia aeronautica', 'Interfaccia di pilotaggio'):
        return [va('Pilotare', x, 'uso_specifico', 'conduzione di aeromobili', beneficio='interfaccia_pilotaggio')]
    return None


# Frasi del Doc per le proprietà il cui testo nei dati è riassunto dal generatore dei lotti (§7.11.4)
FRASI_BASE = {
    'Imbottita': 'Applicano le Contromisure del §5.24: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni.',
    'Isolante': 'Applicano le Contromisure del §5.24: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni.',
    'Ignifuga': 'Applicano le Contromisure del §5.24: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni.',
    'Colpo assistito': 'Colpo assistito X aggiunge X al danno ordinario degli attacchi ravvicinati, una sola volta per applicazione di danno.',
}


def frase(testo, nome=None):
    """La frase del manuale che dà il numero: la prima del testo della proprietà che esiste nel Doc."""
    fb = FRASI_BASE.get(base(nome or ''))
    if fb:
        assert fb in TESTO_DOC, fb
        return fb
    t = norm(testo)
    t = re.sub(r'\s*\(§[^)]*\)\.?$', '.', t)
    for f in re.split(r'(?<=[.;])\s+', t):
        f = f.strip().rstrip(';')
        f = re.sub(r'\s*\(§[^)]*\)', '', f).strip()
        if len(f) > 20 and f in TESTO_DOC:
            return f
    return None


def main():
    p = CART / 'armature_corporative.json'
    d = json.loads(p.read_text(encoding='utf-8'))
    mancanti = []
    sconosciute = set()
    n = 0
    for o in d['oggetti']:
        effetti = []
        for pr in o.get('proprieta', []):
            b = base(pr['nome'])
            if b in GESTITE or b in TESTUALI:
                continue
            ee = effetti_di(pr['nome'])
            if ee is None:
                sconosciute.add(pr['nome'])
                continue
            c = frase(pr['testo'], pr['nome'])
            if not c:
                mancanti.append(f"{o['id']}: {pr['nome']}")
                continue
            for e in ee:
                effetti.append({**e, 'condizione': c, 'fonte': f"Armamenti {o.get('paragrafo', '')}".strip(), 'proprieta': pr['nome']})
        o.pop('effetti', None)
        if effetti:
            o['effetti'] = effetti
            n += 1
    assert not sconosciute, f'proprietà non classificate: {sorted(sconosciute)}'
    assert not mancanti, 'frasi non trovate nel Doc:\n' + '\n'.join(mancanti)
    p.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

    pa = CART / 'armature.json'
    a = json.loads(pa.read_text(encoding='utf-8'))
    a['proprieta_gestite'] = GESTITE
    a['_nota_proprieta_gestite'] = 'Proprietà delle armature già gestite dalle penalità effettive del modello (penalita) o dai PI della tabella: nessun effetto in più e nessun promemoria (docs/proprieta-armature.md).'
    pa.write_bytes((json.dumps(a, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(f'effetti scritti su {n} armature corporative')


if __name__ == '__main__':
    main()
