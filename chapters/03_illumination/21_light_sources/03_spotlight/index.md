聚光灯是另一种现实中常见的光源。在计算机图形学中可以认为聚光灯是一个带有范围限制的点光源，一般会使用可视角度作为限制条件。运算过程中我们需要计算表面位置光线方向和聚光灯照射方向之间的夹角，如果夹角小于可视角度的限制范围，则认为该位置会受到聚光灯的光照影响，反之将忽略聚光灯的影响。

在实际应用中，为了更好地模拟聚光灯的效果，我们会设置两个可视角度：内圈角度和外圈角度（内圈角度要小于等于外圈角度）。所有被内圈角度的影响位置会受到最高的光照强度 `1`，所有在外圈角度外的位置都不会受到任何光照影响 `0`，而处于内外圈角度的位置将使用平滑采样，采样至 `(0, 1)` 范围，使用 `GLSL` 内置的 `smoothstep` 采样函数。并且为了减少计算量，我们并不会真的去计算表面位置光线方向和聚光灯照射方向之间的夹角，而是将两个向量归一化后计算点积得到余弦值，最后直接比较内外圈角度的余弦值的大小。

此外，聚光灯还需要设置单独的照射方向，这个照射方向可以根据需要随意变化。

```
vec3 spotlightDirection; // spotlight direction, normalized
vec3 lightDirection = normalize(position - lightPosition); // direction from light position to position

float outerLimit = cos(outerAngle);
float innerLimit = cos(innerAngle);

const limit = dot(lightDirection, spotlightDirection);

if (limit >= innerLimit) {
  step = 1.0;
} else if (limit <= outerLimit) {
  step = 0.0;
} else {
  step = smoothstep(outerLimit, innerLimit, limit);
}

vec3 diffuseColor = step * diffuse(); // diffuse() is function calculates diffuse color of this position
vec3 specularColor = step * specular(); // diffuse() is function calculates specular color of this position
```

> 注意 `lightDirection` 和 `spotlightDirection` 的方向，两者的方向都必须是以灯光位置为起点的方向向量

上面的伪代码演示了聚光灯光照效果的具体运算流程，我们只需要将其融合入现有的运算过程中即可。同时注意到，聚光灯的效果是不应该影响环境光反射的。