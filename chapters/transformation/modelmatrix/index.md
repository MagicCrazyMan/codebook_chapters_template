> Before everything goes on, it is necessary to understand the basic concept of linear algebra. In this example, different multiplication order of translation matrix, rotation matrix and scale matrix resulting different model matrix.

Let's mixup translation, rotation and scale matrices altogether and make a **_Model Matrix_**! Of course, we don't have to build matrix manually, from this chapter, [`glMatrix`](https://glmatrix.net/docs/) library is introduced, using it could make matrix calculation much easier.

``` glsl
ModelMatrix = ScaleMatrix * TranslationMatrix * RotationMatrix

TransformedPosition = ModelMatrix * Position
```

In this case, we rotate first, then translate and scale last. Result may quite different if we reverse it. You try it by yourself just replacing the order of matrix multiplication in `setModelMatrix` function.
