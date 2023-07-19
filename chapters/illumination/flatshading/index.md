Flat Shading 是一种非平滑光照，每一个平面（如三角形）只会计算一次光照结果，随后的渲染中会使用这个光照结果渲染整个面，一般来说会使用面的质心作为整个面的坐标基点。Flat Shading 可以直接在 JavaScript 代码中计算，计算完之后通过缓冲区或者 `uniform` 传递给着色器。

Flat Shading 因其欠佳的光照效果，在如今 GPU/CPU 普遍较强（相比于 19 世纪 80/90 年代）的时代下，在实际应用使用效果较差，使用 Gouraud Shading 和 Phong Shading 这类平滑光照是更好的选择。