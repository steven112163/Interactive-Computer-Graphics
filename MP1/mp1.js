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

/** @global Array holding the triangle vertices of logo I*/
var triangleVerticesOfI;

/** @global Array holding the triangle vertices of logo L*/
var triangleVerticesOfL;

/** @global Array holding the colors of logo I*/
var colorsOfI;

/** @global Array holding the colors of logo L*/
var colorsOfL;

/** @global The WebGL buffer holding the triangle vertices of logo I */
var vertexPositionBufferOfI;

/** @global The WebGL buffer holding the vertex colors of logo I */
var vertexColorBufferOfI;

/** @global The WebGL buffer holding the triangle vertices of logo L */
var vertexPositionBufferOfL;

/** @global The WebGL buffer holding the vertex colors of logo L */
var vertexColorBufferOfL;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The angle of rotation for first animation*/
var defAngle = 0;

/** @global True for increasing scaleSize => Make logo smaller
            False for decreasing scaleSize => Make logo bigger
            For first animation                                 */
var incOrDec = true;

/** @global The value of scaling for first animation*/
var scaleSize = 1;

/** @global Number of vertices in two animations' object individually */
var numVertices = [120, 120, 96];

/** @global Index of animations */
var animation = 0;

/** @global Stage of non-uniform transformation for first animation */
var nonUniStage = 0;

/** @global Speed of scattering for second animation */
var scatterSpeed = 1;

/** @global Flag for resetting vertices of second animation */
var fReset = true;

var count = 0;



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
 * @param {Array} numVertices number of vertices to use in individual animation
 */
function loadVertices(numVertices) {
    if (!animation)
        loadFirAniVertices(numVertices[0]);
    else
        loadSecAniVertices(numVertices[1], numVertices[2]);
}



/**
 * Populate vertex buffer with data of animation 1
 * @param {Number} numVertices number of vertices to use in animation 1
 */
function loadFirAniVertices(numVertices) {
    vertexPositionBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);

    // Generate the vertex positions
    resetFirVertices();

    // Non-uniform transformation
    nonUniTransform();

    // Fit coordinates into [-1.0, 1.0]
    for (let i = 0; i < triangleVerticesOfI.length; i++) {
        triangleVerticesOfI[i] /= 33.0;
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfI), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfI.itemSize = 3;
    vertexPositionBufferOfI.numberOfItems = numVertices;
}



/**
 * Reset triangleVertices to original logo for first animation
 */
function resetFirVertices() {
    triangleVerticesOfI = [
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
}



/**
 * Non-uniform transformation directly changes buffer
 */
function nonUniTransform() {
    for (let i = 0; i < triangleVerticesOfI.length; i++) {
        switch (nonUniStage) {
            case 1: if (triangleVerticesOfI[i] == 24) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22) triangleVerticesOfI[i-1] = 17;
            } break;
            case 2: if (triangleVerticesOfI[i] == 15) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22) triangleVerticesOfI[i-1] = 17;
            } break;
            case 3: if (triangleVerticesOfI[i] == 0) {
                if (triangleVerticesOfI[i-1] == -12) triangleVerticesOfI[i-1] = -6;
                else if (triangleVerticesOfI[i-1] == 12) triangleVerticesOfI[i-1] = 6;
            } break;
            case 4: if (triangleVerticesOfI[i] == -15) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22) triangleVerticesOfI[i-1] = 17;
            } break;
            case 5: if (triangleVerticesOfI[i] == -24) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22) triangleVerticesOfI[i-1] = 17;
            } break;
            case 6: if (triangleVerticesOfI[i] == -33) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22) triangleVerticesOfI[i-1] = 17;
            } break;
            case 0:
            default:if (triangleVerticesOfI[i] == 33) {
                if (triangleVerticesOfI[i-1] == -22) triangleVerticesOfI[i-1] = -17;
                else if (triangleVerticesOfI[i-1] == 22)  triangleVerticesOfI[i-1] = 17;
            } break;
        }
    }
}



/**
 * Populate vertex buffer with data of animation 2
 * @param {Number} numVerticesOfI number of vertices to use for logo I
 * @param {Number} numVerticesOfL number of vertices to use for logo L
 */
