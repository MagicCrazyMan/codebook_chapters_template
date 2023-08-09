[Blinn-Phong Shading](https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model) 是 Phong Shading 的改进版，其将镜面反射

$$
E_s = k_s L_s \max((\vec{r} \cdot \vec{v})^{\alpha}, 0)
$$

$$
\vec{r} = 2(\vec{l} \cdot \vec{n}) \vec{n} - \vec{l}
$$

更改为一个计算量更少的半角向量（halfway vector）

$$
E_s = k_s L_s \max((\vec{n} \cdot \vec{h})^{\alpha'}, 0)
$$

$$
h = normalize (\vec{l} + \vec{v}) = \dfrac{\vec{l} + \vec{v}}{|\vec{l} + \vec{v}|}
$$

半角向量和平面法向量直接的夹角称为半角（half angle），其角度值为视线方向向量和出射方向向量夹角的一半：

$$
2 (\vec{n} \cdot \vec{h}) = (\vec{r} \cdot \vec{v})
$$

由于计算的角度变成了原来的一半，因此高光系数也需要变化以让光照效果更接近原有的光照效果。一般来说 $\alpha' = 4\alpha$ 就足够贴近原有光照效果。

> Blinn-Phong Shading 最主要用来减少正射、等距等非透视投影摄像机的计算量。这类摄像机的视线方向向量往往是全局固定的，不会改变，那此时场景中所有的远距离平行光源（或任何光线方向向量已经固定的光源）的半角向量就是全局固定的，这样的话我们就只需要为这些光源计算一次半角向量即可，由此可以大量减少计算量。而对于透视投影、点光源这类每个点的视线和光线方向都不同的场景，Blinn-Phong Shading 是没有优化效果的。但毕竟其也并没有增加计算量，所以固定渲染管线的时代会直接将 Blinn-Phong Shading 作为内置的渲染管线。

> 本例使用的是三角格网化的球体
