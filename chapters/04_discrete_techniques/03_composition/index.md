半透明表面在现实世界中是十分常见的物体，但现实世界中的半透明物体是复杂的光线传播产生的效果，全局的光线传播、折射、反射的计算在计算机中是十分复杂的，也很难引入到实时渲染中。为了尽可能模拟出现实的半透明效果，计算机图形学引入了基于 $\alpha$ 通道的图像融合技术。

在 WebGL 中使用 `gl.enable(gl.BLEND)` 启用 $\alpha$ 通道融合，WebGL 同时提供了各种函数控制 $\alpha$ 混合的方式：

- `blendEquation(mode)`

  - 描述

  控制源颜色和目标颜色的混合函数

  - 参数

  | 参数名 | 描述                                                   |
  | ------ | ------------------------------------------------------ |
  | `mode` | 源颜色和目标颜色的混合函数枚举值。默认为 `gl.FUNC_ADD` |

  - 可选值

  | 枚举值                     | 方程效果                                                                          |
  | -------------------------- | --------------------------------------------------------------------------------- |
  | `gl.FUNC_ADD`              | $Color = Color_s + Color_d$                                                       |
  | `gl.FUNC_SUBTRACT`         | $Color = Color_s - Color_d$                                                       |
  | `gl.FUNC_REVERSE_SUBTRACT` | $Color = Color_d - Color_s$                                                       |
  | `gl.MIN`                   | $Color = min(Color_d, Color_s) = (min(R_s, R_d)， min(G_s, G_d)， min(B_s, B_d))$ |
  | `gl.MAX`                   | $Color = max(Color_d, Color_s) = (max(R_s, R_d)， max(G_s, G_d)， max(B_s, B_d))$ |

- `blendFunc(sfactor, dfactor)`

  - 描述

  控制源颜色和目标颜色的融合系数

  - 参数

  | 参数名    | 描述                                   |
  | --------- | -------------------------------------- |
  | `sfactor` | 源颜色融合因子系数。默认为 `gl.ONE`    |
  | `dfactor` | 目标颜色融合因子系数。默认为 `gl.ZERO` |

  - 可选值

  | 枚举值                        | R 分量系数      | G 分量系数      | B 分量系数      |
  | ----------------------------- | --------------- | --------------- | --------------- |
  | `gl.ZERO`                     | $0.0$           | $0.0$           | $0.0$           |
  | `gl.ONE`                      | $1.0$           | $1.0$           | $1.0$           |
  | `gl.SRC_COLOR`                | $R_s$           | $G_s$           | $B_s$           |
  | `gl.ONE_MINUS_SRC_COLOR`      | $1 - R_s$       | $1 - G_s$       | $1 - B_s$       |
  | `gl.DST_COLOR`                | $R_d$           | $R_d$           | $B_d$           |
  | `gl.ONE_MINUS_DST_COLOR`      | $1 - R_d$       | $1 - R_d$       | $1 - B_d$       |
  | `gl.SRC_ALPHA`                | $A_s$           | $A_s$           | $A_s$           |
  | `gl.ONE_MINUS_SRC_ALPHA`      | $1 - A_s$       | $1 - A_s$       | $1 - A_s$       |
  | `gl.DST_ALPHA`                | $A_d$           | $A_d$           | $A_d$           |
  | `gl.ONE_MINUS_DST_ALPHA`      | $1 - A_d$       | $1 - A_d$       | $1 - A_d$       |
  | `gl.CONSTANT_COLOR`           | $R_c$           | $G_c$           | $B_c$           |
  | `gl.ONE_MINUS_CONSTANT_COLOR` | $1 - R_c$       | $1 - G_c$       | $1 - B_c$       |
  | `gl.CONSTANT_ALPHA`           | $A_c$           | $A_c$           | $A_c$           |
  | `gl.ONE_MINUS_CONSTANT_ALPHA` | $1 - A_c$       | $1 - A_c$       | $1 - A_c$       |
  | `gl.SRC_ALPHA_SATURATE`       | $min(A_s, A_d)$ | $min(A_s, A_d)$ | $min(A_s, A_d)$ |

  其中 `gl.CONSTANT_COLOR`、`gl.ONE_MINUS_CONSTANT_COLOR`、`gl.CONSTANT_ALPHA` 和 `gl.ONE_MINUS_CONSTANT_ALPHA` 需要需要配合 `gl.blendColor` 使用

- `blendColor(red, green, blue, alpha)`

  - 描述

  融合时作为常量的颜色值，配合 `gl.blendFunc` 中 `gl.CONSTANT_COLOR`、`gl.ONE_MINUS_CONSTANT_COLOR`、`gl.CONSTANT_ALPHA` 和 `gl.ONE_MINUS_CONSTANT_ALPHA` 使用

  - 参数

  | 参数名  | 描述                      |
  | ------- | ------------------------- |
  | `red`   | 红色分量。默认为 `0`      |
  | `green` | 绿色分量。默认为 `0`      |
  | `blue`  | 蓝色分量。默认为 `0`      |
  | `alpha` | $\alpha$ 分量。默认为 `0` |

除此之外，WebGL 还提供了控制更加精细的 [`gl.blendEquationSeparate`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate) 和 [`gl.blendFuncSeparate`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate) 控制函数。

在绘制半透明表面时，由于深度缓冲区的存在，如果我们先绘制了靠前的半透明表面（摄像机坐标系下更靠近摄像机的表面），那就会导致被这个表面遮挡的表面就不会再被绘制。然而这是不正确的，半透明表面理应可以观察到被遮挡的物体。这种情况下，我们在绘制半透明表面的时候通过 `gl.depthMask(false)` 来将深度缓冲区设置成只读，这样在绘制半透明表面时，深度缓冲区就不会记录这个表面的深度信息，这样被遮挡的表面就仍然可以被绘制。

此外，在进行 $\alpha$ 融合时，由于我们设置的融合参数是基于源颜色和目标颜色的，这就意味着绘制物体的顺序会影响源颜色和目标颜色所代表的物体，这在部分场景下会出现不符合直觉的融合情况。例如当我们使用 `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` 融合因子，在摄像机坐标系下靠近摄像机的是一个半透明表面，后方是一个不透明表面，此时如果我们先绘制半透明表面，再绘制不透明表面，这就会导致在绘制不透明表面时， `sfactor` 的系数会变成 `1.0`，而 `dfactor` 的系数会变成 `0.0`，这就会导致不透明表面的颜色完全覆盖掉半透明表面的颜色，从而出现不合理的视觉效果。但如果我们把绘制顺序反过来，就不会出现这种情况。因此，如果要尽可能在动态的场景中正确绘制半透明效果，我们需要想办法正确排序几何图形的绘制顺序，并考虑优先绘制不透明表面再绘制半透明表面。本章的示例并没针对物体的绘制顺序进行排序。