function loadSecAniVertices(numVerticesOfI, numVerticesOfL) {
    // Generate the vertex positions
    if (fReset) resetSecVertices();

    // Scatter triangles
    if (!fReset) scatter();

    // Fit coordinates into [-1.0, 1.0]
    if (fReset) {
        for (let i = 0; i < triangleVerticesOfI.length; i++) {
            triangleVerticesOfI[i] /= 132.0;
            if (i % 3 == 0) triangleVerticesOfI[i] -= 0.25;
        }
        for (let i = 0; i < triangleVerticesOfL.length; i++) {
            triangleVerticesOfL[i] /= 132.0;
            if (i % 3 == 0) triangleVerticesOfL[i] += 0.25;
        }
    }

    vertexPositionBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfI), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfI.itemSize = 3;
    vertexPositionBufferOfI.numberOfItems = numVerticesOfI;

    vertexPositionBufferOfL = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfL);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfL), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfL.itemSize = 3;
    vertexPositionBufferOfL.numberOfItems = numVerticesOfL;
}



/**
 * Reset triangleVertices to original logo for second animation
 */
function resetSecVertices() {
    resetFirVertices();

    triangleVerticesOfL = [
        -22,  33, 1.0,  -22,  24, 1.0,  -12,  24, 1.0,
        -22,  33, 1.0,  -12,  33, 1.0,  -12,  24, 1.0,
          0,  33, 1.0,  -12,  33, 1.0,  -12,  24, 1.0,
          0,  33, 1.0,    0,  24, 1.0,  -12,  24, 1.0,
        -22,  24, 1.0,  -22,  15, 1.0,  -12,  24, 1.0,
        -12,  15, 1.0,  -22,  15, 1.0,  -12,  24, 1.0,
        -12,  15, 1.0,    0,  15, 1.0,  -12,  24, 1.0,
          0,  15, 1.0,  -12,  24, 1.0,    0,  24, 1.0,
        -22,  15, 1.0,  -22,   0, 1.0,  -12,   0, 1.0,
        -22,  15, 1.0,  -12,  15, 1.0,  -12,   0, 1.0,
          0,  15, 1.0,  -12,  15, 1.0,  -12,   0, 1.0,
          0,  15, 1.0,    0,   0, 1.0,  -12,   0, 1.0,
        -22,   0, 1.0,  -22, -15, 1.0,  -12,   0, 1.0,
        -22, -15, 1.0,  -12,   0, 1.0,  -12, -15, 1.0,
          0, -15, 1.0,  -12,   0, 1.0,  -12, -15, 1.0,
          0,   0, 1.0,    0, -15, 1.0,  -12,   0, 1.0,
        -22, -15, 1.0,  -22, -24, 1.0,  -12, -24, 1.0,
        -22, -15, 1.0,  -12, -15, 1.0,  -12, -24, 1.0,
        -12, -15, 1.0,  -12, -24, 1.0,    0, -15, 1.0,
          0, -15, 1.0,    0, -24, 1.0,  -12, -24, 1.0,
          0, -15, 1.0,    0, -24, 1.0,   12, -24, 1.0,
         12, -15, 1.0,   12, -24, 1.0,    0, -15, 1.0,
         22, -15, 1.0,   12, -15, 1.0,   12, -24, 1.0,
         22, -15, 1.0,   22, -24, 1.0,   12, -24, 1.0,
        -22, -24, 1.0,  -22, -33, 1.0,  -12, -24, 1.0,
        -12, -33, 1.0,  -22, -33, 1.0,  -12, -24, 1.0,
        -12, -33, 1.0,    0, -33, 1.0,  -12, -24, 1.0,
          0, -33, 1.0,  -12, -24, 1.0,    0, -24, 1.0,
          0, -33, 1.0,   12, -24, 1.0,    0, -24, 1.0,
         12, -33, 1.0,    0, -33, 1.0,   12, -24, 1.0,
         12, -33, 1.0,   22, -33, 1.0,   12, -24, 1.0,
         22, -24, 1.0,   22, -33, 1.0,   12, -24, 1.0
    ];
}



/**
 * Scatter the logo
 */
