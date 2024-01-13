
class RowSpecificationPainter {
  constructor() {
    this.dom = mk('th', ['pic-row-spec','nonclickable']);
  }
  paint(lineSpec) {
    this.dom.innerHTML = lineSpec.blocks.join('.');
  }
}

class ColSpecificationPainter {
  constructor() {
    this.dom = mk('th', ['pic-col-spec','nonclickable']);
  }
  paint(lineSpec) {
    this.dom.innerHTML = lineSpec.blocks.join('<br>');
  }
}


class CellPainter {
  constructor() {
    this.dom = mk('td', ['pic-cell','clickable']);
  }
  
  paint(cell) {
    if (cell.color == 1) {
      this.dom.style.backgroundColor = 'black';
      this.dom.innerText = "";
    } else if (cell.color == 0) {
      this.dom.style.backgroundColor = 'white';
      this.dom.innerText = "-";
    } else if (cell.statusCode() == 'error') {
      this.dom.style.backgroundColor = "red";
      this.dom.innerText = "";
    } else if (cell.statusCode() == 'black') {
      this.dom.style.backgroundColor = "rgba(0,0,0,0.9)";
      this.dom.style.color = "white";
      this.dom.innerText = "!";
    } else if (cell.statusCode() == 'white') {
      this.dom.style.backgroundColor = "rgba(0,0,0,0.1)";
      this.dom.style.color = "blue";
      this.dom.innerText = "!";
    } else {
      this.dom.style.backgroundColor = "rgba(0,0,0,"+ (0.2+0.6*cell.score())+")";
      this.dom.innerText = "";
    }
  }
}


var table, rowSpecs, colSpecs, cells;

function initRowSpec(rowSpec) {
  const dom = mk('th', ['pic-row-spec','nonclickable']);
  dom.onclick = function() { console.log(rowSpec); };
  rowSpec.blocks.forEach(function(block,i) {
    if (i>0) { dom.appendChild( document.createTextNode('.') ); }
    dom.appendChild( mk('span', ['spec', 'col-'+block.color]) ).innerText = block.size;
  });
  return dom;
}

function initColSpec(colSpec) {
  const dom = mk('th', ['pic-col-spec','nonclickable']);
  dom.onclick = function() { console.log(colSpec); };
  colSpec.blocks.forEach(function(block,i) {
    if (i>0) { dom.appendChild( mk('br') ); }
    dom.appendChild( mk('span', ['spec', 'col-'+block.color]) ).innerText = block.size;
  });
  return dom;
}

var picrossTracker;
function initTable(tracker) {
  picross = tracker.pic;
  
  table = wipe(get('picross')).appendChild(mk('table', ['pic-table','mx-auto']));
  rowSpecs = picross.spec.rowSpecs.map(initRowSpec);
  colSpecs = picross.spec.colSpecs.map(initColSpec);
  cells = picross.spec.rowSpecs.map(() => picross.spec.colSpecs.map(() => mk('td', ['pic-cell','clickable'])));
  
  // Populating table
  const specRow = table.appendChild( mk('tr',['pic-row']) );
  specRow.appendChild( mk('th',['pic-corner']) );
  colSpecs.forEach((dom) => specRow.appendChild(dom));
  rowSpecs.forEach(function (dom,i) {
    const row = table.appendChild( mk('tr', ['pic-row']) );
    row.appendChild(dom);
    cells[i].forEach(function (dom,j) {
      row.appendChild(dom);
      //dom.tabIndex = -1; // Necessary for keydown event to be recorded
      dom.addEventListener("mouseenter", function (e) {
        const status = tracker.getStatus(i,j);
        if (status.code === 'unsolved') {
          let score = Math.round(100 * status.score);
          if (score > 99) { score = ">99"; }
          if (score <  1) { score = "<1"; }
          status.code = "unsolved ("+score+"% black)";
        }
        get('logs').innerHTML = `<h4>Status: ${status.code}</h3>
          <h5>Row ${i+1}:</h4>
            <p> <b>Black:</b> ${status.row_colors[1]} <b> / White:</b> ${status.row_colors[0]} </p>
          <h5>Col ${j+1}:</h4>
            <p> <b>Black:</b> ${status.col_colors[1]} <b> / White:</b> ${status.col_colors[0]} </p>`;
      });
      dom.addEventListener("click"      , (e) => { e.preventDefault(); tracker.setColor(i,j,1   ); });
      dom.addEventListener("contextmenu", (e) => { e.preventDefault(); tracker.setColor(i,j,0   ); });
      dom.addEventListener("auxclick"   , (e) => { e.preventDefault(); tracker.setColor(i,j,null); });
      
      dom.addEventListener("keydown", function(e) {
        if (e.key === 'b') tracker.setColor(i,j,1);
        if (e.key === 'w') tracker.setColor(i,j,0);
        if (e.key === 'c') tracker.setColor(i,j,null);
      });
    });
  });
  
  // Setup the repainting event
  tracker.paint = function () {
    cells.forEach(function(row,i) {
      row.forEach(function(cell,j) {
        const status = tracker.getStatus(i,j);
        if (tracker.pic.getColor(i,j) == 1) {
          cell.style.backgroundColor = 'black';
          cell.innerText = "";
        } else if (tracker.pic.getColor(i,j) == 0) {
          cell.style.backgroundColor = 'white';
          cell.innerText = "-";
        } else if (status.code == 'error') {
          cell.style.backgroundColor = "red";
          cell.innerText = "";
        } else if (status.code == 'black') {
          cell.style.backgroundColor = "rgba(0,0,0,0.9)";
          cell.style.color = "white";
          cell.innerText = "!";
        } else if (status.code == 'white') {
          cell.style.backgroundColor = "rgba(0,0,0,0.1)";
          cell.style.color = "blue";
          cell.innerText = "!";
        } else {
          cell.style.backgroundColor = "rgba(0,0,0,"+ (0.2+0.6*status.score)+")";
          cell.innerText = "";
        }
      });
    });
  };
  tracker.paint();
}

var picross, picrossTracker;


// Example loading
function loadExample(example) {
  const a = get('picross-loader').appendChild( mk('li') ).appendChild( mk('a', ['dropdown-item']));
  a.href="#";
  a.onclick = function() { load(example); };
  a.innerText = example.split(";")[0];
}


function custom() {
  const height = parseInt(get('dim-x').innerText);
  const width  = parseInt(get('dim-y').innerText);
  return `custom;${','.repeat(height-1)};${','.repeat(width-1)}`;
}


function pasteSpec() {
  navigator.clipboard.readText().then(load);
}

function load(specs) {
//  try {
    picross = new Picross(specs);
    picrossTracker = new PicrossStateTracker(picross);
    initTable(picrossTracker);
    get('clear').disabled = false;
    get('solve').disabled = false;
//  } catch (error) {
//    alert("Could not load copied picross...");
//  }
}

function resetFromSpec() {
  picrossTracker.resetFromSpec();
}


function solve() {
  picrossTracker.trySolveAll();
}

// Loading examples
window.onload = function() {
  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
    req.response.split(/\r?\n/).filter((t)=>t.length).forEach(loadExample);
  });
  req.open("GET", "./ressources/examples.csv");
  req.send();
}
