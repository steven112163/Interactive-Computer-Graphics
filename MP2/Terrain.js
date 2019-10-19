/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */


/** Class implementing 3D terrain. */
class Terrain {
    /**
     * Initialize members of a Terrain object
     * @param {number} div Number of triangles along x axis and y axis
     * @param {number} minX Minimum X coordinate value
     * @param {number} maxX Maximum X coordinate value
     * @param {number} minY Minimum Y coordinate value
     * @param {number} maxY Maximum Y coordinate value
     */
    constructor(div, minX, maxX, minY, maxY) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;

        this.lowestHeight = 0;
        this.highestHeight = 0;

        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.setHeightsByPartition(100, 0.005);
        console.log("Terrain: Set heights");

        this.setNormals();
        console.log("Terrain: Set normals");

        this.generateLines();
        console.log("Terrain: Generated lines");

        // Get extension for 4 byte integer indices for drwElements
        let ext = gl.getExtension('OES_element_index_uint');
        if (ext == null) {
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }


    //-------------------------------------------------------------------------------
    /**
     * Set the x,y,z coords of a vertex at location(i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    setVertex(v, i, j) {
        let vid = 3 * (i * (this.div + 1) + j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];
    }


    //-------------------------------------------------------------------------------
    /**
     * Return the x,y,z coordinates of a vertex at location (i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    getVertex(v, i, j) {
        let vid = 3 * (i * (this.div + 1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
    }


    //-------------------------------------------------------------------------------
    /**
     * Send the buffer objects to WebGL for rendering
     */
    loadBuffers() {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
            gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
            gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
            gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
        //this.printBuffers();
    }


