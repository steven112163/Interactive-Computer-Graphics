/**
 * @file A simple WebGL example drawing Illinois logo and own animation
 * @author Steven Yuan <yhyuan2@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global Array holding the triangle vertices of logo I */
var triangleVerticesOfI;

/** @global Array holding the triangle vertices of logo L */
var triangleVerticesOfL;

/** @global Array holding the colors of logo I */
var triangleColorsOfI;

/** @global Array holding the colors of logo L */
var triangleColorsOfL;

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

/** @global The angle of rotation */
var defAngle = 0;

/** @global True for increasing scale size or speed of scattering, false of the otherwise */
var incOrDec = true;

/** @global The value of scaling for first animation */
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

/** @global Time before scattering */
var time = 0;



//----------------------------------------------------------------------------------



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
 * Populate vertex buffer with data of first animation
 * @param {Number} numVertices number of vertices to use in first animation
 */
function loadFirAniVertices(numVertices) {
    vertexPositionBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);

    // Generate the vertex positions
    resetFirVertices();

    // Non-uniform transformation
    nonUniTransform();

    // Fit coordinates into [-1.0, 1.0]
    for (let i = 0; i < triangleVerticesOfI.length; i++)
        triangleVerticesOfI[i] /= 33.0;

    // Buffer vertices of I
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfI), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfI.itemSize = 3;
    vertexPositionBufferOfI.numberOfItems = numVertices;
}



/**
 * Reset triangleVerticesOfI to original logo I for first animation
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
 * Non-uniform transformation directly changes vertex buffer
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
 * Populate vertex buffer with data of second animation
 * @param {Number} numVerticesOfI number of vertices to use for logo I
 * @param {Number} numVerticesOfL number of vertices to use for logo L
 */
function loadSecAniVertices(numVerticesOfI, numVerticesOfL) {
    // Generate the vertex positions if flag fReset is set
    if (fReset) resetSecVertices();

    // Scatter triangles if fReset isn't set, so vertex can be buffered
    if (!fReset) scatterAssemble();

    // Fit coordinates into [-1.0, 1.0], if flag fReset is set
    if (fReset) {
        for (let i = 0; i < triangleVerticesOfI.length; i++) {
            triangleVerticesOfI[i] /= 132.0;
            // Move I to (-0.25, 0, 0)
            if (i % 3 == 0) triangleVerticesOfI[i] -= 0.25;
        }
        for (let i = 0; i < triangleVerticesOfL.length; i++) {
            triangleVerticesOfL[i] /= 132.0;
            // Move L to (0.25, 0, 0)
            if (i % 3 == 0) triangleVerticesOfL[i] += 0.25;
        }
    }

    // Buffer vertices of I
    vertexPositionBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfI), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfI.itemSize = 3;
    vertexPositionBufferOfI.numberOfItems = numVerticesOfI;

    // Buffer vertices of L
    vertexPositionBufferOfL = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfL);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticesOfL), gl.DYNAMIC_DRAW);
    vertexPositionBufferOfL.itemSize = 3;
    vertexPositionBufferOfL.numberOfItems = numVerticesOfL;
}



/**
 * Reset vertices to original logo for second animation
 */
function resetSecVertices() {
    // Reset triangleVerticesOfI
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
 * Scatter or assemble I and L
 */
function scatterAssemble() {
    // Calculate distance that triangles should move in this tick
    let distance = (scatterSpeed*2 + 0.01) * 0.01 / 2;
    // For holding moving direction
    let radian;
    if(!incOrDec) {
        // scatterSpeed is decreasing, and logos are scattering
        // Scatter logo I
        for (let i = 0; i < triangleVerticesOfI.length; i += 9) {
            // Calculate direction
            radian = Math.atan(triangleVerticesOfI[i+1] / triangleVerticesOfI[i]);
            if (triangleVerticesOfI[i] < 0) radian += Math.PI;

            // Update vertices
            triangleVerticesOfI[i] += distance * Math.cos(radian);
            triangleVerticesOfI[i+1] += distance * Math.sin(radian);
            triangleVerticesOfI[i+3] += distance * Math.cos(radian);
            triangleVerticesOfI[i+4] += distance * Math.sin(radian);
            triangleVerticesOfI[i+6] += distance * Math.cos(radian);
            triangleVerticesOfI[i+7] += distance * Math.sin(radian);
        }

        // Scatter logo L
        for (let i = 0; i < triangleVerticesOfL.length; i += 9) {
            // Calculate direction
            radian = Math.atan(triangleVerticesOfL[i+1] / triangleVerticesOfL[i]);
            if (triangleVerticesOfL[i] < 0) radian += Math.PI;

            // Update vertices
            triangleVerticesOfL[i] += distance * Math.cos(radian);
            triangleVerticesOfL[i+1] += distance * Math.sin(radian);
            triangleVerticesOfL[i+3] += distance * Math.cos(radian);
            triangleVerticesOfL[i+4] += distance * Math.sin(radian);
            triangleVerticesOfL[i+6] += distance * Math.cos(radian);
            triangleVerticesOfL[i+7] += distance * Math.sin(radian);
        }
    } else {
        // scatterSpeed is increasing, and logos are assembling
        // Assemble logo I
        for (let i = 0; i < triangleVerticesOfI.length; i += 9) {
            // Calculate direction
            radian = Math.atan(triangleVerticesOfI[i+1] / triangleVerticesOfI[i]);
            if (triangleVerticesOfI[i] < 0) radian += Math.PI;

            // Update vertices
            triangleVerticesOfI[i] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+1] -= distance * Math.sin(radian);
            triangleVerticesOfI[i+3] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+4] -= distance * Math.sin(radian);
            triangleVerticesOfI[i+6] -= distance * Math.cos(radian);
            triangleVerticesOfI[i+7] -= distance * Math.sin(radian);
        }

        // Assemble logo L
        for (let i = 0; i < triangleVerticesOfL.length; i += 9) {
            // Calculate direction
            radian = Math.atan(triangleVerticesOfL[i+1] / triangleVerticesOfL[i]);
            if (triangleVerticesOfL[i] < 0) radian += Math.PI;

            // Update vertices
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
 * Populate color buffer with data of first animation
 * @param {Number} numVertices number of vertices to use in first animation
 */
function loadFirAniColors(numVertices) {
    vertexColorBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);

    // Generate colors
    resetFirColors();

    // Fit colors into [0.0, 255.0]
    for (let i = 0; i < triangleColorsOfI.length; i++)
        triangleColorsOfI[i] /= 255.0;

    // Buffer colors
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColorsOfI), gl.STATIC_DRAW);
    vertexColorBufferOfI.itemSize = 4;
    vertexColorBufferOfI.numItems = numVertices;
}



