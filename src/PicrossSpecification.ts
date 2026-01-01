
export class BlockSpecification {
  // a single block of n cells of colors c
  size: number;
  color: number;

  constructor(txt: string) {
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


export class LineSpecification {
  // Size of the line
  size: number;
  // The blocks of colors
  blocks: Array<BlockSpecification>;

  constructor(txt: string, size: number) {
    this.size = size;
    this.blocks = txt.split(/\./).filter((x)=>x.length).map((x)=>new BlockSpecification(x));
  }

  toString() {
    return this.blocks.join('.');
  }
}


// A pair of LineSpecification (rows and columns)
export class PicrossSpecification {
  title: string | null;
  rowSpecs: Array<LineSpecification>;
  colSpecs: Array<LineSpecification>;

  constructor(txt: string) {
    const s = txt.split(";");
    this.title = (s.length > 2 && s[0].length) ? s[0] : null;
    const rowSpecTxt = s[ s.length > 2 ? 1 : 0 ].split(',');
    const colSpecTxt = s[ s.length > 2 ? 2 : 1 ].split(',');
    this.rowSpecs = rowSpecTxt.map((s)=>new LineSpecification(s, colSpecTxt.length));
    this.colSpecs = colSpecTxt.map((s)=>new LineSpecification(s, rowSpecTxt.length));
  }
  get height() { return this.rowSpecs.length; }
  get width() { return this.colSpecs.length; }

  toString() {
    return `${this.title||''};${this.rowSpecs.join(',')};${this.colSpecs.join(',')}`;
  }
}

