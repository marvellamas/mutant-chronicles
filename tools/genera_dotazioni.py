#!/usr/bin/env python3
"""Genera data/dotazioni.json dal Manuale del Giocatore §2.16 (docs/manuali-txt/giocatore.md).

Non fa parte dell'app. Uso:  python tools/genera_dotazioni.py
Il testo (righe delle tabelle e paragrafi) si copia dal Doc così com'è; la struttura per il passo
«Equipaggiamento iniziale» (gruppi di scelta, opzioni, riferimenti al catalogo, munizioni,
requisiti di FOR dichiarati, sotto-scelte) è scritta qui sotto a mano, Classe per Classe, e lo
script controlla che ogni gruppo corrisponda a una riga della tabella del Doc. Dopo la
generazione il file si può correggere a mano: il validatore (src/validate.js) controlla
riferimenti, requisiti e copertura delle Classi.
"""
import json
import re
from pathlib import Path

# Dopo la prima generazione dotazioni.json è stato completato dai lotti (collegamenti «rif» alle schede,
# abbinamenti corporativi del §7.22, Giocatore 0.45): un rilancio li perderebbe. Si esegue solo con --forza;
# per aggiornare i testi da una nuova edizione del manuale si fondono i soli paragrafi cambiati
# (docs/diff-manuali-2026-10-01.md).
import sys as _sys  # noqa: E402
if __name__ == '__main__' and '--forza' not in _sys.argv:
    _sys.exit('genera_dotazioni.py: dotazioni.json è stato completato dai lotti successivi; un rilancio li perderebbe. Per forzare: --forza.')

RADICE = Path(__file__).resolve().parent.parent
DOC = RADICE / 'docs' / 'manuali-txt' / 'giocatore.md'
USCITA = RADICE / 'data' / 'dotazioni.json'


def pulisci(s):
    return re.sub(r'\s+', ' ', s.replace('\\', '').replace('**', '')).strip()


# ---------------------------------------------------------------------------
# Testo del §2.16

righe = DOC.read_text(encoding='utf-8').split('\n')
i = next(k for k, r in enumerate(righe) if r.startswith('## **2.16 '))
j = next(k for k, r in enumerate(righe) if r.startswith('## **2.17'))
sezioni, cur = {}, None
introduzione = []
for r in righe[i + 1:j]:
    m = re.match(r'^### \*\*(2\.16\.\d+) (.+?)\*\*', r)
    if m:
        cur = m.group(1)
        sezioni[cur] = {'titolo': pulisci(m.group(2)), 'tabella': [], 'paragrafi': []}
        continue
    if not r.strip():
        continue
    if cur is None:
        introduzione.append(pulisci(r.lstrip('* ')))
        continue
    if r.startswith('|'):
        celle = [pulisci(c) for c in r.strip().strip('|').split('|')]
        if set(celle[0]) <= set(':- ') or celle[0] in ('Dotazione', 'Oggetto'):
            continue
        sezioni[cur]['tabella'].append(celle)
    else:
        sezioni[cur]['paragrafi'].append(pulisci(r))

# ---------------------------------------------------------------------------
# Catalogo: requisiti, nomi e munizioni ordinarie per famiglia

catalogo = {}
for f in (RADICE / 'data' / 'equipaggiamento').glob('*.json'):
    if f.name == 'index.json':
        continue
    for o in json.loads(f.read_text(encoding='utf-8')).get('oggetti', []):
        catalogo[f'{f.stem}:{o["id"]}'] = o
mun = json.loads((RADICE / 'data' / 'equipaggiamento' / 'munizioni.json').read_text(encoding='utf-8'))
famiglia_arma = {x['rif']: x['famiglia'] for x in mun['munizioni_armi']}
ordinaria = {o['munizione']['famiglia']: f'munizioni:{o["id"]}' for o in mun['oggetti']
             if o.get('famiglia') == 'Munizioni ordinarie' and o.get('catalogo') == 'Commerciale' and o.get('munizione')}

