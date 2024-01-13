
class State {
  constructor(i, block) {
    this.i = i; // Index of the state in the line
    if (block) {
      this.block = block;
      block.states.push(this);
    }
    this.color = block ? block.color : 0;
    
    this.preceding = (this.color > 0 ? [] : [this]); // One of these states must be preceding this one
    this.following = (this.color > 0 ? [] : [this]); // One of these states must be following this one
    this.next = null;
    this.prev = null;
  }
  
  toString() {
    return (this.color ? '#' : '.') + this.i;
  }
  
  setNext(state=null) {
    this.next = state;
    this.following.push(state);
    return this;
  }
  
  setPrev(state=null) {
    this.prev = state;
    this.preceding.push(state);
    return this;
  }
}

class BlockSpecification {
  constructor(txt) {
    const s = txt.split(/\|/);
    this.size = parseInt(s[0]);
    this.color = s.length > 1 ? parseInt(s[1]) : 1;
    if (!(this.size>0 && this.color>0)) {
      throw new Error(`Could not parse [${txt}] into a specification block`);
    }
    this.states = [];
  }
  toString() {
    return this.size + (this.color === 1 ? '' : '|'+this.color);
  }
}


class LineSpecification extends Paintable {
  constructor(txt, size=null) {
    super();
    this.size = size;
    this.setBlocks( txt.split(/\./).filter((x)=>x.length).map((x)=>new BlockSpecification(x)) );
  }
  
  toString() {
    return this.blocks.join('.');
  }
  
  setSize(size) {
    this.size = size;
    this.checkSize();
    return this;
  }
  
  setBlocks(blocks) {
    const states = new Array();
    // Setting states color
    let prev_color = null;
    for (const block of blocks) {
      if (prev_color === null || block.color === prev_color) {
        states.push( new State(states.length) );
      }
      prev_color = block.color;
      for (let i = 0; i < block.size; i++) {
        states.push( new State(states.length, block) );
      }
    }
    states.push( new State(states.length) );
    
    this.minSize = blocks.length ? states.length-2 : 0;
    this.checkSize();
    
    // Setting next and previous states
    for (let i = 1; i < states.length; i++) {
      states[i  ].setPrev( states[i-1] );
      states[i-1].setNext( states[i  ] );
    }
    // Setting index
    states.forEach((s,i)=>s.i=i);
    this.blocks = blocks;
    this.states = states;
    this.nbStates = states.length;
    this.paint();
    return this;
  }
  
  checkSize() {
    if (this.size && this.minSize > this.size) {
      throw new Error(`Specification doesn't fit! (min size of ${this.minSize} > ${this.size})`);
    }
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
  // Returns the set of all states initially possible at position {i} in the line of size
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
  constructor(txt) {
    const s = txt.split(";");
    this.title = (s.length > 2 && s[0].length) ? s[0] : null;
    this.rowSpecs = s[ s.length > 2 ? 1 : 0 ].split(',').map((s)=>new LineSpecification(s));
    this.colSpecs = s[ s.length > 2 ? 2 : 1 ].split(',').map((s)=>new LineSpecification(s));
    this.height= this.rowSpecs.length;
    this.width = this.colSpecs.length;
    this.rowSpecs.forEach( (spec)=>spec.setSize(this.width ) );
    this.colSpecs.forEach( (spec)=>spec.setSize(this.height) );
  }
  
  toString() {
    return `${this.title||''};${this.rowSpecs.join(',')};${this.colSpecs.join(',')}`;
  }
}

// A PicrossSpecification with a grid of colors
class Picross {
  constructor(spec) {
    this.spec = spec instanceof PicrossSpecification ? spec : new PicrossSpecification(spec);
    this.grid = this.spec.rowSpecs.map(() => this.spec.colSpecs.map(() => ({color: null})));
  }
  setColor(i, j, c) {
    this.grid[i][j].color = c;
  }
  getColor(i,j) {
    return this.grid[i][j].color;
  }
  resetFromSpec() {
    this.grid.forEach((row) => row.forEach((cell) => cell.color = null));
  }
}



class PicrossStateTracker {
  constructor(pic) {
    this.pic = pic;
    this.rowTrackers = pic.spec.rowSpecs.map((r,i) => new LineTracker(r, pic.spec.colSpecs.map((_,j) => pic.grid[i][j])));
    this.colTrackers = pic.spec.colSpecs.map((c,j) => new LineTracker(c, pic.spec.rowSpecs.map((_,i) => pic.grid[i][j])));
    this.paint = function() {};
  }
  
  setColor(i,j,c) {
    if (c === this.pic.getColor(i,j)) { return; }
    this.pic.setColor(i,j,c);
    if (c === null) {
      this.rowTrackers[i].reset();
      this.colTrackers[j].reset();
    } else {
      this.rowTrackers[i].setColor(j,c);
      this.colTrackers[j].setColor(i,c);
    }
    this.paint();
  }
  
