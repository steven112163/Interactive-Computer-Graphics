/**
 * @file A simple WebGL example for simulating physics
 * @author Yu-Hsun Yuan <steven112163@gmail.com> <yhyuan2@illinois.edu>
 */

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

/** @global WebGL buffer for holding vertices of sphere */
var sphereVertexPositionBuffer;

/** @global WebGL buffer for holding normals of sphere */
var sphereVertexNormalBuffer;

/** @global Buffer for holding sphere's vertices */
let sphereSoup = [];

/** @global Buffer for holding sphere's normals */
let sphereNormals = [];

/** @global Number of triangles of sphere */
var numT;

/** @global Buffer for holding spheres' position, scalar and diffuse */
var spheres = [];

/** @global WebGL buffer for holding vertices of plane*/
var planeVertexPositionBuffer;

/** @global WebGL buffer for holding normals of plane*/
var planeVertexNormalBuffer;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 0.0, 10.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);


// Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 3, -10];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.05, 0.05, 0.05];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [1, 1, 1];


// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0, 1.0, 1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 100;


// Animation parameters
/** @global Milliseconds for animation */
var time;
/** @global Fluid density */
var density = 1.29;
/** @global Drag coefficient */
var dragCoeff = 0.47;
/** @global PI */
var PI = Math.PI;
/** @global Acceleration of gravity */
var acceleration = -9.8;


//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {
    numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
    console.log("Generated ", numT, " triangles");
    console.log("Normals ", sphereNormals.length / 3);
}


//-------------------------------------------------------------------------
/**
 * Generate a sphere
 */
function generateSphere() {
    let translation = [Math.random() * 5 - 2.5, Math.random() * 5 - 2.5, Math.random() * 5 - 2.5];
    let scalar = Math.random() * 0.25 + 0.05;
    let diffuse = [Math.random(), Math.random(), Math.random()];
    spheres.push({translation: translation, scalar: scalar, diffuse: diffuse, velocity: 0.0, direction: -1});
}


//-------------------------------------------------------------------------
/**
 * Setup 5 spheres with random position, size and color
 */
function setupSpheres() {
    for (let i = 0; i < 5; i++)
        generateSphere();
}


//-------------------------------------------------------------------------
/**
 * Setup plane
 */
function setupPlane() {
    let vertices = [-3, -3, 3,
        -3, -3, -3,
        3, -3, -3,
        -3, -3, 3,
        3, -3, -3,
        3, -3, 3,];

    let normals = [];
    for (let i = 0; i < 18; i += 3) {
        normals.push(0);
        normals.push(1);
        normals.push(0);
    }

    // Specify vertices
    planeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    planeVertexPositionBuffer.itemSize = 3;
    planeVertexPositionBuffer.numItems = 6;

    // Specify normals
    planeVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    planeVertexNormalBuffer.itemSize = 3;
    planeVertexNormalBuffer.numItems = 6;
}


//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere() {
    for (let i = 0; i < spheres.length; i++) {
        // Scale and translate every sphere
        let transformedSphereSoup = [];
        for (let j = 0; j < sphereSoup.length; j += 3) {
            transformedSphereSoup.push(sphereSoup[j] * spheres[i].scalar + spheres[i].translation[0]);
            transformedSphereSoup.push(sphereSoup[j + 1] * spheres[i].scalar + spheres[i].translation[1]);
            transformedSphereSoup.push(sphereSoup[j + 2] * spheres[i].scalar + spheres[i].translation[2]);
        }

        // Update diffuse material color/intensity for Phong reflection of every sphere
        gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, spheres[i].diffuse);

        // Specify vertices
        sphereVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transformedSphereSoup), gl.STATIC_DRAW);
        sphereVertexPositionBuffer.itemSize = 3;
        sphereVertexPositionBuffer.numItems = numT * 3;

        // Specify normals
        sphereVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
        sphereVertexNormalBuffer.itemSize = 3;
        sphereVertexNormalBuffer.numItems = numT * 3;

        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        // Draw a sphere
        gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
    }
}


//-------------------------------------------------------------------------
/**
 * Draws a plane from the plane buffer
 */
function drawPlane() {
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, [1.0, 1.0, 1.0]);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, planeVertexPositionBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, planeVertexNormalBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Draw a sphere
    gl.drawArrays(gl.TRIANGLES, 0, planeVertexPositionBuffer.numItems);
}


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
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


//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
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
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
    shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
    shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

    shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} s Specular material color
 */
