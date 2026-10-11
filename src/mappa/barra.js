// Barra in alto della mappa di battaglia (12/10/2026, seguito dei ritocchi alla barra: su una riga anche a 1024 px).
// Funzioni pure per ciò che la barra mostra in poco spazio: l'icona dello stato del salvataggio (al posto della scritta
// «Salvata alle 12:22», che sta nel suggerimento) e il pulsante dell'altoparlante, che apre il menu dei due volumi e
// dice comunque se l'audio è muto. L'interfaccia è in src/ui/mappa/pagina.js.

/**
 * Stati del salvataggio della scena, ognuno con un'icona di un solo segno: lo spazio occupato nella barra è sempre lo
 * stesso (larghezza fissa nel CSS), così la mappa non cambia misura quando lo stato cambia (il «sobbalzo» del 09/10).
 */
export const STATI_SALVATAGGIO = {
  nessuno: { icona: '○', titolo: 'Scena non ancora salvata' },
  salvata: { icona: '✓', titolo: null },
  da_salvare: { icona: '●', titolo: null },
  in_corso: { icona: '…', titolo: null },
  errore: { icona: '⚠', titolo: null },
};

/**
 * L'icona per la scritta di stato del salvataggio («Salvata alle 12:22», «Modifiche da salvare…», «Salvataggio…»,
 * «Non salvata: …»): { stato, icona, titolo, modificata }. Il titolo è la scritta intera, per il passaggio del mouse.
 * @param testo la scritta di stato della pagina (vuota prima del primo salvataggio)
 * @param modificata true se ci sono modifiche non ancora salvate (vince sulla scritta «Salvata alle…»)
 */
export function iconaSalvataggio(testo, modificata = false) {
  const t = String(testo ?? '').trim();
  const stato = t.startsWith('Non salvata') ? 'errore'
    : t.startsWith('Salvataggio') ? 'in_corso'
      : modificata || t.startsWith('Modifiche') ? 'da_salvare'
        : t.startsWith('Salvata') ? 'salvata' : 'nessuno';
  const base = STATI_SALVATAGGIO[stato];
  const titolo = stato === 'da_salvare' && !t.startsWith('Modifiche') ? `Modifiche da salvare…${t ? ` (${t.replace(/^Salvata/, 'ultima volta salvata')})` : ''}` : t || base.titolo;
  return { stato, icona: base.icona, titolo, modificata: stato === 'da_salvare' || stato === 'in_corso' || stato === 'errore' };
}

/**
 * Il pulsante dell'altoparlante: apre il menu con i cursori di Musica ed Effetti e mostra se l'audio è muto.
 * @param imp impostazioni dell'audio su questo PC: { muto, musica, effetti } (volumi 0–1)
 * @returns { icona, muto, titolo, etichetta }
 */
export function pulsanteAudio(imp) {
  const muto = !!imp?.muto;
  const pc = (v) => `${Math.round((Number(v) || 0) * 100)} %`;
  return {
    icona: muto ? '🔇' : '🔊',
    muto,
    titolo: muto ? 'Audio muto su questo PC: clic per aprire i volumi e riaccenderlo' : `Volumi su questo PC: Musica ${pc(imp?.musica)}, Effetti ${pc(imp?.effetti)} (clic per regolarli)`,
    etichetta: muto ? 'Volumi (audio muto)' : 'Volumi',
  };
}

/** Il menu dei volumi si chiude con un clic fuori: true se il bersaglio del clic non sta nel menu. */
export const clicFuori = (menu, bersaglio) => !!menu?.open && !menu.contains(bersaglio);
