// Contenuto dei tooltip e della scheda completa degli incantesimi, ricavato solo dai dati.
// Funzioni pure: la UI (src/ui/tooltip.js) trasforma il risultato in DOM.
import { catalogo, NOMI_TIPI, moduliDi, munizioneDiRiferimento, tabellaSin, tabellaMunizioniArmi, NOMI_FAMIGLIE_MUNIZIONI, infoArtefatto } from './equipaggiamento.js';

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const eTodo = (v) => typeof v === 'string' && v.startsWith('TODO(');

/** Riga della tabella delle versioni al livello indicato (prima colonna = Livello). */
export function rigaAlLivello(incantesimo, livello) {
  const righe = Array.isArray(incantesimo.versioni) ? incantesimo.versioni : [];
  return righe.find((r) => String(Object.values(r)[0]).trim() === String(livello)) ?? null;
}

/**
 * Contenuto del tooltip.
 * @param {'abilita'|'caratteristica'|'incantesimo'|'talento'|'tecnica'} tipo
 * @param {string} id nome dell'Abilità, sigla della Caratteristica, nome dell'incantesimo,
 *   id del Talento Libero o della Specializzazione, id della Tecnica Interiore
 * @returns {{tipo, titolo, sottotitolo, sezioni: {etichetta: string|null, testo: string}[],
 *   tabella: {colonne: string[], righe: object[]}|null, apriScheda: boolean}|null}
 */
export function contenutoTooltip(tipo, id, dati) {
  if (tipo === 'abilita') return tooltipAbilita(id, dati);
  if (tipo === 'caratteristica') return tooltipCaratteristica(id, dati);
  if (tipo === 'incantesimo') return tooltipIncantesimo(id, dati);
  if (tipo === 'talento') return tooltipTalento(id, dati);
  if (tipo === 'tecnica') return tooltipTecnica(id, dati);
  if (tipo === 'oggetto') return tooltipOggetto(id, dati);
  return null;
}

const MOLTEPLICITA = {
  una: 'Acquisibile una sola volta',
  per_caratteristica: 'Acquisibile una volta per ciascuna Caratteristica',
  per_salvezza_max2: 'Acquisibile fino a due volte per ciascuna Salvezza',
  illimitata: 'Acquisibile più volte',
};

/** Talento Libero (§8.6), Talento di magia (provvisorio) o Specializzazione (§8.8), per id. */
function tooltipTalento(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) {
    const sezione = dati.talenti_liberi.sezioni[t.sezione]?.titolo ?? t.sezione;
    const prerequisiti = Array.isArray(t.prerequisiti)
      ? (t.prerequisiti.length ? t.prerequisiti.map((p) => nomeTalento(p, dati)).join(', ') : 'nessuno')
      : 'da definire con il master';
    const molt = t.molteplicita === 'limitata' ? `Acquisibile fino a ${t.max_acquisizioni} volte` : MOLTEPLICITA[t.molteplicita] ?? t.molteplicita;
    const sezioni = [];
    if (t.provvisorio) sezioni.push({ etichetta: 'Provvisorio', testo: 'ricavato dalle citazioni del Manuale della Magia: tipo e prerequisiti da definire con il master.' });
    sezioni.push({ etichetta: 'Prerequisiti', testo: prerequisiti });
    sezioni.push({ etichetta: null, testo: t.testo });
    return {
      tipo: 'talento', titolo: t.nome,
      sottotitolo: [t.sezione.startsWith('8.') ? `§${t.sezione} ${sezione}` : sezione, eTodo(t.tipo) ? null : t.tipo === 'attivo' ? 'Attivo' : 'Passivo', molt].filter(Boolean).join(' · '),
      sezioni, tabella: null, apriScheda: false,
    };
  }
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  if (!s) return null;
  return {
    tipo: 'talento', titolo: `Specializzazione in ${s.nome}`,
    sottotitolo: `§8.8 · ${s.abilita.length ? s.abilita.join(', ') : 'Abilità indicata dalla scheda dell’arma'} · Acquisibile una sola volta`,
    sezioni: [
      { etichetta: 'Effetto', testo: [s.effetto.va ? `+${s.effetto.va} VA` : null, s.effetto.danno ? `+${s.effetto.danno} danno` : null,
        s.effetto.pm ? `${s.effetto.pm} PM al costo (minimo ${s.effetto.pm_minimo})` : null].filter(Boolean).join(', ') + ' negli impieghi descritti' },
      { etichetta: null, testo: s.ambito },
    ],
    tabella: null, apriScheda: false,
  };
}