function scatter() {
    let distance = (scatterSpeed*2 + 0.01) * 0.01 / 2;
    let radian;
    if(!incOrDec) {
        for (let i = 0; i < triangleVerticesOfI.length; i += 9) {
            radian = Math.atan(triangleVerticesOfI[i+1] / triangleVerticesOfI[i]);
            if (triangleVerticesOfI[i] < 0) radian += Math.PI;
            triangleVerticesOfI[i] += distance * Math.cos(radian);
            triangleVerticesOfI[i+1] += distance * Math.sin(radian);
            triangleVerticesOfI[i+3] += distance * Math.cos(radian);
            triangleVerticesOfI[i+4] += distance * Math.sin(radian);
            triangleVerticesOfI[i+6] += distance * Math.cos(radian);
            triangleVerticesOfI[i+7] += distance * Math.sin(radian);
        }
        for (let i = 0; i < triangleVerticesOfL.length; i += 9) {
            radian = Math.atan(triangleVerticesOfL[i+1] / triangleVerticesOfL[i]);
            if (triangleVerticesOfL[i] < 0) radian += Math.PI;
            triangleVerticesOfL[i] += distance * Math.cos(radian);
            triangleVerticesOfL[i+1] += distance * Math.sin(radian);
            triangleVerticesOfL[i+3] += distance * Math.cos(radian);
            triangleVerticesOfL[i+4] += distance * Math.sin(radian);
            triangleVerticesOfL[i+6] += distance * Math.cos(radian);
            triangleVerticesOfL[i+7] += distance * Math.sin(radian);
        }
    } else {
        for (let i = 0; i < triangleVerticesOfI.length; i += 9) {
            radian = Math.atan(triangleVerticesOfI[i+1] / triangleVerticesOfI[i]);
            if (triangleVerticesOfI[i] < 0) radian += Math.PI;
            triangleVerticesOfI[i] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+1] -= distance * Math.sin(radian);
            triangleVerticesOfI[i+3] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+4] -= distance * Math.sin(radian);
            triangleVerticesOfI[i+6] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+7] -= distance * Math.sin(radian);
        }
        for (let i = 0; i < triangleVerticesOfL.length; i += 9) {
            radian = Math.atan(triangleVerticesOfL[i+1] / triangleVerticesOfL[i]);
            if (triangleVerticesOfL[i] < 0) radian += Math.PI;
            triangleVerticesOfL[i] -= distance * Math.cos(radian);
            triangleVerticesOfL[i+1] -= distance * Math.sin(radian);
            triangleVerticesOfL[i+3] -= distance * Math.cos(radian);
            triangleVerticesOfL[i+4] -= distance * Math.sin(radian);
            triangleVerticesOfL[i+6] -= distance * Math.cos(radian);
            triangleVerticesOfL[i+7] -= distance * Math.sin(radian);
        }
    }
}



/**
 * Populate color buffer with data
 * @param {Array} numVertices number of vertices to use in individual animation
 */
function loadColors(numVertices) {
    if (!animation)
        loadFirAniColors(numVertices[0]);
    else
        loadSecAniColors(numVertices[1], numVertices[2]);
}



/**
 * Populate color buffer with data of animation 1
 * @param {Number} numVertices number of vertices to use in animation 1
 */
function loadFirAniColors(numVertices) {
    vertexColorBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);

    // Generate colors
    resetFirColors();

    // Fit colors into [0.0, 255.0]
    for (let i = 0; i < colorsOfI.length; i++) {
        colorsOfI[i] /= 255.0;
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsOfI), gl.STATIC_DRAW);
    vertexColorBufferOfI.itemSize = 4;
    vertexColorBufferOfI.numItems = numVertices;
}



/**
 * Reset colorsOfI to original color of logo I
 */