/**
 * Reset colorsOfI to original color of logo I for first animation
 */
function resetFirColors() {
    triangleColorsOfI = [
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
 * Populate color buffer with data of second animation
 * @param {Number} numVerticesOfI number of vertices to use for logo I
 * @param {Number} numVerticesOfL number of vertices to use for logo L
 */
function loadSecAniColors(numVerticesOfI, numVerticesOfL) {
    // Generate colors
    resetSecColors();

    // Fit colors into [0.0, 255.0]
    for (let i = 0; i < triangleColorsOfI.length; i++)
        triangleColorsOfI[i] /= 255.0;
    for (let i = 0; i < triangleColorsOfL.length; i++)
        triangleColorsOfL[i] /= 255.0;

    // Buffer colors of I
    vertexColorBufferOfI = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColorsOfI), gl.STATIC_DRAW);
    vertexColorBufferOfI.itemSize = 4;
    vertexColorBufferOfI.numItems = numVerticesOfI;

    // Buffer colors of L
    vertexColorBufferOfL = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfL);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColorsOfL), gl.STATIC_DRAW);
    vertexColorBufferOfL.itemSize = 4;
    vertexColorBufferOfL.numItems = numVerticesOfL;
}



/**
 * Reset colors to original logo for second animation
 */
function resetSecColors() {
    // Reset triangleColorsOfI
    resetFirColors();

    triangleColorsOfL = [
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
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
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

    // Draw logo I
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBufferOfI);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
        vertexPositionBufferOfI.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBufferOfI);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
        vertexColorBufferOfI.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBufferOfI.numberOfItems);

    // If we are drawing second animation, draw logo L
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
    // Rotate around y axis
    mat4.fromYRotation(mvMatrix, degToRad(defAngle));
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
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
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

    // Change logo size from small to big and from big to small
    if(scaleSize <= 0) incOrDec = true;
    else if(scaleSize >= 10) incOrDec = false;
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
    // Rotate the logo around y axis
    defAngle = (defAngle + 1) % 360;

    // Always reset vertices and colors unless starting scattering and assembling
    fReset = true;

    if (scatterSpeed <= 0) {
        // Start increasing speed and assembling logos
        incOrDec = true;
    }
    else if (scatterSpeed >= 1) {
        // Start decreasing speed and scattering logos
        incOrDec = false;

        // If logos scatter and then assemble to original location,
        // reset vertices and colors and restart timer
        if (time > 165) {
            time = 0;
            fReset = true;
        }
        time++;
    }

    // Start scattering and assembling
    if (time > 165) {
        fReset = false;
        if (incOrDec) scatterSpeed += 0.01;
        else scatterSpeed -= 0.01;
    }

    setupBuffers(numVertices);
}



/**
 * Toggle canvas when radio button is checked
 */
function myClick() {
    if(document.getElementById("canvas1").checked) {
        // When canvas1 is checked,
        // initialize all variables for starting first animation
        animation = 0;
        defAngle = 0;
        scaleSize = 1;
        incOrDec = true;
        nonUniStage = 0;
    }
    else {
        // When canvas2 is checked,
        // initialize all variables for starting second animation
        animation = 1;
        defAngle = 0;
        fReset = true;
        time = 0;
        scatterSpeed = 1;
        incOrDec = false;
    }

    // Reset vertices and colors and then start drawing
    resetSecVertices();
    resetSecColors();
    setupBuffers(numVertices);
}