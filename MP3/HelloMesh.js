/**
 * @file A simple WebGL example for viewing meshes read from OBJ files
 * @author Yu-Hsun Yuan <steven112163@gmail.com> <yhyuan2@illinois.edu>
 */

const {mat4, mat3, vec3} = glMatrix;

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program for objects */
var objectShaderProgram;

/** @global A simple GLSL shader program for sky box */
var skyBoxShaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

/** @global A texture cube map */
var texture;

/** @global Vertex buffer for holding vertices of sky box */
var vBuffer;

/** @global Normal buffer for holding normals of sky box */
var nBuffer;

/** @global Face buffer for holding triangles of sky box */
var fBuffer;

/** @global WebGL buffer for holding vertices of sky box */
var vertexBuffer;

/** @global WebGL buffer for holding normals of sky box */
var normalBuffer;

/** @global WebGL buffer for holding triangles of sky box */
var faceBuffer;

/** @global Check whether sky box is set */
var skySetOrNot = false;

/** @global Object degree of x */
var objectX = 0;

/** @global Object degree of y */
var objectY = 0;

/** @global Camera degree of y */
var eulerY = 0;

/** @global Camera distance from origin*/
var eyeDistance = 1;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 0.0, 1.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1, 1, 1]; // 0 5 5
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.05, 0.05, 0.05];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [1, 1, 1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [153.0 / 255.0, 102.0 / 255.0, 51.0 / 255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0, 1.0, 1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 100;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0, 1.0, 1.0];


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupMesh("teapot_0.obj");
    setupCubeMap();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    tick();
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
 * Setup and attach shaders of objects and sky box
 */
function setupShaders() {
    // Setup object shaders
    let vertexShader = loadShaderFromDOM("shader-vs");
    let fragmentShader = loadShaderFromDOM("shader-fs");

    objectShaderProgram = gl.createProgram();
    gl.attachShader(objectShaderProgram, vertexShader);
    gl.attachShader(objectShaderProgram, fragmentShader);
    gl.linkProgram(objectShaderProgram);

    if (!gl.getProgramParameter(objectShaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup object shaders");
    }

    // Setup sky box shaders
    vertexShader = loadShaderFromDOM("skybox-shader-vs");
    fragmentShader = loadShaderFromDOM("skybox-shader-fs");

    skyBoxShaderProgram = gl.createProgram();
    gl.attachShader(skyBoxShaderProgram, vertexShader);
    gl.attachShader(skyBoxShaderProgram, fragmentShader);
    gl.linkProgram(skyBoxShaderProgram);

    if (!gl.getProgramParameter(skyBoxShaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup sky box shaders");
    }
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
 * Populate buffers with data
 */
function setupMesh(filename) {
    myMesh = new TriMesh();
    let myPromise = asyncGetFile(filename);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    myPromise.then((retrievedText) => {
        myMesh.loadFromOBJ(retrievedText);
        console.log("Yay! got the file");
    }).catch(
        // Log the rejection reason
        (reason) => {
            console.log("Handle rejected promise (" + reason + ") here.");
        });
}


//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
    console.log("Getting text file");
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
        console.log("Made promise");
    });
}


//----------------------------------------------------------------------------------
/**
 * Setup cube map
 */
function setupCubeMap() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    let faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: 'images/pos-x.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: 'images/neg-x.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: 'images/pos-y.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: 'images/neg-y.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: 'images/pos-z.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: 'images/neg-z.jpg',
        },
    ];

    let level = 0;
    let internalFormat = gl.RGBA;
    let width = 2048;
    let height = 2048;
    let border = 0;
    let format = gl.RGBA;
    let type = gl.UNSIGNED_BYTE;
    faceInfos.forEach((faceInfo) => {
        let {target, url} = faceInfo;

        // setup each face so it's immediately renderable
        gl.texImage2D(target, level, internalFormat, width, height, border, format, type, null);

        // Asynchronously load an image
        let image = new Image();
        image.src = url;
        // Now that the image has loaded make copy it to the texture.
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            console.log(url + " loaded");
        };
    });
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}


//----------------------------------------------------------------------------------
/**
 * Update any model transformations
 */
