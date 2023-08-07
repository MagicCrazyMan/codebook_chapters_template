[Flat Shading](https://en.wikipedia.org/wiki/Shading#Flat_shading) 是一种非平滑光照，每一个平面（如三角形）只会计算一次光照结果，随后的渲染中会使用这个光照结果渲染整个面，一般来说会使用面的质心作为整个面的坐标基点。Flat Shading 可以直接在 JavaScript 代码中完成计算，随后再传递给着色器渲染。

从下面的例子可以看出，因为 Flat Shading 对于每一个表面都仅仅进算了一次光照效果，整个表面的光照效果都被锁定在一个顶点的光照上了，因此其实际上丢失了大量的光照效果，特别是镜面反射的效果，对于画面渲染有要求的情况下基本是不可能使用 Flat Shading 的。

Flat Shading 因其欠佳的光照效果，在如今 GPU/CPU 普遍较强（相比于 19 世纪 80/90 年代）的时代下，在实际应用使用效果较差，使用 Gouraud Shading 和 Phong Shading 这类平滑光照是更好的选择。