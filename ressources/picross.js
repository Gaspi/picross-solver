
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


const specificationSplitter = /[^0-9]+/;

class LineSpecification extends Paintable {
  constructor(txt, size) {
    super();
    this.size = size;
    this.set(txt);
  }
  
  setSize(size) {
    this.size = size;
    this.setValues(this.values);
    return this;
  }
  
  setValues(values) {
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
    this.paint();
    return this;
  }
  
  set(txt) {
    return this.setValues( txt.split(specificationSplitter).filter((x)=>x.length).map((x)=>parseInt(x)) );
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
  
  toString() {
    return this.values.join('.');
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