function animate() {
    document.getElementById("oX").value = objectX;
    document.getElementById("oY").value = objectY;
    document.getElementById("eY").value = eulerY;
    document.getElementById("eZ").value = eyePt[2];
}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    //console.log("function draw()")
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix, degToRad(45),
        gl.viewportWidth / gl.viewportHeight,
        0.1, 500.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);

    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(vMatrix, eyePt, viewPt, up);

    // Draw Mesh
    // ADD an if statement to prevent early drawing of myMesh
    if (!myMesh.loaded())
        return;
    mvPushMatrix();
    drawObjects();
    mvPopMatrix();

    // Draw sky box
    mvPushMatrix();
    if (!skySetOrNot) {
        skySetOrNot = true;
        setupSkybox();
    }
    drawSkyBox();
    mvPopMatrix();
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
 * Draw objects
 */
function drawObjects() {
    setupObjShaders();

    // Get axis-aligned box
    let minXYZ = [3], maxXYZ = [3];
    myMesh.getAABB(minXYZ, maxXYZ);

    // Scale box
    let max = maxXYZ[0] - minXYZ[0];
    if (max < maxXYZ[1] - minXYZ[1])
        max = maxXYZ[1] - minXYZ[1];
    else if (max < maxXYZ[2] - minXYZ[2])
        max = maxXYZ[2] - minXYZ[2];
    mat4.scale(mvMatrix, mvMatrix, [0.5 / max, 0.5 / max, 0.5 / max]);

    // Rotate box
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(objectY));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(objectX));

    // Translate box
    mat4.translate(mvMatrix, mvMatrix, [-(maxXYZ[0] + minXYZ[0]) / 2,
        -(maxXYZ[1] + minXYZ[1]) / 2,
        -(maxXYZ[2] + minXYZ[2]) / 2]);

    setWorldUniforms();
    mat4.multiply(mvMatrix, vMatrix, mvMatrix);
    setMatrixUniforms();
    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked)) {
        setMaterialUniforms(shininess, kAmbient, kTerrainDiffuse, kSpecular);
        myMesh.drawTriangles();
    }

    if (document.getElementById("wirepoly").checked) {
        setMaterialUniforms(shininess, kAmbient, kEdgeBlack, kSpecular);
        myMesh.drawEdges();
    }

    if (document.getElementById("wireframe").checked) {
        setMaterialUniforms(shininess, kAmbient, kEdgeWhite, kSpecular);
        myMesh.drawEdges();
    }
}


//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for objects
 */
