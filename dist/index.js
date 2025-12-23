import { get, mk, wipe } from './utils.js';
import { Picross, PicrossStateTracker } from './picross.js';
var picross, picrossTracker;
var table, rowSpecs, colSpecs, cells;
function initBlock(block, cellSelector) {
    const dom = mk('span', ['spec', 'col-' + block.color]);
    dom.innerText = block.size;
    dom.addEventListener("mouseenter", () => cellSelector().forEach((c) => c.classList.add('highlight')));
    dom.addEventListener("mouseleave", () => cellSelector().forEach((c) => c.classList.remove('highlight')));
    return dom;
}
function initRowSpec(rowSpec, i) {
    const dom = mk('th', ['pic-row-spec', 'nonclickable']);
    rowSpec.blocks.forEach(function (block, n) {
        if (n > 0) {
            dom.appendChild(document.createTextNode('.'));
        }
        dom.appendChild(initBlock(block, () => [...new Set(block.states.flatMap((s) => Array.from(picrossTracker.rowTrackers[i].possible_cells[s.i])))].map((j) => cells[i][j])));
    });
    return dom;
}
function initColSpec(colSpec, j) {
    const dom = mk('th', ['pic-col-spec', 'nonclickable']);
    colSpec.blocks.forEach(function (block, n) {
        if (n > 0) {
            dom.appendChild(mk('br'));
        }
        dom.appendChild(initBlock(block, () => [...new Set(block.states.flatMap((s) => Array.from(picrossTracker.colTrackers[j].possible_cells[s.i])))].map((i) => cells[i][j])));
    });
    return dom;
}
function initCell(i, j) {
    const dom = mk('td', ['pic-cell', 'clickable']);
    dom.addEventListener("mouseenter", function (e) {
        const status = picrossTracker.getStatus(i, j);
        if (status.code === 'unsolved') {
            let score = Math.round(100 * status.score);
            if (score > 99) {
                score = ">99";
            }
            if (score < 1) {
                score = "<1";
            }
            status.code = "unsolved (" + score + "% black)";
        }
        get('logs').innerHTML = `<h4>Status: ${status.code}</h3>
      <h5>Row ${i + 1}:</h4>
        <p> <b>Black:</b> ${status.row_colors[1]} <b> / White:</b> ${status.row_colors[0]} </p>
      <h5>Col ${j + 1}:</h4>
        <p> <b>Black:</b> ${status.col_colors[1]} <b> / White:</b> ${status.col_colors[0]} </p>`;
    });
    dom.addEventListener("click", (e) => { e.preventDefault(); picrossTracker.setColor(i, j, 1); paint(); });
    dom.addEventListener("contextmenu", (e) => { e.preventDefault(); picrossTracker.setColor(i, j, 0); paint(); });
    dom.addEventListener("auxclick", (e) => { e.preventDefault(); picrossTracker.setColor(i, j, null); paint(); });
    return dom;
}
function initTable() {
    table = wipe(get('picross')).appendChild(mk('table', ['pic-table', 'mx-auto']));
    rowSpecs = picross.spec.rowSpecs.map(initRowSpec);
    colSpecs = picross.spec.colSpecs.map(initColSpec);
    cells = picross.spec.rowSpecs.map((_, i) => picross.spec.colSpecs.map((c, j) => initCell(i, j)));
    // Populating table
    const specRow = table.appendChild(mk('tr', ['pic-row']));
    specRow.appendChild(mk('th', ['pic-corner']));
    colSpecs.forEach((dom) => specRow.appendChild(dom));
    rowSpecs.forEach(function (dom, i) {
        const row = table.appendChild(mk('tr', ['pic-row']));
        row.appendChild(dom);
        cells[i].forEach(function (dom, j) {
            row.appendChild(dom);
        });
    });
    paint();
}
function paint() {
    cells.forEach(function (row, i) {
        row.forEach(function (cell, j) {
            const status = picrossTracker.getStatus(i, j);
            if (picrossTracker.pic.getColor(i, j) == 1) {
                cell.style.backgroundColor = 'black';
                cell.innerText = "";
            }
            else if (picrossTracker.pic.getColor(i, j) == 0) {
                cell.style.backgroundColor = 'white';
                cell.style.color = "black";
                cell.innerText = "-";
            }
            else if (status.code == 'error') {
                cell.style.backgroundColor = "red";
                cell.innerText = "";
            }
            else if (status.code == 'black') {
                cell.style.backgroundColor = "rgba(0,0,0,0.9)";
                cell.style.color = "white";
                cell.innerText = "!";
            }
            else if (status.code == 'white') {
                cell.style.backgroundColor = "rgba(0,0,0,0.1)";
                cell.style.color = "blue";
                cell.innerText = "!";
            }
            else {
                cell.style.backgroundColor = "rgba(0,0,0," + (0.2 + 0.6 * status.score) + ")";
                cell.innerText = "";
            }
        });
    });
}
;
// Example loading
function loadExample(example) {
    const a = get('picross-loader').appendChild(mk('li')).appendChild(mk('a', ['dropdown-item']));
    a.href = "#";
    a.onclick = function () { load(example); };
    a.innerText = example.split(";")[0];
}
function pasteSpec() {
    navigator.clipboard.readText().then(load);
}
function load(specs) {
    picross = new Picross(specs);
    picrossTracker = new PicrossStateTracker(picross);
    initTable();
    SVG_init();
    get('clear').disabled = false;
    get('solve').disabled = false;
    get('corne').disabled = false;
}
function resetFromSpec() {
    picrossTracker.resetFromSpec();
    SVG_clear();
    paint();
}
function solve() {
    picrossTracker.trySolveAll();
    paint();
}
var cornerings = null;
function cornering() {
    if (cornerings !== null) {
        SVG_clear();
        cornerings = null;
    }
    else {
        const corn = picrossTracker.getCorneringSolver().twoStepsImpossible();
        cornerings = corn.forEach(function ([[i, j, c], [ti, tj, _]]) {
            return drawArrow(i, j, ti, tj, c);
        });
    }
}
const svg = document.body.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
const g = svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "g"));
const svg_content = [];
function SVG_draw(type) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", type);
    svg_content.push(e);
    return g.appendChild(e);
}
function SVG_clear() {
    svg_content.forEach((e) => g.removeChild(e));
    svg_content.length = 0;
}
var cell_height, cell_width;
function SVG_init() {
    SVG_clear();
    const cell_rect = cells[0][0].getBoundingClientRect();
    cell_height = cell_rect.height;
    cell_width = cell_rect.width;
    svg.setAttribute('height', (cell_height * picross.spec.height) + "px");
    svg.setAttribute('width', (cell_width * picross.spec.width) + "px");
    svg.style = `position:absolute; top: ${cell_rect.top}px; left: ${cell_rect.left}px; pointer-events: none;`;
}
function drawArrow(i, j, ti, tj, c) {
    const path = SVG_draw("path");
    path.setAttribute('d', `M${(j + 0.5) * cell_width},${(i + 0.5) * cell_height} L${(tj + 0.5) * cell_width},${(ti + 0.5) * cell_height}`);
    path.setAttribute('style', `stroke: ${c === 1 ? 'red' : 'green'}; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);`);
    return path;
}
// Loading examples
window.onload = function () {
    get("paste").addEventListener("click", pasteSpec);
    get("clear").addEventListener("click", resetFromSpec);
    get("solve").addEventListener("click", solve);
    get("corne").addEventListener("click", cornering);
    const req = new XMLHttpRequest();
    req.addEventListener("load", function () {
        req.response.split(/\r?\n/).filter((t) => t.length).forEach(loadExample);
    });
    req.open("GET", "./static/examples.csv");
    req.send();
    const defs = g.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "defs"));
    const marker = defs.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "marker"));
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refx', '5');
    marker.setAttribute('refy', '5');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = marker.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('style', "fill:red;");
};
//# sourceMappingURL=index.js.map