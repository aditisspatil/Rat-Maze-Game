// Koch Snowflake 2D
// Aditi Patil (asp270)


"use strict";

var gl;
var canvas;
var height = 5;
var width = 5;
var cell_size;

var start = -1;
var end = -1;

var vertices = [];
var rat;
var rat_dir = -1*90;
var rat_pos = 0;

var bufferId;
var rat_buf;
var positionLoc;
var programInfo;
// var program_rat;

var graph;
var cell_graph;
var vertex_pos_map = {};
var cell_pos_map = {};


window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);

    reload();
    
    //  Load shaders and initialize attribute buffers
    programInfo = initShaders(gl, "vertex-shader", "fragment-shader");

    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    gl.useProgram( programInfo );

    positionLoc = gl.getAttribLocation( programInfo, "aPosition" );
    gl.vertexAttribPointer( positionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(positionLoc);

    document.getElementById("update_button").onclick = function (event) {
      height = parseInt(document.getElementById("width").value);
      width = parseInt(document.getElementById("height").value);
      reload();
      render();
    };

    window.onkeydown = function(e) {
      var key = e.which || e.keyCode;
      var new_cell;
      var new_dir;
      switch( key ) {
        case 37: // left 
          new_cell = rat_pos -1;
          new_cell = can_move(rat_pos, new_cell) ? new_cell : rat_pos;
          new_dir = 270;
          break;

        case 38: //Up arrow key
          new_cell = rat_pos +width;
          new_cell = can_move(rat_pos, new_cell) ? new_cell : rat_pos;
          new_dir = 0;
          break;

        case 39: //right arrow key
          new_cell = rat_pos +1;
          new_cell = can_move(rat_pos, new_cell) ? new_cell : rat_pos;
          new_dir = 90;
          break;
        
        case 40: //down arrow key
          new_cell = rat_pos - width;
          new_cell = can_move(rat_pos, new_cell) ? new_cell : rat_pos;
          new_dir = 180;          
          break;
      }
      place_rat(new_cell, new_dir);
      render();
  };

    render();

};

function init_environment() {
  if (width <= height) {
    cell_size = 2/(height +1);
  }
  else {
    cell_size = 2/(width +1);
  }
  start = -1;
  end = -1;
}

function reload(){
  gl.clearColor(0.9, 1.0, 1.0, 1.0);
  vertices = [];
  init_environment();
  create_rat();
  create_graph(); // Execute once for dimension change
  initialize_edges();
  open_path();
  gerenate_vertices();
}

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT );

  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
  gl.drawArrays(gl.LINES, 0, vertices.length);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(rat), gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, rat.length); 
}

function create_graph() {
  graph = new Graph();
  cell_graph = new Graph();
  vertex_pos_map = {};
  cell_pos_map = {};

  var v_index = 0
  for (let row = 0; row <= height; row++) { 
    for (let col = 0; col <= width; col++) { 
      graph.addVertex( v_index );
      vertex_pos_map[v_index] = [row, col];
      v_index += 1;
    }
  }
  var v_index = 0
  for (let row = 0; row < height; row++) { 
    for (let col = 0; col < width; col++) { 
      cell_graph.addVertex( v_index );
      cell_pos_map[v_index] = [row, col];
      v_index += 1;
    }
  }
}

function create_rat() {
  const x = cell_size/3;
  rat_pos= -1;
  rat_dir = 0;
  rat = [
    vec2(0,  2*x/3),
    vec2(-x/3,  -x/3),
    vec2(x/3,  -x/3),
  ];
  const PI = 3.14
  const step=5.0;// How far is the next point i.e it should be small value
  const centerX = 0;
  const centerY = -x/3;
  const radius = x/2;
  rat.push( vec2(centerX, centerY));

  for(let angle= 0.0 ; angle <= 360; angle+=step) {
    var rad  = PI*angle/180;
    const x  = centerX+radius*Math.cos(rad);
    const y  = centerY+radius*Math.sin(rad);
    rat.push( vec2(x, y));
    rat.push( vec2(centerX, centerY));
  }

  const centerX_2 = 0;
  const centerY_2 = centerY+radius;
  const radius_2 = x/4;
  rat.push( vec2(centerX_2, centerY_2));
  for(let angle= 0.0 ; angle <= 360; angle+=step) {
    var rad  = PI*angle/180;
    const x  = centerX_2+radius_2*Math.cos(rad);
    const y  = centerY_2+radius_2*Math.sin(rad);
    rat.push( vec2(x, y));
    rat.push( vec2(centerX_2, centerY_2));
  }

  rat.push( vec2(centerX, centerY));
  rat.push( vec2(centerX, centerY));
  rat.push( vec2(-x/20, -x));
  rat.push( vec2(x/20, -x));
}

