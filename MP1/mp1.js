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

/** @global The angle of rotation */
var defAngle = 0;

/** @global True for increasing scaleSize => Make logo smaller
            False for decreasing scaleSize => Make logo bigger */
var incOrDec = true;

/** @global The value of scaling*/
var scaleSize = 1;

/** @global Number of vertices in the logo */
var numVertices = 120;

/** @global Two times pi to save some multiplications...*/
var twicePi = 2.0 * 3.14159;

/** @global Halve pi to save some multiplications...*/
var halfPi = 3.14159 / 2;



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
  @param {Number} numVertices number of vertices to use in the logo
 */
function loadVertices(numVertices) {
  console.log("Frame", defAngle);

  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  //Generate the vertex positions
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

  // Fit coordinates into [-1.0, 1.0]
  for (let i = 0; i < triangleVertices.length; i++) {
      triangleVertices[i] /= 33.0;
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = numVertices;
}



/**
 * Populate color buffer with data
  @param {Number} numVertices number of vertices to use in the logo
 */
function loadColors(numVertices) {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    
  // Generate colors
  let colors = [
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
      203,  46,   0, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
      203,  46,   0, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
      203,  46,   0, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
      203,  46,   0, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0
  ];

  // Fit colors into [0.0, 255.0]
  for (let i = 0; i < colors.length; i++) {
      colors[i] /= 255.0;
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = numVertices;
}



/**
 * Populate buffers with data
   @param {Number} numVertices number of vertices to use in the logo
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
  // Perform transformations
  transformation();
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
 * Add transformations to mvMatrix
 */
function transformation() {
    // Translate on Lissajous Curve
    mat4.fromTranslation(mvMatrix, [Math.sin(3*degToRad(defAngle) + halfPi), Math.sin(2*degToRad(defAngle)), 0]);
    // Rotate around z axis
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(defAngle));
    // Change logo size
    mat4.scale(mvMatrix, mvMatrix, [1.0 / scaleSize, 1.0 / scaleSize, 1.0]);
}



/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 
    defAngle = (defAngle + 0.5) % 360;

    // Make logo change size from small to big and from big to small
    if(scaleSize == 0) incOrDec = true;
    else if(scaleSize == 10) incOrDec = false;
    if(incOrDec) scaleSize += 0.125;
    else scaleSize -= 0.125;

    loadVertices(numVertices);
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
    animate();
}