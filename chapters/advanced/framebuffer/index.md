WebGL 启动时配置了一个默认的帧缓冲区，一个帧缓冲区包含颜色关联对象和深度关联对象（以及一个未介绍的模板关联对象），这个缓冲区会将渲染结果呈现在浏览器 Canvas 中。但 WebGL 允许开发者在渲染时配置使用其他的帧缓冲区，这样就可以使用 WebGL 将画面渲染到某个特定的地方上（如纹理或者渲染缓冲区），从而实现一些特殊的渲染需求，如将副摄像机所看到的内容渲染到纹理上然后呈现某个物体表面。

操作流程：

1. 使用 `gl.createFrameBuffer` 创建一个独立的帧缓冲区
2. 使用 `gl.createTexture`、`gl.bindTexture`、`gl.texImage2D` 和 `gl.Parameteri` 创建纹理对象，并设置其尺寸和参数
3. 使用 `gl.createRenderbuffer`、`gl.bindRenderbuffer` 和 `gl.renderbufferStorage` 创建渲染缓冲区对象，并设置其尺寸
4. 使用 `gl.framebufferTexture2D` 将帧缓冲区的颜色关联对象指定到纹理对象
5. 使用 `gl.framebufferRenderbuffer` 将帧缓冲区的深度关联对象指定为渲染缓冲区对象
6. 使用 `gl.checkFramebufferStatus` 检查帧缓冲区是否正确配置
7. 使用 `gl.bindFramebuffer` 将帧缓冲区绑定到 WebGL 程序。随后执行的渲染行为就会将结果渲染到绑定的纹理对象和渲染缓冲区上。
