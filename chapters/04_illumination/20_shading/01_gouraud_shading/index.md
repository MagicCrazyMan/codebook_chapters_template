[Gouraud Shading](https://en.wikipedia.org/wiki/Shading#Gouraud_shading) 是一种平滑光照。对于每一个顶点，其可能是多个不同的网格共享的顶点，Gaoraud Shading 的核心理念便是计算这些网格的法向量的平均法向量，然后将这个平均法向量作为该顶点的法向量。随后使用该顶点法向量在顶点着色器中计算该顶点的光照效果，经过光栅化后插值将顶点的光照颜色输出。

$$
n = \dfrac{n_1 + n_2 + ... + n_i}{|n_1 + n_2 + ... + n_i|}
$$

其中 $n_1...n_i$ 是顶点所属的所有平面的法向量。

> 该章节是[点光源](../lightsource/pointlight)一章的拷贝