function nomeTalento(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) return t.nome;
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  return s ? `Specializzazione in ${s.nome}` : id;
}

/** Oggetto del catalogo dell'equipaggiamento (Manuale degli Armamenti), per riferimento "file:id". */
function tooltipOggetto(rif, dati) {
  const cat = catalogo(dati);
  const o = cat.perRif.get(rif);
  if (!o) return null;
  const rep = dati.equipaggiamento.indice.reperibilita?.[o.reperibilita];
  const danno = o.danno_da_munizione ? 'dalla munizione' : o.danno ? [o.danno.una_mano ? `${o.danno.una_mano} a una mano` : null, o.danno.due_mani ? `${o.danno.due_mani} a due mani` : null].filter(Boolean).join(', ') : null;
  const riga = {};
  if (o.abilita) riga['Abilità'] = o.abilita;
  if (o.mani !== undefined) riga.Mani = String(o.mani).replace('1/2', '1 / 2');
  if (danno) riga.Danno = danno;
  if (o.portata_q) riga.Portata = `${o.portata_q} Q`;
  if (o.gittata_q) riga.Gittata = `${o.gittata_q} Q`;
  if (o.gittata_per_for) riga.Gittata = `FOR × ${o.gittata_per_for} Q`;
  if (o.ac !== undefined && o.ac !== 1) riga.AC = o.ac === 'munizione' ? 'dalla munizione' : String(o.ac);
  if (o.modificatore_va) riga.VA = o.modificatore_va > 0 ? `+${o.modificatore_va}` : `−${-o.modificatore_va}`;
  if (o.munizioni?.capacita) riga.CC = String(o.munizioni.capacita);
  if (o.modalita?.length) riga['Modalità'] = o.modalita.join(' ');
  if (o.mov) riga.MOV = `−${-o.mov} Q`;
  if (o.categoria) riga.Categoria = o.categoria;
  if (o.taglia) riga.Taglia = o.taglia;
  if (o.ar) riga.AR = `${o.ar.totale}${o.ar.magica ? ` (${o.ar.magica} magica)` : ''}`;
  if (o.supporti) riga.Supporti = o.supporti;
  if (o.autonomia) riga.Autonomia = o.autonomia;
  if (o.applicazioni) riga[(o.nome_applicazioni ?? 'applicazioni').replace(/^./, (c) => c.toUpperCase())] = String(o.applicazioni);
  if (o.for_richiesta) riga.FOR = String(o.for_richiesta);
  if (o.inc) riga.INC = String(o.inc);
  if (o.pi !== undefined && o.pi !== null) riga.PI = String(o.pi);
  if (o.qualita) riga['Qualità'] = `${o.qualita}${o.ps_int ? ` (PS INT ${o.ps_int})` : ''}`;
  if (o.reperibilita) riga.REP = rep ? `${o.reperibilita} ${rep.nome}` : o.reperibilita;
  if (o.costo !== undefined && o.costo !== null) riga.Costo = o.costo.toLocaleString('it-IT');
  if (o.modulo_di) riga.Costo = 'compreso nell’arma';
  const sezioni = [];
  if (o.nomi_alternativi?.length) sezioni.push({ etichetta: 'Comprende', testo: o.nomi_alternativi.join(', ') });
  for (const p of o.proprieta ?? []) sezioni.push({ etichetta: p.nome, testo: p.testo });
  const conSegno = (n) => (n < 0 ? `−${-n}` : n > 0 ? `+${n}` : '0');
  if (o.parata) riga.Parata = `${conSegno(o.parata.ravvicinata)} ravv. / ${conSegno(o.parata.distanza)} dist.`;
  // penalità proprie del modello (armature corporative: categoria con gli effetti delle proprietà)
  const testoPen = (p) => [`attacchi ${conSegno(p.attacchi_ravvicinati)} ravv. / ${conSegno(p.attacchi_distanza)} dist.`, `Agilità ${conSegno(p.agilita)}`, `MOV ${conSegno(p.movimento_q)} Q`, `lancio con Potere ${conSegno(p.lancio_potere)}`].join(', ');
  if (o.tipo === 'armatura' && o.penalita) sezioni.push({ etichetta: 'Penalità effettive', testo: `${testoPen(o.penalita)}.` });
  for (const a of o.profili_alternativi ?? []) {
    sezioni.push({ etichetta: a.condizione.replace(/^./, (c) => c.toUpperCase()), testo: [a.ar ? `AR ${a.ar.totale}${a.ar.magica ? ` (${a.ar.magica} magica)` : ''}` : null, a.parata ? `Parata ${conSegno(a.parata.ravvicinata)} ravv. / ${conSegno(a.parata.distanza)} dist.` : null,
      a.for_richiesta ? `FOR ${a.for_richiesta}` : null, a.penalita ? `penalità ${testoPen(a.penalita)}` : null].filter(Boolean).join(', ') });
  }
  if (o.rinforzi_ammessi) sezioni.push({ etichetta: 'Rinforzi ammessi', testo: o.rinforzi_ammessi.length ? `un kit ${o.rinforzi_ammessi.join(' oppure ')} (§7.11.2)` : 'nessuno' });
  if (o.attivazione) sezioni.push({ etichetta: 'Attivazione', testo: o.attivazione.testo });
  if (o.manovre?.length) sezioni.push({ etichetta: 'Manovre compatibili', testo: o.manovre.join(', ') });
  if (o.attacco) sezioni.push({ etichetta: 'Attacco', testo: `${o.attacco.abilita}, ${o.attacco.mani === 1 ? 'una mano' : 'due mani'}, danno ${o.attacco.danno}, portata ${o.attacco.portata_q} Q${o.attacco.condizione ? `, ${o.attacco.condizione}` : ''}.` });
  if (o.modulo_di) sezioni.push({ etichetta: 'Modulo integrato', testo: `Compreso in ${cat.perRif.get(o.modulo_di)?.nome ?? o.modulo_di}: propria Abilità, gittata, INC, capacità e modalità; PI, Qualità e MOV dell’arma principale (§7.8).` });
  for (const m of moduliDi(o, cat)) sezioni.push({ etichetta: `Modulo integrato: ${m.nome}`, testo: `${m.abilita}, gittata ${m.gittata_q} Q, CC ${m.munizioni?.capacita ?? '—'}, INC ${m.inc}, ${m.modalita.join(' ')}${m.munizioni?.riferimento ? `; ${m.munizioni.riferimento}` : ''}.` });
  if (o.munizioni?.riferimento) {
    const mr = munizioneDiRiferimento(o.munizioni.riferimento, dati);
    sezioni.push({ etichetta: 'Munizione di riferimento', testo: mr ? `${mr.nome}: danno ${mr.danno}, AC ${mr.ac}, RS ${mr.rs_q} Q; ${mr.proprieta.join('; ')}.` : o.munizioni.riferimento });
  }
  if (o.munizioni?.ricarica) sezioni.push({ etichetta: 'Ricarica', testo: o.munizioni.ricarica });
  if (o.ricarica?.applicazioni) sezioni.push({ etichetta: 'Ricarica', testo: `${o.ricarica.applicazioni} applicazioni, costo ${o.ricarica.costo.toLocaleString('it-IT')}` });
  const s = tabellaSin(dati).get(rif);
  if (s) sezioni.push({ etichetta: `SIN ${s.valore}`, testo: `+${s.valore} VA (${s.prova.toLowerCase()}) con un Innesto di Interfaccia Neurale in uso (§7.15.1).` });
  if (o.innesto === 'interfaccia_neurale') sezioni.push({ etichetta: 'In uso', testo: 'Le armi con SIN ricevono il bonus al VA per colpire nella scheda (§7.15.1).' });
  if (o.scudo_integrato) {
    const si = o.scudo_integrato;
    sezioni.push({ etichetta: `Scudo, ${si.condizione}`, testo: `AR ${si.ar.totale}, Parata ${conSegno(si.parata.ravvicinata)} ravv. / ${conSegno(si.parata.distanza)} dist. (con Difese)` });
  }
  const famMun = tabellaMunizioniArmi(dati).get(rif);
  if (famMun) sezioni.push({ etichetta: 'Munizioni', testo: `${NOMI_FAMIGLIE_MUNIZIONI[famMun]} (§7.20.9)` });
  if (o.munizione) {
    riga.Confezione = `${o.munizione.confezione.quantita} × ${o.munizione.confezione.costo.toLocaleString('it-IT')}`;
    sezioni.push({ etichetta: 'Famiglia', testo: `${NOMI_FAMIGLIE_MUNIZIONI[o.munizione.famiglia]}${o.munizione.variante ? `, variante ${o.munizione.variante}` : ''}` });
  }
  if (o.esplosivo) sezioni.push({ etichetta: 'Carico', testo: `danno ${o.esplosivo.danno}, AC ${o.esplosivo.ac}, RS ${o.esplosivo.rs_q} Q; ${o.esplosivo.proprieta.join(', ')}` });
  if (o.cella) sezioni.push({ etichetta: 'Capacità', testo: `${o.cella.capacita} ${o.cella.unita}; riempirla o ricaricarla costa ${o.cella.ricarica_costo.toLocaleString('it-IT')}` });
  const art = infoArtefatto(o, dati);
  if (art) sezioni.push({ etichetta: 'Artefatto', testo: `${art.tipologia}; potenza ${art.potenza}, costo di sintonizzazione ${art.sintonizzazione}${art.contenitore ? `; ${art.contenitore.integrato ? 'riserva integrata' : 'contenitore'} di ${art.contenitore.capacita_pm} PM (Chroma ${art.contenitore.energia})` : ''} (§7.10).` });
  // risposta A.14: disponibilità degli Artefatti Mistici (regole.json → artefatti_mistici)
  if (art && dati.regole?.artefatti_mistici?.disponibilita) sezioni.push({ etichetta: 'Disponibilità', testo: dati.regole.artefatti_mistici.disponibilita });
  if (o.strumenti) sezioni.push({ etichetta: 'Strumenti', testo: `${o.strumenti.va > 0 ? '+' : o.strumenti.va < 0 ? '−' : ''}${Math.abs(o.strumenti.va)} VA a ${o.strumenti.prova}; un solo modificatore degli strumenti per Prova.` });
  if (o.esiti) sezioni.push({ etichetta: 'Successo', testo: o.esiti.successo }, { etichetta: 'Magistrale', testo: o.esiti.magistrale });
  if (o.effetto) sezioni.push({ etichetta: 'Effetto', testo: o.effetto });
  if (o.capacita_cartucce) riga.Cartucce = String(o.capacita_cartucce);
  if (o.rinforzo) sezioni.push({ etichetta: `Kit ${o.rinforzo.kit}`, testo: `AR +${o.rinforzo.ar}, FOR richiesta +${o.rinforzo.for}; PI e PS propri. Una Leggera portata fisicamente ad AR 3 o più usa le penalità della Media (§7.11.2).` });
  if (o.mirino) sezioni.push({ etichetta: 'Mirino', testo: `riduce di ${o.mirino.riduzione} la penalità di distanza, fino a 0. ${o.mirino.testo}` });
  if (o.effetto_arma && (o.effetto_arma.va || o.effetto_arma.danno)) sezioni.push({ etichetta: 'Sull’arma', testo: [o.effetto_arma.va ? `VA per colpire ${conSegno(o.effetto_arma.va)}` : null, o.effetto_arma.danno ? `danno ${conSegno(o.effetto_arma.danno)}` : null].filter(Boolean).join(', ') });
  if (o.percezione) sezioni.push({ etichetta: 'Percezione dello sparo', testo: o.percezione });
  if (o.bonus_condizionato) sezioni.push({ etichetta: 'Bonus al tiro', testo: `${conSegno(o.bonus_condizionato.va)} VA ${o.bonus_condizionato.condizione}` });
  if (o.portata_q && o.tipo === 'accessorio') riga.Portata = `${o.portata_q} Q`;
  if (o.si_monta_su) sezioni.push({ etichetta: 'Si monta su', testo: o.si_monta_su.map((x) => ({ arma_distanza: 'arma a distanza', arma_ravvicinata: 'arma ravvicinata', armatura: 'armatura', mirino: 'mirino' }[x])).join(', ') });
  if (o.compatibilita) sezioni.push({ etichetta: 'Compatibilità', testo: o.compatibilita });
  if (o.compatibile_con) sezioni.push({ etichetta: 'Compatibile con', testo: o.compatibile_con.map((r) => cat.perRif.get(r)?.nome ?? r).join(', ') });
  for (const t of o.tabelle ?? []) {
    sezioni.push({ etichetta: t.titolo, testo: t.righe.map((r) => (t.colonne.length === 2 ? `${r[0]}: ${r[1]}` : `${r[0]}: ${r.slice(1).map((v, i) => `${t.colonne[i + 1]} ${v}`).join(', ')}`)).join(' · ') });
  }
  if (o.note_manuale) sezioni.push({ etichetta: null, testo: o.note_manuale });
  const noteCatalogo = dati.equipaggiamento.file?.[o.file]?.note_per_catalogo?.[o.catalogo];
  if (noteCatalogo) sezioni.push({ etichetta: `Note del catalogo ${o.catalogo}`, testo: Array.isArray(noteCatalogo) ? noteCatalogo.join(' ') : noteCatalogo });
  return {
    tipo: 'oggetto', titolo: o.nome,
    sottotitolo: `${NOMI_TIPI[o.tipo]} · ${o.catalogo} · ${o.famiglia} · ${o.paragrafo} (${o.versione_manuale})`,
    sezioni, tabella: { titolo: null, colonne: Object.keys(riga), righe: [riga] }, apriScheda: false,
  };
}