function place_rat(new_pos, direction) { // (cell_number. angle in deg)
  const old_center = rat_pos == -1 ? vec2(0,0) : scaled_cell_center(rat_pos);
  const new_center = scaled_cell_center(new_pos);

  var angleInDegrees = rat_dir - direction;
  var angleInRadians = angleInDegrees * Math.PI / 180;;
  const s = Math.sin(angleInRadians);
  const c = Math.cos(angleInRadians);

  for(let i=0; i < rat.length; i++) {
    var row = rat[i][0];
    var col = rat[i][1];

    row = row - old_center[0];
    col = col - old_center[1];

    var new_row = -s*col + c*row;
    var new_col = s*row + c*col;
    new_row = new_center[0] + new_row;
    new_col = new_center[1] + new_col;
    rat[i] = vec2(new_row, new_col);
  }
  rat_pos = new_pos;
  rat_dir = direction;
}

function initialize_edges() {
  for (const [key, value] of Object.entries(vertex_pos_map)) {
    const row = value[0];
    const col = value[1];
    const vertex = parseInt(key);
    var  other_vertex;

    if (row+1 <= height) {
      other_vertex = (row+1)*(width+1) + col;
      graph.addEdge(vertex, other_vertex);
    }
    if (row-1 >= 0) {
      other_vertex = (row)*(width+1) - (width-col+1);
      graph.addEdge(vertex, other_vertex);
    }
    if (col-1 >= 0 ) {
      other_vertex = vertex-1;
      graph.addEdge(vertex, other_vertex);    
    }
    if (col+1 <= width) {
      other_vertex = vertex+1;
      graph.addEdge(vertex, other_vertex);
    }
  }

  for (const [key, value] of Object.entries(cell_pos_map)) {
    const row = value[0];
    const col = value[1];
    const vertex = parseInt(key);
    var  other_vertex;

    if (row+1 < height) {
      other_vertex = (row+1)*(width) + col;
      cell_graph.addEdge(vertex, other_vertex);
    }
    if (row-1 >= 0) {
      other_vertex = (row)*(width) - (width-col);
      cell_graph.addEdge(vertex, other_vertex);
    }
    if (col-1 >= 0 ) {
      other_vertex = vertex-1;
      cell_graph.addEdge(vertex, other_vertex);    
    }
    if (col+1 < width) {
      other_vertex = vertex+1;
      cell_graph.addEdge(vertex, other_vertex);
    }
  }
}

function open_path() {
  var cell_0 = get_random(height) * (width);
  const r0 = cell_pos_map[cell_0][0];
  place_rat(cell_0, 90);
  graph.removeEdge(get_vertex(r0,0), get_vertex(r0+1,0)); // remove start

  var fringe = [cell_0];
  var visited_cells = new Set()
 

  while (fringe.length > 0) {
    if ( has_unvisited_neighbours(cell_0, visited_cells) ) {
      var neighbours = cell_graph.edges.get(cell_0);
      shuffle(neighbours);
      var next;
      for (let i = 0; i< neighbours.length; i++) {
        if (!visited_cells.has(neighbours[i])) {
          next = neighbours[i];
          break;
        }
      }
      if (next >= 0) {
        const edge = get_edge_cells(cell_0, next);
        graph.removeEdge(edge[0], edge[1]);
        visited_cells.add(next);
        cell_graph.removeEdge(cell_0, next);
        cell_0 = next;
        fringe.push(cell_0);
        if (end < 0 && cell_pos_map[next][1] == width-1) {
          end = cell_pos_map[next][0];
          const e_0 = get_vertex(end, width);
          graph.removeEdge(e_0, e_0+width+1);
        }
      }
    }
    else {
      cell_0 = fringe[fringe.length-1];
      fringe.splice(fringe.length-1, 1);
    }
  }
}

