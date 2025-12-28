import { BlockSpecification } from './PicrossSpecification.js'


export class State {
  i: number;
  block: StateBlockSpecification | undefined;
  color: number;
  preceding: Array<State>;
  following: Array<State>;
  prev: State | null;
  next: State | null;

  constructor(i: number, block: StateBlockSpecification | undefined) {
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


export class StateBlockSpecification extends BlockSpecification {
  states: Array<State>;

  constructor(txt: string) {
    super(txt);
    this.states = [];
  }
}

