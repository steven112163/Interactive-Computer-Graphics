/**
 * @fileoverview simpleModeling - A sphere generated from tetrahedron with subdivision for use with WebGL
 * @author Yu-Hsun Yuan <steven112163@gmail.com> <yhyuan2@illinois.edu>
 */


//----------------------------------------------------------------------------------
/**
 * Push vertex into array
 * @param {Object} v Vertex
 * @param {Float32Array} vArray Array of vertices
 */
function pushVertex(v, vArray) {
    for (let i = 0; i < 3; i++) {
        vArray.push(v[i]);
    }
}


//----------------------------------------------------------------------------------
/**
 * Recursively subdivide triangles
 * @param {Object} a A corner of triangle
 * @param {Object} b A corner of triangle
 * @param {Object} c A corner of triangle
 * @param {Number} numSubDivs Number of times of subdivision
 * @param {Float32Array} vertexArray Array of vertices
 * @param {Float32Array} normalArray Array of normals
 * @return {Number} Number of triangles generated from subdivision
 */
function sphDivideTriangle(a, b, c, numSubDivs,
                           vertexArray, normalArray) {
    if (numSubDivs > 0) {
        let numT = 0;

        let ab = vec4.create();
        vec4.lerp(ab, a, b, 0.5);
        vec4.normalize(ab, ab);

        let ac = vec4.create();
        vec4.lerp(ac, a, c, 0.5);
        vec4.normalize(ac, ac);

        let bc = vec4.create();
        vec4.lerp(bc, b, c, 0.5);
        vec4.normalize(bc, bc);

        numT += sphDivideTriangle(a, ab, ac, numSubDivs - 1, vertexArray, normalArray);
        numT += sphDivideTriangle(ab, b, bc, numSubDivs - 1, vertexArray, normalArray);
        numT += sphDivideTriangle(bc, c, ac, numSubDivs - 1, vertexArray, normalArray);
        numT += sphDivideTriangle(ab, bc, ac, numSubDivs - 1, vertexArray, normalArray);

        return numT;
    } else {
        // Add 3 vertices to the array
        pushVertex(a, vertexArray);
        pushVertex(b, vertexArray);
        pushVertex(c, vertexArray);

        // Normals are the same as the vertices for a sphere
        pushVertex(a, normalArray);
        pushVertex(b, normalArray);
        pushVertex(c, normalArray);

        return 1;
    }
}


//----------------------------------------------------------------------------------
/**
 * Recursively subdivide triangles to form a sphere
 * @param {Number} numSubDivs Number of times of subdivision
 * @param {Float32Array} vertexArray Array of vertices
 * @param {Float32Array} normalArray Array of normals
 * @return {Number} Number of triangles generated from subdivision
 */
function sphereFromSubdivision(numSubDivs, vertexArray, normalArray) {
    let numT = 0;
    let a = vec4.fromValues(0.0, 0.0, -1.0, 0);
    let b = vec4.fromValues(0.0, 0.942809, 0.333333, 0);
    let c = vec4.fromValues(-0.816497, -0.471405, 0.333333, 0);
    let d = vec4.fromValues(0.816497, -0.471405, 0.333333, 0);

    numT += sphDivideTriangle(a, b, c, numSubDivs, vertexArray, normalArray);
    numT += sphDivideTriangle(d, c, b, numSubDivs, vertexArray, normalArray);
    numT += sphDivideTriangle(a, d, b, numSubDivs, vertexArray, normalArray);
    numT += sphDivideTriangle(a, c, d, numSubDivs, vertexArray, normalArray);

    return numT;
}