function resetFirColors() {
    colorsOfI = [
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
}



/**
 * Populate color buffer with data of animation 2
 * @param {Number} numVerticesOfI number of vertices to use for logo I
 * @param {Number} numVerticesOfL number of vertices to use for logo L
 */
function loadSecAniColors(numVerticesOfI, numVerticesOfL) {
    // Generate colors
    resetSecColors();

    // Fit colors into [0.0, 255.0]
    for (let i = 0; i < colorsOfI.length; i++) {
        colorsOfI[i] /= 255.0;
    }
    for (let i = 0; i < colorsOfL.length; i++) {
        colorsOfL[i] /= 255.0;
    }

    vertexColorBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsOfI), gl.STATIC_DRAW);
    vertexColorBufferOfI.itemSize = 4;
    vertexColorBufferOfI.numItems = numVerticesOfI;

    vertexColorBufferOfL = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfL);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsOfL), gl.STATIC_DRAW);
    vertexColorBufferOfL.itemSize = 4;
    vertexColorBufferOfL.numItems = numVerticesOfL;
}



/**
 * Reset two color arrays to original colors
 */
function resetSecColors() {
    resetFirColors();

    colorsOfL = [
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        203,  46,   0, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        203,  46,   0, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,    0,   0, 102, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,    0,   0, 102, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        203,  46,   0, 1.0,  203,  46,   0, 1.0,    0,   0, 102, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,  203,  46,   0, 1.0,
        0,   0, 102, 1.0,  203,  46,   0, 1.0,    0,   0, 102, 1.0,
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
}



/**
 * Populate buffers with data
 * @param {Array} numVertices number of vertices to use in individual animation
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
    // Perform transformations
    transform();
    setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                            vertexPositionBufferOfI.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBufferOfI.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBufferOfI.numberOfItems);

    if (animation) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfL);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
            vertexPositionBufferOfL.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfL);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
            vertexColorBufferOfL.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBufferOfL.numberOfItems);
    }
}



/**
 * Add transformations to matrix
 */
function transform() {
    if (!animation)
        transformFirAni();
    else
        transformSecAni();
}



/**
 * Add transformations to matrix of first animation
 */
function transformFirAni() {
    // Translate on Lissajous Curve
    mat4.fromTranslation(mvMatrix, [Math.sin(3*degToRad(defAngle) + Math.PI/2.0),
        Math.sin(2*degToRad(defAngle)), 0]);
    // Rotate around z axis
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(defAngle));
    // Change logo size
    mat4.scale(mvMatrix, mvMatrix, [1.0 / scaleSize, 1.0 / scaleSize, 1.0]);
}



/**
 * Add transformations to matrix of second animation
 */
function transformSecAni() {
    // Rotate around z axis
    mat4.fromYRotation(mvMatrix, degToRad(defAngle));
}



/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
    if(!animation)
        animateFir();
    else
        animateSec();
}



/**
 * Animate first animation
 */
function animateFir() {
    // Rotate the logo around z axis
    defAngle = (defAngle + 0.5) % 360;

    // Make logo change size from small to big and from big to small
    if(scaleSize == 0) incOrDec = true;
    else if(scaleSize == 10) incOrDec = false;
    if(incOrDec) scaleSize += 0.125;
    else scaleSize -= 0.125;

    // Adjust stage of non-uniform transformation to change appearance of the logo
    if (!(parseInt(scaleSize.toString().split('.')[1]) > 0.0))
        nonUniStage = (nonUniStage + 1) % 7;

    setupBuffers(numVertices);
}



/**
 * Animate second animation
 */
function animateSec() {
    // Rotate the logo around z axis
    defAngle = (defAngle + 0.5) % 360;

    fReset = true;
    if (scatterSpeed <= 0) {
        incOrDec = true;
    }
    else if (scatterSpeed >= 1) {
        incOrDec = false;
        if (count > 165) {
            count = 0;
            fReset = true;
        }
        count++;
    }
    if (count > 165) {
        fReset = false;
        if (incOrDec) scatterSpeed += 0.01;
        else scatterSpeed -= 0.01;
    }

    setupBuffers(numVertices);
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



/**
 * Toggle canvas when radio button is checked
 */
function myClick() {
    if(document.getElementById("canvas1").checked) {
        animation = 0;
        defAngle = 0;
        scaleSize = 1;
        incOrDec = true;
        nonUniStage = 0;
    }
    else {
        animation = 1;
        defAngle = 0;
        fReset = true;
        count = 0;
        scatterSpeed = 1;
        incOrDec = false;
    }

    resetSecVertices();
    resetSecColors();
    setupBuffers(numVertices);
}