function uploadMaterialToShader(alpha, a, s) {
    gl.uniform1f(shaderProgram.uniformShininess, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, a);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, s);
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix, eyePt, viewPt, up);

    uploadLightsToShader(lightPosition, lAmbient, lDiffuse, lSpecular);
    uploadMaterialToShader(shininess, kAmbient, kSpecular);
    setMatrixUniforms();

    mvPushMatrix();
    drawSphere();
    mvPopMatrix();
    mvPushMatrix();
    drawPlane();
    mvPopMatrix();
}


//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
    // Update time
    let previousTime = time;
    time = new Date().getTime();
    let currentTime = time;
    let elapsedTime = (currentTime - previousTime) / 1000;

    // Update position, velocity and direction of every sphere
    // Wall is at y = -3
    for (let i = 0; i < spheres.length; i++) {
        if (spheres[i].translation[1] == spheres[i].scalar - 3 && spheres[i].direction == 0)
            continue;

        // Get distance until collision
        let disToColl = Math.abs(spheres[i].translation[1] - spheres[i].scalar + 3);

        // Get current velocity
        let drag = 0.5 * density * Math.pow(spheres[i].velocity, 2)
            * dragCoeff * PI * Math.pow(spheres[i].scalar, 2);
        let currentVelocity = spheres[i].velocity - drag * elapsedTime
            + spheres[i].direction * acceleration * elapsedTime;

        // Get distance
        let distance = (currentVelocity + spheres[i].velocity) / 2 * elapsedTime;

        // Change direction if it has already passed the highest point
        if (currentVelocity < 0 && spheres[i].direction > 0) {
            spheres[i].direction = -spheres[i].direction;
            currentVelocity = -currentVelocity;
        }

        console.log(i, "y", spheres[i].translation[1] - spheres[i].scalar);
        // Sphere and wall will collide
        if (disToColl < distance && spheres[i].direction < 0 && spheres[i].translation[1] > -3) {
            console.log(i, "disToColl", disToColl);
            // Get time needed to collide and remaining time after collision
            let timeNeeded = (Math.sqrt(Math.pow(spheres[i].velocity, 2) - 2 * acceleration * disToColl)
                - spheres[i].velocity) / (-acceleration);
            let remainingTime = elapsedTime - timeNeeded;
            if (remainingTime < 0) {
                spheres[i].direction = 0;
                spheres[i].translation[1] = spheres[i].scalar - 3;
                spheres[i].velocity = 0.0;
                continue;
            }
            console.log(i, "remaining time", remainingTime);

            // Get new velocity after collision and change direction
            let newVelocity = spheres[i].velocity - drag * elapsedTime
                + spheres[i].direction * acceleration * timeNeeded;
            spheres[i].direction = -spheres[i].direction;
            console.log(i, "direction", spheres[i].direction);
            newVelocity *= 0.5;

            // Calculate new position and velocity after collision
            currentVelocity = newVelocity - drag * remainingTime
                + spheres[i].direction * acceleration * remainingTime;
            distance = (currentVelocity + newVelocity) / 2 * remainingTime;
            if (currentVelocity < 0) {
                spheres[i].direction = 0;
                spheres[i].translation[1] = spheres[i].scalar - 3;
                spheres[i].velocity = 0.0;
                continue;
            }

            spheres[i].translation[1] = distance + spheres[i].scalar - 3;
            spheres[i].velocity = currentVelocity;
        } else {
            console.log(i, "here", disToColl);
            spheres[i].translation[1] += spheres[i].direction * distance;
            spheres[i].velocity = currentVelocity;
        }
    }
}


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupSphereBuffers();
    setupSpheres();
    setupPlane();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    time = new Date().getTime();
    document.onkeydown = handleKeyDown;
    canvas.onmousedown = mouseDown;
    tick();
}


//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}


//----------------------------------------------------------------------------------
// Code to handle user interaction of keyboard
function handleKeyDown(event) {
    // Reset
    if (event.key == "=") {
        event.preventDefault();
        spheres = [];
        setupSpheres();
        document.getElementById("nS").value = 5;
    }

    // Add a sphere
    if (event.key == "+") {
        event.preventDefault();
        generateSphere();
        document.getElementById("nS").value++;
    }
}


//----------------------------------------------------------------------------------
// Code to handle user interaction of mouse
function mouseDown(event) {
    event.preventDefault();
    generateSphere();
    document.getElementById("nS").value++;
}