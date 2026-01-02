import { BlockSpecification, LineSpecification, PicrossSpecification } from './PicrossSpecification.js'


export class State {
  i: number;
  color: number;
  preceding: State[] = [];
  following: State[] = [];
  prev: State | null = null;
  next: State | null = null;

  constructor(i: number, color: number) {
    this.i = i;
    this.color = color;
  }
  toString() { return (this.color>0 ? '#' : '.') + this.i; }

  setNext(state: State | null = null) {
    this.next = state;
    if (state) { this.following.push(state); }
    return this;
  }

  setPrev(state: State | null = null) {
    this.prev = state;
    if (state) { this.preceding.push(state); }
    return this;
  }
}

export class FillerState extends State {
  constructor(i: number) {
    super(i, 0);
    this.preceding.push(this); // The filler state may be
    this.following.push(this); // One of these states must be preceding this one
  }
}

export class BlockState extends State {
  block: BlockSpecification;
  constructor(i: number, block: BlockSpecification) {
    super(i, block.color);
    this.block = block;
  }
}

export class BlockStateTracker {
  states: State[];
  block: BlockSpecification;

  constructor(block: BlockSpecification) {
    this.block = block;
    this.states = [];
  }

  get color(): number {
    return this.block.color;
  }
  get size(): number {
    return this.block.size;
  }
}


export class LineStates {
  line: LineSpecification;
  states: State[] = [];
  blocks: BlockStateTracker[];
  minSize: number;

  constructor(line: LineSpecification) {
    this.line = line;
    this.blocks = line.blocks.map((b)=> new BlockStateTracker(b));

    // Setting states color
    let prev_color = null;
    for (const block of this.blocks) {
      if (prev_color === null || block.color === prev_color) {
        this.states.push(new FillerState(this.states.length));
      }
      prev_color = block.color;
      for (let i = 0; i < block.size; i++) {
        this.states.push(new BlockState(this.states.length, block));
      }
    }
    this.states.push( new FillerState(this.states.length) );

    this.minSize = this.line.blocks.length ? this.states.length-2 : 0;
    this.checkSize();

    // Setting next and previous states
    for (let i = 1; i < this.states.length; i++) {
      this.states[i  ].setPrev( this.states[i-1] );
      this.states[i-1].setNext( this.states[i  ] );
    }
    this.checkSize();
  }

  get nbStates(): number { return this.states.length; }
  get size(): number { return this.line.size; }

  checkSize(): void {
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
  initialStates(i: number) {
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



// A pair of LineStates
export class PicrossStates {
  spec: PicrossSpecification;
  rowStates: LineStates[];
  colStates: LineStates[];
  constructor(spec: PicrossSpecification) {
    this.spec = spec;
    this.rowStates = spec.rowSpecs.map((s)=>new LineStates(s));
    this.colStates = spec.colSpecs.map((s)=>new LineStates(s));
  }

  toString() { return this.spec.toString(); }
  
  get title() { return this.spec.title; }
  get height() { return this.spec.height; }
  get width() { return this.spec.width; }
  get rowSpecs() { return this.rowStates; }
  get colSpecs() { return this.colStates; }
}


export class Cell {
  color: number | null = null;
}

// A PicrossSpecification with a grid of colors
export class Picross {
  spec: PicrossStates;
  grid: Cell[][];

  constructor(spec: PicrossStates | PicrossSpecification | string) {
    if (spec instanceof PicrossStates) {
      this.spec = spec;
    } else if (spec instanceof PicrossSpecification) {
      this.spec = new PicrossStates(spec);
    } else {
      this.spec = new PicrossStates(new PicrossSpecification(spec));
    }
    this.grid = this.spec.rowSpecs.map(() => this.spec.colSpecs.map(() => (new Cell())));
  }
  setColor(i: number, j: number, c: number | null): void {
    this.grid[i][j].color = c;
  }
  getColor(i: number, j: number): number | null {
    return this.grid[i][j].color;
  }
  resetFromSpec(): void {
    this.grid.forEach((row) => row.forEach((cell) => cell.color = null));
  }
}