# ---------------------------------------------------------------------------
# Oggetti della dotazione non ancora a catalogo (Manuale dell'Equipaggiamento, cap. 2–8)

AMBIENTI = ['Artico', 'Forestale', 'Desertico', 'Urbano', 'Pianure', 'Sottosuolo', 'Apocalittico']
OGGETTI = {
    # dotazione comune (§2.16.1)
    'abiti-comuni': {'nome': 'Abiti comuni, comprese le calzature'},
    'zaino-da-viaggio': {'nome': 'Zaino da viaggio'},
    'cintura-attrezzata': {'nome': 'Cintura attrezzata'},
    'borraccia': {'nome': 'Borraccia da un litro, piena d’acqua'},
    'torcia-elettrica': {'nome': 'Torcia elettrica'},
    'comunicatore-personale': {'nome': 'Comunicatore personale'},
    'corredo-igiene': {'nome': 'Corredo personale per igiene e piccoli rammendi'},
    'utensile-multiuso': {'nome': 'Utensile multiuso'},
    'accendino': {'nome': 'Accendino'},
    'sacco-a-pelo': {'nome': 'Sacco a pelo'},
    'razione-da-viaggio': {'nome': 'Razione da viaggio'},
    # dotazioni delle Classi
    # E&L 15 (A.34): peso e prezzo dall'Equipaggiamento 0.3 §§4.2–4.3
    'binocolo': {'nome': 'Binocolo', 'peso': 0.8, 'costo': 500, 'paragrafo': 'Equipaggiamento 0.3 §4.2'},
    'registratore-audiovisivo': {'nome': 'Registratore audiovisivo', 'peso': 0.2, 'costo': 200, 'paragrafo': 'Equipaggiamento 0.3 §4.3'},
    'corredo-sopravvivenza-ambientale': {'nome': 'Corredo di sopravvivenza ambientale', 'sotto': 'ambiente'},
    'corredo-orientamento': {'nome': 'Corredo di orientamento, con carta della zona iniziale'},
    'corredo-assalto-verticale': {'nome': 'Corredo da assalto verticale'},
    'rilevatore-ambientale': {'nome': 'Rilevatore ambientale'},
    'abiti-eleganti': {'nome': 'Abiti eleganti, comprese le calzature (completo aggiuntivo)'},
    'monocolo-periscopico': {'nome': 'Monocolo periscopico'},
    'corredo-da-scasso': {'nome': 'Corredo da scasso (Standard)'},
    'corredo-da-camuffamento': {'nome': 'Corredo da camuffamento (Standard)'},
    'ricarica-kit-trauma': {'nome': 'Ricarica per il Kit trauma (5 applicazioni)'},
    'abiti-da-viaggio': {'nome': 'Abiti da viaggio, comprese le calzature (completo aggiuntivo)'},
    'comunicatore-da-squadra': {'nome': 'Comunicatore da squadra', 'sostituisce': 'comunicatore-personale'},
    'tenda-2-posti': {'nome': 'Tenda da 2 posti, completa di pali, tiranti e picchetti'},
    'corredo-agricolo': {'nome': 'Corredo agricolo (Standard)', 'sotto': 'corredo_agricolo'},
    'corredo-artigianale-professionale': {'nome': 'Corredo artigianale professionale'},
    'corredo-manutenzione-campo': {'nome': 'Corredo di manutenzione da campo'},
    'lampada-frontale': {'nome': 'Lampada frontale', 'sostituisce': 'torcia-elettrica'},
    'cassetta-attrezzi': {'nome': 'Cassetta degli attrezzi (Standard)'},
    'maschera-filtrante': {'nome': 'Maschera filtrante'},
    'corredo-elettronico-informatico': {'nome': 'Corredo elettronico e informatico (Standard)'},
    'kit-videosorveglianza': {'nome': 'Kit di videosorveglianza'},
    'corredo-ricerca-documentale': {'nome': 'Corredo di ricerca documentale (Standard)'},
    'corredo-analisi-campo': {'nome': 'Corredo di analisi da campo', 'sotto': 'ambito_analisi'},
    'corredo-amministrativo': {'nome': 'Corredo amministrativo (Standard)'},
    'strumento-musicale-portatile': {'nome': 'Strumento musicale portatile (Standard)'},
    'corredo-scenico': {'nome': 'Corredo scenico (Standard)'},
    'terminale-produzione-multimediale': {'nome': 'Terminale per produzione multimediale (Standard)'},
    'testo-dottrinale-e-simbolo': {'nome': 'Testo dottrinale e simbolo della propria tradizione'},
    'completo-cerimoniale': {'nome': 'Completo cerimoniale, comprese le calzature (profilo Abiti eleganti)'},
    'lanterna-elettrica': {'nome': 'Lanterna elettrica', 'sostituisce': 'torcia-elettrica'},
    'focus-personale': {'nome': 'Focus personale, già sintonizzato prima dell’avventura'},
    'corredo-rituale': {'nome': 'Corredo rituale (Standard)'},
}
# Effetti sui VA (docs/effetti-oggetti.md): (Abilità, valore, ambito, uso, paragrafo, chiave). La frase
# del paragrafo che contiene `chiave` si copia intera nella «condizione» (tools/verifica_frasi.mjs).
EFFETTI = {
    'binocolo': [('Percezione', 1, 'situazionale', None, '2.16.7', 'Il Binocolo concede +1 VA a Percezione')],
    'corredo-sopravvivenza-ambientale': [('Sopravvivenza', 2, 'situazionale', None, '2.16.3', 'Nell’ambiente scelto concede +2 VA a Sopravvivenza')],
    'corredo-orientamento': [('Sopravvivenza', 1, 'uso_specifico', 'orientamento', '2.16.4', 'Il Corredo di orientamento concede +1 VA')],
    'corredo-assalto-verticale': [('Atletica', 2, 'uso_specifico', 'arrampicata', '2.16.4', 'Concede +2 VA ad Atletica per arrampicarsi')],
    'abiti-eleganti': [('Oratoria', 1, 'situazionale', None, '2.16.5', 'Gli Abiti eleganti concedono +1 VA a Oratoria')],
    'abiti-da-viaggio': [('Atletica', 1, 'uso_specifico', 'arrampicata ed equilibrio', '2.16.10', 'Gli Abiti da viaggio concedono +1 VA ad Atletica')],
    'corredo-artigianale-professionale': [('Tecnologia', 2, 'uso_specifico', 'lavori del mestiere', '2.16.13', 'Concede +2 VA a Tecnologia per lavorare')],
    'corredo-manutenzione-campo': [('Tecnologia', 2, 'uso_specifico', 'riparazioni sul campo', '2.16.13', 'Il Corredo di manutenzione da campo concede +2 VA')],
    'corredo-analisi-campo': [('Scienza', 2, 'uso_specifico', 'analisi', '2.16.17', 'concede +2 VA a Scienza per analisi preliminari')],
    'completo-cerimoniale': [('Oratoria', 1, 'situazionale', None, '2.16.21', 'L’abito cerimoniale usa il profilo degli Abiti eleganti')],
}

