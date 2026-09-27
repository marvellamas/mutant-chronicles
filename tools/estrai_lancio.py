#!/usr/bin/env python3
"""Campi strutturati per l'utility «Lancia un incantesimo» (src/lancio.js) da ogni scheda di
data/incantesimi.json: azioni, componenti, tiro per colpire, contatto, Salvezza del bersaglio,
Concentrazione, Rituale, PM utilizzabili, Anticipazione con gli aspetti.

Uso:  python tools/estrai_lancio.py      (riscrive il campo «meccanica» di ogni incantesimo)

Le fonti sono testi del manuale già nei dati (intestazione, riga «Lancio:», paragrafo
«Anticipazione:»): tools/verifica_frasi.mjs controlla che esistano nel Doc. Dove il testo non è
riconducibile a un campo il valore resta null e il campo compare in «da_verificare» (per-davide).
Le CORREZIONI in fondo sistemano i casi che le regole non leggono bene.
"""
import json
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
P = RADICE / 'data' / 'incantesimi.json'
SALVEZZE = ['Tempra', 'Riflessi', 'Volontà', 'Magia']


def frasi(t):
    return [f.strip() for f in re.split(r'(?<=[.;])\s+', t) if f.strip()]


def azioni(lancio):
    m = re.match(r'Lancio: (\d+) AP', lancio)
    if m:
        return {'azioni_principali': int(m.group(1))}
    tempo = re.match(r'Lancio: ([^;,.]+)', lancio).group(1).strip()
    return {'tempo': tempo}


def componenti(lancio):
    testo = lancio.split('. ')[0] + ('. ' + lancio.split('. ')[1] if '. ' in lancio else '')
    out = [c for c, parola in [('focus', 'Focus'), ('gesto', 'Gesto'), ('invocazione', 'Invocazione')] if parola in testo]
    obbligatoria = 'Componente vocale obbligatoria' in lancio
    return out, obbligatoria


def concentrazione(lancio):
    l = lancio
    if re.search(r'Esclusivamente a Concentrazione|Concentrazione e contatto per tutta', l):
        return 'obbligatoria'
    if re.search(r'sceglie[^.]*Concentrazione|Concentrazione o(ppure)? (a )?durata|a Concentrazione o a durata', l):
        return 'a_scelta'
    if re.search(r'fuori dal combattimento, con Concentrazione', l):
        return 'durante_il_lancio'
    if re.search(r'senza Concentrazione|[Nn]essuna Concentrazione|Nessuna PS o Concentrazione|Non richiede Concentrazione|[Ee]ffetto istantaneo|Danno istantaneo', l):
        return 'no'
    return None


def salvezza(lancio):
    # frasi intere della riga «Lancio:» che parlano di Salvezze (la prima frase è tempo e componenti)
    parti = [f for f in re.split(r'(?<=\.)\s+', lancio) if re.search(r'\bPS\b|' + '|'.join(SALVEZZE), f) and not f.startswith('Lancio:')]
    parti = [p for p in parti if re.search(r'\bPS\b|Tempra|Riflessi|Volontà', p) or 'PS Magia' in p]
    if not parti:
        return None
    testo = ' '.join(parti).rstrip(';')
    tipi = []
    for p in parti:
        if re.search(r'[Nn]essuna PS(?! ordinaria)', p) and not re.search(r'PS (Tempra|Riflessi|Volontà|Magia)', p):
            continue
        for s in SALVEZZE:
            if re.search(r'(PS |, |\b)' + s + r'\b', p) and s not in tipi and not (s == 'Magia' and 'PS Magia' not in p):
                tipi.append(s)
    return {'tipi': tipi, 'testo': testo}


def intestazione(t):
    rit = re.search(r'Rituale: (consentito|non consentito|obbligatorio)', t)
    pm = re.search(r'PM utilizzabili: ([^.]+)\.', t)
    return (rit.group(1) if rit else None,
            [x.strip() for x in re.split(r'\s+o\s+|,', pm.group(1))] if pm else None,
            t.startswith('Divinazione') or ' Divinazione ' in t)