function setupObjShaders() {
    gl.useProgram(objectShaderProgram);

    objectShaderProgram.vertexPositionAttribute = gl.getAttribLocation(objectShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(objectShaderProgram.vertexPositionAttribute);

    objectShaderProgram.vertexNormalAttribute = gl.getAttribLocation(objectShaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(objectShaderProgram.vertexNormalAttribute);

    objectShaderProgram.mMatrixUniform = gl.getUniformLocation(objectShaderProgram, "uMMatrix");
    objectShaderProgram.mvMatrixUniform = gl.getUniformLocation(objectShaderProgram, "uMVMatrix");
    objectShaderProgram.pMatrixUniform = gl.getUniformLocation(objectShaderProgram, "uPMatrix");
    objectShaderProgram.nMatrixUniform = gl.getUniformLocation(objectShaderProgram, "uNMatrix");
    objectShaderProgram.wNMatrixUniform = gl.getUniformLocation(objectShaderProgram, "uWNMatrix");
    objectShaderProgram.uniformLightPositionLoc = gl.getUniformLocation(objectShaderProgram, "uLightPosition");
    objectShaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(objectShaderProgram, "uAmbientLightColor");
    objectShaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(objectShaderProgram, "uDiffuseLightColor");
    objectShaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(objectShaderProgram, "uSpecularLightColor");
    objectShaderProgram.uniformShininessLoc = gl.getUniformLocation(objectShaderProgram, "uShininess");
    objectShaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(objectShaderProgram, "uKAmbient");
    objectShaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(objectShaderProgram, "uKDiffuse");
    objectShaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(objectShaderProgram, "uKSpecular");

    objectShaderProgram.worldEyeUniform = gl.getUniformLocation(objectShaderProgram, "worldEye");

    objectShaderProgram.cubeMapUniform = gl.getUniformLocation(objectShaderProgram, "cubeMap");
    gl.uniform1i(objectShaderProgram.cubeMapUniform, 0);

    objectShaderProgram.typeUniform = gl.getUniformLocation(objectShaderProgram, "type");
    // Phong or Reflection or Refraction
    if (document.getElementById("Phong").checked)
        gl.uniform1i(objectShaderProgram.typeUniform, 0);
    else if (document.getElementById("Reflection").checked)
        gl.uniform1i(objectShaderProgram.typeUniform, 1);
    else
        gl.uniform1i(objectShaderProgram.typeUniform, 2);
}


//----------------------------------------------------------------------------------
/**
 * Setup sky box
 */
function setupSkybox() {
    // Get axis-aligned box
    let minXYZ = [3], maxXYZ = [3];
    myMesh.getAABB(minXYZ, maxXYZ);

    // Calculate box distance from origin
    let max = maxXYZ[0] - minXYZ[0];
    if (max < maxXYZ[1] - minXYZ[1])
        max = maxXYZ[1] - minXYZ[1];
    else if (max < maxXYZ[2] - minXYZ[2])
        max = maxXYZ[2] - minXYZ[2];
    let distance = max / 2.0 * 3.0;

    vBuffer = [distance, -distance, distance,
        distance, -distance, -distance,
        -distance, -distance, -distance,
        -distance, -distance, distance,
        distance, distance, distance,
        distance, distance, -distance,
        -distance, distance, -distance,
        -distance, distance, distance];

    let root3 = 1.0 / Math.sqrt(3);
    nBuffer = [root3, -root3, root3,
        root3, -root3, -root3,
        -root3, -root3, -root3,
        -root3, -root3, root3,
        root3, root3, root3,
        root3, root3, -root3,
        -root3, root3, -root3,
        -root3, root3, root3];

    fBuffer = [0, 2, 3,
        0, 1, 2,
        0, 3, 7,
        0, 7, 4,
        0, 4, 1,
        1, 4, 5,
        1, 5, 2,
        2, 5, 6,
        2, 6, 3,
        3, 6, 7,
        4, 7, 6,
        4, 6, 5];

    loadSkyBox();
}

//----------------------------------------------------------------------------------
/**
 * Load buffers of sky box
 */
function loadSkyBox() {
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vBuffer), gl.STATIC_DRAW);
    vertexBuffer.itemSize = 3;
    vertexBuffer.numItems = vBuffer.length / 3;
    console.log("Loaded ", vertexBuffer.numItems, " vertices of sky box");

    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nBuffer), gl.STATIC_DRAW);
    normalBuffer.itemSize = 3;
    normalBuffer.numItems = nBuffer.length / 3;
    console.log("Loaded ", normalBuffer.numItems, " normals of sky box");

    faceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(fBuffer), gl.STATIC_DRAW);
    faceBuffer.itemSize = 1;
    faceBuffer.numItems = fBuffer.length;
    console.log("Loaded ", faceBuffer.numItems / 3, " triangles of sky box");
}


//----------------------------------------------------------------------------------
/**
 * Draw sky box
 */