/** Tecnica Interiore (§8.9). */
function tooltipTecnica(id, dati) {
  const t = dati.tecniche_interiori.tecniche.find((x) => x.id === id);
  if (!t) return null;
  const gruppo = t.gruppo === 'generica' ? 'Tecnica generica' : t.gruppo === 'lottatore' ? 'Tecnica del Lottatore' : `Scuola Mishima ${t.gruppo.slice(7)}`;
  const campo = (v) => (eTodo(v) ? 'non indicato' : v);
  return {
    tipo: 'tecnica', titolo: t.nome, sottotitolo: `§8.9 · ${gruppo}`,
    sezioni: [
      { etichetta: 'Costo', testo: campo(t.costo) },
      { etichetta: 'Azione', testo: campo(t.azione) },
      { etichetta: 'Bersaglio', testo: campo(t.bersaglio) },
      { etichetta: 'Durata', testo: campo(t.durata) },
      { etichetta: null, testo: t.testo },
    ],
    tabella: null, apriScheda: false,
  };
}

function nomeCaratteristica(sigla, dati) {
  return dati.caratteristiche.caratteristiche.find((c) => c.sigla === sigla)?.nome ?? sigla;
}

function tooltipAbilita(nome, dati) {
  const a = trova(dati.abilita.abilita, nome);
  if (!a) return null;
  return {
    tipo: 'abilita',
    titolo: a.nome,
    sottotitolo: `${nomeCaratteristica(a.caratteristica, dati)} (${a.caratteristica}) · ${a.categoria}`,
    sezioni: [
      { etichetta: 'Ambito', testo: a.ambito },
      { etichetta: null, testo: descrizioneOAvviso(a.descrizione) },
    ],
    tabella: null,
    apriScheda: false,
  };
}

