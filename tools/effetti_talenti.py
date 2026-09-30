#!/usr/bin/env python3
"""Censimento dei Talenti e loro effetti tipizzati (docs/censimento-talenti.md).

Una sola tabella, qui sotto, per ogni Talento con un numero applicabile ai valori del personaggio:
gli effetti nello schema degli oggetti (docs/effetti-oggetti.md). La «condizione» è la frase del
manuale che dà il bonus, ritrovata nel testo del Talento dal suo inizio («frase»): così è sempre
copiata intera e tools/verifica_frasi.mjs la ritrova nei manuali.

Uso:
  python tools/effetti_talenti.py --doc     scrive docs/censimento-talenti.md
  python tools/effetti_talenti.py --dati    scrive effetti.valori nelle voci dei Talenti
                                            (data/talenti_liberi.json, data/classi.json)
Le chiavi di «effetti» già lette dal motore (iniziativa, attacco_distanza, lancio…) non si toccano.
"""
import json
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
LIBERI = RADICE / 'data' / 'talenti_liberi.json'
CLASSI = RADICE / 'data' / 'classi.json'

# ---------------------------------------------------------------------------
# Effetti per Talento: (inizio della frase del manuale, effetto). Tipi e campi: docs/effetti-oggetti.md.
# uso: tipo di Prova (ambito uso_specifico); «{annotazione}» e «{parametro}» si sostituiscono con la
# scelta del giocatore (Sport, Prova di Caratteristica Migliorata).

def va(abilita, valore, ambito, uso=None):
    e = {'abilita': abilita, 'valore': valore, 'ambito': ambito}
    if uso: e['uso'] = uso
    return e

def ps(salvezza, valore, ambito, uso=None, **extra):
    e = {'tipo': 'salvezza', 'salvezza': salvezza, 'valore': valore, 'ambito': ambito}
    if uso: e['uso'] = uso
    e.update(extra)
    return e

def molte(abilita, valore, ambito, uso=None):
    return [va(a, valore, ambito, uso) for a in abilita]