SOTTO = {
    'ambiente': {'etichetta': 'Ambiente del corredo', 'valori': AMBIENTI},
    'corredo_agricolo': {'etichetta': 'Versione del corredo agricolo', 'valori': ['Coltivazione', 'Allevamento']},
    'ambito_analisi': {'etichetta': 'Ambito del corredo di analisi', 'libero': True, 'esempi': ['chimica', 'biologia', 'geologia']},
}

# ---------------------------------------------------------------------------
# Struttura per Classe: (etichetta della riga della tabella, [opzioni])
# opzione: 'rif' del catalogo, 'd:<oggetto>' per gli oggetti di dotazione, una lista per un
# gruppo di oggetti presi insieme; dizionario per quantità, munizioni, FOR dichiarata, legami.

PIST = 'armi_distanza:pistola-semiautomatica'
ARM_L = 'armature:armatura-civile-leggera'
ARM_M = 'armature:armatura-civile-media'
COLT = 'armi:coltello'
KIT_STD = 'sanitario:kit-di-pronto-soccorso-standard'
KIT_TRAUMA = 'sanitario:kit-di-pronto-soccorso-professionale'
BATTERIE = [{'rif': f'artefatti:batteria-da-5-pm-chroma-{c}'} for c in ('rosso', 'blu', 'verde')]


