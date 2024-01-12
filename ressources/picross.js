
class State {
  constructor(i, color=0) {
    this.i = i;
    this.color = color;
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
        states.push( new State(states.length, block.color) );
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
    this.blocks = blocks;
    this.states = states;
    this.nbStates = states.length;
    this.paint();
    return this;
  }
  
  checkSize() {
    if (this.size && this.minSize > this.size) {
      throw new Error(`Specification doesn't fit! (min size of ${minSize} > ${size})`);
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
    this.title = s.length > 2 ? s[0] : null;
    this.rowSpecs = s[ s.length > 2 ? 1 : 0 ].split(',').map((s)=>new LineSpecification(s));
    this.colSpecs = s[ s.length > 2 ? 2 : 1 ].split(',').map((s)=>new LineSpecification(s));
    this.height= this.rowSpecs.length;
    this.width = this.colSpecs.length;
    this.rowSpecs.forEach( (spec)=>spec.setSize(this.width ) );
    this.colSpecs.forEach( (spec)=>spec.setSize(this.height) );
  }
}


class Picross {
  constructor(spec, grid=null) {
    this.spec = spec;
    this.height = spec.height;
    this.width  = spec.width;
    if (grid === null) {
      this.grid = spec.rowSpecs.map(() => spec.colSpecs.map(() => ({ color: 0 })));
    } else {
      this.grid = spec.rowSpecs.map((_,i) => spec.colSpecs.map((_,j) => ({ color: grid[i][j] })));
    }
  }
  
  toJSON() {
    return JSON.stringify({
      specification: {
        rows: this.spec.rowSpecs,
        cols: this.spec.rowSpecs
      },
      grid: this.grid.map((r)=>r.map((c)=>c.color))
    });
  }
  
  fromJSON() {
    const o = JSON.parse(txt);
    //...
  }
  
}