EFFETTI = {
    # --- Talenti Liberi (Giocatore §8.6, Magia sez. 1)
    'Sempre Allerta': [('Ottiene +3 VA alle Prove di Percezione', [va('Percezione', 3, 'uso_specifico', 'imboscate e pericoli improvvisi')])],
    'Struttura Robusta': [('Ottiene +3 alla PS di Tempra', [ps('tempra', 3, 'uso_specifico', 'per evitare una Menomazione')])],
    'Duro a Morire': [('Quando si trova a 0 PV', [ps('tempra', 3, 'uso_specifico', 'a 0 PV, contro nuove Ferite')])],
    'Mulo da Soma': [
        ('Ottiene +3 VA alle Prove di Atletica', [va('Atletica', 3, 'uso_specifico', 'sollevare e trasportare carichi')]),
        ('Ottiene inoltre +3 alle PS di Tempra', [ps('tempra', 3, 'uso_specifico', 'Affaticamento da trasporto di carichi')]),
    ],
    'Sport': [('All’acquisizione sceglie una sola disciplina sportiva', [va('Atletica', 3, 'uso_specifico', 'sport: {annotazione}')])],
    'Prova di Caratteristica Migliorata': [('Sceglie Forza', [{'tipo': 'caratteristica', 'caratteristiche': ['{parametro}'], 'valore': 3, 'ambito': 'uso_specifico', 'uso': 'Prove dirette di Caratteristica'}])],
    'Resistenza ai Veleni': [('Ottiene +2 alla PS per evitare o attenuare', [ps('tempra', 2, 'uso_specifico', 'contro l’avvelenamento', resistenza=True)])],
    'Resistenza alle Malattie': [('Ottiene +2 alle PS contro malattie', [ps('tempra', 2, 'uso_specifico', 'contro malattie e infezioni', resistenza=True)])],
    'Resistenza all’Affaticamento': [('Ottiene +2 alle PS per evitare o limitare', [ps('tempra', 2, 'uso_specifico', 'contro l’Affaticamento', resistenza=True)])],
    'Resistenza alla Paura': [('Ottiene +2 alle PS contro paura', [ps('volonta', 2, 'uso_specifico', 'contro paura e panico', resistenza=True)])],
    'Resistenza al Controllo Mentale': [('Ottiene +2 alle PS contro suggestioni', [ps('volonta', 2, 'uso_specifico', 'contro il controllo mentale', resistenza=True)])],
    'Resistenza alla Corruzione': [('Ottiene +2 alle PS per evitare di acquisire', [ps('magia', 2, 'uso_specifico', 'contro la Corruzione Oscura', resistenza=True)])],
    'Parata a Distanza': [('Quando para con uno scudo', [{'tipo': 'parata', 'con': 'scudo', 'contro': 'distanza', 'valore': 2, 'ambito': 'generale'}])],
    'Hacker': [('Una volta per sessione per ciascun sistema', [va('Tecnologia', 2, 'uso_specifico', 'intrusione informatica e sorveglianza elettronica')])],
    'Inseguimento': [('Ottiene +2 VA a Pilotare', [va('Pilotare', 2, 'uso_specifico', 'inseguire o seminare un mezzo')])],
    'Concentrazione Migliorata': [('Ottiene +3 VA alle Prove Salvezza di Volontà', [ps('volonta', 3, 'uso_specifico', 'mantenere la Concentrazione')])],
    'Arti Marziali Migliorate': [('Ottiene +1 VA agli attacchi senz’armi', [va('Difese', 1, 'uso_specifico', 'contro attacchi ravvicinati, senz’armi')])],
    # --- Talenti di Classe (Giocatore cap. 3)
    'Attacco Silenzioso': [('Ottiene +2 VA a Furtività', [va('Furtività', 2, 'uso_specifico', 'avvicinarsi a un avversario senza essere visto')])],
    'Doppia Identità': [('Ottiene +3 VA alle Prove di Cultura', molte(['Cultura', 'Oratoria', 'Raggirare'], 3, 'uso_specifico', 'usare o difendere le identità alternative'))],
    'Ottime Credenziali': [('Con credenziali autentiche', molte(['Cultura', 'Intrattenere', 'Oratoria', 'Raggirare'], 4, 'situazionale'))],
    'Senso dell’Occulto': [('Spendendo 2 PM', [va('Occultismo', 2, 'uso_specifico', 'natura delle creature avvertite')])],
    'Cacciatore Instancabile': [('La prima Prova Salvezza richiesta al gruppo', [ps('tempra', 5, 'uso_specifico', 'prima PS del gruppo in marcia forzata o inseguimento')])],
    'Strumentazione Efficace': [('Ottiene +2 VA a Medicina per Pronto Soccorso', [va('Medicina', 2, 'uso_specifico', 'Pronto Soccorso con strumenti')])],
    'Campo Sterile': [('All’interno ottiene +2 VA a Medicina', [va('Medicina', 2, 'situazionale')])],
    'Armaiolo da Campo': [('Ottiene +2 VA a Tecnologia per manutenzione', [va('Tecnologia', 2, 'uso_specifico', 'riparare armi da fuoco')])],
    'Mantenere la Posizione': [('Ottiene +3 al valore delle Prove', [ps(None, 3, 'uso_specifico', 'resistere a spinte, sbilanciamenti e disarmi')])],
    'Presidio di Combattimento': [('Entrambi ottengono +2 VA a Difese', [va('Difese', 2, 'situazionale')])],
    'Sabotaggio Rapido': [('Ottiene +2 VA a Tecnologia per sabotare', [va('Tecnologia', 2, 'uso_specifico', 'sabotare o disattivare dispositivi')])],
    'Addestramento Militare': [('Il Soldato ottiene +3 alle Prove Salvezza', [ps('volonta', 3, 'uso_specifico', 'contro paura e pressioni del combattimento')])],
    'Supporto di Difesa': [('Il beneficiario ottiene +2 VA alle Prove di Difese', [va('Difese', 2, 'situazionale')])],
    'Supporto Logistico': [('Il Soldato ottiene +2 VA alle Prove di Pilotare', molte(['Pilotare', 'Sopravvivenza', 'Tecnologia'], 2, 'uso_specifico', 'attività logistiche'))],
    'Base Operativa': [('Finché si trovano nella Base', [va('Percezione', 2, 'uso_specifico', 'nella Base, minacce dall’esterno')])],
    'Addestramento Rurale': [('L’Agricoltore ottiene +3 alle Prove Salvezza', [ps('tempra', 3, 'uso_specifico', 'Affaticamento da lavoro e clima')])],
    'Coltivatore Esperto': [('Ottiene +3 VA alle Prove pertinenti', molte(['Scienza', 'Sopravvivenza', 'Tecnologia'], 3, 'uso_specifico', 'coltivazioni'))],
    'Meccanizzazione Agricola': [('Ottiene +3 VA a Pilotare e Tecnologia', molte(['Pilotare', 'Tecnologia'], 3, 'uso_specifico', 'macchinari e impianti agricoli'))],
    'Allevatore Esperto': [('Ottiene +3 VA alle Prove pertinenti', molte(['Medicina', 'Percezione', 'Sopravvivenza'], 3, 'uso_specifico', 'animali domestici'))],
    'Caccia, Pesca e Raccolta': [('Ottiene +3 VA a Percezione e Sopravvivenza', molte(['Percezione', 'Sopravvivenza'], 3, 'uso_specifico', 'tracce, caccia, pesca e raccolta'))],
    'Conservazione delle Provviste': [('Ottiene +3 VA alle Prove pertinenti', molte(['Scienza', 'Sopravvivenza', 'Tecnologia'], 3, 'uso_specifico', 'provviste e acqua'))],
    'Addestramento di Bottega': [('L’Artigiano ottiene +3 VA alle Prove pertinenti', molte(['Cultura', 'Percezione', 'Scienza', 'Tecnologia'], 3, 'uso_specifico', 'esaminare materiali e manufatti'))],
    'Armaiolo': [('Ottiene +3 VA alle Prove pertinenti', molte(['Percezione', 'Scienza', 'Tecnologia'], 3, 'uso_specifico', 'costruire o riparare armi e munizioni'))],
    'Corazzaio': [('Ottiene +3 VA alle Prove pertinenti', molte(['Percezione', 'Scienza', 'Tecnologia'], 3, 'uso_specifico', 'costruire o riparare protezioni'))],
    'Artefice di Precisione': [('Ottiene +3 VA alle Prove pertinenti', molte(['Percezione', 'Tecnologia'], 3, 'uso_specifico', 'serrature e meccanismi di precisione'))],
    'Maestro Manifattore': [('Ottiene +3 VA alle Prove pertinenti', molte(['Cultura', 'Tecnologia'], 3, 'uso_specifico', 'manufatti ordinari'))],
    'Restauratore e Falsario': [('Ottiene +3 VA alle Prove pertinenti', molte(['Cultura', 'Percezione', 'Raggirare', 'Tecnologia'], 3, 'uso_specifico', 'restauri e contraffazioni'))],
    'Duro Lavoro': [('L’Operaio ottiene +3 VA alle Prove pertinenti', molte(['Atletica', 'Pilotare', 'Tecnologia'], 3, 'uso_specifico', 'lavori pesanti e riparazioni strutturali'))],
    'Sincronia Tattica': [('All’arrivo della propria Iniziativa', [va('Pilotare', 2, 'uso_specifico', 'assetto Difensivo: evitare attacchi e collisioni')])],
    'Meccanico di Bordo': [('Il Pilota ottiene +2 VA a Tecnologia', [va('Tecnologia', 2, 'uso_specifico', 'riparare il proprio veicolo')])],
    'Mani Esperte': [('Il Tecnico ottiene +3 VA a Tecnologia', [va('Tecnologia', 3, 'uso_specifico', 'macchinari, elettronica e computer')])],
    'Autorità Intellettuale': [('Nelle situazioni rischiose o contrastate', [va('Oratoria', 2, 'situazionale')])],
    'Metodo di Ricerca': [('Quando consulta pubblicazioni', molte(['Scienza', 'Tecnologia'], 2, 'uso_specifico', 'ricerca con fonti e strumenti adeguati'))],
    'Burocrate Esperto': [('L’Amministrativo ottiene +2 VA a Cultura', [va('Cultura', 2, 'uso_specifico', 'regolamenti e procedure')])],
    'Documentazione Perfetta': [('Ottiene +2 VA a Raggirare', [va('Raggirare', 2, 'uso_specifico', 'preparare documenti falsi')])],
    'Presenza Mediatica': [('L’Artista ottiene +2 VA a Cultura o Tecnologia', molte(['Cultura', 'Tecnologia'], 2, 'uso_specifico', 'contenuti per i mezzi di comunicazione'))],
    'Diagnosi Rapida': [('Ottiene inoltre +2 VA a Medicina o Scienza', molte(['Medicina', 'Scienza'], 2, 'uso_specifico', 'identificare malattie, veleni e sostanze'))],
    'Resistenza Clinica': [('Il Medico ottiene +2 alle Prove Salvezza di Tempra', [ps('tempra', 2, 'uso_specifico', 'contro malattie, infezioni e veleni')])],
    'Stabilizzazione': [('Il Medico ottiene +2 VA a Medicina', [va('Medicina', 2, 'uso_specifico', 'Pronto Soccorso e Sanguinamento')])],
    'Parola Ispiratrice': [('Il Predicatore ottiene +2 VA a Oratoria quando', [va('Oratoria', 2, 'uso_specifico', 'incoraggiare, consolare, guidare')])],
    'Autorità Morale': [('Il Predicatore ottiene +2 VA a Oratoria con fedeli', [va('Oratoria', 2, 'situazionale')])],
    'Devozione': [('Il Predicatore ottiene +2 VA a Occultismo', [va('Occultismo', 2, 'uso_specifico', 'religioni, culti e segni di Corruzione')])],
    'Scudo Spirituale': [
        ('Finché il Mistico è cosciente', [ps('volonta', 1, 'generale'), ps('magia', 1, 'generale')]),
        ('Spendendo 2 PM', [ps('volonta', 2, 'situazionale'), ps('magia', 2, 'situazionale')]),
    ],
    'Meccanica Potenziata': [('Il Tecnomante ottiene +1 al danno', [{'tipo': 'danno', 'armi': 'artefatto', 'attacchi': 'tutti', 'valore': 1, 'ambito': 'generale'}])],
    # --- Talenti di lancio, applicati da «Lancia!» (src/lancio.js). «incantesimi»: a quali Incantesimi
    # valgono (offensivi: hanno una colonna Danno con dadi; area: colonna Area/Raggio o Anticipazione
    # dell'Area; cura: colonna Guarigione con dadi; cura_ferite_contatto; danno_o_cura). Gli
    # usi specifici si applicano da soli; i situazionali sono un interruttore nel pannello «Lancia!».
    # «valore_per_grado»: il valore per Grado minimo nella Classe «grado_di» (come i «_per_grado» delle Discipline).
    'Incantesimi Aggressivi': [('Gli Incantesimi offensivi dell’Invocatore infliggono', [{
        'tipo': 'danno', 'ambito': 'uso_specifico', 'uso': 'incantesimi_offensivi', 'incantesimi': 'offensivi', 'valore': 1,
        'valore_per_grado': {'1': 1, '3': 2, '5': 3}, 'grado_di': 'Invocatore', 'nota_inizio': 'Il bonus si applica una sola volta per bersaglio'}])],
    'Sovraccarico Controllato': [('Una volta per combattimento, prima di lanciare', [{
        'tipo': 'dado_danno', 'ambito': 'situazionale', 'incantesimi': 'offensivi', 'valore': 1, 'nota_inizio': 'Il dado aggiuntivo si applica una sola volta per bersaglio'}])],
    'Controllo Arcano': [('Se l’Incantesimo infligge danni ai PV', [{
        'tipo': 'danno', 'ambito': 'uso_specifico', 'uso': 'incantesimi_area', 'incantesimi': 'area', 'valore': 1}])],
    'Canale Vitale': [('Ogni Incantesimo di cura lanciato dal Mistico', [{
        'tipo': 'cura', 'ambito': 'uso_specifico', 'uso': 'incantesimi_cura', 'incantesimi': 'cura', 'valore': 1}])],
    'Tocco Sacro': [('Quando il Mistico usa Cura Ferite a Contatto', [{
        'tipo': 'massimizza', 'ambito': 'uso_specifico', 'uso': 'Cura Ferite a Contatto', 'incantesimi': 'cura_ferite_contatto', 'valore': 1}])],
    'Incantesimi Massimizzati': [('Una volta per combattimento, dopo un lancio riuscito', [{
        'tipo': 'massimizza', 'ambito': 'situazionale', 'incantesimi': 'danno_o_cura', 'valore': 1, 'nota_inizio': 'Ogni dado della determinazione scelta assume'}])],
}