  getStatus(i, j) {
    return {
      code: this.statusCode(i,j),
      score: this.score(i,j),
      row_colors: this.rowTrackers[i].getColorScores(j),
      col_colors: this.colTrackers[j].getColorScores(i)
    };
  }
  
  statusCode(i, j) {
    if (this.pic.getColor(i,j) !== null) {
      return 'solved';
    } else {
      const row_cc = this.rowTrackers[i].getColorCounts(j);
      const col_cc = this.colTrackers[j].getColorCounts(i);
      const empty  = row_cc[0] * col_cc[0];
      const filled = row_cc[1] * col_cc[1];
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
  
  trySolve(i,j) {
    const code = this.statusCode(i,j);
    if (code === 'black') this.setColor(i,j,1);
    if (code === 'white') this.setColor(i,j,0);
  }
  
  trySolveAll() {
    for (let i = 0; i < this.pic.spec.height; i++) {
      for (let j = 0; j < this.pic.spec.width; j++) {
        this.trySolve(i,j);
      }
    }
  }
  
  resetFromSpec() {
    this.pic.resetFromSpec();
    this.rowTrackers.forEach((t)=>t.reset());
    this.colTrackers.forEach((t)=>t.reset());
    this.paint();
  }
  
  score(i,j) {
    const row_cs = this.rowTrackers[i].getColorScores(j);
    const col_cs = this.colTrackers[j].getColorScores(i);
    const empty  = row_cs[0] * col_cs[0];
    const filled = row_cs[1] * col_cs[1];
    return (1 + (filled-empty) / (filled+empty))/2;
  }
}


class LineTracker {
  constructor(spec, cells) {
    this.spec = spec;
    this.cells = cells;
    this.size = cells.length;
    // Initialize the sets of possibilities
    this.possible_states = this.cells.map( () => new Set());
    this.possible_cells  = spec.states.map(() => new Set());
    this.reset();
  }
  
  reset() {
    // Empty posibilities
    this.possible_cells.forEach((s) => s.clear());
    this.possible_states.forEach((s) => s.clear());
    // Initialise to default
    this.cells.forEach((_,c) => this.spec.initialStates(c).forEach((s) => this.addState(c,s)));
    // Apply already known cells
    this.cells.forEach((cell,c) => cell.color !== null ? this.setColor(c, cell.color) : undefined);
  }
  
  addState(c,s) {
    this.possible_states[c].add(s);
    this.possible_cells[s.i].add(c);
  }
  
  removeState(c,s) {
    this.possible_states[c].delete(s);
    this.possible_cells[s.i].delete(c);
  }
  
    // Returns the set of eligible states for the next cell, based on current possible states
  getEligibleNextCell(c) {
    return new Set([...this.possible_states[c]].flatMap((s)=>s.following));
  }
  getEligiblePrevCell(c) {
    return new Set([...this.possible_states[c]].flatMap((s)=>s.preceding));
  }
  
  nextCell(c) { return (c < this.size-1 ? c+1 : null); }
  prevCell(c) { return (c > 0           ? c-1 : null); }
  
  // Updates a neighbor cell using this cell's eligibles states
  updateNext(c) {
    const next = this.nextCell(c);
    if (next === null) { return; }
    // States allowed to remain
    const eligible_states = this.getEligibleNextCell(c);
    // States that must be removed
    const toRemove = [...this.possible_states[next]].filter( (s) => !eligible_states.has(s) );
    if (toRemove.length) {
      toRemove.forEach((s) => this.removeState(next, s));
      this.updateNext(next);
    }
  }
  updatePrev(c) {
    const prev = this.prevCell(c);
    if (prev === null) { return; }
    // States allowed to remain
    const eligible_states = this.getEligiblePrevCell(c);
    // States that must be removed
    const toRemove = [...this.possible_states[prev]].filter( (s) => !eligible_states.has(s) );
    if (toRemove.length) {
      toRemove.forEach((s) => this.removeState(prev, s));
      this.updatePrev(prev);
    }
  }
  
  setColor(c, color) {
    const toRemove = [...this.possible_states[c]].filter((s)=>s.color !== color);
    if (toRemove.length) {
      for (const s of toRemove) { this.removeState(c, s); }
      this.updateNext(c);
      this.updatePrev(c);
    }
  }
  
  getColorCounts(c) {
    const color_counts = [0,0];
    this.possible_states[c].forEach((s)=>color_counts[s.color]++);
    return color_counts;
  }
  getColorScores(c) {
    const color_scores = [0,0];
    this.possible_states[c].forEach((s) => color_scores[s.color] += 1.0 / this.possible_cells[s.i].size);
    return color_scores;
  }
}
