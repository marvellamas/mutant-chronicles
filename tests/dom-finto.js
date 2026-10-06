// DOM finto minimo per provare con node --test le funzioni dell'interfaccia che creano pochi elementi (src/ui/dom.js,
// src/ui/avvisi.js). Solo ciò che serve: createElement, getElementById, body, classi, dataset, figli, eventi.
class Nodo {}

class Elemento extends Nodo {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this.attributi = {};
    this.className = '';
    this.testo = '';
    this.ascolti = {};
  }
  get firstElementChild() { return this.children[0] ?? null; }
  get textContent() { return this.testo + this.children.map((c) => c.textContent).join(''); }
  set textContent(t) { this.testo = String(t); this.children = []; }
  setAttribute(k, v) { this.attributi[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this.attributi[k] ?? null; }
  addEventListener(tipo, fn) { (this.ascolti[tipo] ??= []).push(fn); }
  append(...figli) { for (const f of figli) this.aggiungi(f, false); }
  prepend(...figli) { for (const f of figli.reverse()) this.aggiungi(f, true); }
  aggiungi(f, inTesta) {
    if (!(f instanceof Elemento)) { this.testo += String(f); return; }
    f.remove();
    f.parent = this;
    if (inTesta) this.children.unshift(f); else this.children.push(f);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  tutti() { return this.children.flatMap((c) => [c, ...c.tutti()]); }
  querySelectorAll(sel) {
    const classe = /^\.([\w-]+)$/.exec(sel)?.[1];
    return this.tutti().filter((c) => classe && c.className.split(/\s+/).includes(classe));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}

/** Installa document e Node globali; restituisce il documento. */
export function installaDomFinto() {
  const body = new Elemento('body');
  const documento = {
    body,
    createElement: (tag) => new Elemento(tag),
    getElementById: (id) => body.tutti().find((c) => c.id === id) ?? null,
  };
  globalThis.Node = Nodo;
  globalThis.document = documento;
  return documento;
}

export function togliDomFinto() {
  delete globalThis.document;
  delete globalThis.Node;
}
