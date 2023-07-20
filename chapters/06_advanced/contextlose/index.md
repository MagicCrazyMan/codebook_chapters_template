WebGL 操作硬件资源的资源由浏览器负责调度，当发生一些事件（如系统休眠、系统错误等）的时候，浏览器就可能会强制释放 WebGL 的资源，并在适当（如重新唤醒浏览器）的时候恢复 WebGL。为了保证 WebGL 在上下文丢失和恢复的前后能正确恢复渲染状态，WebGL 提供了两个事件 `webglcontextlost` 和 `webglcontextrestored` 事件来通知开发者上下文丢失和上下文恢复，开发者则需要在事件发生的时候适当地停止或重新触发渲染。

- 触发 `webglcontextlost` 上下文丢失时，所有与当前 WebGL 相关的对象（`WebGLRenderContext`、`WebGLProgram` 等）通通会被销毁，但继续调用 `WebGLRenderContext` 的方法不会报错，因此循环触发的 `requestAnimationFrame` 是不会主动中止的，需要使用一定的方法在上下文丢失的时候主动停止 `requestAnimationFrame` 循环。否则当上下文恢复的时候，`requestAnimationFrame` 会继续触发 WebGL 渲染，但由于先前的渲染数据已经被销毁，WebGL 将一直报错。
- 触发 `webglcontextrestored` 上下文恢复时，WebGL 需要完全重新初始化（如编译着色器、获取变量地址，缓冲区数据等）才能正确工作。

> 本章节使用了 `WEBGL_lose_context` 扩展来模拟上下文丢失和恢复事件。监听 `webglcontextlost` 事件时，必须调用 `event.preventDefault()` 函数，否则将无法重新恢复上下文

