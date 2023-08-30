坐标系（标架）转换是二三维渲染中十分重要的内容，开发过程中涉及大量的坐标系转换工作。该章节简要总结一下坐标系变换的流程，但不做理论证明，有兴趣的可以自己研究一下。

## 基础理论

设存在以 $v_1$ $v_2$ $v_3$ 为基向量，$Q_0$ 为原点的坐标系 $V$ 和以 $u_1$ $u_2$ $u_3$ 为基向量， $P_0$ 为原点的坐标系 $U$。$U$ 中的基向量 $V$ 的基向量表达（反之亦然）。因而可通过 12 个标量 $\gamma_{ij}$ 使得：

> $v_1$, $v_2$, $v_3$, $u_1$, $u_2$, $u_3$ 为向量的齐次坐标表示， $P_0$, $Q_0$ 为坐标点的齐次坐标表示

$$
u_1 = \gamma_{11}v_1 + \gamma_{12}v_2 + \gamma_{13}v_3 \\
u_2 = \gamma_{21}v_1 + \gamma_{22}v_2 + \gamma_{23}v_3 \\
u_3 = \gamma_{31}v_1 + \gamma_{32}v_2 + \gamma_{33}v_3 \\
Q_0 = \gamma_{41}v_1 + \gamma_{42}v_2 + \gamma_{43}v_3 + P_0 \\
$$

将表达式矩阵化可得：

$$
\begin{bmatrix}
u_1 \\
u_2 \\
u_3 \\
Q_0 \\
\end{bmatrix}

= M
\begin{bmatrix}
v_1 \\
v_2 \\
v_3 \\
P_0 \\
\end{bmatrix}
$$

其中 $M$ 为一个 4x4 矩阵：

$$
M = 
\begin{bmatrix}
\gamma_{11} & \gamma_{12} & \gamma_{13} & 0 \\
\gamma_{21} & \gamma_{22} & \gamma_{23} & 0 \\
\gamma_{31} & \gamma_{32} & \gamma_{33} & 0 \\
\gamma_{41} & \gamma_{42} & \gamma_{43} & 1 \\
\end{bmatrix}
$$

矩阵 $M$ 称为坐标系（标架）变换的矩阵表示。

通过 $M$，我们可以将同一个点在 $V$ 和 $U$ 两个坐标系下的表示进行转换。假定 $a$ 和 $b$ 为同一个点或向量在 $U$ 和 $V$ 下的两个不同的表示，则有：

$$
b^{\textrm{T}}
\begin{bmatrix}
u_1 \\
u_2 \\
u_3 \\
Q_0 \\
\end{bmatrix}
=
b^{\textrm{T}}
M
\begin{bmatrix}
v_1 \\
v_2 \\
v_3 \\
P_0 \\
\end{bmatrix}
=
a^{\textrm{T}}
\begin{bmatrix}
v_1 \\
v_2 \\
v_3 \\
P_0 \\
\end{bmatrix}
$$

因此有：

$$
a = M^{\textrm{T}} b
$$

$M^{\textrm{T}}$ 就是将点或向量从 $U$ 坐标系表示转换至 $V$ 坐标系表示的矩阵：

$$
M^{\textrm{T}}
=
\begin{bmatrix}
\alpha_{11} & \alpha_{12} & \alpha_{13} & \alpha_{14} \\
\alpha_{21} & \alpha_{22} & \alpha_{23} & \alpha_{24} \\
\alpha_{31} & \alpha_{32} & \alpha_{33} & \alpha_{34} \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
$$

## 坐标系表示的变换

设存在一个点或向量在新旧两个坐标系表示之间的变换可以通过一个矩阵表示：

$$
a = Cb
$$

其中 $a$ 和 $b$ 是一个点或者向量的齐次坐标表示。同时矩阵 $C$ 也是齐次表示，是矩阵 $M$ 的转置：

$$
C = M^{\textrm{T}} =
\begin{bmatrix}
\alpha_{11} & \alpha_{12} & \alpha_{13} & \alpha_{14} \\
\alpha_{21} & \alpha_{22} & \alpha_{23} & \alpha_{24} \\
\alpha_{31} & \alpha_{32} & \alpha_{33} & \alpha_{34} \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
$$