# Talenti con effetti già letti dal motore fuori da «effetti» (per nome o per id)
GIA_PER_NOME = {
    'Ricarica Rapida': 'data/equipaggiamento/munizioni.json → ricarica, src/ui/tab.js (promemoria)',
    'Ricarica Migliorata': 'src/ricarica.js e src/sessione.js (munizioni per operazione)',
    'Ricarica Efficiente': 'regole.json → chroma (rapporto di conversione)',
    'Conversione Migliorata': 'regole.json → chroma (rapporto di conversione)',
    'Forza da Lavoro': 'regole.json → carico.moltiplicatori, src/carico.js',
    'Architetto TecnoMistico': 'artefatti.json → sintonizzazione.talento (+2 alla capacità), src/equipaggiamento.js',
    'Corazza Potenziata': 'src/protezione.js (+1 AR magica)',
    'Addestramento al Combattimento Senz’Armi': 'classi.json → parametro (Disciplina), src/attacco.js',
    'Reazione Operativa': 'src/avanzamento.js (Talento di Classe a scelta)',
}
DOVE_CHIAVE = {
    'attacco_distanza': 'src/attacco.js', 'attacco_ravvicinato': 'src/attacco.js', 'lancio': 'src/lancio.js',
    'iniziativa': 'src/avanzamento.js', 'pv': 'src/avanzamento.js', 'pm': 'src/avanzamento.js', 'salvezza': 'src/avanzamento.js',
    'movimento': 'src/avanzamento.js', 'magia': 'src/avanzamento.js', 'meditazione': 'src/avanzamento.js',
    'tecniche': 'src/avanzamento.js', 'accessoMagia': 'src/incantesimi.js', 'incantesimi': 'src/incantesimi.js',
    'livelloMax': 'src/incantesimi.js', 'livelloMaxIncantesimi': 'src/incantesimi.js',
}

