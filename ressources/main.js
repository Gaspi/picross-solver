
class State {
  constructor(i, color=0) {
    this.i = i;
    this.color = color;
    this.preceding = (this.color === 0 ? [this] : []); // One of these states must be preceding this one
    this.following = (this.color === 0 ? [this] : []); // One of these states must be following this one
    this.next = null;
    this.prev = null;
  }
  
  toString() { return (this.color ? '#' : '.') + this.i; }
  
  setNext(state=null) {
    this.next = state;
    this.following.push(state);
  }
  setPrev(state=null) {
    this.prev = state;
    this.preceding.push(state);
  }
}


const specificationSplitter = /[^0-9]+/;
class LineSpecification {
  constructor(txt, size, isRow=true) {
    this.isRow = isRow;
    this.size = size;
    this.set(txt);
  }
  
  set(txt) {
    const values = txt.split(specificationSplitter).filter((x)=>x.length).map((x)=>parseInt(x));
    if (values.some((x)=>x<=0)) {
      throw new Error('Only strictly positive integers permitted on specifications!');
    }
    
    // Each black squares + separating whites (or even 0 if spec is empty)
    const minSize = values.length ? values.reduce((x,y)=>x+y,0) + values.length - 1 : 0;
    if (this.size && minSize > this.size) {
      throw new Error(`Specification doesn't fit! (min size of ${minSize} > ${size})`);
    }
    
    this.values = values;
    this.minSize = minSize;
    // One state for each black squares + separating whites + first and last (facultative) whites
    this.nbStates = this.minSize === 0 ? 1 : this.minSize+2;
    // Default states with color 0
    this.states = new Array(this.nbStates);
    // Setting states color
    let c = 0;
    this.states[c] = new State(c++,0); // Start with a white state
    for (const v of this.values) {
      for (let i = 0; i < v; i++) {
        this.states[c] = new State(c++, 1); // Fill each segment with that many black state
      }
      this.states[c] = new State(c++, 0); // Add an extra white state separator
    }
    // Setting next and previous states
    for (let i = 1; i < this.states.length; i++) {
      this.states[i  ].setPrev( this.states[i-1] );
      this.states[i-1].setNext( this.states[i  ] );
    }
    return this;
  }
  
  setSize(size) {
    this.size = size;
    this.set(this.toString());
  }
  
  toString() {
    return this.values.join(this.isRow ? '.' : '<br>');
  }
  
  /*
  3 values: [1,1,2]
  8 states: [0, 1, 0, 1, 0, 1, 1, 0]
  size = 10
  i
  0-  0,1
  1-  0,1,2
  2-  0,1,2,3
  3-  0,1,2,3,4
  4-    1,2,3,4,5
  5-      2,3,4,5,6
  6-        3,4,5,6,7
  7-          4,5,6,7
  8-            5,6,7
  9-              6,7
  */
  // All states initially possible at position {i} in the line of size
  initialStates(i) {
    // (size-i-1) cells remain after cell i
    // min + (size-i-1) >= minSize = nbState-2
    const min = Math.max(0, this.nbStates - this.size + i - 1);
    // max <= i + 1
    const max = Math.min(this.nbStates-1, i + 1);
    if (max < min) {
      throw new Error(`Specification ${this} too long for line of size ${this.size} : [${i}; ${min}, ${max}]`);
    }
    return new Set(this.states.slice(min, max+1));
  }
}

// A pair of LineSpecifications
class PicrossSpecification {
  constructor(rowSpecs, colSpecs) {
    this.rowSpecs = rowSpecs;
    this.colSpecs = colSpecs;
  }
  height() { return this.rowSpecs.length; }
  width()  { return this.colSpecs.length; }
}


// A self-updating set of possible states according to neighbors
class LineCell {
  constructor(spec, i, cell) {
    this.i = i;
    this.cell = cell;
    this.states = spec.initialStates(i);
    this.color_counts = [0,0];
    for (const state of this.states) this.color_counts[state.color]++;
    this.prev = null;
    this.next = null;
  }
  
  // Returns the set of eligible states for the next cell, based on current eligible states
  getEligibleNext() {
    return new Set([...this.states].flatMap((s)=>s.following));
  }
  getEligiblePrev() {
    return new Set([...this.states].flatMap((s)=>s.preceding));
  }
  
  // Updates a neighbor cell using this cell's eligibles states
  updateNext() {
    if (this.next === null) { return; }
    // States allowed to remain
    const eligible_states = this.getEligibleNext();
    // States that must be removed
    const toRemove = [...this.next.states].filter( (s) => !eligible_states.has(s) );
    if (toRemove.length) {
      toRemove.forEach( (s) => this.next.removeState(s) );
      this.next.updateNext();
    }
  }
  