假定新坐标系的基向量和原点可通过原坐标系表示，则存在一个变换矩阵 $T$ 可令：

$$
T
\begin{bmatrix}
1 \\
0 \\
0 \\
0 \\
\end{bmatrix}
=
u
=
\begin{bmatrix}
u_1 \\
u_2 \\
u_3 \\
0 \\
\end{bmatrix}
$$

$$
T
\begin{bmatrix}
0 \\
1 \\
0 \\
0 \\
\end{bmatrix}
=
v
=
\begin{bmatrix}
v_1 \\
v_2 \\
v_3 \\
0 \\
\end{bmatrix}
$$

$$
T
\begin{bmatrix}
0 \\
0 \\
1 \\
0 \\
\end{bmatrix}
=
n
=
\begin{bmatrix}
n_1 \\
n_2 \\
n_3 \\
0 \\
\end{bmatrix}
$$

$$
T
\begin{bmatrix}
0 \\
0 \\
0 \\
1 \\
\end{bmatrix}
=
p
=
\begin{bmatrix}
p_1 \\
p_2 \\
p_3 \\
1 \\
\end{bmatrix}
$$

则其逆矩阵 $C = T^{-1}$ 就是原坐标系的基向量和原点在新坐标系下表示的变换矩阵

合并上述等式，可得：

$$
TI = T = 
\begin{bmatrix}
u & v & n & p
\end{bmatrix}
=
\begin{bmatrix}
u_{1} & v_{1} & n_{1} & p_{1} \\
u_{2} & v_{2} & n_{2} & p_{2} \\
u_{3} & v_{3} & n_{3} & p_{3} \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
$$

于是有

$$
C = 
T^{-1}
=
\begin{bmatrix}
u & v & n & p
\end{bmatrix}
^{-1}
=
\begin{bmatrix}
u_{1} & v_{1} & n_{1} & p_{1} \\
u_{2} & v_{2} & n_{2} & p_{2} \\
u_{3} & v_{3} & n_{3} & p_{3} \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
^{-1}
$$

以此我们就可以得到一个把新坐标系下的表示变换成原坐标系下的表示的矩阵 $T$，和一个把原坐标系下的表示变换成新坐标系下的表示的矩阵 $C$

## 示例

设存在坐标系 $U$ 和坐标系 $V$，其中坐标系 $V$ 的基向量和原点在坐标系 $U$ 下的表示为

$$
\vec{u} = \begin{bmatrix} 1 & 0 & 0 \end{bmatrix} \\
\vec{v} = \begin{bmatrix} 0 & 0 & -1 \end{bmatrix} \\
\vec{n} = \begin{bmatrix} 0 & 1 & 0 \end{bmatrix} \\
p = \begin{bmatrix} 2 & 2 & 2 \end{bmatrix} \\
$$

通过基向量和原点在 $U$ 坐标系下的表示可构建一个变换矩阵 $T$ 将坐标系 $V$ 下的表示变换为坐标系 $U$ 下的表示：

$$
T = 
\begin{bmatrix}
1 & 0  & 0 & 2 \\
0 & 0  & 1 & 2 \\
0 & -1 & 0 & 2 \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
$$

则其逆矩阵 $C = T^{-1}$ 便是将坐标系 $U$ 下的表示变换为坐标系 $V$ 下的表示。

$$
C = 
\begin{bmatrix}
1 & 0  & 0 & -2 \\
0 & 0  & -1 & 2 \\
0 & 1 & 0 & -2 \\
0 & 0 & 0 & 1 \\
\end{bmatrix}
$$

将坐标系 $V$ 的原点 $b = \begin{bmatrix} 0 & 0 & 0 & 1 \end{bmatrix}$ 使用坐标系 $U$ 表示：

$$
a = Tb = \begin{bmatrix} 2 & 2 & 2 & 1 \end{bmatrix}
$$

将坐标系 $U$ 的原点 $b = \begin{bmatrix} 0 & 0 & 0 & 1 \end{bmatrix}$ 使用坐标系 $V$ 表示：

$$
a = Cb = \begin{bmatrix} -2 & 2 & -2 & 1 \end{bmatrix}
$$