# Numeri nel testo che non sono valori del personaggio da sommare: motivo (restano testo, promemoria).
NUMERICI_NON_APPLICATI = {
    'Sangue Freddo': 'riduce di 2, una volta al giorno, la penalità di un altro effetto mentale: la applica il giocatore al tavolo',
    'Aura di Equilibrio': 'attenua le penalità di Ferite e Corruzione per sé e per gli alleati: la applica il giocatore al tavolo',
    'Assalto Armato': 'riduce la penalità di Movimento di una combinazione precisa di armatura e scudo enorme: l’app non la ricalcola',
    'Evacuazione Medica': 'toglie il −2 Q del Sovraccarico solo trasportando un ferito: la applica il giocatore al tavolo',
    'Supporto Avanzato': 'il Supporto migliorato si sceglie permanentemente, ma l’app non registra la scelta',
    'Capolavoro': 'bonus degli oggetti costruiti come Capolavoro: l’app non segna i Capolavori nell’Inventario',
    'Maestro d’Arma': 'il +1 danno vale per l’Arma Astrale evocata, che la scheda non ha fra le armi (Armi da mischia, danno per Grado di Custode: da aggiungere come arma evocabile)',
    'Maestria Astrale': 'come Maestro d’Arma: +2 VA e +1 danno con l’Arma Astrale, che la scheda non ha fra le armi',
}

