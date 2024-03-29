/**
 * @file A simple WebGL example drawing terrain
 * @author Yu-Hsun Yuan <yhyuan2@illinois.edu> <steven112163@gmail.com>
 */

const {mat4, mat3, vec3, quat} = glMatrix;

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the z axis */
var viewRoll = 0.0;

/** @global The speed of flight */
var speed = 0.001;

/** @global Global quaternion */
var quaternion = quat.create();
quat.setAxisAngle(quaternion, [1, 0, 0], 0.0);

/** @global Dictionary of user interactions */
var currentlyPressedKeys = {};

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();

// Initialize the vector....
vec3.set(transformVec, 0.0, 0.0, -2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 0.0, 0.0);
/** @global Temporary location of the camera in world coordinates */
var tempEyePt = vec3.fromValues(0.0, 0.0, 0.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
/** @global Temporary Direction of the view in world coordinates */
var tempViewDir = vec3.fromValues(0.0, 0.0, -1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Temporary up vector for view matrix creation, in world coordinates */
var tempUp = vec3.fromValues(0.0, 1.0, 0.0);
/** @global camera axis of x */
var cameraX = vec3.fromValues(1.0, 0.0, 0.0);
/** @global camera axis of y */
var cameraY = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = vec3.fromValues(0, 3, 3);
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0, 0, 0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [0, 0, 0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0 / 255.0, 163.0 / 255.0, 63.0 / 255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0, 0.0, 0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0, 1.0, 1.0];


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
        false, pMatrix);
}


//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.transpose(nMatrix, nMatrix);
    mat3.invert(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    let copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}


//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


//----------------------------------------------------------------------------------
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
        } catch (e) {
        }
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}


//----------------------------------------------------------------------------------
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


//----------------------------------------------------------------------------------
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

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.lHeightUniform = gl.getUniformLocation(shaderProgram, "lowestHeight");
    shaderProgram.hHeightUniform = gl.getUniformLocation(shaderProgram, "highestHeight");
    shaderProgram.manualUniform = gl.getUniformLocation(shaderProgram, "manualOrNot");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
    shaderProgram.fogUniform = gl.getUniformLocation(shaderProgram, "fogOn");
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha, a, d, s) {
    gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}


//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(128, -1, 1, -1, 1);
    myTerrain.loadBuffers();
}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    let transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix, degToRad(45),
        gl.viewportWidth / gl.viewportHeight,
        0.1, 200.0);

    // Change view direction
    vec3.transformQuat(tempViewDir, tempViewDir, quaternion);
    // Move eye point forward
    let distance = vec3.create();
    vec3.scale(distance, tempViewDir, speed);
    vec3.add(tempEyePt, tempEyePt, distance);
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, tempEyePt, tempViewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix, tempEyePt, viewPt, tempUp);
    //mat4.rotate(mvMatrix, mvMatrix, degToRad(viewRoll), tempViewDir);

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec, 0.0, -0.25, -2.0);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    setMatrixUniforms();
    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);
    gl.uniform1f(shaderProgram.lHeightUniform, myTerrain.lowestHeight);
    gl.uniform1f(shaderProgram.hHeightUniform, myTerrain.highestHeight);

    if (document.getElementById("fogOn").checked)
        gl.uniform1i(shaderProgram.fogUniform, 1);
    else
        gl.uniform1i(shaderProgram.fogUniform, 0);

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked)) {
        gl.uniform1i(shaderProgram.manualUniform, 1);
        setMaterialUniforms(shininess, kAmbient, kTerrainDiffuse, kSpecular);
        myTerrain.drawTriangles();
    }

    if (document.getElementById("wirepoly").checked) {
        gl.uniform1i(shaderProgram.manualUniform, 0);
        setMaterialUniforms(shininess, kAmbient, kEdgeBlack, kSpecular);
        myTerrain.drawEdges();
    }

    if (document.getElementById("wireframe").checked) {
        gl.uniform1i(shaderProgram.manualUniform, 0);
        setMaterialUniforms(shininess, kAmbient, kEdgeWhite, kSpecular);
        myTerrain.drawEdges();
    }
    mvPopMatrix();
}


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(0.0, 204.0 / 255.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    tick();
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
}


//----------------------------------------------------------------------------------
/**
 * Handle user interaction
 */
function handleKeyDown(event) {
    currentlyPressedKeys[event.key] = true;
    event.preventDefault();
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.key] = false;
    event.preventDefault();

    if (!currentlyPressedKeys["ArrowRight"] && !currentlyPressedKeys["ArrowLeft"])
        quat.setAxisAngle(quaternion, [0, 1, 0], 0.0);

    if (!currentlyPressedKeys["ArrowUp"] && !currentlyPressedKeys["ArrowDown"])
        quat.setAxisAngle(quaternion, [1, 0, 0], 0.0);
}

function handleKeys() {
    let workingQuaternion = quat.create();

    // Yaw
    if (currentlyPressedKeys["e"] || currentlyPressedKeys["E"]) {
        // Yaw to right
        quat.setAxisAngle(workingQuaternion, cameraY, degToRad(-0.29));
        quat.multiply(quaternion, workingQuaternion, quaternion);
    }
    if (currentlyPressedKeys["q"] || currentlyPressedKeys["Q"]) {
        // Yaw to left
        quat.setAxisAngle(workingQuaternion, cameraY, degToRad(0.29));
        quat.multiply(quaternion, workingQuaternion, quaternion);
    }

    // Pitch
    if (currentlyPressedKeys["ArrowUp"]) {
        // Pitch up
        quat.setAxisAngle(workingQuaternion, cameraX, degToRad(0.29));

        quat.multiply(quaternion, workingQuaternion, quaternion);
    }
    if (currentlyPressedKeys["ArrowDown"]) {
        // Pitch down
        quat.setAxisAngle(workingQuaternion, cameraX, degToRad(-0.29));
        quat.multiply(quaternion, workingQuaternion, quaternion);
    }

    // Roll
    if (currentlyPressedKeys["ArrowRight"]) {
        // Roll to right
        vec3.rotateZ(tempUp, tempUp, [0, 0, 0], -0.13);
        vec3.rotateZ(cameraX, cameraX, [0, 0, 0], -0.13);
        vec3.rotateZ(cameraY, cameraY, [0, 0, 0], -0.13);
        vec3.rotateZ(lightPosition, lightPosition, [0, 0, 0], 0.13);
    }
    if (currentlyPressedKeys["ArrowLeft"]) {
        // Roll to left
        vec3.rotateZ(tempUp, tempUp, [0, 0, 0], 0.13);
        vec3.rotateZ(cameraX, cameraX, [0, 0, 0], 0.13);
        vec3.rotateZ(cameraY, cameraY, [0, 0, 0], 0.13);
        vec3.rotateZ(lightPosition, lightPosition, [0, 0, 0], -0.13);
    }

    quat.normalize(quaternion, quaternion);

    // Speed
    if (currentlyPressedKeys["+"]) {
        // Speed up
        speed += 0.001;
    }
    if (currentlyPressedKeys["-"]) {
        // Speed down
        speed -= 0.001;
    }

    // Reset
    if (currentlyPressedKeys["="]) {
        viewRoll = 0.0;
        speed = 0.001;
        vec3.copy(tempEyePt, eyePt);
        vec3.copy(tempViewDir, viewDir);
        vec3.copy(tempUp, up);
        lightPosition = vec3.fromValues(0, 3, 3);
        cameraX = vec3.fromValues(1, 0, 0);
        cameraY = vec3.fromValues(0, 1, 0);
    }
}