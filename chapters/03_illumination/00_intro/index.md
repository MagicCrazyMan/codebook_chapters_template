本章开始我们正式开始了解如何渲染光照效果。

前面的章节一直都直接使用 “物体颜色” 或 “顶点颜色” 这一概念来简化渲染过程。但从光照这章开始，我们需要明确一个更符合现实情况的概念：物体的颜色是由光线的颜色（电磁波的波长）和物体对于光线的反射率（物体对电磁波的吸收）决定的。当电磁波经过物体后，物体会吸收一部分能量并反射另一部分的能量，被反射的这部分电磁波能量最终进入我们的眼睛（或摄像机）后形成了我们观察到的物体的颜色。我们在模拟光照效果时也沿用这一物理逻辑：**光照颜色是属于灯光的物理属性**，**光线反射率是属于物体的物理属性**，物体的颜色是光线被物体反射后形成的效果（`VertexColor = LightColor * VectexColorReflection`）。

> 后续会出现的镜面反射高光系数属于物体的物理属性；光线衰减中衰减因子的各项系数理论上应属于环境的物理属性，但我们会将其归入灯光的物理属性以便建模。

为了更好地模拟真实光照，光照反射又被分为**环境光反射（Ambient Reflection）**、**漫反射（Diffuse Reflection）**和**镜面反射（Specular Reflection）**三个基础反射模型（镜子反射、半透明反射、折射、光线追踪等复杂的光线效果后面将再展开讨论），这三个基础反射效果将整个光照运算的逻辑分为了三个独立的部分，并可以独立控制（如同一个物体可以同时存在环境光反射率、漫反射反射率来对应环境光反射和漫反射，且他们可以不一样）以增加灵活性。但必须明确的是现实世界的光照不存在什么环境光反射、漫反射、镜面反射这样的东西，本质是电磁波在传播过程中收到各种影响后最终形成的效果，在计算机图形学中引入这些概念只是为了让计算机可以尽可能地使用更少的硬件资源来尽可能地模拟现实。

从此章节开始我们必须明确光照效果的本质，否则很容易错误理解后面光照效果的实现过程。读者可以认为前文所述的 “物体颜色” 指的是场景中存在一个纯白的场景光（`RGB (1.0, 1.0, 1.0)`）时物体的环境光反射率。