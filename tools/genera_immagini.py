#!/usr/bin/env python3
"""Genera le immagini servite dall'app dagli originali in img/originali/ (non tracciati da Git).

Non fa parte dell'app. Uso:
  python tools/genera_immagini.py            genera e scrive img/immagini.json
  python tools/genera_immagini.py --prova    elenca soltanto che cosa scriverebbe

Per ogni originale (1254×1254 RGBA) scrive in img/corporazioni/ o img/pagine/:
  <id>-96.png           icone, intestazioni, card del wizard, tab
  <id>-512.png          stemma della stampa
  <id>-512-grigio.png   filigrana (scala di grigi, trasparenza conservata)
e la versione .webp di ognuna, tenuta solo se più leggera del PNG (il PNG, a 256 colori con la
trasparenza, resta come riserva).

I nomi seguono gli «id» di data/corporazioni.json (Alleanza compresa, anche se non è una scelta
iniziale; Freelance non ha ancora un'immagine) e gli id delle tab della scheda. img/immagini.json
elenca i file prodotti con il peso, più gli sfondi img/sfondi/<id>.jpg presenti (messi a mano, non
generati): l'app legge solo il manifesto e non chiede mai un file che non esiste.

Dipendenza: Pillow (tools/requirements.txt).
"""
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('Manca Pillow: installalo con  python -m pip install -r tools/requirements.txt')

RADICE = Path(__file__).resolve().parent.parent
ORIGINALI = RADICE / 'img' / 'originali'

# originale → (gruppo, id). Gli id delle Corporazioni sono quelli di data/corporazioni.json.
SORGENTI = {
    'Corporazioni/Alleanza.png': ('corporazioni', 'alleanza'),
    'Corporazioni/Bauhaus.png': ('corporazioni', 'bauhaus'),
    'Corporazioni/capitol.png': ('corporazioni', 'capitol'),
    'Corporazioni/Cybertronic.png': ('corporazioni', 'cybertronic'),
    'Corporazioni/Fratellanza.png': ('corporazioni', 'fratellanza'),
    'Corporazioni/Imperials.png': ('corporazioni', 'imperial'),
    'Corporazioni/Mishima.png': ('corporazioni', 'mishima'),
    # pagine della scheda: id delle tab (src/ui/tab.js)
    'Pages/Main-Background.png': ('pagine', 'identita'),
    'Pages/Skills.png': ('pagine', 'abilita'),
    'Pages/Combat.png': ('pagine', 'combattimento'),
    'Pages/Magic.png': ('pagine', 'magia'),
    # tab nuovi della scheda (docs/layout-sd.md); gli originali di Marcello vanno in img/originali/Pages/
    'Pages/Artefatti.png': ('pagine', 'artefatti'),
    'Pages/Cibernetica.png': ('pagine', 'cibernetica'),
    'Pages/Veicoli.png': ('pagine', 'veicoli'),
    'Pages/equipaggiamento.png': ('pagine', 'inventario'),
}

VARIANTI = [('96', 96, False), ('512', 512, False), ('512-grigio', 512, True)]
QUALITA_WEBP = 85


def png(im):
    # 256 colori con la trasparenza (FASTOCTREE, con dithering): a occhio identico all'originale
    # ridotto e circa 5 volte più leggero; è comunque solo la riserva del WebP
    q = im.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    b = io.BytesIO()
    q.save(b, 'PNG', optimize=True)
    return b.getvalue()


def webp(im):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=QUALITA_WEBP, method=6)
    return b.getvalue()


def variante(orig, lato, grigio):
    im = orig.convert('RGBA').resize((lato, lato), Image.LANCZOS)
    if grigio:
        # scala di grigi con la trasparenza dell'originale (LA), poi di nuovo RGBA per WebP
        im = Image.merge('LA', (im.convert('L'), im.getchannel('A'))).convert('RGBA')
    return im


def main(prova=False):
    manifesto = {'_nota': 'Generato da tools/genera_immagini.py. «sfondi» si può aggiornare anche a mano (README, «Ritratto e sfondi»).', 'corporazioni': {}, 'pagine': {}, 'sfondi': {}}
    totale = {'png': 0, 'webp': 0, 'servito': 0}
    righe = []
    # voci già generate: se su questa macchina manca l'originale, restano come sono (i file serviti
    # sono tracciati, gli originali no), invece di sparire dal manifesto
    try:
        precedente = json.loads((RADICE / 'img' / 'immagini.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        precedente = {}
    for rel, (gruppo, id_) in SORGENTI.items():
        sorgente = ORIGINALI / rel
        if not sorgente.exists():
            vecchia = precedente.get(gruppo, {}).get(id_)
            if vecchia and all((RADICE / f[k]).exists() for f in vecchia.values() for k in ('png', 'webp') if k in f):
                manifesto[gruppo][id_] = vecchia
                print(f'manca {sorgente.relative_to(RADICE)}: tengo {gruppo}/{id_} già generato')
            else:
                print(f'manca {sorgente.relative_to(RADICE)}: salto {gruppo}/{id_}')
            continue
        orig = Image.open(sorgente)
        uscita = RADICE / 'img' / gruppo
        voce = {}
        for nome, lato, grigio in VARIANTI:
            im = variante(orig, lato, grigio)
            dati_png = png(im)
            dati_webp = webp(im)
            base = f'{id_}-{nome}'
            file = {'png': f'img/{gruppo}/{base}.png', 'byte_png': len(dati_png)}
            usa_webp = len(dati_webp) < len(dati_png)
            if usa_webp:
                file.update({'webp': f'img/{gruppo}/{base}.webp', 'byte_webp': len(dati_webp)})
            voce[nome] = file
            totale['png'] += len(dati_png)
            totale['webp'] += len(dati_webp) if usa_webp else 0
            totale['servito'] += len(dati_webp) if usa_webp else len(dati_png)
            righe.append(f'{gruppo}/{base}: PNG {len(dati_png) / 1024:.1f} KB' + (f', WebP {len(dati_webp) / 1024:.1f} KB' if usa_webp else ' (WebP non più leggero)'))
            if not prova:
                uscita.mkdir(parents=True, exist_ok=True)
                (uscita / f'{base}.png').write_bytes(dati_png)
                w = uscita / f'{base}.webp'
                if usa_webp:
                    w.write_bytes(dati_webp)
                elif w.exists():
                    w.unlink()
        manifesto[gruppo][id_] = voce
    # sfondi di Corporazione messi a mano: si elencano, non si toccano
    ids = {c['id'] for c in json.loads((RADICE / 'data' / 'corporazioni.json').read_text(encoding='utf-8'))['corporazioni']}
    for f in sorted((RADICE / 'img' / 'sfondi').glob('*.jpg')):
        if f.stem in ids:
            manifesto['sfondi'][f.stem] = f'img/sfondi/{f.name}'
            righe.append(f'sfondi/{f.name}: {f.stat().st_size / 1024:.1f} KB (messo a mano)')
        else:
            righe.append(f'sfondi/{f.name}: ignorato, «{f.stem}» non è l\'id di una Corporazione')
    print('\n'.join(righe))
    print(f"Totale PNG {totale['png'] / 1024:.0f} KB · WebP {totale['webp'] / 1024:.0f} KB · servito (WebP dove c'è) {totale['servito'] / 1024:.0f} KB")
    if not prova:
        (RADICE / 'img' / 'immagini.json').write_bytes((json.dumps(manifesto, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
        print('scritto img/immagini.json')


if __name__ == '__main__':
    main(prova='--prova' in sys.argv)