function tooltipCaratteristica(sigla, dati) {
  const c = dati.caratteristiche.caratteristiche.find((x) => x.sigla === sigla);
  if (!c) return null;
  const abilita = dati.abilita.abilita.filter((a) => a.caratteristica === sigla).map((a) => a.nome);
  const salvezze = dati.caratteristiche.salvezze.filter((s) => s.caratteristica === sigla).map((s) => s.nome);
  const sezioni = [
    { etichetta: null, testo: descrizioneOAvviso(c.descrizione) },
    { etichetta: 'Abilità', testo: abilita.length ? abilita.join(', ') : 'Nessuna Abilità usa questa Caratteristica.' },
  ];
  if (salvezze.length) sezioni.push({ etichetta: salvezze.length > 1 ? 'Salvezze' : 'Salvezza', testo: salvezze.join(', ') });
  return { tipo: 'caratteristica', titolo: `${c.nome} (${c.sigla})`, sottotitolo: null, sezioni, tabella: null, apriScheda: false };
}

function tooltipIncantesimo(nome, dati) {
  const i = trova(dati.incantesimi.incantesimi, nome);
  if (!i) return null;
  const riga = rigaAlLivello(i, i.livello_base);
  return {
    tipo: 'incantesimo',
    titolo: i.nome,
    sottotitolo: i.intestazione ?? `Scheda ${i.scheda} • ${i.macrofamiglia} • ${i.specializzazione}`,
    sezioni: [
      { etichetta: null, testo: descrizioneOAvviso(i.lancio) },
      { etichetta: null, testo: descrizioneOAvviso(i.descrizione) },
    ],
    tabella: riga ? { titolo: `Livello base ${i.livello_base}`, colonne: Object.keys(riga), righe: [riga] } : null,
    apriScheda: true,
  };
}