def arma(rif, colpi, caricatori=None, **k):
    return {'rif': rif, 'munizioni': {'colpi': colpi, 'caricatori': caricatori}, **k}


PISTOLA = arma(PIST, 45, 3, for_=3)
P_A = [{'rif': ARM_L, 'for_': 3}, 'd:abiti-da-viaggio']  # «Protezione o abbigliamento» dei Taumaturghi
MAGICI = [('Focus', ['d:focus-personale']), ('Riserva mistica', BATTERIE), ('Protezione o abbigliamento', P_A)]

CLASSI = {
    'Agente': ('2.16.2', [
        ('Arma da fuoco', [PISTOLA, arma('armi_distanza:revolver', 18, for_=3)]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}, {'rif': 'armi:randello', 'for_': 3}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Osservazione', ['d:binocolo']),
        ('Registrazione', ['d:registratore-audiovisivo'])]),
    'Cacciatore': ('2.16.3', [
        ('Arma da fuoco', [arma('armi_distanza:carabina', 45, 3, for_=4), arma('armi_distanza:fucile-a-pompa', 18, for_=4)]),
        ('Arma da mischia', [{'rif': 'armi:pugnale', 'for_': 2}, {'rif': 'armi:ascia-leggera', 'for_': 4}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Osservazione', ['d:binocolo']),
        ('Sopravvivenza', ['d:corredo-sopravvivenza-ambientale'])]),
    'Esploratore': ('2.16.4', [
        ('Arma da fuoco', [PISTOLA]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Osservazione', ['d:binocolo']),
        ('Orientamento', ['d:corredo-orientamento']),
        ('Strumento specialistico', ['d:corredo-assalto-verticale', 'd:corredo-sopravvivenza-ambientale', 'd:rilevatore-ambientale'])]),
    'Lestofante': ('2.16.5', [
        ('Arma da mischia', [{'rif': 'armi:pugnale', 'for_': 2}, {'rif': 'armi:spada-leggera', 'for_': 3}]),
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Abbigliamento', ['d:abiti-eleganti']),
        ('Osservazione', ['d:monocolo-periscopico']),
        ('Strumento specialistico', ['d:corredo-da-scasso', 'd:corredo-da-camuffamento'])]),
    'Paramedico': ('2.16.6', [
        ('Arma da fuoco', [PISTOLA]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Pronto soccorso', [KIT_TRAUMA]),
        ('Materiali di riserva', ['d:ricarica-kit-trauma']),
        ('Trattamento rapido', [
            ['sanitario:iniettore-sanitario-manuale', {'rif': 'sanitario:cartuccia-emostatica', 'quantita': 2}, 'sanitario:cartuccia-curativa'],
            'sanitario:spray-rimarginante'])]),
    'Artigliere': ('2.16.7', [
        ('Arma principale', [arma('armi_distanza:fucile-d-assalto', 90, 3, for_=5), arma('armi_distanza:fucile-di-precisione', 15, 3, for_=5)]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        # il mirino segue l'arma scelta: Reflex per il Fucile d'assalto, Ottico per il Fucile di precisione
        ('Mirino', [{'rif': 'accessori_armi:mirino-reflex', 'segue': ('Arma principale', 'armi_distanza:fucile-d-assalto')},
                    {'rif': 'accessori_armi:mirino-ottico', 'segue': ('Arma principale', 'armi_distanza:fucile-di-precisione')}]),
        ('Supporto', ['accessori_armi:bipiede']),
        ('Osservazione', ['d:binocolo'])]),
    'Assaltatore': ('2.16.8', [
        ('Arma da mischia', [{'rif': 'armi:spada-leggera', 'for_': 3}, {'rif': 'armi:spada-lunga', 'for_': 4}, {'rif': 'armi:ascia-leggera', 'for_': 4}]),
        ('Scudo', [{'rif': 'scudi:scudo-piccolo', 'for_': 3}, {'rif': 'scudi:scudo-medio', 'for_': 5}]),
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}, {'rif': ARM_M, 'for_': 5}])]),
    'Incursore': ('2.16.9', [
        ('Arma da fuoco', [PISTOLA]),
        ('Arma da mischia', [{'rif': 'armi:pugnale-da-combattimento', 'for_': 3}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Accessorio', ['accessori_armi:silenziatore']),
        ('Corredo', ['d:corredo-da-scasso', 'd:corredo-assalto-verticale'])]),
    'Lottatore': ('2.16.10', [
        ('Arma da mischia', [{'rif': 'armi:tonfa', 'for_': 3}, {'rif': 'armi:randello', 'for_': 3}]),
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Abbigliamento aggiuntivo', ['d:abiti-da-viaggio']),
        ('Pronto soccorso', [KIT_STD])]),
    'Soldato': ('2.16.11', [
        ('Arma principale', [arma('armi_distanza:carabina', 45, 3, for_=4), arma('armi_distanza:fucile-d-assalto', 90, 3, for_=5)]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}, {'rif': ARM_M, 'for_': 5}]),
        ('Comunicazioni', ['d:comunicatore-da-squadra']),
        ('Materiale di supporto', [KIT_STD, 'd:tenda-2-posti'])]),
    'Agricoltore': ('2.16.12', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}, {'rif': 'armi:ascia-leggera', 'for_': 4}]),
        ('Strumenti agricoli', ['d:corredo-agricolo']),
        ('Supporto', ['d:corredo-sopravvivenza-ambientale', KIT_STD])]),
    'Artigiano': ('2.16.13', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}, {'rif': 'armi:martello', 'for_': 4}]),
        ('Strumenti del mestiere', ['d:corredo-artigianale-professionale', 'd:corredo-manutenzione-campo']),
        ('Illuminazione', ['d:lampada-frontale']),
        ('Documentazione', ['d:registratore-audiovisivo'])]),
    'Operaio': ('2.16.14', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': 'armi:randello', 'for_': 3}, {'rif': 'armi:martello', 'for_': 4}]),
        ('Utensili', ['d:cassetta-attrezzi']),
        ('Lavori in altezza', ['d:corredo-assalto-verticale']),
        ('Protezione respiratoria', ['d:maschera-filtrante']),
        ('Illuminazione', ['d:lampada-frontale'])]),
    'Pilota': ('2.16.15', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Utensili', ['d:cassetta-attrezzi']),
        ('Orientamento', ['d:corredo-orientamento']),
        ('Osservazione', ['d:binocolo']),
        ('Comunicazioni', ['d:comunicatore-da-squadra'])]),
    'Tecnico': ('2.16.16', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Strumenti tecnici', ['d:corredo-elettronico-informatico']),
        ('Attrezzatura aggiuntiva', ['d:corredo-manutenzione-campo', 'd:kit-videosorveglianza']),
        ('Illuminazione', ['d:lampada-frontale'])]),
    'Accademico': ('2.16.17', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Ricerca', ['d:corredo-ricerca-documentale']),
        ('Registrazione', ['d:registratore-audiovisivo']),
        ('Attrezzatura aggiuntiva', ['d:corredo-analisi-campo', ['d:binocolo', 'd:corredo-orientamento']])]),
    'Amministrativo': ('2.16.18', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Strumenti amministrativi', ['d:corredo-amministrativo']),
        ('Abbigliamento', ['d:abiti-eleganti']),
        ('Attrezzatura aggiuntiva', ['d:registratore-audiovisivo', 'd:comunicatore-da-squadra'])]),
    'Artista': ('2.16.19', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Strumenti artistici', ['d:strumento-musicale-portatile', 'd:corredo-scenico', 'd:terminale-produzione-multimediale']),
        ('Registrazione', ['d:registratore-audiovisivo']),
        ('Abbigliamento', ['d:abiti-eleganti'])]),
    'Medico': ('2.16.20', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Primo soccorso', [[KIT_TRAUMA, 'd:ricarica-kit-trauma']]),
        ('Attrezzatura aggiuntiva', ['sanitario:scanner-diagnostico-portatile', 'sanitario:kit-chirurgico-da-campo']),
        ('Illuminazione', ['d:lampada-frontale'])]),
    'Predicatore': ('2.16.21', [
        ('Arma da fuoco', [PISTOLA]),
        ('Protezione', [{'rif': ARM_L, 'for_': 3}]),
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}, {'rif': 'armi:randello', 'for_': 3}]),
        ('Materiale della tradizione', ['d:testo-dottrinale-e-simbolo']),
        ('Abbigliamento', ['d:completo-cerimoniale']),
        ('Attrezzatura aggiuntiva', [KIT_STD, 'd:corredo-sopravvivenza-ambientale']),
        ('Illuminazione', ['d:lanterna-elettrica'])]),
    'Arcanista': ('2.16.22', [
        ('Arma da fuoco', [PISTOLA]), *MAGICI,
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Ricerca', ['d:corredo-ricerca-documentale']),
        ('Registrazione', ['d:registratore-audiovisivo']),
        ('Attrezzatura aggiuntiva', ['d:corredo-analisi-campo', ['d:binocolo', 'd:corredo-orientamento']])]),
    'Custode': ('2.16.23', [
        ('Arma da fuoco', [PISTOLA]), *MAGICI,
        ('Arma da mischia', [{'rif': 'armi:spada-leggera', 'for_': 3}, {'rif': 'armi:tonfa', 'for_': 3}]),
        ('Scudo', [{'rif': 'scudi:scudo-piccolo', 'for_': 3}]),
        ('Primo soccorso', [KIT_STD]),
        ('Comunicazioni', ['d:comunicatore-da-squadra'])]),
    'Invocatore': ('2.16.24', [
        ('Arma da fuoco', [PISTOLA]), *MAGICI,
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Osservazione', ['d:binocolo']),
        ('Attrezzatura aggiuntiva', ['d:corredo-sopravvivenza-ambientale', 'd:corredo-assalto-verticale']),
        ('Comunicazioni', ['d:comunicatore-da-squadra'])]),
    'Mistico': ('2.16.25', [
        ('Arma da fuoco', [PISTOLA]), *MAGICI,
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}, {'rif': 'armi:randello', 'for_': 3}]),
        ('Primo soccorso', [KIT_TRAUMA]),
        ('Materiali di riserva', ['d:ricarica-kit-trauma']),
        ('Strumenti rituali', ['d:corredo-rituale']),
        ('Illuminazione', ['d:lanterna-elettrica'])]),
    'Tecnomante': ('2.16.26', [
        ('Arma da fuoco', [PISTOLA]), *MAGICI,
        ('Arma da mischia', [{'rif': COLT, 'for_': 2}]),
        ('Strumenti tecnici', ['d:corredo-elettronico-informatico']),
        ('Attrezzatura aggiuntiva', ['d:corredo-manutenzione-campo', 'd:corredo-analisi-campo']),
        ('Illuminazione', ['d:lampada-frontale'])]),
}