# Categorie degli aspetti, per i Talenti che tolgono il raddoppio del costo (Magia sez. 12.3):
# Area (Ampliati), Durata (Estesi), Gittata (Proiettati), numero di Bersagli (Plurimi), valori
# numerici di danno, guarigione o bonus (Intensificati: non le Prove Salvezza). «altro»: nessuno.
CATEGORIE = [
    ('altro', r'\bPS\b|Mod\. PS|elementi|elemento|\bnatura\b|Colpi'),
    ('durata', r'durat|Concentrazione'), ('gittata', r'gittata|distanza dal corpo'), ('area', r'raggio|area|dimension|lunghezza|spessore|cono|volume'),
    ('bersagli', r'bersagli|beneficiari|destinatari|dispositivi|animali|partecipanti'), ('valori', r'danno|guarigione|PV|bonus|^\+\d'),
]
# pezzi che precisano l'aspetto precedente (massimi, limiti, eccezioni): non sono aspetti a sé
QUALIFICATORI = r'^(fino a|massimo|anche |senza |oltre |da [−+-]?\d|con |che |mantenendo|applicat|usando|a partire|anziché |artificiale e mistica →)'


# Nome breve dell'aspetto per il pannello «Lancia!» (il gradino intero va nel tooltip). Le etichette
# che non sono qui e non sono già brevi mostrano il gradino intero: meglio lungo che ambiguo.
NOMI = {
    'natura Naturale → Magico': 'Natura del danno', 'Mod. PS peggiorato': 'Mod. PS',
    '+1 elemento entro il massimo di 3': 'Elemento +1', '+1 elemento fino a 6': 'Elemento +1', '+1 elemento fino a 3': 'Elemento +1',
    'sola delle due durate al gradino successivo della propria co': 'Una delle due durate',
    'modificatore delle sole PS secondarie di un gradino': 'Mod. PS secondarie', 'durata al gradino successivo': 'Durata',
    'Contromisura al gradino successivo': 'Contromisura', 'modificatore PS di un gradino': 'Mod. PS',
    'composizione da puro a uno degli ibridi di due elementi': 'Composizione ibrida', 'composizione da puro a ibrido di due elementi': 'Composizione ibrida',
    'natura del danno da Magico a Etereo per entrambe le componen': 'Natura del danno', 'modificatore PS': 'Mod. PS',
    'quantità di PV temporanei': 'PV temporanei', '+1 Q al Passo': 'Passo +1 Q', 'ulteriore −1 al VA degli attaccanti': 'VA degli attaccanti −1',
    'durata successiva': 'Durata', '+1 al bonus Tempra selezionato': 'Bonus Tempra +1', 'gradino nella durata della modalità attiva': 'Durata',
    '+1 al bonus operativo': 'Bonus operativo +1', '+1 al VA degli attacchi': 'VA degli attacchi +1', '+1 al danno': 'Danno +1',
    'gradino nella durata attiva': 'Durata', '+1 AR': 'AR +1', 'gradino di durata': 'Durata', '+1 all’Iniziativa': 'Iniziativa +1',
    '+1 al bonus Schivata': 'Bonus Schivata +1', '+1 PV recuperabile per RND': 'PV per RND +1', 'ulteriore −2 alla Percezione': 'Percezione −2',
    '+1 Azione consentita': 'Azioni consentite +1', 'gradino della durata scelta': 'Durata', '+1 al bonus fisico': 'Bonus fisico +1',
    '+1 al bonus al danno': 'Bonus al danno +1', 'peso successivo della tabella': 'Peso', 'danno successivo': 'Danno',
    'durata della modalità scelta': 'Durata', '+1 al bonus Parata': 'Bonus Parata +1', 'gradino nella durata': 'Durata',
    'danno della riga successiva': 'Danno', '+1 Q alla spinta con Tempra fallita': 'Spinta +1 Q', 'gradino del modificatore PS': 'Mod. PS',
    'valore successivo di PV per segmento': 'PV per segmento', 'Stato da Rallentato a Immobilizzato': 'Stato: Immobilizzato',
    'carico successivo': 'Carico', '+1 al bonus stabilità': 'Bonus stabilità +1', 'durata scelta': 'Durata',
    'dimensione cubica successiva': 'Dimensione del cubo', 'modificatore Tempra': 'Mod. Tempra', 'numero massimo di bersagli': 'Bersagli',
    'modificatore PS Magia': 'Mod. PS Magia', '+1 al bonus': 'Bonus +1', '+1 al bonus PS': 'Bonus PS +1',
    'danno della successiva voce distinta in tabella': 'Danno', 'PV alla riga successiva': 'PV', '+1 VA operativo': 'VA operativo +1',
    '+1 al danno che resta Naturale': 'Danno +1 (Naturale)', '+1 PV per RND': 'PV per RND +1', '+1 al danno iniziale': 'Danno iniziale +1',
    'ulteriore −1 alla penalità al VA': 'Penalità al VA −1', 'grado di complessità della tabella': 'Complessità', 'raggio aura': 'Raggio dell’aura',
    'ulteriore −2 alla PS della modalità scelta': 'PS della modalità −2', 'durata massima a Concentrazione': 'Durata a Concentrazione',
    'precisione del numero Approssimata → Generica → Precisa → Es': 'Precisione del numero',
    'profondità delle informazioni individuali alla riga successi': 'Profondità delle informazioni',
    'durata continuativa a Concentrazione': 'Durata a Concentrazione', 'durata alla riga successiva': 'Durata',
    'passato massimo alla riga successiva': 'Passato massimo', 'un’impressione massima aggiuntiva': 'Impressioni +1',
    'entrambe le modalità contemporaneamente': 'Entrambe le modalità', 'alleato come beneficiario al posto del Taumaturgo': 'Beneficiario: un alleato',
    '+1 al bonus INI': 'Bonus INI +1', 'difesa automatica totale aggiuntiva': 'Difesa automatica totale +1',
    'guarigione alla riga immediatamente successiva': 'Guarigione', 'gittata Contatto': 'Gittata', 'Pericolosità I → II → III → IV → V → VI': 'Pericolosità',
    'origini naturale → naturale e artificiale → naturale': 'Origini', 'gruppo di capacità livello': 'Gruppo di capacità',
    'massimo stato curabile Infetto → Corrotto → Eretico → Caotic': 'Stato massimo curabile', 'natura Magico → Etereo': 'Natura del danno',
    'Potere di esorcismo': 'Potere di esorcismo +3', 'durata al gradino successivo della progressione': 'Durata', 'bonus danno con la stessa scala': 'Bonus danno',
    'sigillo aggiuntivo': 'Sigilli +1', 'combinazione Avviso e Blocco prima del livello': 'Avviso e Blocco insieme',
    'trappola aggiuntiva entro il limite SAG': 'Trappole +1', 'attesa al gradino successivo': 'Attesa', 'danno proprio alla riga successiva': 'Danno proprio',
    'penalità di Interferenza peggiorata': 'Interferenza −1', 'capacità aggiuntiva': 'Capacità in PM', 'Potere di rottura': 'Potere di rottura +3',
    'bonus PS aumentato': 'Bonus PS +1', 'protezione PM aumentata': 'Protezione PM +1', 'sorgente su un oggetto toccato': 'Sorgente su un oggetto',
    'bonus aumentato': 'Bonus +1', 'penalità aumentata': 'Penalità −1', 'danno ai PV al successivo valore distinto della tabella': 'Danno ai PV',
    'perdita di PM aumentata': 'Perdita di PM +1', 'Potere di Negazione aumentato': 'Potere di Negazione +3', 'Concentrazione': 'Durata a Concentrazione',
    'utilizzo aggiuntivo': 'Utilizzi +1', 'gittata Personale → Contatto': 'Gittata', 'gittata di Analisi con la stessa scala': 'Gittata di Analisi',
    'informazioni della soglia successiva in una sola categoria s': 'Informazioni della soglia successiva',
    'Potere di Rilevazione aumentato': 'Potere di Rilevazione +3', 'Potere di Falsificazione aumentato': 'Potere di Falsificazione +3',
}


