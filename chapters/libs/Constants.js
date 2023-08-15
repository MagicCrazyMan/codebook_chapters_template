/**
 * Attribute types, mapping to WebGL enums.
 * @enum {number}
 */
export const ArrayAttributeType = {
  FloatVector1: 0,
  FloatVector2: 1,
  FloatVector3: 2,
  FloatVector4: 3,
  IntVector4: 4,
  UnsignedIntVector4: 5,
};

/**
 * Buffer usages, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferUsage = {
  StaticDraw: 0,
  DynamicDraw: 1,
  StreamDraw: 2,
  StaticRead: 3,
  DynamicRead: 4,
  StreamRead: 5,
  StaticCopy: 6,
  DynamicCopy: 7,
  StreamCopy: 8,
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {BufferUsage} usage
 */
export const glBufferUsage = (gl, usage) => {
  switch (usage) {
    case BufferUsage.DynamicCopy:
      return gl.DYNAMIC_COPY;
    case BufferUsage.DynamicDraw:
      return gl.DYNAMIC_DRAW;
    case BufferUsage.DynamicRead:
      return gl.DYNAMIC_READ;
    case BufferUsage.StaticCopy:
      return gl.STATIC_COPY;
    case BufferUsage.StaticDraw:
      return gl.STATIC_DRAW;
    case BufferUsage.StaticRead:
      return gl.STATIC_READ;
    case BufferUsage.StreamCopy:
      return gl.STREAM_COPY;
    case BufferUsage.StreamDraw:
      return gl.STREAM_DRAW;
    case BufferUsage.StreamRead:
      return gl.STREAM_READ;
    default:
      throw new Error(`unknown WebGL buffer usage ${usage}`);
  }
};

/**
 * Buffer targets, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferTarget = {
  ArrayBuffer: 0,
  ElementArrayBuffer: 1,
  CopyReadBuffer: 2,
  CopyWriteBuffer: 3,
  TransformFeedbackBuffer: 4,
  UniformBuffer: 5,
  PixelPackBuffer: 6,
  PixelUnpackBuffer: 7,
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {BufferTarget} target
 */
export const glBufferTarget = (gl, target) => {
  switch (target) {
    case BufferTarget.ArrayBuffer:
      return gl.ARRAY_BUFFER;
    case BufferTarget.CopyReadBuffer:
      return gl.COPY_READ_BUFFER;
    case BufferTarget.CopyWriteBuffer:
      return gl.COPY_WRITE_BUFFER;
    case BufferTarget.ElementArrayBuffer:
      return gl.ELEMENT_ARRAY_BUFFER;
    case BufferTarget.PixelPackBuffer:
      return gl.PIXEL_PACK_BUFFER;
    case BufferTarget.PixelUnpackBuffer:
      return gl.PIXEL_PACK_BUFFER;
    case BufferTarget.TransformFeedbackBuffer:
      return gl.TRANSFORM_FEEDBACK_BUFFER;
    case BufferTarget.UniformBuffer:
      return gl.UNIFORM_BUFFER;
    default:
      throw new Error(`unknown WebGL buffer target ${target}`);
  }
};

/**
 * Buffer attribute data types, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferAttributeDataType = {
  Byte: 0,
  Short: 1,
  UnsignedByte: 2,
  UnsignedShort: 3,
  Float: 4,
  HalfFloat: 5,
  Int: 6,
  UnsignedInt: 7,
  Int_2_10_10_10_Rev: 8,
  UnsignedInt_2_10_10_10_Rev: 9,
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {BufferAttributeDataType} type
 */
export const glBufferAttributeDataType = (gl, type) => {
  switch (type) {
    case BufferAttributeDataType.Byte:
      return gl.BYTE;
    case BufferAttributeDataType.Float:
      return gl.FLOAT;
    case BufferAttributeDataType.HalfFloat:
      return gl.HALF_FLOAT;
    case BufferAttributeDataType.Int:
      return gl.INT;
    case BufferAttributeDataType.Int_2_10_10_10_Rev:
      return gl.INT_2_10_10_10_REV;
    case BufferAttributeDataType.Short:
      return gl.SHORT;
    case BufferAttributeDataType.UnsignedShort:
      return gl.UNSIGNED_SHORT;
    case BufferAttributeDataType.UnsignedByte:
      return gl.UNSIGNED_BYTE;
    case BufferAttributeDataType.UnsignedInt:
      return gl.UNSIGNED_INT;
    case BufferAttributeDataType.UnsignedInt_2_10_10_10_Rev:
      return gl.UNSIGNED_INT_2_10_10_10_REV;
    default:
      throw new Error(`unknown buffer attribute data type ${type}`);
  }
};

/**
 * Uniform types, mapping to WebGL enums.
 * @enum {number}
 */
export const UniformType = {
  FloatVector1: 0,
  IntVector1: 1,
  FloatVector2: 2,
  IntVector2: 3,
  FloatVector3: 4,
  IntVector3: 5,
  FloatVector4: 6,
  IntVector4: 7,
  Mat2: 8,
  Mat3: 9,
  Mat4: 10,
};

/**
 * Draw modes, mapping to WebGL enums.
 * @enum {number}
 */
export const DrawMode = {
  Points: 0,
  Lines: 1,
  LineLoop: 2,
  LineStrip: 3,
  Triangles: 4,
  TrianglesStrip: 5,
  TrianglesFan: 6,
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {DrawMode} mode
 */
export const glDrawMode = (gl, mode) => {
  switch (mode) {
    case DrawMode.Points:
      return gl.POINTS;
    case DrawMode.Lines:
      return gl.LINES;
    case DrawMode.LineLoop:
      return gl.LINE_LOOP;
    case DrawMode.LineStrip:
      return gl.LINE_STRIP;
    case DrawMode.Triangles:
      return gl.TRIANGLES;
    case DrawMode.TrianglesStrip:
      return gl.TRIANGLE_STRIP;
    case DrawMode.TrianglesFan:
      return gl.TRIANGLE_FAN;
    default:
      throw new Error(`unknown draw mode ${mode}`);
  }
};

/**
 * Cull face side, mapping to WebGL enums
 * @enum {number}
 */
export const CullFace = {
  None: 0,
  Back: 1,
  Front: 2,
  Both: 3,
};
