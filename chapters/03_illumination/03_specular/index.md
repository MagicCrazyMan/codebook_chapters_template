[镜面反射（Specular Reflection）](https://en.wikipedia.org/wiki/Specular_reflection)是一种有光泽的表面的反射模型。照射到表面的光线绝大部分都非常接近光线的出射方向，镜子则是一种理想的镜面反射表面，其可能会吸收一部分入射光线，但绝大部分光线都沿着出射方向反射。镜面反射的光照强度受物体表面点到观察者（相机）的方向向量和光线的出射方向向量之间的夹角影响，夹角越小光线强度越大。此外，镜面反射还有一个被称为**高光系数（shininess）**的指数 $\alpha$ 用于反应表面的光照集中程度，$\alpha$ 越大则光线越集中在反射向量附近（即夹角相同时，$\alpha$ 越大光照越亮），一般来说，无限大 $\alpha$ 对应镜子，100 ~ 500 之间的 $\alpha$ 对应大多数金属表面，小于 100 的 $\alpha$ 对应高光区域比较大的区域。

$$
E_s = k_s L_s \max((\vec{r} \cdot \vec{v})^{\alpha}, 0)
$$

同时有：
$$
\vec{r} = 2(\vec{l} \cdot \vec{n}) \vec{n} - \vec{l}
$$

其中， $E_s$ 为物体表面镜面反射颜色；$k_s$ 是物体镜面反射反射率，取值范围 $[0, 1]$；$L_s$ 为镜面反射光照颜色；$\vec{r}$ 为出射光方向向量（归一化）；$\vec{v}$ 为点到观察者的方向向量（归一化）；$\alpha$ 为镜面反射高光系数；$\max$ 为最大值取值函数，其会从 $(\vec{r} \cdot \vec{v})^{\alpha}$ 和 $0$ 中选择较大值，用于排除负值。

> WebGL GLSL 中内置了 `reflect(incidentVector, normalVector)` 函数计算出射光方向向量 $\vec{r}$，本文往后的章节都将使用此函数计算。

部分实现相关内容详细可看[此文章](http://learnwebgl.brown37.net/09_lights/lights_specular.html)

> 在本例渲染中，没有融合漫反射和环境光反射，以便我们更清楚地看到镜面反射的渲染结果。

> 本例使用[点光源](./21_light_sources/01_pointlight)作为光源。且为了更好地展示镜面反射效果，使用 [Phong Shading](./20_shading/02_phongshading) 渲染光照。
