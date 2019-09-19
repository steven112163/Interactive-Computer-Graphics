/**
 * @file A simple WebGL example drawing Illinois logo
 * @author Steven Yuan <yhyuan2@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle vertices */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The angle of rotation around the x axis */
var defAngle = 0;

/** @global Number of vertices in the logo */
var numVertices = 120;

/** @global Two times pi to save some multiplications...*/
var twicePi = 2.0 * 3.14159;



//----------------------------------------------------------------------------------



/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}



/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}



/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  let names = ["webgl", "experimental-webgl"];
  let context = null;
  for (let i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = context.drawingBufferWidth;
    context.viewportHeight = context.drawingBufferHeight;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}



/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  let shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  let shaderSource = "";
  let currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  let shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}



/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  let vertexShader = loadShaderFromDOM("shader-vs");
  let fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}



/**
 * Populate vertex buffer with data
  @param {Number} numVertices number of vertices to use around the circle boundary
 */
function loadVertices(numVertices) {
  console.log("Frame", defAngle);
  //Generate the vertex positions
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  let triangleVertices = [
      -22,  33, 0.0,  -22,  24, 0.0,  -12,  24, 0.0,
      -22,  33, 0.0,  -12,  33, 0.0,  -12,  24, 0.0,
        0,  33, 0.0,  -12,  33, 0.0,  -12,  24, 0.0,
        0,  33, 0.0,    0,  24, 0.0,  -12,  24, 0.0,
        0,  33, 0.0,    0,  24, 0.0,   12,  24, 0.0,
        0,  33, 0.0,   12,  33, 0.0,   12,  24, 0.0,
       22,  33, 0.0,   12,  33, 0.0,   12,  24, 0.0,
       22,  33, 0.0,   22,  24, 0.0,   12,  24, 0.0,
      -22,  24, 0.0,  -22,  15, 0.0,  -12,  24, 0.0,
      -12,  15, 0.0,  -22,  15, 0.0,  -12,  24, 0.0,
      -12,  15, 0.0,    0,  15, 0.0,  -12,  24, 0.0,
        0,  15, 0.0,  -12,  24, 0.0,    0,  24, 0.0,
        0,  15, 0.0,   12,  24, 0.0,    0,  24, 0.0,
       12,  15, 0.0,    0,  15, 0.0,   12,  24, 0.0,
       12,  15, 0.0,   22,  15, 0.0,   12,  24, 0.0,
       22,  24, 0.0,   22,  15, 0.0,   12,  24, 0.0,
      -12,  15, 0.0,  -12,   0, 0.0,    0,   0, 0.0,
      -12,  15, 0.0,    0,  15, 0.0,    0,   0, 0.0,
       12,  15, 0.0,    0,  15, 0.0,    0,   0, 0.0,
       12,  15, 0.0,   12,   0, 0.0,    0,   0, 0.0,
      -12,   0, 0.0,  -12, -15, 0.0,    0,   0, 0.0,
      -12, -15, 0.0,    0,   0, 0.0,    0, -15, 0.0,
       12, -15, 0.0,    0,   0, 0.0,    0, -15, 0.0,
       12,   0, 0.0,   12, -15, 0.0,    0,   0, 0.0,
      -22, -15, 0.0,  -22, -24, 0.0,  -12, -24, 0.0,
      -22, -15, 0.0,  -12, -15, 0.0,  -12, -24, 0.0,
      -12, -15, 0.0,  -12, -24, 0.0,    0, -15, 0.0,
        0, -15, 0.0,    0, -24, 0.0,  -12, -24, 0.0,
        0, -15, 0.0,    0, -24, 0.0,   12, -24, 0.0,
       12, -15, 0.0,   12, -24, 0.0,    0, -15, 0.0,
       22, -15, 0.0,   12, -15, 0.0,   12, -24, 0.0,
       22, -15, 0.0,   22, -24, 0.0,   12, -24, 0.0,
      -22, -24, 0.0,  -22, -33, 0.0,  -12, -24, 0.0,
      -12, -33, 0.0,  -22, -33, 0.0,  -12, -24, 0.0,
      -12, -33, 0.0,    0, -33, 0.0,  -12, -24, 0.0,
        0, -33, 0.0,  -12, -24, 0.0,    0, -24, 0.0,
        0, -33, 0.0,   12, -24, 0.0,    0, -24, 0.0,
       12, -33, 0.0,    0, -33, 0.0,   12, -24, 0.0,
       12, -33, 0.0,   22, -33, 0.0,   12, -24, 0.0,
       22, -24, 0.0,   22, -33, 0.0,   12, -24, 0.0
  ];

  // Fit coordinate into [-1, 1]
  for (let i = 0; i < triangleVertices.length; i++) {
      triangleVertices[i] /= 100.0;
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = numVertices;
    
  // Start with vertex at the origin    
  /*let triangleVertices = [0.0, 0.0, 0.0];

  //Generate a triangle fan around origin
  let radius = 0.5;
  let z = 0.0;
    
  for (let i = 0; i <= numVertices; i++) {
      let angle = i *  twicePi / numVertices;
      let x = (radius * Math.cos(angle));
      let y = (radius * Math.sin(angle));
      triangleVertices.push(x);
      triangleVertices.push(y);
      triangleVertices.push(z);
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = numVertices + 2;*/
}



/**
 * Populate color buffer with data
  @param {Number} numVertices number of vertices to use around the circle boundary
 */
function loadColors(numVertices) {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    
  // Set the heart of the circle to be black    
  //let colors = [230.0 / 255.0, 46.0 / 255.0, 0.0, 1.0];
    let colors = [];
  for (let i = 0; i < numVertices; i++) {
      colors.push(230.0 / 255.0);
      colors.push(46.0 / 255.0);
      colors.push(0.0);
      colors.push(1.0);
  }
  
  /*let a = 1.0;
  let g = 0.0;
  let halfV = numVertices / 2.0;
  for (let i = 0; i <= numVertices; i++) {
      let r = Math.abs((i - halfV) / halfV);
      let b = 1.0 - r;
      colors.push(r);
      colors.push(g);
      colors.push(b);
      colors.push(a);
  }*/
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = numVertices;
}



/**
 * Populate buffers with data
   @param {Number} numVertices number of vertices to use around the circle boundary
 */
function setupBuffers(numVertices) {
    
  //Generate the vertex positions    
  loadVertices(numVertices);

  //Generate the vertex colors
  loadColors(numVertices);
}



/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}



/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 
    defAngle = (defAngle + 1.0) % 360;
    loadVertices(numCircleVerts);
}



/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers(numVertices);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}



/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    //animate();
}