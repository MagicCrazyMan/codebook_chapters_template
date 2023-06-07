In this chapter, we use `gl.enable(gl.BLEND)` and `gl.blendFunc` to enable alpha blending to draw opacity objects.

For `blendFunc`, it calculate blended color follows formula below:

$$
BlendedColor = SourceColor * SourceFactor + DestinationColor * DestinationFactor
$$

where $SourceFactor$ and $DestinationFactor$ are parameters of `blendFunc`.

All supported blending factors in WebGL list below:

| Factor Name              | R Component | G Component | B Component |
| ------------------------ | ----------- | ----------- | ----------- |
| `gl.ZERO`                | 0.0         | 0.0         | 0.0         |
| `gl.ONE`                 | 1.0         | 1.0         | 1.0         |
| `gl.SRC_COLOR`           | Rs          | Gs          | Bs          |
| `gl.ONE_MINUS_SRC_COLOR` | (1 - Rs)    | (1 - Gs)    | (1 - Bs)    |
| `gl.DST_COLOR`           | Rd          | Gd          | Bd          |
| `gl.ONE_MINUS_DST_COLOR` | (1 - Rd)    | (1 - Gd)    | ( 1- Bd)    |
| `gl.SRC_ALPHA`           | As          | As          | As          |
| `gl.ONE_MINUS_SRC_ALPHA` | (1 - As)    | (1 - As)    | (1 - As)    |
| `gl.DST_ALPHA`           | Ad          | Ad          | Ad          |
| `gl.ONE_MINUS_DST_ALPHA` | (1 - Ad)    | (1 - Ad)    | (1 - Ad)    |
| `gl.SRC_ALPHA_SATURATE`  | min(As, Ad) | min(As, Ad) | min(As, Ad) |

where `Rs`, `Gs`, `Bs`, `As` are components of source color, `Rd`, `Gd`, `Bd`, `Ad` are components of destination color.