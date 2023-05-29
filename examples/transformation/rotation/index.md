This example introduces how to rotate an object with a matrix.

As usual, we forget about the mathematical details. In 3-dimension WebGL, there are three standalone rotation matrices representing rotation around x-axis(**_roll_**), y-axis(**_pitch_**) and z-axis(**_yaw_**, or **_heading_**) respectively:

## Rotation Matrix

$$
Yaw = R_z(\alpha) =
\begin{bmatrix}
\cos(\alpha) & -\sin(\alpha) & 0 & 0 \\
\sin(\alpha) & \cos(\alpha) & 0 & 0 \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1  \\
\end{bmatrix}
$$

$$
Pitch = R_y(\beta) =
\begin{bmatrix}
\cos(\beta) & 0 & \sin(\beta) & 0 \\
0 & 1 & 0 & 0 \\
-\sin(\beta) & 0 & \cos(\beta) & 0 \\
0 & 0 & 0 & 1  \\
\end{bmatrix}
$$

$$
Roll = R_x(\gamma) =
\begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & \cos(\gamma) & -\sin(\gamma) & 0 \\
0 & \sin(\gamma) & \cos(\gamma) & 0 \\
0 & 0 & 0 & 1  \\
\end{bmatrix}
$$

We can combine them together to get a general (intrinsic)[**_Rotation Matrix_**](https://en.wikipedia.org/wiki/Rotation_matrix) about axes $x$, $y$, $z$:

$$
Rotation = R_z(\alpha) R_y(\beta) R_x(\gamma) =
\begin{bmatrix}
\cos(\alpha)\cos(\beta) & \cos(\alpha)\sin(\beta)\sin(\gamma) - \sin(\alpha)\cos(\gamma) & \cos(\alpha)\sin(\beta)\cos(\gamma) + \sin(\alpha)\sin(\gamma) & 0 \\

\sin(\alpha)\cos(\beta) & \sin(\alpha)\sin(\beta)\sin(\gamma) + \cos(\alpha)\cos(\gamma) & \sin(\alpha)\sin(\beta)\cos(\gamma) - \cos(\alpha)\sin(\gamma) & 0 \\

-\sin(\beta) & \cos(\beta)\sin(\gamma) & \cos(\beta)\cos(\gamma) & 0 \\

0 & 0 & 0 & 1  \\
\end{bmatrix}
$$

In this example, we calculate rotation matrix inside vertex shader directly, not in Javascript, thus, passing three angle values to GPU is enough. But in practical, if we have a large amount of vertexes, it's better to calculate matrix in Javascript and pass it to GPU as a uniform variable, since we only need to calculate it once while shader must calculate it every single vertex.

> ## More Advanced
> Actually, the rotation matrix above just a special rotation around $x$, $y$ and $z$ unit axes. There is a more general rotation matrix which can rotate around any arbitrary axis:
>
> _The matrix of a proper rotation $R$ by angle $\theta$ around the axis $u=(u_x, u_y, u_z)$, a unit vector with $u_x^2 + u_y^2 + u_z^2 = 1$, is given by:_
> $$
> R = 
> \begin{bmatrix}
> \cos(\theta) + u_x^2(1-\cos(\theta)) & u_x u_y(1-\cos(\theta)) - u_z \sin(\theta) & u_x u_z (1-\cos(\theta)) + u_y \sin(\theta) \\
> u_y u_x(1-\cos(\theta)) + u_z \sin(\theta) & \cos(\theta) + u_y^2(1-\cos(\theta)) & u_y u_z (1-\cos(\theta)) - u_x \sin(\theta) \\
> u_z u_x(1-\cos(\theta)) - u_y \sin(\theta) & u_z u_y(1-\cos(\theta)) + u_x \sin(\theta) & \cos(\theta) + u_z^2(1-\cos(\theta)) \\
> \end {bmatrix}
> $$
>
> Besides rotation matrix, [Euler angles](https://en.wikipedia.org/wiki/Euler_angles) and [Quaternion](https://en.wikipedia.org/wiki/Quaternion) are two other important things in 3-dimension rotation, take a closer look to them if you wanna deep dive.