def slug(s):
    s = s.lower().replace('’', '-').replace("'", '-')
    for a, b in (('à', 'a'), ('è', 'e'), ('é', 'e'), ('ì', 'i'), ('ò', 'o'), ('ù', 'u')):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')


def elemento(x):
    """Un oggetto dell'opzione: { rif } (catalogo) oppure { dotazione } (oggetto non a catalogo)."""
    if isinstance(x, str):
        x = {'rif': x}
    x = dict(x)
    rif = x.pop('rif')
    out = {'dotazione': rif[2:]} if rif.startswith('d:') else {'rif': rif}
    if 'dotazione' in out:
        assert out['dotazione'] in OGGETTI, out
    else:
        assert rif in catalogo, f'rif inesistente nel catalogo: {rif}'
    if x.get('quantita', 1) != 1:
        out['quantita'] = x['quantita']
    return out, x


def opzione(spec):
    elementi = spec if isinstance(spec, list) else [spec]
    oggetti, extra = [], {}
    for e in elementi:
        o, x = elemento(e)
        oggetti.append(o)
        extra.update(x)
    primo = oggetti[0]
    nome = catalogo[primo['rif']]['nome'] if 'rif' in primo else OGGETTI[primo['dotazione']]['nome']
    if len(oggetti) > 1:
        nome = ' + '.join(catalogo[o['rif']]['nome'] if 'rif' in o else OGGETTI[o['dotazione']]['nome'] for o in oggetti)
    op = {'id': primo.get('rif') or f'dotazione:{primo["dotazione"]}', 'nome': nome, 'oggetti': oggetti}
    if 'for_' in extra:
        op['for_dichiarata'] = extra['for_']
    if 'segue' in extra:
        op['segue'] = {'gruppo': slug(extra['segue'][0]), 'opzione': extra['segue'][1]}
    if 'munizioni' in extra:
        m = extra['munizioni']
        fam = famiglia_arma.get(primo['rif'])
        assert fam in ordinaria, (primo, fam)
        op['munizioni'] = {'rif': ordinaria[fam], 'colpi': m['colpi'], **({'caricatori': m['caricatori']} if m['caricatori'] else {})}
    return op