function descrizioneOAvviso(testo) {
  if (!testo || eTodo(testo)) return 'Descrizione non ancora disponibile (da completare nei dati: TODO).';
  return testo;
}

/** Scheda completa di un incantesimo per il pannello modale. */
export function schedaIncantesimo(nome, dati) {
  const i = trova(dati.incantesimi.incantesimi, nome);
  if (!i) return null;
  const tabelle = [];
  if (Array.isArray(i.versioni) && i.versioni.length) {
    tabelle.push({ titolo: null, colonne: Object.keys(i.versioni[0]), righe: i.versioni, evidenzia: String(i.livello_base) });
  }
  for (const t of i.altre_tabelle ?? []) {
    if (Array.isArray(t.righe) && t.righe.length) tabelle.push({ titolo: t.titolo ?? null, colonne: Object.keys(t.righe[0]), righe: t.righe });
  }
  return {
    titolo: i.nome,
    intestazione: i.intestazione ?? '',
    lancio: descrizioneOAvviso(i.lancio),
    descrizione: descrizioneOAvviso(i.descrizione),
    livelloBase: i.livello_base,
    tabelle,
    tabellaMancante: !tabelle.length || eTodo(i.versioni),
    regole: i.regole && !eTodo(i.regole) ? i.regole : '',
    riferimento: `Manuale della Magia, scheda ${i.scheda}, p. ${i.pagina}`,
  };
}

/** Il contenuto del tooltip come testo semplice (per test e lettori di schermo). */
export function testoTooltip(tipo, id, dati) {
  const c = contenutoTooltip(tipo, id, dati);
  if (!c) return '';
  const parti = [c.titolo];
  if (c.sottotitolo) parti.push(c.sottotitolo);
  for (const s of c.sezioni) parti.push(s.etichetta ? `${s.etichetta}: ${s.testo}` : s.testo);
  if (c.tabella) {
    parti.push(c.tabella.titolo);
    for (const r of c.tabella.righe) parti.push(c.tabella.colonne.map((k) => `${k}: ${r[k]}`).join(' · '));
  }
  if (c.apriScheda) parti.push('Apri scheda completa');
  return parti.join('\n');
}