    //-------------------------------------------------------------------------------
    /**
     * Render the triangles
     */
    drawTriangles() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
            this.VertexNormalBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT, 0);
    }


    //-------------------------------------------------------------------------------
    /**
     * Render the triangle edges wireframe style
     */
    drawEdges() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
            this.VertexNormalBuffer.itemSize,
            gl.FLOAT, false, 0, 0);

        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT, 0);
    }


    //-------------------------------------------------------------------------------
    /**
     * Fill the vertex and buffer arrays
     */
    generateTriangles() {
        let deltaX = (this.maxX - this.minX) / this.div;
        let deltaY = (this.maxY - this.minY) / this.div;

        for (let i = 0; i <= this.div; i++)
            for (let j = 0; j <= this.div; j++) {
                this.vBuffer.push(this.minX + deltaX * j);
                this.vBuffer.push(this.minY + deltaY * i);
                this.vBuffer.push(0);
            }

        for (let i = 0; i < this.div; i++)
            for (let j = 0; j < this.div; j++) {
                let vid = i * (this.div + 1) + j;
                this.fBuffer.push(vid);
                this.fBuffer.push(vid + 1);
                this.fBuffer.push(vid + (this.div + 1));

                this.fBuffer.push(vid + 1);
                this.fBuffer.push((vid + 1) + (this.div + 1));
                this.fBuffer.push(vid + (this.div + 1));
            }

        this.numVertices = this.vBuffer.length / 3;
        this.numFaces = this.fBuffer.length / 3;
    }


    //-------------------------------------------------------------------------------
    /**
     * Set the vertex heights according to a slow but noise generation algorithm.
     * We repeatedly partition the terrain using a random cutting plane. On one side of the plane
     * we raise the terrain, and on the other we lower it.
     * @param {number} N the number of times to partition the terrain grad and adjust
     *                  the heights on each side
     * @param {number} delta the amount to raise (and lower) the partitioned vertices
     */
    setHeightsByPartition(N, delta) {
        let p = vec3.create();
        let n = vec3.create();
        let radian;
        let vertex = vec3.create();
        let vecPtoVertex = vec3.create();

        for (let times = 0; times < N; times++) {
            // Get a random point p in the plane
            vec3.set(p, Math.random() - this.maxX, Math.random() - this.maxY, 0);

            // Get a random normal of the plane
            radian = (Math.random() * 360) * Math.PI / 180;
            vec3.set(n, Math.cos(radian), Math.sin(radian), 0);

            // Move every vertex's position according to its side
            for (let i = 0; i <= this.div; i++)
                for (let j = 0; j <= this.div; j++) {
                    this.getVertex(vertex, i, j);

                    vec3.subtract(vecPtoVertex, vertex, p);
                    vertex[2] += (vec3.dot(vecPtoVertex, n) >= 0) ? (delta) : (-delta);

                    this.setVertex(vertex, i, j);
                }
        }

        // Make the terrain smoother
        for (let i = 1; i < this.div; i++)
            for (let j = 1; j < this.div; j++) {
                this.getVertex(vertex, i, j);

                let neighbors = [];
                for (let k = 0; k < 8; k++)
                    neighbors.push(vec3.create());
                this.getVertex(neighbors[0], i, j + 1);
                this.getVertex(neighbors[1], i + 1, j + 1);
                this.getVertex(neighbors[2], i + 1, j);
                this.getVertex(neighbors[3], i + 1, j - 1);
                this.getVertex(neighbors[4], i, j - 1);
                this.getVertex(neighbors[5], i - 1, j - 1);
                this.getVertex(neighbors[6], i - 1, j);
                this.getVertex(neighbors[7], i - 1, j + 1);

                let average = 4 * vertex[2];
                for (let k = 0; k < 8; k++)
                    if (k % 2 == 0)
                        average += 2 * neighbors[k][2];
                    else
                        average += neighbors[k][2];
                average /= 16;
                vertex[2] = average;
                this.setVertex(vertex, i, j);
            }

        // Find the lowest position
        this.getVertex(vertex, 0, 0);
        let min = vertex[2];
        for (let i = 0; i <= this.div; i++)
            for (let j = 0; j <= this.div; j++) {
                this.getVertex(vertex, i, j);
                min = (vertex[2] < min) ? vertex[2] : min;
            }

        // Move the whole place so that the lowest vertex's z is 0
        min = 0 - min;
        for (let i = 0; i <= this.div; i++)
            for (let j = 0; j <= this.div; j++) {
                this.getVertex(vertex, i, j);
                vertex[2] += min;
                this.setVertex(vertex, i, j);
            }

        // Set lowest and highest height
        this.getVertex(vertex, 0, 0);
        this.lowestHeight = vertex[2];
        this.highestHeight = vertex[2];
        for (let i = 0; i <= this.div; i++)
            for (let j = 0; j <= this.div; j++) {
                this.getVertex(vertex, i, j);
                this.lowestHeight = (vertex[2] < this.lowestHeight) ? vertex[2] : this.lowestHeight;
                this.highestHeight = (vertex[2] > this.highestHeight) ? vertex[2] : this.highestHeight;
            }
    }


    //-------------------------------------------------------------------------------
    /**
     * Set normal vector to every vertex
     */
    setNormals() {
        let vertex = vec3.create();
        let vNormal = vec3.create();
        let a = vec3.create();
        let b = vec3.create();
        let crossProduct = vec3.create();

        for (let i = 0; i <= this.div; i++)
            for (let j = 0; j <= this.div; j++) {
                this.getVertex(vertex, i, j);
                vec3.set(vNormal, 0, 0, 0);

                if ((0 < i && i < this.div) && (0 < j && j < this.div)) { // vertices in the plane
                    // Get all neighbors
                    let neighbors = [];
                    for (let k = 0; k < 6; k++)
                        neighbors.push(vec3.create());
                    this.getVertex(neighbors[0], i, j + 1);
                    this.getVertex(neighbors[1], i + 1, j);
                    this.getVertex(neighbors[2], i + 1, j - 1);
                    this.getVertex(neighbors[3], i, j - 1);
                    this.getVertex(neighbors[4], i - 1, j);
                    this.getVertex(neighbors[5], i - 1, j + 1);

                    // Calculate normals of neighbor surfaces
                    let neiSurfaceNormals = [];
                    for (let k = 0; k < 6; k++) {
                        vec3.subtract(a, neighbors[k], vertex);
                        vec3.subtract(b, neighbors[(k + 1) % 6], vertex);
                        vec3.cross(crossProduct, a, b);
                        neiSurfaceNormals.push(crossProduct);
                    }

                    // Sum all neighbor normals and normalize
                    for (let k = 0; k < 6; k++)
                        vec3.add(vNormal, vNormal, neiSurfaceNormals[k]);
                    vec3.normalize(vNormal, vNormal);
                } else if ((i == 0 && j == 0) || (i == this.div && j == this.div) ||
                    (i == 0 && j == this.div) || (i == this.div && j == 0)) { // vertices at four corners
                    // Get all neighbors according to location of the vertex
                    let neighbors = [];
                    if (i == 0 && j == 0) {
                        // vertex at the left bottom corner
                        this.getVertex(a, i, j + 1);
                        this.getVertex(b, i + 1, j);
                    } else if (i == this.div && j == this.div) {
                        // vertex at the right top corner
                        this.getVertex(a, i, j - 1);
                        this.getVertex(b, i - 1, j);
                    } else if (i == 0 && j == this.div) {
                        // vertex at the right bottom corner
                        for (let k = 0; k < 3; k++)
                            neighbors.push(vec3.create());
                        this.getVertex(neighbors[0], i + 1, j);
                        this.getVertex(neighbors[1], i + 1, j - 1);
                        this.getVertex(neighbors[2], i, j - 1);
                    } else {
                        // vertex at the left top corner
                        for (let k = 0; k < 3; k++)
                            neighbors.push(vec3.create());
                        this.getVertex(neighbors[0], i - 1, j);
                        this.getVertex(neighbors[1], i - 1, j + 1);
                        this.getVertex(neighbors[2], i, j + 1);
                    }

                    if ((i == 0 && j == 0) || (i == this.div && j == this.div)) {
                        // vertex at left bottom or right top corner
                        vec3.subtract(a, a, vertex);
                        vec3.subtract(b, b, vertex);
                        vec3.cross(vNormal, a, b);
                        vec3.normalize(vNormal, vNormal);
                    } else {
                        // vertex at right bottom or left top corner
                        // Calculate normals of neighbor surfaces
                        let neiSurfaceNormals = [];
                        for (let k = 0; k < 2; k++) {
                            vec3.subtract(a, neighbors[k], vertex);
                            vec3.subtract(b, neighbors[k + 1], vertex);
                            vec3.cross(crossProduct, a, b);
                            neiSurfaceNormals.push(crossProduct);
                        }

                        // Sum all neighbor normals and normalize
                        for (let k = 0; k < 2; k++)
                            vec3.add(vNormal, vNormal, neiSurfaceNormals[k]);
                        vec3.normalize(vNormal, vNormal);
                    }
                } else { // vertices at the edges
                    let neighbors = [];
                    for (let k = 0; k < 4; k++)
                        neighbors.push(vec3.create());

                    // Get all neighbors according to location of the vertex
                    if (i == 0) {
                        // vertices at bottom edge
                        this.getVertex(neighbors[0], i, j + 1);
                        this.getVertex(neighbors[1], i + 1, j);
                        this.getVertex(neighbors[2], i + 1, j - 1);
                        this.getVertex(neighbors[3], i, j - 1);
                    } else if (j == 0) {
                        // vertices at left edge
                        this.getVertex(neighbors[0], i - 1, j);
                        this.getVertex(neighbors[1], i - 1, j + 1);
                        this.getVertex(neighbors[2], i, j + 1);
                        this.getVertex(neighbors[3], i + 1, j);
                    } else if (i == this.div) {
                        // vertices at top edge
                        this.getVertex(neighbors[0], i, j - 1);
                        this.getVertex(neighbors[1], i - 1, j);
                        this.getVertex(neighbors[2], i - 1, j + 1);
                        this.getVertex(neighbors[3], i, j + 1);
                    } else {
                        // vertices at right edge
                        this.getVertex(neighbors[0], i + 1, j);
                        this.getVertex(neighbors[1], i + 1, j - 1);
                        this.getVertex(neighbors[2], i, j - 1);
                        this.getVertex(neighbors[3], i - 1, j);
                    }

                    let neiSurfaceNormals = [];
                    for (let k = 0; k < 3; k++) {
                        vec3.subtract(a, neighbors[k], vertex);
                        vec3.subtract(b, neighbors[k + 1], vertex);
                        vec3.cross(crossProduct, a, b);
                        neiSurfaceNormals.push(crossProduct);
                    }

                    for (let k = 0; k < 3; k++)
                        vec3.add(vNormal, vNormal, neiSurfaceNormals[k]);
                    vec3.normalize(vNormal, vNormal);
                }

                this.nBuffer.push(vNormal[0]);
                this.nBuffer.push(vNormal[1]);
                this.nBuffer.push(vNormal[2]);
            }
    }


    //-------------------------------------------------------------------------------
    /**
     * Print vertices and triangles to console for debugging
     */
    printBuffers() {
        for (let i = 0; i < this.numVertices; i++) {
            console.log("v ", this.vBuffer[i * 3], " ",
                this.vBuffer[i * 3 + 1], " ",
                this.vBuffer[i * 3 + 2], " ");

        }

        for (let i = 0; i < this.numFaces; i++) {
            console.log("f ", this.fBuffer[i * 3], " ",
                this.fBuffer[i * 3 + 1], " ",
                this.fBuffer[i * 3 + 2], " ");

        }

    }


    //-------------------------------------------------------------------------------
    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateLines() {
        let numTris = this.fBuffer.length / 3;
        for (let f = 0; f < numTris; f++) {
            let fid = f * 3;
            this.eBuffer.push(this.fBuffer[fid]);
            this.eBuffer.push(this.fBuffer[fid + 1]);

            this.eBuffer.push(this.fBuffer[fid + 1]);
            this.eBuffer.push(this.fBuffer[fid + 2]);

            this.eBuffer.push(this.fBuffer[fid + 2]);
            this.eBuffer.push(this.fBuffer[fid]);
        }

    }

}