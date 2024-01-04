


function get(id) { return document.getElementById(id);}

function mk(elt, classes=[], innerText) {
  const res = document.createElement(elt);
  res.classList.add(...classes);
  if (innerText) {
    res.innerText = innerText;
  }
  return res;
}

function wipe(node) {
  while (node.firstChild) {
    node.removeChild(node.lastChild);
  }
}

function arr(length, fill=null) {
  const res = new Array(length);
  if (fill) {
    for (let i = 0; i < length; i++) {
      res[i] = fill(i);
    }
  }
  return res;
}