  updatePrev() {
    if (this.prev === null) { return; }
    // States allowed to remain
    const eligible_states = this.getEligiblePrev();
    // States that must be removed
    const toRemove = [...this.prev.states].filter( (s) => !eligible_states.has(s) );
    if (toRemove.length) {
      toRemove.forEach( (s) => this.prev.removeState(s) );
      this.prev.updatePrev();
    }
  }
  
  removeState(s) {
    if (this.states.has(s)) {
      this.color_counts[s.color]--;
      this.states.delete(s);
      this.cell.paint();
    }
  }
  
  setColor(c) {
    const toRemove = [...this.states].filter((s)=>s.color !== c);
    if (toRemove.length) {
      for (const s of toRemove) { this.removeState(s); }
      this.updateNext();
      this.updatePrev();
    }
  }
  
  
  status() {
    return `
      <h5>Cell ${this.i}:</h5>
      <p>
        <b>Colors:</b>
        ${this.color_counts}
      </p>
      <p>
        <b>States:</b>
        ${[...this.states]}
      </p>`;
  }
}


// A pair of LineCells
class Cell {
  constructor(i, j, picross) {
    const self = this;
    this.i = i;
    this.j = j;
    this.picross = picross;
    
    // Sets of eligibles states for this cell
    this.row = new LineCell(this.picross.spec.rowSpecs[i], j, this);
    this.col = new LineCell(this.picross.spec.colSpecs[j], i, this);
    
    this.color = null; // null means undefined, int means a color, string means an error
    
    this.dom = null;
  }
  
  setColor(c) {
    if (this.color === null) {
      this.row.setColor(c);
      this.col.setColor(c);
      this.color = c;
      this.paint();
    }
  }
  
  setDOM(dom) {
    this.dom = dom;
    
    const self = this;
    dom.tabIndex = -1; // Necessary for keydown event to be recorded
    dom.addEventListener("focus", function (e) {
      get('logs').innerHTML = self.status();
      self.paint();
    });
    dom.addEventListener("click", function (e) {
      if (self.statusCode() === 'black') self.setColor(1);
      if (self.statusCode() === 'white') self.setColor(0);
    });
    dom.addEventListener("keydown", function (e) {
      if (e.key === 'b') self.setColor(1);
      if (e.key === 'w') self.setColor(0);
    });
    
    this.paint();
  }
  
  paint() {
    if (this.dom) {
      if (this.color == 1) {
        this.dom.style.backgroundColor = 'black';
        this.dom.innerText = "";
      } else if (this.color == 0) {
        this.dom.style.backgroundColor = 'white';
        this.dom.innerText = "-";
      } else if (this.statusCode() == 'error') {
        this.dom.style.backgroundColor = "red";
        this.dom.innerText = "";
      } else if (this.statusCode() == 'black') {
        this.dom.style.backgroundColor = "rgba(0,0,0,0.9)";
        this.dom.style.color = "white";
        this.dom.innerText = "!";
      } else if (this.statusCode() == 'white') {
        this.dom.style.backgroundColor = "rgba(0,0,0,0.1)";
        this.dom.style.color = "blue";
        this.dom.innerText = "!";
      } else {
        this.dom.style.backgroundColor = "rgba(0,0,0,"+this.score()+")";
        this.dom.innerText = "";
      }
    }
  }
  
  status() {
    return `
      <h3>${this.statusCode()}</h3>
      <h4>Row:</h4> ${this.row.status()}
      <h4>Col:</h4> ${this.col.status()}`;
  }
  
  statusCode() {
    if (this.color !== null) {
      return 'solved';
    } else {
      const empty  = this.row.color_counts[0] * this.col.color_counts[0];
      const filled = this.row.color_counts[1] * this.col.color_counts[1];
      if (empty === 0 && filled === 0) {
        return 'error';
      } else if (empty === 0) {
        return 'black'
      } else if (filled === 0) {
        return 'white'
      } else {
        return 'unsolved';
      }
    }
  }
  
  score() {
    const empty  = this.row.color_counts[0] * this.col.color_counts[0];
    const filled = this.row.color_counts[1] * this.col.color_counts[1];
    return 0.2 + 0.3 * (1+ (filled-empty) / (filled+empty));
  }
}



var picrossTable, rowDivs, colDivs;

