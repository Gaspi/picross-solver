import { get, mk, wipe  } from './utils.js';

import { LineStates, BlockStateTracker, Picross } from './StatePicross.js';
import { PicrossStateTracker } from './PicrossSolver.js';
import { SVGDrawer } from './SVGDrawer.js';


export var picrossTracker: PicrossStateTracker;
export var picross: Picross;

export var table: HTMLElement, rowSpecs: HTMLElement[], colSpecs: HTMLElement[], cells: HTMLElement[][];
export var svgdrawer: SVGDrawer;


function initBlock(block: BlockStateTracker, cellSelector: () => HTMLElement[]): HTMLElement {
  const dom = mk('span', ['spec', 'col-'+block.color]);
  dom.innerText = block.size.toString();

  dom.addEventListener("mouseenter" , () => cellSelector().forEach((c)=>c.classList.add('highlight')));
  dom.addEventListener("mouseleave" , () => cellSelector().forEach((c)=>c.classList.remove('highlight')));
  return dom;
}

export function initRowSpec(rowSpec: LineStates, i: number): HTMLElement {
  const dom = mk('th', ['pic-row-spec','nonclickable']);
  rowSpec.blocks.forEach(function(block: BlockStateTracker, n: number) {
    if (n>0) { dom.appendChild( document.createTextNode('.') ); }
    dom.appendChild( initBlock(block, () => [...new Set(block.states.flatMap((s) => Array.from(picrossTracker.rowTrackers[i].possible_cells[s.i])))].map((j)=>cells[i][j]) ) );
  });
  return dom;
}

export function initColSpec(colSpec: LineStates, j: number): HTMLElement {
  const dom = mk('th', ['pic-col-spec','nonclickable']);
  colSpec.blocks.forEach(function(block,n) {
    if (n>0) { dom.appendChild( mk('br') ); }
    dom.appendChild( initBlock(block, () => [...new Set(block.states.flatMap((s) => Array.from(picrossTracker.colTrackers[j].possible_cells[s.i])))].map((i)=>cells[i][j]) ) );
  });
  return dom;
}


export function initCell(i: number, j: number): HTMLElement {
  const dom = mk('td', ['pic-cell','clickable']);
  dom.addEventListener("mouseenter", function (e) {
    const status = picrossTracker.getStatus(i,j);
    if (status.code === 'unsolved') {
      let score: number = Math.round(100 * status.score);
      if (score > 99)      { status.code = "unsolved (>99% black)"; }
      else if (score <  1) { status.code = "unsolved (<1% black)"; }
      else                 { status.code = "unsolved ("+score+"% black)"; }
    }
    const logs = get('logs');
    if (logs) {
        logs.innerHTML = `
          <h4>Status: ${status.code}</h4>
          <h5>Row ${i+1}:</h5>
            <p> <b>Black:</b> ${status.row_colors[1]} <b> / White:</b> ${status.row_colors[0]} </p>
          <h5>Col ${j+1}:</h5>
            <p> <b>Black:</b> ${status.col_colors[1]} <b> / White:</b> ${status.col_colors[0]} </p>`
    };
  });
  dom.addEventListener("click"      , (e) => { e.preventDefault(); picrossTracker.setColor(i,j,1   ); paint(); });
  dom.addEventListener("contextmenu", (e) => { e.preventDefault(); picrossTracker.setColor(i,j,0   ); paint(); });
  dom.addEventListener("auxclick"   , (e) => { e.preventDefault(); picrossTracker.setColor(i,j,null); paint();  });
  return dom;
}


function initTable(): void {
  const picross_dom = get('picross');
  if (picross_dom) {
    table = wipe(picross_dom).appendChild(mk('table', ['pic-table','mx-auto']));
  }
  rowSpecs = picross.spec.rowSpecs.map(initRowSpec);
  colSpecs = picross.spec.colSpecs.map(initColSpec);
  cells = picross.spec.rowSpecs.map((_,i) => picross.spec.colSpecs.map((c,j) => initCell(i,j)));

  // Populating table
  const specRow = table.appendChild( mk('tr',['pic-row']) );
  specRow.appendChild( mk('th',['pic-corner']) );
  colSpecs.forEach((dom) => specRow.appendChild(dom));
  rowSpecs.forEach(function (dom,i) {
    const row = table.appendChild( mk('tr', ['pic-row']) );
    row.appendChild(dom);
    cells[i].forEach(function (dom,j) {
      row.appendChild(dom);
    });
  });
  paint();
}