function gerenate_vertices() {
  var visited = [];
  var neighbours;
  var vertex;
  for (const [key, value] of Object.entries(vertex_pos_map)) {
    vertex = parseInt(key);
    if ( !visited.includes(vertex) ) {
      visited.push(vertex);
      const x_0 = vertex_pos_map[vertex][0];
      const y_0 = vertex_pos_map[vertex][1];
      neighbours = graph.edges.get(vertex);
      for (var i = 0; i < neighbours.length; i++) {
        const n = neighbours[i];
        if (!visited.includes(n) ) {
           const x_1 = vertex_pos_map[n][0];
           const y_1 = vertex_pos_map[n][1];
           vertices.push(scaled_position(x_0, y_0));
           vertices.push(scaled_position(x_1, y_1));
        }
      }
    }
  }
}

function scaled_position(row,col) {
  var new_x = (col- width/2) * cell_size;
  var new_y = (row-height/2) * cell_size;

  return vec2(new_x, new_y);
}

function scaled_cell_center(cell) {
  const row = cell_pos_map[cell][0];
  const col = cell_pos_map[cell][1];
  var new_x = ((col- width/2) * cell_size) + cell_size/2;
  var new_y = ((row-height/2) * cell_size) + cell_size/2;

  return vec2(new_x, new_y);
}

function get_random(max) {
  return Math.floor(Math.random() * max);
}

function get_vertex(row, col) {
  return row*(width+1) + col;
}

function get_cell(row, col) {
  return row*(width) + col;
}

function has_unvisited_neighbours (cell, visited) {
  const neighbours = cell_graph.edges.get(cell);
  for (let i =0; i< neighbours.length; i++) {
    if (!visited.has(neighbours[i])) {
      return true;
    }
  }
  return false;
}

function can_move(from_cell, to_cell) {
  if (to_cell >=0 && to_cell <= width*height-1) {
    if ( cell_graph.AdjList.get(from_cell).includes(to_cell)) {
      const edge = get_edge_cells(from_cell, to_cell);
      const v_0 = edge[0];
      const v_1 = edge[1];
  
      const neighbours = graph.edges.get(v_0);
      if (!neighbours.includes(v_1)) {
        return true;
      }
    }
  }
  return false;
}

function get_edge_cells(A, B) {
  const row_0 = cell_pos_map[A][0];
  const row_1 = cell_pos_map[B][0];
  const col_0 = cell_pos_map[A][1];
  const col_1 = cell_pos_map[B][1];

  if (col_0 == col_1) {
    const v = get_vertex(Math.max(row_0, row_1), col_0);
    return vec2(v, v+1);
  }
  if (row_0 == row_1) {
    const v = get_vertex(row_0, Math.max(col_0, col_1));
    return vec2(v, v+1+width);
  }
}

function is_box_edge(v_0, v_1) {
  const row_0 = vertex_pos_map[v_0][0];
  const row_1 = vertex_pos_map[v_1][0];
  const col_0 = vertex_pos_map[v_0][1];
  const col_1 = vertex_pos_map[v_1][1];
  const h_edge_main = ((row_0 == 0 || row_0 == height) && row_1 == row_0);
  const v_edge_main = ((col_0 == 0 || col_0 == width) && col_1 == col_0);
  return h_edge_main || v_edge_main;
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

class Graph {
  constructor() {
      this.AdjList = new Map();
      this.edges = new Map();
  }

  addVertex(v) {
    this.AdjList.set(v, []);
    this.edges.set(v, []);
  }

  addEdge(v, w) {
    if (!this.AdjList.get(v).includes(w)) {
      this.AdjList.get(v).push(w);
    }
    if (!this.AdjList.get(w).includes(v)) {
      this.AdjList.get(w).push(v);
    }
    if (!this.edges.get(v).includes(w)) {
      this.edges.get(v).push(w);
    }
    if (!this.edges.get(w).includes(v)) {
      this.edges.get(w).push(v);
    }
  }

  removeEdge(v, w) {
    var neighbours = this.edges.get(v);
    this.edges.set(v, []);

    for (var i = 0; i < neighbours.length; i++) {
      const n = neighbours[i];
      if (n != w) {
        this.edges.get(v).push(n);
      }
    }
    neighbours = this.edges.get(w);
    this.edges.set(w, []);
    for (var i = 0; i < neighbours.length; i++) {
      const n2 = neighbours[i];
      if (n2 != v) {
        this.edges.get(w).push(n2);
      }
    }
  }
}