function showPicrossSpec(spec) {
  rowDivs = new Array(spec.height());
  colDivs = new Array(spec.width());
  picrossTable = spec.rowSpecs.map(() => new Array(spec.colSpecs.length));
  
  const pic = get('picross');
  wipe(pic);
  const specRow = pic.appendChild( mk('tr',['pic-row']) );
  specRow.appendChild( mk('th',['pic-corner']) );
  for (let j = 0; j < spec.colSpecs.length; j++) {
    const s = specRow.appendChild( mk('th', ['pic-col-spec']) );
    s.innerHTML = spec.colSpecs[j].toString();
    s.onclick = function() {
      if (mode === 'edit') {
        s.innerHTML = spec.colSpecs[j].set( prompt(`Specify column ${j+1}`, spec.colSpecs[j]), spec.height()).toString();
      }
    }
    colDivs[j] = s;
  }
  for (let i = 0; i < spec.rowSpecs.length; i++) {
    const row = pic.appendChild( mk('tr', ['pic-row']) );
    const s = row.appendChild( mk('th', ['pic-row-spec']) );
    s.innerHTML = spec.rowSpecs[i].toString();
    s.onclick = function() {
      if (mode === 'edit') {
        s.innerHTML = spec.rowSpecs[i].set( prompt(`Specify row ${i+1}`, spec.rowSpecs[i]), spec.width()).toString();
      }
    }
    rowDivs[i] = s;
    for (let j = 0; j < spec.colSpecs.length; j++) {
      picrossTable[i][j] = row.appendChild( mk('td', ['pic-cell']) );
    }
  }
}


class Picross {
  constructor(spec) {
    this.height = spec.height();
    this.width  = spec.width();
    this.spec = spec;
    // The cells are an array of rows which are arrays of cells
    this.cells = spec.rowSpecs.map((_,i) => spec.colSpecs.map((_,j) => new Cell(i, j, this)));
    // We link the LineCells with their direct neighbors
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (i > 0            ) { this.cells[i][j].col.prev = this.cells[i-1][j  ].col; }
        if (i < this.height-1) { this.cells[i][j].col.next = this.cells[i+1][j  ].col; }
        if (j > 0            ) { this.cells[i][j].row.prev = this.cells[i  ][j-1].row; }
        if (j < this.width -1) { this.cells[i][j].row.next = this.cells[i  ][j+1].row; }
      }
    }
  }
  
  setColor(i, j, c) {
    this.cells[i][j].setColor(c);
  }
  
  setDom(picrossTable) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        this.cells[i][j].setDOM( picrossTable[i][j] );
      }
    }
  }
}


// Loading examples
[
  {
    title: "Simple example",
    rows: ['2.1','1.1','1','1.1'],
    cols: ['2.1','1','2','1.1']
  }
].forEach(function(ex) {
  const a = get('picross-loader').appendChild( mk('li') ).appendChild( mk('a', ['dropdown-item']));
  a.href="#";
  a.onclick = function() { load(ex); };
  a.innerText = ex.title;
})


function custom() {
  const height = parseInt(get('dim-x').innerText);
  const width  = parseInt(get('dim-y').innerText);
  // TODO: warn in case incorrect values are provided
  return {
    rows: new Array(height).fill(''),
    cols: new Array(width).fill('')
  };
}

var picSpec;
var picross;


function pasteSpec() {
  navigator.clipboard.readText().then(function (txt) { load(JSON.parse(txt)); } );
}



function load(specs) {
  const rowSpecs = specs.rows.map(function (x) { return new LineSpecification(x, specs.cols.length, isRow=true ); });
  const colSpecs = specs.cols.map(function (x) { return new LineSpecification(x, specs.rows.length, isRow=false); });
  picSpec = new PicrossSpecification(rowSpecs, colSpecs);
  edit();
}

var mode = 'edit';
var checked = false;

function edit() {
  showPicrossSpec(picSpec);
  // Switch buttons
  get('check').disabled = checked = (mode === 'solve'); // If we come from the "solve" mode, remain "checked"
  get('edit').disabled = true;
  get('solve').disabled = !checked;
  mode = 'edit';
}

function check() {

  // TODO check indeed
  
  // Switch buttons
  checked = get('check').disabled = true;
  if (mode === 'edit') get('solve').disabled = false;
}

function uncheck() {
  // Switch buttons
  checked = get('check').disabled = false;
  get('solve').disabled = !checked;
}

function solve() {
  picross = new Picross(picSpec);
  picross.setDom(picrossTable);
  mode = 'solve';
  checked = false;
  get('edit').disabled = false;
  get('check').disabled = false;
  get('solve').disabled = !checked;
}