function drawSkyBox() {
    setupSkyShaders();

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(skyBoxShaderProgram.vertexPositionAttribute, vertexBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(skyBoxShaderProgram.vertexNormalAttribute, normalBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuffer);
    gl.drawElements(gl.TRIANGLES, faceBuffer.numItems, gl.UNSIGNED_INT, 0);
}


//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for sky box
 */
function setupSkyShaders() {
    gl.useProgram(skyBoxShaderProgram);

    skyBoxShaderProgram.vertexPositionAttribute = gl.getAttribLocation(skyBoxShaderProgram, "aVertex");
    gl.enableVertexAttribArray(skyBoxShaderProgram.vertexPositionAttribute);

    skyBoxShaderProgram.vertexNormalAttribute = gl.getAttribLocation(skyBoxShaderProgram, "aNormal");
    gl.enableVertexAttribArray(skyBoxShaderProgram.vertexNormalAttribute);

    mat4.multiply(mvMatrix, vMatrix, mvMatrix);
    skyBoxShaderProgram.mvMatrixUniform = gl.getUniformLocation(skyBoxShaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(skyBoxShaderProgram.mvMatrixUniform, false, mvMatrix);
    skyBoxShaderProgram.pMatrixUniform = gl.getUniformLocation(skyBoxShaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(skyBoxShaderProgram.pMatrixUniform, false, pMatrix);
    skyBoxShaderProgram.cubeMapUniform = gl.getUniformLocation(skyBoxShaderProgram, "cubeMap");
    gl.uniform1i(skyBoxShaderProgram.cubeMapUniform, 0);
}


//----------------------------------------------------------------------------------
/**
 * Sends eye position, Model matrix and normal matrix to shader
 */
function setWorldUniforms() {
    uploadEyePositionToShader();
    uploadModelMatrixToShader();
    uploadWorldNormalToShader();
}


//-------------------------------------------------------------------------
/**
 * Sends eye position to shader
 */
function uploadEyePositionToShader() {
    gl.uniform3fv(objectShaderProgram.worldEyeUniform, eyePt);
}


//-------------------------------------------------------------------------
/**
 * Sends Model matrix to shader
 */
function uploadModelMatrixToShader() {
    gl.uniformMatrix4fv(objectShaderProgram.mMatrixUniform, false, mvMatrix);
}


//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadWorldNormalToShader() {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.invert(nMatrix, nMatrix);
    mat3.transpose(nMatrix, nMatrix);
    gl.uniformMatrix3fv(objectShaderProgram.wNMatrixUniform, false, nMatrix);
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


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(objectShaderProgram.mvMatrixUniform, false, mvMatrix);
}


//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.invert(nMatrix, nMatrix);
    mat3.transpose(nMatrix, nMatrix);
    gl.uniformMatrix3fv(objectShaderProgram.nMatrixUniform, false, nMatrix);
}


//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(objectShaderProgram.pMatrixUniform, false, pMatrix);
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
    gl.uniform1f(objectShaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(objectShaderProgram.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(objectShaderProgram.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(objectShaderProgram.uniformSpecularMaterialColorLoc, s);
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
    gl.uniform3fv(objectShaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(objectShaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(objectShaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(objectShaderProgram.uniformSpecularLightColorLoc, s);
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
//Code to handle user interaction
var currentlyPressedKeys = {};


function handleKeyDown(event) {
    //console.log("Key down ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = true;

    // Orbit eye
    if (currentlyPressedKeys["ArrowLeft"]) {
        // Right cursor key
        event.preventDefault();
        eulerY -= 1;
        vec3.rotateY(lightPosition, lightPosition, [0, 0, 0], degToRad(1));
    } else if (currentlyPressedKeys["ArrowRight"]) {
        // Left cursor key
        event.preventDefault();
        eulerY += 1;
        vec3.rotateY(lightPosition, lightPosition, [0, 0, 0], degToRad(-1));
    }

    // Zoom
    if (currentlyPressedKeys["ArrowUp"]) {
        // Up cursor key
        event.preventDefault();
        eyeDistance += 0.01;
    } else if (currentlyPressedKeys["ArrowDown"]) {
        // Down cursor key
        event.preventDefault();
        eyeDistance -= 0.01;
    }

    // Yaw
    if (currentlyPressedKeys["a"] || currentlyPressedKeys["A"]) {
        // key A
        event.preventDefault();
        objectY -= 1;
    } else if (currentlyPressedKeys["d"] || currentlyPressedKeys["D"]) {
        // key D
        event.preventDefault();
        objectY += 1;
    }
    objectY = (objectY + 360) % 360;

    // Pitch
    if (currentlyPressedKeys["w"] || currentlyPressedKeys["W"]) {
        // key W
        event.preventDefault();
        objectX -= 1;
    } else if (currentlyPressedKeys["s"] || currentlyPressedKeys["S"]) {
        // key S
        event.preventDefault();
        objectX += 1;
    }
    objectX = (objectX + 360) % 360;

    if (eyeDistance < 0.1)
        eyeDistance = 0.1;

    eyePt = vec3.fromValues(eyeDistance * Math.sin(degToRad(eulerY)), 0.0, eyeDistance * Math.cos(degToRad(eulerY)));
    viewDir = vec3.fromValues(-Math.sin(degToRad(eulerY)), 0.0, -Math.cos(degToRad(eulerY)));
}


function handleKeyUp(event) {
    //console.log("Key up ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = false;
}