def frasi_di(par):
    out = []
    for t in sezioni[par]['paragrafi']:
        out += [f.strip() for f in re.split(r'(?<=[.;])\s+(?=[A-ZÈÉÀ+])', t) if f.strip()]
    return out


for oid, lista in EFFETTI.items():
    effetti = []
    for abilita, valore, ambito, uso, par, chiave in lista:
        trovate = [f for f in frasi_di(par) if chiave in f]
        assert trovate, f'{oid}: nessuna frase con «{chiave}» nel §{par}'
        e = {'abilita': abilita, 'valore': valore, 'ambito': ambito}
        if uso:
            e['uso'] = uso
        e['condizione'] = trovate[0]
        e['fonte'] = f'Giocatore §{par}'
        effetti.append(e)
    OGGETTI[oid]['effetti'] = effetti


dotazioni = {}
for classe, (par, gruppi_spec) in CLASSI.items():
    s = sezioni[par]
    assert s['titolo'].endswith(classe), (par, s['titolo'])
    tabella = {}
    for celle in s['tabella']:
        tabella.setdefault(celle[0], celle[1] if len(celle) > 1 else '')
    gruppi = []
    for etichetta, opzioni in gruppi_spec:
        assert etichetta in tabella, f'{classe}: nessuna riga «{etichetta}» nella tabella del §{par}'
        g = {'id': slug(etichetta), 'etichetta': etichetta, 'testo': tabella[etichetta], 'opzioni': [opzione(o) for o in opzioni]}
        mun = [op for op in g['opzioni'] if 'munizioni' in op]
        if mun:
            g['testo_munizioni'] = tabella['Munizioni e caricatori']
        gruppi.append(g)
    usate = {e for e, _ in gruppi_spec} | {'Munizioni e caricatori'}
    # righe della tabella non trasformate in gruppi: solo la tabella dei requisiti dell'Assaltatore
    restanti = [k for k in tabella if k not in usate]
    assert classe == 'Assaltatore' or not restanti, (classe, restanti)
    dotazioni[classe] = {
        'paragrafo': par,
        'introduzione': s['paragrafi'][0],
        'gruppi': gruppi,
        'note': s['paragrafi'][1:],
        **({'tabelle_aggiuntive': [[k, tabella[k]] for k in restanti]} if restanti else {}),
    }