# Ambigui o non definiti dal manuale: TODO(Davide) nella voce (pacchetto per il Doc)
RIMANDATI = {
    'Corazzaio': 'Il +1 Protezione dell’armatura Capolavoro «resta da raccordare alle regole definitive delle protezioni» (lo dice il manuale).',
}

MOMENTANEI = 'bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo'

# ---------------------------------------------------------------------------

def frase(testo, inizio, nome):
    """La frase del testo che comincia con «inizio» (fino al punto che la chiude)."""
    t = testo.replace('\n', ' ')
    i = t.find(inizio)
    if i < 0:
        sys.exit(f'{nome}: frase «{inizio}» non trovata nel testo del Talento')
    m = re.search(r'\.(\s|$)', t[i:])
    return t[i:i + m.start() + 1] if m else t[i:]


def talenti():
    liberi = json.loads(LIBERI.read_text(encoding='utf-8'))
    classi = json.loads(CLASSI.read_text(encoding='utf-8'))
    out = []
    for t in liberi['talenti']:
        out.append({'t': t, 'gruppo': 'Libero', 'fonte': 'Magia sez. 1' if t['sezione'] == 'magia' else 'Giocatore §' + t['sezione']})
    for c in classi['classi']:
        for t in c['talenti_fissi']:
            out.append({'t': t, 'gruppo': f"{c['nome']} (fisso, Grado {t['grado']})", 'fonte': f"Giocatore, {c['nome']} ({c['fonte']})" if c.get('fonte') else f"Giocatore, {c['nome']}"})
        for t in c['talenti_a_scelta']:
            out.append({'t': t, 'gruppo': f"{c['nome']} (a scelta)", 'fonte': f"Giocatore, {c['nome']} ({c['fonte']})" if c.get('fonte') else f"Giocatore, {c['nome']}"})
    return liberi, classi, out


