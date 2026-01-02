import { get, mk, wipe  } from './utils.js';

class Cell { color=0; }

class Picross {
  rows: Cell[][];
  cols: Cell[][];
  constructor(height: number, width: number) {
    this.rows = new Array(height).fill(0).map(   () => new Array(width ).fill(0).map(   () => new Cell()     ));
    this.cols = new Array(width ).fill(0).map((_,i) => new Array(height).fill(0).map((_,j) => this.rows[j][i]));
  }
}

var picross: Picross;
var rows: HTMLElement[], cols: HTMLElement[], cells: HTMLElement[][];

var dimX: HTMLElement;

function spec(row: Cell[]): number[] {
  const res = new Array();
  let acc = 0;
  row.forEach(function(c: Cell) {
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


function setColor(i: number, j: number, c: number) {
  picross.rows[i][j].color = c;
  if (c) {
    cells[i][j].classList.replace('white','black');
  } else {
    cells[i][j].classList.replace('black','white');
  }
  rows[i].innerHTML = spec( picross.rows[i] ).join('.');
  cols[j].innerHTML = spec( picross.cols[j] ).join('<br>');
}

function mkCell(i: number, j: number) {
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

function initPicross(height: number, width: number) {
  picross = new Picross(height, width);
  rows = new Array(height);
  cols = new Array(width);
  cells = new Array(height).fill(0).map(()=>new Array(width));

  const pic = wipe( get('picross') as HTMLElement );
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
  (get('copy'    ) as HTMLButtonElement).disabled = false;
  (get('copyspec') as HTMLButtonElement).disabled = false;
}

function newPicross() {
  initPicross(
    parseInt( (get('dim-x') as HTMLElement).innerText ) ,
    parseInt( (get('dim-y') as HTMLElement).innerText )
  );
}

function loadPicrossFromString(txt: string) {
  const spec = JSON.parse(txt);
  initPicross(spec.height, spec.width);
  spec.rows.forEach(function (row: number[], i: number) {
    row.forEach(function (c: number, j: number) {
      setColor(i, j, c);
    });
  });
}

function copyObject(o: any) {
  navigator.clipboard.writeText(JSON.stringify(o)).then(()=>{alert("Copied");});
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
  navigator.clipboard.writeText(txt).then(()=>{alert("Copied");});
}

window.onload = function() {
  (get("newpicross") as HTMLElement).addEventListener("click", newPicross);
  (get("copy"      ) as HTMLElement).addEventListener("click", copyPicross);
  (get("paste"     ) as HTMLElement).addEventListener("click", pastePicross);
  (get("copyspec"  ) as HTMLElement).addEventListener("click", copySpec);

  const field_x = get("field-x") as HTMLInputElement;
  field_x.addEventListener("change", function () { (get("field-x") as HTMLElement).innerText = field_x.value; });
  const field_y = get("field-y") as HTMLInputElement;
  field_y.addEventListener("change", function () { (get('dim-y') as HTMLElement).innerText = field_y.value; });
}
