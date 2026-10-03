// Indirizzi a cui i giocatori si collegano al Tavolo del Master (richiesta di Marcello del 03/10/2026: con il
// solo avvia-server.bat non si vedeva quale indirizzo dare ai telefoni). Funzione pura sulle interfacce di rete
// nel formato di os.networkInterfaces(); la usano server.mjs (finestra del server, /api/rete) e i test con
// interfacce finte.
// - solo IPv4, niente loopback (127.x) né indirizzi automatici senza rete (169.254.x);
// - le interfacce virtuali evidenti (WSL, Hyper-V, VirtualBox, VMware, Docker, VPN…) si riconoscono dal nome e
//   finiscono fra le «altre»; se non resta nessuna interfaccia vera, si mostrano tutte, ognuna con il suo nome.

const VIRTUALI = /vEthernet|WSL|Hyper-?V|VirtualBox|VBox|VMware|VMnet|Docker|\bbr-|veth|virbr|Tailscale|ZeroTier|Hamachi|WireGuard|\bwg\d|VPN|OpenVPN|\bTAP\b|TAP-|\btun\d|\butun\d|Npcap|Loopback|Bluetooth/i;

export const eVirtuale = (nome) => VIRTUALI.test(String(nome ?? ''));

/**
 * @param interfacce { nome: [{ address, family, internal }] } come os.networkInterfaces()
 * @param porta porta del server
 * @returns {{ indirizzi: [{ nome, indirizzo, url, virtuale }], altri: [...], tuttiPerDubbio: boolean }}
 *   indirizzi: quelli da dare ai giocatori; altri: le interfacce virtuali escluse (con il nome)
 */
export function indirizziRete(interfacce, porta) {
  const voci = [];
  for (const [nome, elenco] of Object.entries(interfacce ?? {})) {
    for (const a of elenco ?? []) {
      // family è «IPv4» (Node 18+) oppure 4 (alcune versioni di Node 18)
      if (a?.internal || !(a?.family === 'IPv4' || a?.family === 4)) continue;
      if (/^127\./.test(a.address) || /^169\.254\./.test(a.address)) continue;
      voci.push({ nome, indirizzo: a.address, url: `http://${a.address}:${porta}`, virtuale: eVirtuale(nome) });
    }
  }
  const veri = voci.filter((v) => !v.virtuale);
  if (!veri.length) return { indirizzi: voci, altri: [], tuttiPerDubbio: voci.length > 0 };
  return { indirizzi: veri, altri: voci.filter((v) => v.virtuale), tuttiPerDubbio: false };
}

/** Testo della finestra del server: indirizzi in evidenza, permesso del firewall, cosa fare se non si collegano. */
export function testoAvvio({ indirizzi, altri, tuttiPerDubbio }, porta, { soloLocale = false } = {}) {
  const riga = '='.repeat(72);
  const righe = ['', riga, ''];
  if (soloLocale) {
    righe.push(`   Mutant e' acceso SOLO per questo computer: http://localhost:${porta}`, '   (avviato con --solo-locale: i giocatori non possono collegarsi)');
  } else if (!indirizzi.length) {
    righe.push('   Nessuna rete trovata: collega questo computer al Wi-Fi e riavvia.', `   Da questo computer: http://localhost:${porta}`);
  } else {
    for (const v of indirizzi) righe.push(`   Giocatori: aprite ${v.url} dalla stessa rete Wi-Fi${tuttiPerDubbio || indirizzi.length > 1 ? `   (${v.nome})` : ''}`);
    if (tuttiPerDubbio) righe.push('', '   Non so quale sia la rete Wi-Fi: provate gli indirizzi uno alla volta.');
    righe.push('', `   Da questo computer: http://localhost:${porta}`);
  }
  righe.push('', riga);
  if (altri.length) righe.push(`Reti virtuali escluse: ${altri.map((v) => `${v.indirizzo} (${v.nome})`).join(', ')}`);
  if (!soloLocale) {
    righe.push(
      'Firewall: se Windows chiede il permesso per Node.js, consenti l\'accesso alle «reti private».',
      'Se i giocatori non si collegano: in Windows la rete Wi-Fi deve essere «privata», non «pubblica»',
      '(Impostazioni > Rete e Internet > Wi-Fi > proprietà della rete), e il firewall deve consentire Node.js.',
    );
  }
  return righe.join('\n');
}