def effetti_di(x):
    """Effetti tipizzati del Talento, con condizione e fonte; None se non ne ha."""
    nome = x['t']['nome']
    if nome not in EFFETTI:
        return None
    out = []
    for inizio, lista in EFFETTI[nome]:
        f = frase(x['t'].get('testo', ''), inizio, nome)
        for e in lista:
            e = dict(e)
            # «nota»: un'altra frase del manuale da mostrare sotto il valore («una sola volta per bersaglio…»)
            if 'nota_inizio' in e:
                e['nota'] = frase(x['t'].get('testo', ''), e.pop('nota_inizio'), nome)
            out.append({**e, 'condizione': f, 'fonte': x['fonte']})
    return out


def categoria(x):
    t = x['t']
    nome = t['nome']
    ee = effetti_di(x)
    solo_promemoria = lambda v: isinstance(v, dict) and set(v) <= {'promemoria'}
    gia = [k for k, v in (t.get('effetti') or {}).items() if k != 'valori' and not solo_promemoria(v)]
    promemoria = [k for k, v in (t.get('effetti') or {}).items() if k != 'valori' and solo_promemoria(v)]
    if nome in RIMANDATI and not ee:
        return 'rimandato', RIMANDATI[nome]
    if nome in RIMANDATI:
        ambiti = sorted({e['ambito'] for e in ee})
        return '+'.join([*ambiti, 'rimandato']), '; '.join(testo_effetto(e) for e in ee) + f' · rimandato: {RIMANDATI[nome]}'
    if ee:
        ambiti = sorted({e['ambito'] for e in ee})
        return '+'.join(ambiti), '; '.join(testo_effetto(e) for e in ee) + (f" · già gestito in parte: {', '.join(sorted({DOVE_CHIAVE.get(k, k) for k in gia}))}" if gia else '')
    if gia:
        return 'già gestito', ', '.join(sorted({f'{k} → {DOVE_CHIAVE.get(k, "?")}' for k in gia}))
    if nome in GIA_PER_NOME:
        return 'già gestito', GIA_PER_NOME[nome]
    if nome in NUMERICI_NON_APPLICATI:
        return 'testuale', f'numerico non applicato: {NUMERICI_NON_APPLICATI[nome]}'
    if promemoria:
        dove = ', '.join(sorted({'«Lancia!»' if k == 'lancio' else '«Attacca!»' for k in promemoria}))
        return 'testuale', f'promemoria in {dove} (prima frase del Talento), nessun valore'
    if re.search(r'[+−-]\s?\d+\s*(VA|PV|PM|AR|Q\b|danni?|alle|al |a )', t.get('testo', '')):
        return 'testuale', MOMENTANEI
    return 'testuale', 'nessun valore numerico del personaggio'


def testo_effetto(e):
    v = f"{'+' if e['valore'] > 0 else '−'}{abs(e['valore'])}"
    tipo = e.get('tipo', 'va')
    if tipo == 'va':
        s = f"{v} VA a {e['abilita']}"
    elif tipo == 'salvezza':
        s = f"{v} alla PS {({'tempra': 'di Tempra', 'riflessi': 'di Riflessi', 'volonta': 'di Volontà', 'magia': 'di Magia'}).get(e['salvezza'], 'prevista')}"
    elif tipo == 'caratteristica':
        s = f"{v} alle Prove di Caratteristica ({', '.join(e['caratteristiche'])})"
    elif tipo == 'parata':
        s = f"{v} alla Parata a distanza con lo scudo"
    elif tipo == 'danno' and e.get('incantesimi'):
        s = f"{v} danno" + (f" (Gradi: {', '.join(f'{k}+ → {x}' for k, x in e['valore_per_grado'].items())} di {e['grado_di']})" if e.get('valore_per_grado') else '') + f" agli Incantesimi {e['incantesimi']}"
    elif tipo == 'dado_danno':
        s = f"+{e['valore']} dado di danno agli Incantesimi {e['incantesimi']}"
    elif tipo == 'cura':
        s = f"{v} PV curati agli Incantesimi {e['incantesimi']}"
    elif tipo == 'massimizza':
        s = f"dadi al massimo (Incantesimi {e['incantesimi']})"
    elif tipo == 'danno':
        s = f"{v} danno con le armi Artefatto"
    else:
        s = f'{v} {tipo}'
    if e['ambito'] == 'uso_specifico':
        s += f" (solo per {e['uso']})"
    elif e['ambito'] == 'situazionale':
        s += ' (con la condizione accesa)'
    return s


