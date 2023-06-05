In this chapter, three important features are introduced:

- `gl_FragCoord` in fragment shader: a window relative coordinate for current fragment ([read in details](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_FragCoord.xhtml)).
- `gl_PointCoord` in fragment shader: a two-dimensional coordinate indicating the position in the scoped coordinate system of current drawing point defined by `gl_Position` and `gl_PointSize` in vertex shader. ([read in details](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_PointCoord.xhtml))
- `discard` in fragment shader: discard current fragment and do nothing