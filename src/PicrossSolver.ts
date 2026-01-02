import { State, LineStates, Picross, Cell } from './StatePicross.js';

export class Implication {
  i: number;
  j: number;
  color: number;
  constructor(i: number, j: number, color: number) {
    this.i = i;
    this.j = j;
    this.color = color;
  }
}

export class PicrossStateTracker {
  pic: Picross;
  rowTrackers: LineTracker[];
  colTrackers: LineTracker[];

  constructor(pic: Picross) {
    this.pic = pic;
    this.rowTrackers = pic.spec.rowSpecs.map((r,i) => new LineTracker(r, pic.spec.colSpecs.map((_,j) => pic.grid[i][j])));
    this.colTrackers = pic.spec.colSpecs.map((c,j) => new LineTracker(c, pic.spec.rowSpecs.map((_,i) => pic.grid[i][j])));
  }

  setColor(i: number, j: number, c: number | null) {
    if (c === this.pic.getColor(i,j)) { return; }
    this.pic.setColor(i,j,c);
    if (c === null) {
      this.rowTrackers[i].reset();
      this.colTrackers[j].reset();
    } else {
      this.rowTrackers[i].setColor(j,c);
      this.colTrackers[j].setColor(i,c);
    }
  }

  getStatus(i: number, j: number) {
    return {
      code: this.statusCode(i,j),
      score: this.score(i,j),
      row_colors: this.rowTrackers[i].getColorScores(j),
      col_colors: this.colTrackers[j].getColorScores(i)
    };
  }

  statusCode(i: number, j: number): string {
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

  trySolve(i: number, j: number): void {
    const code = this.statusCode(i,j);
    if (code === 'black') this.setColor(i,j,1);
    if (code === 'white') this.setColor(i,j,0);
  }

  trySolveAll(): void {
    for (let i = 0; i < this.pic.spec.height; i++) {
      for (let j = 0; j < this.pic.spec.width; j++) {
        this.trySolve(i,j);
      }
    }
  }

  resetFromSpec(): void {
    this.pic.resetFromSpec();
    this.rowTrackers.forEach((t)=>t.reset());
    this.colTrackers.forEach((t)=>t.reset());
  }

  score(i: number, j: number): number {
    const row_cs = this.rowTrackers[i].getColorScores(j);
    const col_cs = this.colTrackers[j].getColorScores(i);
    const empty  = row_cs[0] * col_cs[0];
    const filled = row_cs[1] * col_cs[1];
    return (1 + (filled-empty) / (filled+empty))/2;
  }

  directImplications(i: number, j: number, c: number): Implication[] {
    const row_impl = this.rowTrackers[i].directImplications(j,c).map(([cell,color])=> new Implication(i, cell, color));
    const col_impl = this.colTrackers[j].directImplications(i,c).map(([cell,color])=> new Implication(cell, j, color));
    return row_impl.concat(col_impl);
  }

  assignmentsDirectImplications(i: number, j: number): Implication[][] {
    return this.pic.grid[i][j].color === null ? [0,1].map((c) => this.directImplications(i,j,c)) : [];
  }

  allDirectImplications(): Implication[][][][] {
    return this.pic.grid.map((r,i) => r.map((_,j) => this.assignmentsDirectImplications(i,j)));
  }

  getCorneringSolver(): CorneringSolver {
    return new CorneringSolver(this.pic, this.allDirectImplications());
  }
}


export class LineTracker {
  spec: LineStates;
  cells: Cell[];
  possible_states: Set<State>[];
  possible_cells: Set<number>[];

  constructor(spec: LineStates, cells: Cell[]) {
    this.spec = spec;
    this.cells = cells;
    // Initialize the sets of possibilities
    this.possible_states = this.cells.map( () => new Set());
    this.possible_cells  = spec.states.map(() => new Set());
    this.reset();
  }

  get size(): number { return this.cells.length; }

  reset(): void {
    // Empty posibilities
    this.possible_cells.forEach((s) => s.clear());
    this.possible_states.forEach((s) => s.clear());
    // Initialise to default
    this.cells.forEach((_,c) => this.spec.initialStates(c).forEach((s) => this.addState(c,s)));
    // Apply already known cells
    this.cells.forEach((cell,c) => cell.color !== null ? this.setColor(c, cell.color) : undefined);
  }

  addState(c: number, s: State): void {
    this.possible_states[c].add(s);
    this.possible_cells[s.i].add(c);
  }