def nome_breve(etichetta, gradino):
    if etichetta in NOMI:
        return NOMI[etichetta]
    if len(etichetta) <= 32 and '→' not in etichetta:
        return etichetta[0].upper() + etichetta[1:]
    return gradino[0].upper() + gradino[1:]


def categoria(e):
    for c, rx in CATEGORIE:
        if re.search(rx, e, re.I):
            return c
    return 'altro'


def anticipazione(testo_scheda):
    m = re.search(r'Anticipazione:([^\n]*)', testo_scheda)
    if not m:
        return None
    par = 'Anticipazione:' + m.group(1).rstrip()
    if not par.endswith('.'):  # testo della tabella seguente attaccato al paragrafo (13.2)
        par = par[:par.rfind('.') + 1]
    corpo = m.group(1).strip().replace('Mod. PS', 'Mod·PS')
    scelta = re.search(r'(Si sceglie|È consentita soltanto|È anticipabile soltanto)\s+(.*?)(?:\.\s|\.$)', corpo)
    if scelta:
        lista = scelta.group(2)
    else:
        # forma breve: «un solo aspetto…: A, B oppure C.» oppure «A, B oppure C.» all'inizio
        prima = re.split(r'\.\s', corpo)[0]
        prima = re.sub(r'^(un solo aspetto[^.:;]*?(categoria|gradino)[.,;:]?\s*|un solo gradino (nella|nel) )', '', prima)
        lista = prima
    lista = re.sub(r'^(il |la |lo |l’|la sola |soltanto )', '', lista)
    pezzi = re.split(r';\s*(?:oppure\s+)?|,\s+(?![^()]*\))(?:oppure\s+)?|\s+oppure\s+', lista)
    aspetti = []
    for p in pezzi:
        p = re.sub(r'^(oppure |si sceglie |il |la |lo |l’|le |i |gli |un |una |nella |nel |all’|al )', '', p.strip()).strip(' .').replace('Mod·PS', 'Mod. PS')
        if not p or re.match(r'costo base|PM raddoppiati|Potere più difficile|raddoppiando', p):
            continue
        if aspetti and re.match(QUALIFICATORI, p):
            aspetti[-1]['gradino'] += ', ' + p
            continue
        if re.match(r'[+−-]?\d', p):
            et = re.split(r'\s\(|:\s', p)[0]
        else:
            et = re.split(r'\s\(|:\s|\s(?:da\s+)?[−+-]?\d', p)[0]
        et = et.strip()
        while re.search(r'\s+(da|di|a|→|fino)$', et):
            et = re.sub(r'\s+(da|di|a|→|fino)$', '', et)
        if p == 'oppure':
            continue
        if re.fullmatch(r'ulteriore|dal livello', et):
            # «ulteriore −1 al VA…», «dal livello 6»: il numero fa parte dell'aspetto
            if et == 'dal livello' and aspetti:
                aspetti[-1]['gradino'] += ', ' + p
                continue
            et = re.split(r'\s\(|,\s', p)[0]
        aspetti.append({'etichetta': et[:60], 'gradino': p, 'categoria': categoria(p)})
    for a in aspetti:
        a['nome'] = nome_breve(a['etichetta'], a['gradino'])
    return {'ammessa': True, 'aspetti': aspetti, 'frase': par}


