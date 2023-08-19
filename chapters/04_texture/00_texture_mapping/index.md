## st 坐标系

WebGL 纹理贴图坐标系与裁剪范围坐标系是两个独立的坐标系。WebGL 纹理坐标系原点为 $(0, 0)$，位于贴图的左下角，$s$ 轴水平向右为正方向，$t$ 轴竖直向上为正方向，采用比例值作为坐标值，图像左上角为 $(0, 1)$，右上角为 $(1, 1)$，右下角为 $(1, 0)$。

## 纹理映射流程

### GLSL

1. 顶点着色器接收每个顶点的坐标及其对应的纹理坐标，光栅化后传递给片元着色器
2. 片元着色器根据片元的纹理坐标，通过采样器（`sampler2D`）从纹理图像中抽取出纹理要素的颜色，赋给当前片元

### JavaScript

1. 预处理图形的顶点坐标及其对应的纹理坐标。
2. 初始化纹理
   1. 创建纹理（两个 `gl.createTexture()`）
   2. 获取片元着色器的 `uniform sampler2D` 纹理引用
3. 加载图像至纹理
   1. 使用 `Image` 在浏览器中加载图片。注意，WebGL 不允许跨域加载纹理图像！
   2. 绑定纹理（`gl.bindTexture()`）
   3. 设置是否对图像进行 y 轴翻转（`gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)`）。大部分主流的图片格式坐标系为图片左上角为原点，水平向右为 x 轴正方向，竖直向下为 y 轴正方向，这与 st 坐标系统刚好翻转过来，所以需要进行 y 轴翻转以便图片的坐标系与 st 坐标系对应
   4. 配置纹理方法参数（`gl.texParameteri()`）
   5. 传递图像至着色器（`gl.texImage2D()`）
4. 绑定并启用纹理
   1. 绑定纹理（`gl.bindTexture()`）
   2. 开启纹理单元（`gl.activeTexture()`）
   3. 将纹理传递给着色器（`gl.uniform1i()`）
5. 绘制图像

可用纹理参数如下（仅限 `gl.TEXTURE_2D`）：

- 放大方法（`gl.TEXTURE_MAG_FILTER`）：
  - 在基层 MIP 使用最邻近取样（`gl.NEAREST`），默认
  - 在基层 MIP 使用双线性插值（`gl.LINEAR`）
- 缩小方法（`gl.TEXTURE_MIN_FILTER`）：
  - 在基层 MIP 使用最邻近取样（`gl.NEAREST`）
  - 在基层 MIP 使用双线性插值（`gl.LINEAR`）
  - 选取最邻近 MIP 使用最邻近取样（`gl.NEAREST_MIPMAP_NEAREST`）
  - 在 MIP 之间使用双线性插值和最邻近取样（`gl.NEAREST_MIPMAP_LINEAR`），默认。注意，如果没有设置 MIPMAP，并且缩小采样时选择了一个不存在的缩放级别，这会导致采样器永远输出黑色
  - 选取最邻近 MIP 使用双线性插值（`gl.LINEAR_MIPMAP_NEAREST`）
  - 在 MIP 之间使用双线性插值和双线性插值，即三线性过滤（`gl.LINEAR_MIPMAP_LINEAR`）
- 水平填充方法（`gl.TEXTURE_WRAP_S`）：
  - 平铺式重复纹理（`gl.REPEAT`），默认
  - 镜像翻转重复纹理（`gl.MIRRORED_REPEAT`）
  - 重复纹理图像边缘值（`gl.CLAMP_TO_EDGE`）
- 垂直填充方法（`gl.TEXTURE_WRAP_T`）：
  - 平铺式重复纹理（`gl.REPEAT`），默认
  - 镜像翻转重复纹理（`gl.MIRRORED_REPEAT`）
  - 重复纹理图像边缘值（`gl.CLAMP_TO_EDGE`）

## MIPMAP