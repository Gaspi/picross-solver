
export function get(id: string) : HTMLElement | null {
  return document.getElementById(id);
}

export function mk(elt: string, classes: Array<string> = [], innerText: string = "") {
  const res = document.createElement(elt);
  res.classList.add(...classes);
  if (innerText != "") {
    res.innerText = innerText;
  }
  return res;
}

export function wipe(node: HTMLElement) : HTMLElement {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
  return node;
}

export function arr(length: number, fill: ((x:number) => HTMLElement) | null = null) {
  const res = new Array(length);
  if (fill) {
    for (let i = 0; i < length; i++) {
      res[i] = fill(i);
    }
  }
  return res;
}
