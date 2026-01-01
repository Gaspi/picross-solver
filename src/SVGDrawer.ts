import { Picross } from './StatePicross.js'
import { CorneringSolver } from './PicrossSolver.js'

export class SVGDrawer {
  svg: SVGElement;
  g: SVGElement;
  svg_content: Array<any>;
  cell_height: number = 0;
  cell_width: number = 0;

  constructor(container: HTMLElement = document.body) {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    if (container) { container.appendChild(this.svg); }
    this.g = this.svg.appendChild( document.createElementNS("http://www.w3.org/2000/svg", "g") );
    // Elements from g that should be removed on clear (arrows)
    this.svg_content = [];

    const defs = this.g.appendChild( document.createElementNS("http://www.w3.org/2000/svg", "defs") );
    const marker = defs.appendChild( document.createElementNS("http://www.w3.org/2000/svg", "marker") );
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refx', '5');
    marker.setAttribute('refy', '5');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = marker.appendChild( document.createElementNS("http://www.w3.org/2000/svg", "path") );
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('style', "fill:red;");
  }

  clear() {
    this.svg_content.forEach((e) => this.g.removeChild(e));
    this.svg_content.length = 0
  }

  init(picross: Picross, cell_rect: DOMRect) {
    this.clear();
    this.cell_height = cell_rect.height;
    this.cell_width  = cell_rect.width;
    this.svg.setAttribute('height', (this.cell_height * picross.spec.height)+"px");
    this.svg.setAttribute('width' , (this.cell_width  * picross.spec.width )+"px");
    this.svg.style = `position:absolute; top: ${cell_rect.top}px; left: ${cell_rect.left}px; pointer-events: none;`;
  }

  draw(type: string) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", type);
    this.svg_content.push(e);
    return this.g.appendChild(e);
  }

  drawArrow(i: number, j: number, ti: number, tj: number, c: number) {
    const path = this.draw("path");
    path.setAttribute('d', `M${(j+0.5)*this.cell_width},${(i+0.5)*this.cell_height} L${(tj+0.5)*this.cell_width},${(ti+0.5)*this.cell_height}`);
    path.setAttribute('style', `stroke: ${c === 1 ? 'red' : 'green'}; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);`);
    return path;
  }

  drawCorneringSolver(corneringSolver: CorneringSolver) {
    this.clear();
    return corneringSolver.twoStepsImpossible().forEach(
      ([ [i,j,c], [ti,tj,_]]) => this.drawArrow(i,j,ti,tj,c)
    );
  }
}
