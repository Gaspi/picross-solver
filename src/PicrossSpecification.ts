


export class BlockSpecification {
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