function paint(): void {
  const auto_cornering = get("auto_cornering");
  if (auto_cornering instanceof HTMLInputElement && auto_cornering.checked) {
    svgdrawer.clear();
    svgdrawer.drawCorneringSolver( picrossTracker.getCorneringSolver() );
  }
  cells.forEach(function(row,i) {
    row.forEach(function(cell,j) {
      const status = picrossTracker.getStatus(i,j);
      if (picrossTracker.pic.getColor(i,j) == 1) {
        cell.style.backgroundColor = 'black';
        cell.innerText = "";
      } else if (picrossTracker.pic.getColor(i,j) == 0) {
        cell.style.backgroundColor = 'white';
        cell.style.color = "black";
        cell.innerText = "-";
      } else if (status.code == 'error') {
        cell.style.backgroundColor = "red";
        cell.innerText = "";
      } else if (status.code == 'black') {
        cell.style.backgroundColor = "rgba(0,0,0,0.9)";
        cell.style.color = "white";
        cell.innerText = "!";
      } else if (status.code == 'white') {
        cell.style.backgroundColor = "rgba(0,0,0,0.1)";
        cell.style.color = "blue";
        cell.innerText = "!";
      } else {
        cell.style.backgroundColor = "rgba(0,0,0,"+ (0.2+0.6*status.score)+")";
        cell.innerText = "";
      }
    });
  });
};





// Example loading
function loadExample(example: string): void {
  const loader = get('picross-loader');
  if (loader) {
    const a = loader.appendChild( mk('li') ).appendChild( mk('a', ['dropdown-item'], example.split(";")[0]));
    if (a instanceof HTMLAnchorElement) {
      a.href="#";
      a.onclick = function() { load(example); };
    }
  }
}

function pasteSpec() {
  navigator.clipboard.readText().then(load);
}


function load(specs: string) {
  picross = new Picross(specs);
  picrossTracker = new PicrossStateTracker(picross);
  initTable();
  svgdrawer.init(picross, cells[0][0].getBoundingClientRect());
  (get('clear')             as HTMLButtonElement).disabled = false;
  (get('solve')             as HTMLButtonElement).disabled = false;
  (get('compute_cornering') as HTMLButtonElement).disabled = false;
  (get('clear_cornering')   as HTMLButtonElement).disabled = false;
  (get('auto_cornering')    as HTMLButtonElement).disabled = false;
}

function resetFromSpec() {
  picrossTracker.resetFromSpec();
  svgdrawer.clear();
  paint();
}

function solve() {
  picrossTracker.trySolveAll();
  paint();
}

function enableAutoCornering() {
  // TODO
}

function disableAutoCornering() {
  // TODO
}


window.onload = function() {
  svgdrawer = new SVGDrawer(document.body);

  (get("paste") as HTMLElement).addEventListener("click", pasteSpec);
  (get("clear") as HTMLElement).addEventListener("click", resetFromSpec);
  (get("solve") as HTMLElement).addEventListener("click", solve);
  (get("compute_cornering") as HTMLElement).addEventListener("click", () => svgdrawer.drawCorneringSolver( picrossTracker.getCorneringSolver() ) );
  (get("clear_cornering") as HTMLElement).addEventListener("click", () => svgdrawer.clear());
  const auto_cornering: HTMLInputElement = get("auto_cornering") as HTMLInputElement;
  auto_cornering.addEventListener("change", () => auto_cornering.checked ? enableAutoCornering() : disableAutoCornering());

  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
    req.response.split(/\r?\n/).filter((t: string)=>t.length).forEach(loadExample);
  });
  req.open("GET", "./static/examples.csv");
  req.send();
}