  removeState(c: number, s: State): void {
    this.possible_states[c].delete(s);
    this.possible_cells[s.i].delete(c);
  }

    // Returns the set of eligible states for the next cell, based on current possible states
  getEligibleNextCell(c: number): Set<State> {
    return new Set([...this.possible_states[c]].flatMap((s)=>s.following));
  }
  getEligiblePrevCell(c: number): Set<State> {
    return new Set([...this.possible_states[c]].flatMap((s)=>s.preceding));
  }

  nextCell(c: number): number | null { return (c < this.size-1 ? c+1 : null); }
  prevCell(c: number): number | null { return (c > 0           ? c-1 : null); }

  // Updates a neighbor cell using this cell's eligibles states
  updateNext(c: number): void {
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

  updatePrev(c: number): void {
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

  setColor(c: number, color: number): void {
    const toRemove = [...this.possible_states[c]].filter((s)=>s.color !== color);
    if (toRemove.length) {
      for (const s of toRemove) { this.removeState(c, s); }
      this.updateNext(c);
      this.updatePrev(c);
    }
  }

  getColorCounts(c: number): number[] {
    const color_counts = [0,0];
    this.possible_states[c].forEach((s)=>color_counts[s.color]++);
    return color_counts;
  }

  getColorScores(c: number): number[] {
    const possible = [0,0];
    this.spec.states.forEach((s) => possible[ s.color ] += this.possible_cells[s.i].size);
    const actual = [0,0];
    this.spec.states.forEach((s) => actual[s.color] += 1);
    actual[0] = this.size - actual[1];
    const ratio = [ actual[0]/possible[0], actual[1]/possible[1] ];
    const color_scores = [0,0];
    this.possible_states[c].forEach((s) => color_scores[s.color] += ratio[s.color]);
    return color_scores;
  }

  // Returns the cells whose color that can be deduced from the given assignment assumption
  directImplications(cell: number, color: number): number[][] {
    const copy = new LineTracker(this.spec, this.cells);
    copy.setColor(cell,color);
    const res = [];
    for (let c = 0; c < this.cells.length; c++) {
      if (c !== cell && this.cells[c].color === null) {
        const color_counts = copy.getColorCounts(c);
        const total = color_counts.reduce((acc,v)=>acc+v,0);
        if (total == 0) {
          return [];
        } else if (color_counts[0]===total) {
          res.push([c,0]);
        } else if (color_counts[1]===total) {
          res.push([c,1]);
        }
      }
    }
    return res;
  }
}


export class CorneringSolver {
  pic: Picross;
  nb_colors: number = 2;
  keys: number[];
  implications: number[][];

  constructor(pic: Picross, implications: Implication[][][][]) {
    this.pic = pic;
    this.keys = [];
    this.implications = new Array(this.height*this.width*this.nb_colors);
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (this.pic.grid[i][j].color === null) {
          for (let c = 0; c < this.nb_colors; c++) {
            const key = this.key(i,j,c);
            if (implications[i][j][c] !== null) {
              this.keys.push(key);
              this.implications[key] = implications[i][j][c].map((imp) => this.key(imp.i, imp.j, imp.color));
            }
          }
        }
      }
    }
  }

  get height(): number { return this.pic.spec.height; }
  get width(): number { return this.pic.spec.width; }

  key(i: number, j: number, c: number): number {
    return (i * this.width + j) * this.nb_colors + c;
  }
  pos(k: number) { return ~~(k / this.nb_colors); }
  i(k: number) { return ~~(k / (this.width * this.nb_colors)); }
  j(k: number) { return this.pos(k) % this.width; }
  c(k: number) { return k % this.nb_colors; }
  triplet(k: number): number[] { return [this.i(k), this.j(k), this.c(k)]; }

  twoStepsImpossible(): number[][][] {
    const steps1 = this.implications.map((impl,k) => [k, ...new Set(impl)]);
    const steps2 = steps1.map((impl)  => [...new Set(impl.flatMap((k)=>steps1[k]))]);
    const res: number[][][] = [];
    for (const k of this.keys) {
      const impl = steps2[k].sort();
      for (let i = 0; i < impl.length-1; i++) {
        if (this.pos( impl[i] ) === this.pos( impl[i+1] ) ) {
          res.push([ this.triplet(k), this.triplet(impl[i]) ] );
        }
      }
    }
    return res;
  }

}
