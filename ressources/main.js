
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

class PicrossPainter {
  constructor(picross) {
    this.dom = mk('table', ['pic-table','mx-auto']);
    
    // Populating table
    const specRow = this.dom.appendChild( mk('tr',['pic-row']) );
    specRow.appendChild( mk('th',['pic-corner']) );
    for (let j = 0; j < picross.width; j++) {
      const colSpec = picross.spec.colSpecs[j];
      const colPainter = new ColSpecificationPainter();
      colSpec.addPainter(colPainter);
      specRow.appendChild(colPainter.dom).onclick = function() {
        console.log(colSpec);
      }
    }
    for (let i = 0; i < picross.height; i++) {
      const rowSpec = picross.spec.rowSpecs[i];
      const rowPainter = new RowSpecificationPainter();
      rowSpec.addPainter(rowPainter);
      const row = this.dom.appendChild( mk('tr', ['pic-row']) );
      // TODO: move this to editor
      row.appendChild( rowPainter.dom ).onclick = function() {
        console.log(rowSpec);
      }
      for (let j = 0; j < picross.width; j++) {
        const cellPainter = new CellPainter();
        const cell = picross.cells[i][j];
        cell.addPainter(cellPainter);
        row.appendChild(cellPainter.dom);
        cellPainter.dom.tabIndex = -1; // Necessary for keydown event to be recorded
        cellPainter.dom.addEventListener("focus", function (e) {
          let status = cell.statusCode();
          if (status === 'unsolved') {
            let score = Math.round(100 * cell.score());
            if (score > 99) { score = ">99"; }
            if (score <  1) { score = "<1"; }
            status = "unsolved ("+score+"% black)";
          }
          get('logs').innerHTML = `<h4>Status: ${status}</h3>
            <h5>Row ${i+1}:</h4>
              <p> <b>Black:</b> ${cell.row.color_counts[1]} <b> / White:</b> ${cell.row.color_counts[0]} </p>
            <h5>Col ${j+1}:</h4>
              <p> <b>Black:</b> ${cell.col.color_counts[1]} <b> / White:</b> ${cell.col.color_counts[0]} </p>
              <h5> Row States</h5> <p> ${cell.row.states} </p>
              <h5> Col States</h5> <p> ${cell.col.states} </p>
              `;
        });
        //cellPainter.dom.addEventListener("click", () => cell.trySolve());
        cellPainter.dom.addEventListener("keydown", function(e) {
          if (e.key === 'b') cell.setColor(1);
          if (e.key === 'w') cell.setColor(0);
        });
      }
    }
  }
}

var picSpec, picross, picrossTable;


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
  try {
    picSpec = new PicrossSpecification(specs);
    picross = new PicrossSolver(picSpec);
    picrossTable = new PicrossPainter(picross);
    wipe(get('picross')).appendChild(picrossTable.dom);
    get('clear').disabled = false;
    get('solve').disabled = false;
  } catch (error) {
    alert("Could not load copied picross...");
  }
}

function resetFromSpec() {
  picross.resetFromSpec();
}


function solve() {
  picross.trySolve();
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