def estrai(i):
    testo = '\n'.join([i.get('lancio') or '', i.get('descrizione') or '', i.get('regole') or ''])
    comp, obbl = componenti(i['lancio'])
    rit, pm, divinazione = intestazione(i['intestazione'])
    contatto = any('Contatto' in str(v.get('Gittata', '')) for v in i.get('versioni') or [])
    colpire = bool(re.search(r'si effettua Armi da lancio', testo))
    out = {
        'azioni': azioni(i['lancio']),
        'componenti': comp,
        **({'invocazione_obbligatoria': True} if obbl else {}),
        'richiede_colpire': colpire,
        'contatto': contatto,
        'salvezza': salvezza(i['lancio']),
        'concentrazione': concentrazione(i['lancio']),
        'rituale': rit,
        'pm_utilizzabili': pm,
        **({'divinazione': True} if divinazione else {}),
        'anticipazione': anticipazione(testo),
    }
    return out


# Correzioni puntuali (scheda → campi): dove le regole generali non leggono il testo. Ogni
# correzione cita in «frasi» il testo della scheda da cui viene (verificato come le altre frasi).
NO_CONC = lambda f: {'concentrazione': 'no', 'frasi': [f]}
CORREZIONI = {
    # effetti istantanei: nessuna colonna Durata nelle versioni (sez. 2: «Ogni versione persistente riporta la Durata.»)
    '13.1': {'concentrazione': 'no', 'frasi': ['Ogni versione persistente riporta la Durata.'],
             'TODO(Davide)': 'Colpo Elementale ha la colonna «Mod PS» ma la scheda non dice quale Prova Salvezza e quando la fa il bersaglio (colpisce automaticamente). Per-davide A.39.'},
    '21.10': {'TODO(Davide)': 'Rigenerazione si lancia solo mediante Rituale: componenti, Concentrazione, Anticipazione e costo di esecuzione arriveranno con le regole dei Rituali. Per-davide A.39.'},
    '13.2': {'concentrazione': 'a_scelta', 'frasi': ['Un comportamento semplice dichiarato al lancio può proseguire senza Concentrazione.', 'Modificare attivamente l’effetto richiede Concentrazione.']},
    '13.3': NO_CONC('Durata fissa senza Concentrazione.'),
    '13.4': NO_CONC('Durata fissa senza Concentrazione.'),
    '13.5': NO_CONC('Durata fissa senza Concentrazione.'),
    '13.6': {'concentrazione': 'no', 'salvezza': {'tipi': [], 'testo': 'La tabella modifica Elusione e le PS secondarie.'},
             'frasi': ['La tabella modifica Elusione e le PS secondarie.', 'Ogni versione persistente riporta la Durata.']},
    '13.7': {'concentrazione': 'no', 'salvezza': {'tipi': [], 'testo': 'Consente soltanto Elusione: il modificatore PS si applica a questa prova e alle eventuali PS secondarie.'},
             'frasi': ['Consente soltanto Elusione: il modificatore PS si applica a questa prova e alle eventuali PS secondarie.', 'Ogni versione persistente riporta la Durata.']},
    '13.8': NO_CONC('La durata è fissa e non richiede Concentrazione.'),
    '13.9': {'concentrazione': 'no', 'salvezza': {'tipi': [], 'testo': 'nessuna PS per trasformarsi.'}, 'frasi': ['Durata fissa senza Concentrazione.', 'Bersaglio e gittata Personale; nessuna PS per trasformarsi.']},
    '13.10': {'concentrazione': 'no', 'salvezza': {'tipi': [], 'testo': 'Il modificatore PS si applica a Elusione e alle PS secondarie che prevedono una prova.'},
              'frasi': ['L’origine è un punto visibile entro gittata; l’area è una sfera immobile, senza Concentrazione.', 'Il modificatore PS si applica a Elusione e alle PS secondarie che prevedono una prova.']},
    '20.2': NO_CONC('Durata fissa.'),
    '20.5': NO_CONC('Durata fissa.'),
    '20.6': NO_CONC('Durata fissa dopo il completamento.'),
    '21.8': NO_CONC('Gittata personale; esplosione sferica istantanea.'),
}


def main():
    d = json.loads(P.read_text(encoding='utf-8'))
    da_verificare = []
    for i in d['incantesimi']:
        m = estrai(i)
        m.update(CORREZIONI.get(i['scheda'], {}))
        mancanti = [k for k in ['componenti', 'salvezza', 'concentrazione', 'rituale', 'pm_utilizzabili', 'anticipazione'] if m.get(k) in (None, [])]
        if m['anticipazione'] and not m['anticipazione']['aspetti']:
            mancanti.append('anticipazione.aspetti')
        if mancanti and not (m.get('salvezza') is None and mancanti == ['salvezza']):
            m['da_verificare'] = mancanti
            da_verificare.append((i['scheda'], i['nome'], mancanti))
        i['meccanica'] = m
    P.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    for x in da_verificare:
        print('DA VERIFICARE', *x)
    print(len(d['incantesimi']), 'incantesimi')


if __name__ == '__main__':
    main()
