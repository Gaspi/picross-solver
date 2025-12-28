import { get, mk, wipe  } from './utils.js';

function spec(row) {
  const res = new Array();
  let acc = 0;
  row.forEach(function(c) {
    if (c.color === 1) {
      acc += 1
    } else {
      if (acc) { res.push(acc); }
      acc = 0;
    }
  });
  if (acc) { res.push(acc); }
  return res;
}

class Cell { color=0; }

class Picross {
  constructor(height, width) {
    this.rows = new Array(height).fill(0).map(   () => new Array(width ).fill(0).map(   () => new Cell()     ));
    this.cols = new Array(width ).fill(0).map((_,i) => new Array(height).fill(0).map((_,j) => this.rows[j][i]));
  }
}

var cells, rows, cols, picross;

function setColor(i,j,c) {
  picross.rows[i][j].color = c;
  if (c) {
    cells[i][j].classList.replace('white','black');
  } else {
    cells[i][j].classList.replace('black','white');
  }
  rows[i].innerHTML = spec( picross.rows[i] ).join('.');
  cols[j].innerHTML = spec( picross.cols[j] ).join('<br>');
}

function mkCell(i,j) {
  const c = cells[i][j] = mk('td', ['pic-cell','white']);
  c.addEventListener("click", function () {
    setColor(i,j,1);
  });
  c.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    setColor(i,j,0);
    c.classList.replace('black','white');
  });
  return c;
}

function initPicross(height, width) {
  picross = new Picross(height, width);
  rows = new Array(height);
  cols = new Array(width);
  cells = new Array(height).fill(0).map(()=>new Array(width));

  const pic = wipe( get('picross') );
  const specRow = pic.appendChild( mk('tr',['pic-row']) );
  specRow.appendChild( mk('th',['pic-corner']) );
  for (let j = 0; j < width; j++) {
    cols[j] = specRow.appendChild( mk('th', ['pic-col-spec']) );
  }
  for (let i = 0; i < height; i++) {
    const row = pic.appendChild( mk('tr', ['pic-row']) );
    rows[i] = row.appendChild( mk('th', ['pic-row-spec']) );
    for (let j = 0; j < width; j++) {
      row.appendChild( mkCell(i,j) );
    }
  }
  get('copy').disabled = false;
  get('copyspec').disabled = false;
}

function newPicross() {
  initPicross(parseInt(get('dim-x').innerText) , parseInt(get('dim-y').innerText));
}

function loadPicrossFromString(txt) {
  const spec = JSON.parse(txt);
  initPicross(spec.height, spec.width);
  spec.rows.forEach(function (row, i) {
    row.forEach(function (c, j) {
      setColor(i, j, c);
    });
  });
}

function copyObject(o) {
  navigator.clipboard.writeText(JSON.stringify(o)).then(alert("Copied"));
}

function copyPicross() {
  copyObject({
    height: picross.rows.length,
    width: picross.cols.length,
    rows: picross.rows.map((r)=>r.map((c)=>c.color))
  });
}

function pastePicross() {
  navigator.clipboard.readText().then((txt)=>loadPicrossFromString(txt));
}

function copySpec() {
  const txt = `copied;${picross.rows.map((x)=>spec(x).join('.')).join(',')};${picross.cols.map((x)=>spec(x).join('.')).join(',')}`;
  navigator.clipboard.writeText(txt).then(alert("Copied"));
}

window.onload = function() {
  get("newpicross").addEventListener("click", newPicross);
  get("copy").addEventListener("click", copyPicross);
  get("paste").addEventListener("click", pastePicross);
  get("copyspec").addEventListener("click", copySpec);

  const field_x = get("field-x");
  field_x.addEventListener("change", function () { get('dim-x').innerText = field_x.value; });
  const field_y = get("field-y");
  field_y.addEventListener("change", function () { get('dim-y').innerText = field_y.value; });
}
