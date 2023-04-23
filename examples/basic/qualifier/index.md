Three qualifiers are defined in WebGL: `attribute`, `uniform` and `varying`

- `attribute` – Global variables that may change **per vertex**, that are passed from the OpenGL application to vertex shaders. This qualifier can only be used in vertex shaders. For the shader this is a read-only variable.
- `uniform` – Global variables that may change **per primitive**, that are passed from the OpenGL application to the shaders. This qualifier can be used in both vertex and fragment shaders. For the shaders this is a read-only variable.
- `varying` – used for interpolated data between a vertex shader and a fragment shader. Available for writing in the vertex shader, and read-only in a fragment shader.

In this example, color of triangle on the left uses `uniform` and color of triangle on the right uses `varying`.
