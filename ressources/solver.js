


// A self-updating set of possible states according to neighbors
class LineCell {
  constructor(i, cell) {
    this.i = i;
    this.cell = cell;
    this.prev = null;
    this.next = null;
    this.states = new Set();
    this.color_counts = [0,0];
  }
  
  resetFromSpec(spec) {
    this.states = spec.initialStates(this.i);
    this.color_counts = [0,0];
    for (const state of this.states) this.color_counts[state.color]++;
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
}



// A pair of LineCells
class Cell extends Paintable {
  constructor(i, j, spec) {
    super();
    this.i = i;
    this.j = j;
    this.spec = spec;
    // Sets of eligibles states for this cell
    this.row = new LineCell(j, this);
    this.col = new LineCell(i, this);
    this.resetFromSpec();
  }
  
  resetFromSpec() {
    this.color = null; // null means undefined, int means a color, string means an error
    this.row.resetFromSpec( this.spec.rowSpecs[this.i] );
    this.col.resetFromSpec( this.spec.colSpecs[this.j] );
    this.paint();
  }
  
  setColor(c) {
    if (this.color === null) {
      this.row.setColor(c);
      this.col.setColor(c);
      this.color = c;
      this.paint();
    }
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
  
  trySolve() {
    if (this.statusCode() === 'black') this.setColor(1);
    if (this.statusCode() === 'white') this.setColor(0);
  }
  
  score() {
    const empty  = this.row.color_counts[0] * this.col.color_counts[0];
    const filled = this.row.color_counts[1] * this.col.color_counts[1];
    return (1 + (filled-empty) / (filled+empty))/2;
  }
}



class PicrossSolver extends Picross {
  constructor(spec, grid=null) {
    super(spec, grid);
    // The cells are an array of rows which are arrays of cells
    this.cells = spec.rowSpecs.map((_,i) => spec.colSpecs.map((_,j) => new Cell(i, j, spec)));
    // We link the LineCells with their direct neighbors
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (i > 0            ) { this.cells[i][j].col.prev = this.cells[i-1][j  ].col; }
        if (i < this.height-1) { this.cells[i][j].col.next = this.cells[i+1][j  ].col; }
        if (j > 0            ) { this.cells[i][j].row.prev = this.cells[i  ][j-1].row; }
        if (j < this.width -1) { this.cells[i][j].row.next = this.cells[i  ][j+1].row; }
      }
    }
    this.refreshFromGrid();
  }
  
  setColor(i, j, c) {
    this.cells[i][j].setColor(c);
  }
  
  refreshFromGrid() {
    const self = this;
    this.grid.forEach(function (row,i) {
      row.forEach( function (cell, j) {
        if (cell.color > 0) {
          self.setColor(i, j, cell.color);
        }
      });
    });
  }
  
  resetFromSpec() {
    this.cells.forEach((row) => row.forEach((cell) => cell.resetFromSpec()));
    this.refreshFromGrid();
  }
  
  
  
  trySolve() {
    this.cells.forEach((row) => row.forEach((cell) => cell.trySolve()));
    
  }
}