comune = sezioni['2.16.1']
nomi_comune = {v['nome']: k for k, v in OGGETTI.items()}
oggetti_comune = []
for nome, q in comune['tabella']:
    m = re.match(r'(\d+)\s*(.*)', q)
    voce = {'dotazione': nomi_comune[nome], 'quantita': int(m.group(1))}
    if m.group(2):
        voce['unita'] = m.group(2)
    oggetti_comune.append(voce)

risultato = {
    'versione_manuale': 'Giocatore 0.45 (Google Doc del 01/10/2026)',
    'fonte': 'Manuale del Giocatore §2.16, §§2.16.1–2.16.29 (Google Doc del 27/09/2026); risposte del master E&L A.5–A.5.29 (docs/risposte-master.md, decisioni 12–19)',
    '_nota': 'Generato da tools/genera_dotazioni.py; da qui in poi si può correggere a mano. «testo», «introduzione» e «note» sono copiati dal Doc. Un’opzione ha uno o più «oggetti»: «rif» del catalogo oppure «dotazione» (oggetti_dotazione, non ancora a catalogo). «for_dichiarata» è il requisito di FOR scritto nel §2.16: il validatore lo confronta con quello del catalogo. «munizioni» segue l’arma scelta; «segue» lega un’opzione a quella di un altro gruppo; «sotto» (negli oggetti) chiede una scelta ulteriore.',
    'introduzione': introduzione,
    'TODO(Davide)': 'Gli oggetti di oggetti_dotazione (Binocolo, Registratore audiovisivo, i Corredi, Focus personale…) non hanno ancora una scheda di catalogo: entrano nell’inventario come voci personalizzate senza peso né prezzo, e non si possono cedere per gli acquisti (§2.16.29). Aspettano i cap. 2–8 del Manuale dell’Equipaggiamento. Per-davide A.34.',
    'comune': {'paragrafo': '2.16.1', 'oggetti': oggetti_comune, 'note': comune['paragrafi']},
    'classi': dotazioni,
    'oggetti_dotazione': OGGETTI,
    'sotto_scelte': SOTTO,
    # §2.16.27 e §2.16.29: catalogo di ogni Corporazione (nomi dei file dati); i Freelance usano il Commerciale
    'cataloghi_corporazioni': {'Bauhaus': 'Bauhaus', 'Capitol': 'Capitol', 'Cybertronic': 'Cybertronic', 'Fratellanza': 'Fratellanza',
                               'Imperiali': 'Imperial', 'Mishima': 'Mishima', 'Freelance': 'Commerciale'},
    'corporativi': {
        'paragrafo': '2.16.27',
        'testo': sezioni['2.16.27']['paragrafi'],
        '_nota': 'Abbinamenti profilo commerciale → modello corporativo di base, per Corporazione: { "<Corporazione>": { "<rif commerciale>": { "rif": "<rif corporativo>", "munizioni": "<rif>" } } }. I Freelance usano sempre il catalogo Commerciale.',
        'TODO(Davide)': 'Abbinamenti puntuali commerciale → corporativo per ogni Corporazione, con munizioni e accessori compatibili (E&L A.5.27: «Restano da completare gli abbinamenti puntuali»). Finché mancano, l’app assegna il profilo commerciale con la nota «modello corporativo da definire (A.5.27)». Per-davide A.33.',
        'abbinamenti': {},
    },
    'scambio': {
        'paragrafo': '2.16.29',
        'testo': sezioni['2.16.29']['paragrafi'],
        'valutazione_cessione': 1,
        '_nota': '§2.16.29: gli armamenti di base ceduti valgono il 100 % del prezzo di catalogo del modello assegnato; conguaglio = prezzo del nuovo − valore dei ceduti; solo alla creazione.',
    },
    'crediti': {'paragrafo': '2.16.28', 'testo': sezioni['2.16.28']['paragrafi']},
}
USCITA.write_bytes((json.dumps(risultato, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(f'scritto {USCITA.relative_to(RADICE)}: {len(dotazioni)} Classi, {len(OGGETTI)} oggetti di dotazione')