def scrivi_doc():
    _, _, tutti = talenti()
    righe = [(x, *categoria(x)) for x in tutti]
    conta = {}
    for _, c, _ in righe:
        for k in c.split('+'):
            conta[k] = conta.get(k, 0) + 1
    con_effetti = [r for r in righe if effetti_di(r[0])]
    n_effetti = sum(len(effetti_di(x)) for x, _, _ in con_effetti)
    L = []
    L.append('# Censimento dei Talenti: effetti numerici nei valori effettivi\n')
    L.append('30 settembre 2026. Fonti: `data/talenti_liberi.json` (Giocatore §8.6, Magia sez. 1) e `data/classi.json` (Talenti fissi e a scelta delle 25 Classi, Giocatore cap. 3). Non ci sono Talenti di Corporazione nei dati: le Corporazioni danno solo +1 alle Abilità e alle Salvezze (già nel calcolo). Metodo come in `docs/proprieta-armature.md`: ogni Talento con il suo testo, la classificazione e, dove il testo dà un numero sui valori del personaggio, gli effetti nello schema degli oggetti (`docs/effetti-oggetti.md`). Generato da `tools/effetti_talenti.py --doc` (la stessa tabella scrive i dati con `--dati`).\n')
    L.append('## Classificazione\n')
    L.append('- **generale**: vale sempre, entra nel valore effettivo.')
    L.append('- **situazionale**: il giocatore lo accende al tavolo quando ricorre la circostanza scritta in `condizione`.')
    L.append('- **uso_specifico**: vale per un tipo di Prova (`uso`): valore a parte accanto all’Abilità o alla Salvezza.')
    L.append('- **testuale**: nessun numero sui valori del personaggio, oppure un bonus momentaneo, per gli alleati o una penalità dell’avversario; oppure un numero che l’app non può applicare (motivo indicato). Resta testo del Talento.')
    L.append('- **rimandato**: il manuale non definisce il valore o è ambiguo: `TODO(Davide)` nella voce.')
    L.append('- **già gestito**: il motore lo applica già (chiavi di `effetti` lette da `src/attacco.js`, `src/lancio.js`, `src/avanzamento.js`, `src/incantesimi.js`, oppure per nome).\n')
    L.append('## Conteggi\n')
    L.append(f'**{len(righe)} Talenti** (119 Liberi, {len(righe) - 119} di Classe). Un Talento con effetti di più ambiti conta in ciascuno.\n')
    L.append('| Categoria | Talenti |')
    L.append('|---|---|')
    for k in ['generale', 'situazionale', 'uso_specifico', 'testuale', 'rimandato', 'già gestito']:
        L.append(f'| {k} | {conta.get(k, 0)} |')
    L.append(f'\nTalenti con effetti tipizzati nuovi: **{len(con_effetti)}**, per **{n_effetti} effetti** (`effetti.valori`).\n')
    L.append('## Tipi dello schema\n')
    L.append('Nuovi o estesi per i Talenti (anche in `docs/effetti-oggetti.md` e nel validatore):')
    L.append('- `salvezza` con ambito **generale** o **situazionale** (Scudo Spirituale): entra nella Prova Salvezza effettiva; `resistenza: true` per le Resistenze specifiche (§8.6: strutturale + Prova Salvezza Migliorata + Resistenza non oltre 18).')
    L.append('- `parata` (nuovo): `con: "scudo"`, `contro: "distanza"`, generale (Parata a Distanza: la penalità della Parata a distanza con lo scudo passa da −4 a −2).')
    L.append('- `danno` con `armi: "artefatto"` (Meccanica Potenziata: armi Mistiche o TecnoMistiche, cioè Artefatto).')
    L.append('- `caratteristica` e `va` con `{parametro}` e `{annotazione}`: la scelta del giocatore (Prova di Caratteristica Migliorata, Sport).\n')
    L.append('## Talenti\n')
    for titolo, filtro in [('Talenti Liberi', lambda x: x['gruppo'] == 'Libero'), ('Talenti di Classe', lambda x: x['gruppo'] != 'Libero')]:
        L.append(f'### {titolo}\n')
        L.append('| Talento | Fonte | Categoria | Effetto o nota |')
        L.append('|---|---|---|---|')
        for x, c, nota in righe:
            if not filtro(x):
                continue
            nome = x['t']['nome'] + ('' if x['gruppo'] == 'Libero' else f" ({x['gruppo']})")
            L.append(f"| {nome} | {x['fonte']} | {c} | {nota.replace('|', '/')} |")
        L.append('')
    L.append('## Rimandati (pacchetto per il Doc)\n')
    for k, v in RIMANDATI.items():
        L.append(f'- **{k}**: {v}')
    L.append('')
    L.append('## Cosa è stato implementato\n')
    L.append('- **Dati:** `effetti.valori` nelle voci dei Talenti (`talenti_liberi.json`, `classi.json`), scritti da questo script; le chiavi di `effetti` già lette dal motore restano come sono. Validatore e `tools/verifica_frasi.mjs` controllano forma e frasi.')
    L.append('- **Motore** (`src/talenti.js`, `src/condizioni.js`): solo al tavolo (con la sessione), nei valori effettivi; il totale da regole, l’avanzamento e la SS non cambiano. Generali sempre; situazionali con l’interruttore del Talento (`sessione.talentiAccesi`); usi specifici come valore a parte accanto all’Abilità, sotto le Prove Salvezza (Resistenze con il tetto del §8.6) e sotto le Caratteristiche. I bonus dei Talenti si sommano (la regola «un solo modificatore degli strumenti» vale per gli oggetti). Provenienza: una riga per Talento, con il suo nome.')
    L.append('- **Interruttore «Bonus dei Talenti»** (`sessione.bonusTalenti`, predefinito acceso; nel salvataggio e nell’export, come le altre condizioni al tavolo): in testa alle tab Combattimento e Poteri. Spento: nessun effetto di `effetti.valori`, nemmeno i Talenti dell’Iniziativa; «Attacca!» e «Lancia!» calcolano senza Talenti (`talentiAttacco` vuoto); la provenienza elenca i Talenti barrati («Talenti spenti: non conta»). PV, PM, Prova Salvezza Migliorata e Movimento restano: sono il totale da regole.')
    L.append('- **Talenti di lancio** (`incantesimi` negli effetti, applicati da «Lancia!»): **offensivo** = la versione dell’Incantesimo ha una colonna che inizia con «Danno» e contiene dadi (in `incantesimi.json` non c’è un campo che dica «offensivo»); **ad Area** = offensivo con una colonna «Area» o «Raggio», o con l’Anticipazione dell’Area; **di cura** = una colonna «Guarigione» con dadi. Incantesimi Aggressivi (+1/+2/+3 per Grado di Invocatore), Controllo Arcano (+1 ad Area), Canale Vitale (+1 PV), Tocco Sacro (dadi al massimo) si applicano da soli; Sovraccarico Controllato (+1 dado) e Incantesimi Massimizzati sono interruttori del pannello. Il valore e il Grado compaiono nella provenienza del danno, la frase «una sola volta per bersaglio» sotto il danno.')
    L.append('- **Promemoria di lancio senza numero** (Canalizzazione Implacabile, Controllo Superiore, Controllo dei Flussi, Calcolo Arcano, Manifestazioni Occultate; Canalizzazione Sicura e Geometria Arcana con il numero ricavato fra parentesi): una riga «Talenti: Nome — prima frase» nei promemoria di «Lancia!». Non sono «già gestiti»: il motore non applica nessun valore.')
    L.append('- **SD:** interruttori dei Talenti situazionali nella colonna Condizioni della tab Abilità e, per Difese e Salvezze, in testa alla tab Combattimento; usi delle Prove di Caratteristica sotto le Caratteristiche (Identità).')
    L.append('- **Non applicati** (restano testo, motivo nella tabella): Sangue Freddo, Aura di Equilibrio, Assalto Armato, Evacuazione Medica, Supporto Avanzato, Capolavoro, Maestro d’Arma, Maestria Astrale (l’Arma Astrale non è ancora un’arma della scheda).')
    L.append('')
    # fine riga LF anche su Windows (write_text userebbe CRLF)
    with open(RADICE / 'docs' / 'censimento-talenti.md', 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L) + '\n')
    print('scritto docs/censimento-talenti.md', conta, len(con_effetti), n_effetti)


def scrivi_dati():
    liberi, classi, tutti = talenti()
    n = 0
    for x in tutti:
        t = x['t']
        nome = t['nome']
        ee = effetti_di(x)
        if ee:
            t.setdefault('effetti', {})['valori'] = ee
            n += len(ee)
        if nome in RIMANDATI:
            t['TODO(Davide)'] = RIMANDATI[nome]
    for p, d in ((LIBERI, liberi), (CLASSI, classi)):
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('effetti scritti:', n)


if __name__ == '__main__':
    nomi = {x['t']['nome'] for x in talenti()[2]}
    for k in [*EFFETTI, *RIMANDATI, *NUMERICI_NON_APPLICATI]:
        if k not in nomi:
            sys.exit(f'«{k}» non è un Talento dei dati')
    if '--doc' in sys.argv:
        scrivi_doc()
    if '--dati' in sys.argv:
        scrivi_dati()
