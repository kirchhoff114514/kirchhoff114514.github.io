---
title: Part1-位置编码：RoPE与YARN
---

# Part1-位置编码：RoPE与YARN

## 理论

### RoPE

![img_v3_02vu_67488bc3-2314-4986-a92e-fc481576bf3g](../assets/images/Part1-位置编码：RoPE与YARN/img_v3_02vu_67488bc3-2314-4986-a92e-fc481576bf3g.jpg)

输入到模型中的 token 会先经过 word embedding，一个 token 会被编码成一个向量，如上图左所示。这里假设某个 token 被编码成图左侧那样的向量，维度为 16。这个维度通常被称为 **hidden size**，在代码中也常用变量名 **dim** 来指代。

对这个 token 做位置编码，本质上就是对这个向量做旋转。不过这里并不是把整个向量作为一个整体去旋转，而是把各个维度两两配对后，分别进行二维旋转。如上图所示，16 个维度被分成 8 组，每组两个分量。组号记为 k，取值范围是 0 到 7。

每组旋转的角度由下面的公式给出：

$$
\omega_k=\frac{1}{\theta^{2k/d}}
$$

> [!NOTE]
>
> 这里的 wk 虽然本质上是旋转角度，但在很多资料和文献中都会把它称为频率，因此本文也沿用这个说法。wk 大就被称为高频，wk 小就被称为低频。

k 为组号，\(\theta\) 为一个常数参数，在《Attention is all you need》中取值为 10000，后续一些工作又对这个参数做了改进。d 为 hidden size，计算结果的单位是 rad。上图左侧那个向量对应的计算结果如下：

![img_v3_02vu_06d0ae4f-d5d0-4014-89e0-022b32da301g](../assets/images/Part1-位置编码：RoPE与YARN/img_v3_02vu_06d0ae4f-d5d0-4014-89e0-022b32da301g.jpg)

下面以一句话 `Please subscribe to the channel` 为例，根据每个 token 的 word embedding，可以计算出各个 token 的频率如下：

![img_v3_02vu_8aa622f9-a291-4aa1-a8da-1688fbfe8e7g](../assets/images/Part1-位置编码：RoPE与YARN/img_v3_02vu_8aa622f9-a291-4aa1-a8da-1688fbfe8e7g.png)

设 w 为某个 token 对应的频率向量，则有

$$
{\vec \omega _{token}} = \vec \omega  \times token\_index
$$
比如，`channel` 对应的频率向量，就是把 w 整体乘以 4 得到的。比较靠前的 4.0、1.2649 等可以看作高频分量，而 0.004、0.0013 这样的值则属于低频分量。

如果把旋转写成复数形式，那么 RoPE 可以概括为

$$
f_{\boldsymbol{W}}(x_m,m,\theta)=e^{im\boldsymbol{\theta}}Wx_m
$$

> [!CAUTION]
>
> 注意：上式中的 \theta 指的是前文的频率向量 w。这里改写成 \theta，是因为 YaRN 论文中采用的就是这套记号，本文从这里开始也统一使用 \theta。

### YARN

YaRN 在论文中的严格定义是：

1. 使用 `NTK-by-parts interpolation` 对 RoPE 的频率做分段缩放
2. 使用 `attention scaling` 对注意力分数做温度补偿

也就是说，YaRN 不是单独的一条频率修正公式，而是一套由“分段插值 + 注意力缩放”组成的长上下文扩展方法。

#### 论文版YaRN算法

设：

- \(L\)：模型预训练时见过的最大上下文长度
- \(L'\)：希望扩展到的目标上下文长度
- \(s=\frac{L'}{L}\)：上下文扩展倍数
- \(\theta_d\)：第 \(d\) 个 RoPE 维度的原始频率
- \(\lambda_d=\frac{2\pi}{\theta_d}\)：第 \(d\) 个维度的波长
- \(r_d=\frac{L}{\lambda_d}\)：在原始上下文长度 \(L\) 内，第 \(d\) 个维度大约会旋转多少圈

这里最关键的是 \(r_d\)。它描述了某个 RoPE 维度在训练窗口内到底“转了几圈”：

- 如果 \(r_d\) 很大，说明这个维度转得很快，更偏向编码局部、相对位置
- 如果 \(r_d\) 很小，说明这个维度转得很慢，甚至在整个训练窗口里都转不满一圈，更偏向保留绝对位置信息

论文因此引入两个分段边界参数 \(\alpha,\beta\)，并定义一个线性过渡函数 \(\gamma(r_d)\)。这个 \(\gamma(r_d)\) 本质上就是一个**插值权重**，用来决定第 \(d\) 个维度到底更接近“原始 RoPE”还是更接近“PI 缩放”：

$$
\gamma(r_d)=
\begin{cases}
1, & r_d < \alpha \\
\frac{\beta-r_d}{\beta-\alpha}, & \alpha \le r_d \le \beta \\
0, & r_d > \beta
\end{cases}
$$

也就是说：

- 当 \(r_d < \alpha\) 时，\(\gamma(r_d)=1\)，该维度完全采用插值
- 当 \(r_d > \beta\) 时，\(\gamma(r_d)=0\)，该维度完全保持原始频率
- 当 \(\alpha \le r_d \le \beta\) 时，\(\gamma(r_d)\) 在 1 到 0 之间线性变化，表示该维度处在平滑过渡区

从工程实现角度，可以把这件事理解成对频率做如下修正：

$$
\theta'_d = \theta_d \cdot \Big((1-\gamma_d) + \gamma_d / s\Big)
$$

其中：

- \(\gamma_d = 0\) 表示该维度完全不缩放。此时

  $$
  \theta'_d = \theta_d \cdot \big((1-0)+0/s\big)=\theta_d
  $$
  也就是说，这个维度保持原始 RoPE 频率不变，不做任何上下文插值。
- \(\gamma_d = 1\) 表示该维度完全按 PI 方式缩放。此时

  $$
  \theta'_d = \theta_d \cdot \big((1-1)+1/s\big)=\theta_d/s
  $$
  也就是说，这个维度的频率被直接缩小到原来的 \(1/s\)，与 Position Interpolation 的处理方式一致。
- \(0 < \gamma_d < 1\) 表示该维度处在平滑过渡区。此时

  $$
  \theta'_d = \theta_d \cdot \big((1-\gamma_d)+\gamma_d/s\big)
  $$
  它既不是完全保持原始频率，也不是完全按 PI 缩放，而是在两者之间做线性加权混合。权重越接近 0，说明越偏向原始 RoPE；权重越接近 1，说明越偏向 PI。

这样一来：

- 高频、局部位置敏感的维度尽量保持原状
- 低频、绝对位置倾向更强的维度按比例压缩
- 中间区域线性过渡，避免突变

这就是论文里 `NTK-by-parts interpolation` 的核心。

#### Attention scaling

在完成上面的频率分段缩放之后，论文还额外引入了 attention scaling。设 attention softmax 之前的分数为

$$
\frac{qk^\top}{\sqrt{d}}
$$

论文会再引入一个温度参数 \(t\)，把它改写为

$$
\frac{t \cdot qk^\top}{\sqrt{d}}
$$
或者等价地，把 \(q\) 和 \(k\) 同时缩放一个常数因子。

论文指出，这个温度补偿可以显著改善长上下文下的困惑度表现，而且不必真的去改写 attention 算子本身。只要把 RoPE 之后的向量整体乘上一个常数，就能得到等价效果。因此 YaRN 既保留了理论上的 attention scaling，又保持了工程实现上的低开销。

综合起来，论文版 YaRN 可以概括为：

$$
\text{YaRN} = \text{NTK-by-parts interpolation} + \text{attention scaling}
$$

#### 工程版YaRN：前后两半的实现方式

上面是论文里的数学定义。到了工程实现里，真正的难点不是“公式怎么写”，而是“如何高效地把二维旋转批量作用到整个张量上”。

RoPE 的本质，是把向量按两维一组做二维旋转。以 4 维向量为例，如果写成

$$
[x_0, y_0, x_1, y_1]
$$
那么标准的二维旋转是：

$$
[x, y] \mapsto [x\cos\phi - y\sin\phi,\; x\sin\phi + y\cos\phi]
$$

如果把一组二维向量写成

$$
[u, v]
$$
那么旋转后

$$
[u\cos - v\sin,\; u\sin + v\cos]
$$
还可以改写成

$$
[u, v]\cdot \cos + [-v, u]\cdot \sin
$$

这个改写非常关键，因为它说明二维旋转可以拆成两部分：

- 原向量本身乘上 `cos`
- 再加上“旋转了 90 度”的向量 `[-v, u]` 乘上 `sin`

后面的工程实现，本质上就是把这个二维公式批量推广到整个高维张量上。

对两组同时应用后，结果应为：

$$
[x_0\cos\phi_0 - y_0\sin\phi_0,\; x_0\sin\phi_0 + y_0\cos\phi_0,\; x_1\cos\phi_1 - y_1\sin\phi_1,\; x_1\sin\phi_1 + y_1\cos\phi_1]
$$

但是工程里通常不会逐组手写这个式子，而是会把它改写成统一形式：

$$
x_{\text{rope}} = x \cdot \cos + \operatorname{rotate}(x) \cdot \sin
$$

关键就在于这里的 `rotate(x)` 怎么定义。

本项目采用的是“前后两半”的实现方式。也就是说，不把向量看成

$$
[x_0, y_0, x_1, y_1]
$$
而是把它重新排布成

$$
[x_0, x_1, y_0, y_1]
$$

此时：

- 前半部分保存所有二维组的第一个分量
- 后半部分保存所有二维组的第二个分量

对于这个布局，定义

$$
\operatorname{rotate\_half}([x_0, x_1, y_0, y_1]) = [-y_0, -y_1, x_0, x_1]
$$

那么再配合

$$
\cos = [\cos\phi_0, \cos\phi_1, \cos\phi_0, \cos\phi_1]
$$
和

$$
\sin = [\sin\phi_0, \sin\phi_1, \sin\phi_0, \sin\phi_1]
$$

就有

$$
x \cdot \cos + \operatorname{rotate\_half}(x)\cdot \sin
$$
等价于逐组执行二维旋转。

把它逐项展开就是：

$$
[x_0\cos\phi_0 - y_0\sin\phi_0,\; x_1\cos\phi_1 - y_1\sin\phi_1,\; y_0\cos\phi_0 + x_0\sin\phi_0,\; y_1\cos\phi_1 + x_1\sin\phi_1]
$$

这与标准二维旋转完全等价，只是张量布局不同：

- 数学表达通常写成“相邻两维一组”
- 工程实现里则常写成“前半是实部，后半是虚部”

这种写法的好处是：

1. 不需要显式地把每两维拆成很多小块再逐块旋转
2. 更容易利用张量广播做批量计算
3. 更适合 GPU 上大批量的 `[batch, seq_len, num_heads, head_dim]` 运算

因此，“前后两半”不是在修改 RoPE 或 YaRN 的数学定义，而只是把二维旋转改写成一种更适合工程实现的张量形式。

## 理论与实现的变量映射

这一节把论文中的变量、代码中的配置项，以及工程实现里的实际含义统一对应起来。

#### 模型维度相关变量

- `hidden_size`：一个 token 在模型主干中的总表示维度，也就是 embedding 长度和 hidden state 长度
- `num_attention_heads`：注意力头数
- `head_dim`：每个头分到的维度，等于 `hidden_size // num_attention_heads`
- `dim`：传给 `precompute_freqs` 的实际值，本质上就是 `head_dim`

这里要特别注意：RoPE 不是作用在整个 `hidden_size` 上，而是独立地作用在每个 attention head 的最后一维上，所以传给 `precompute_freqs` 的不是整个 `hidden_size`，而是 `head_dim`。

#### 上下文长度相关变量

- `original_max_position_embeddings`：论文中的原始训练长度 \(L\)
- `end`：当前实现准备预计算到的最大位置数，可以理解为目标长度 \(L'\)
- `factor`：上下文扩展倍数，对应论文中的 \(s=\frac{L'}{L}\)

因此，`end` 更接近“当前模型准备支持多长上下文”，而 `original_max_position_embeddings` 才更接近“模型预训练时最初见过多长上下文”。

#### 分段插值相关变量

论文里的 `NTK-by-parts` 依赖的是“按旋转圈数分段”的思想，而本项目把它实现成了更直接的工程参数：

- `beta_fast`
- `beta_slow`
- `ramp`

它们的作用分别是：

- `beta_fast`：高频边界。高于这个边界的维度基本不缩放
- `beta_slow`：低频边界。低于这个边界的维度基本完全按 \(1/s\) 缩放
- `ramp`：在高频边界和低频边界之间做线性过渡

代码中实际执行的是：

$$
\theta'_d = \theta_d \cdot \Big((1-\gamma_d) + \gamma_d / factor\Big)
$$

其中 `gamma_d` 就是由 `ramp` 给出的过渡系数。

#### Attention scaling 相关变量

- `attention_factor`：对应论文里的 attention scaling 的工程实现

它不是改变频率本身，而是直接乘在最终的 `cos/sin` 上：

$$
\text{freqs\_cos} = \cos(\cdot)\times \text{attention\_factor}
$$

$$
\text{freqs\_sin} = \sin(\cdot)\times \text{attention\_factor}
$$

由于最终 RoPE 后的 `q` 和 `k` 都会乘到这个系数，因此它等价于把 attention 分数里的 \(qk^\top\) 整体缩放一个常数，从而实现论文里的温度补偿。



## 程序
### 函数与接口定义

在本项目中，位置编码的实现主要由两个函数完成：

- `precompute_freqs`
- `apply_rotary_pos_emb`

前者负责预先计算所有位置对应的 `cos/sin` 表，后者负责把这些表应用到注意力层中的 `q` 和 `k` 上。

#### precompute_freqs

函数定义如下：

```python
def precompute_freqs(
    dim: int,
    end: int = int(32 * 1024),
    rope_base: float = 1e6,
    rope_scaling: Optional[dict] = None,
)
```

其中各个参数的含义如下：

- `dim`：每个 attention head 的维度，也就是 RoPE 实际作用的向量长度。注意它不是整个 `hidden_size`，而是 `head_dim = hidden_size // num_attention_heads`
- `end`：要预计算到的最大位置数，也就是最多为多少个 token 位置生成 `cos/sin`
- `rope_base`：RoPE公式中的底数 `base`
- `rope_scaling`：可选的YARN配置字典；为 `None` 时表示使用普通RoPE

这里的 `Optional[dict]` 是 Python 类型标注，意思是“这个参数要么是一个 `dict`，要么是 `None`”，并不是一种新的运行时类型。

这个函数的返回值是：

```python
freqs_cos, freqs_sin
```

二者都可以理解为形状大致为 `[end, dim]` 的张量，表示从位置 0 到位置 `end-1` 的全部旋转参数表。

它的内部流程可以概括为：

1. 先根据 `dim` 和 `rope_base` 计算标准RoPE频率
2. 如果配置了 `rope_scaling` 且目标长度超过原始训练长度，则按YARN方式调整频率
3. 生成位置索引向量 `t = [0, 1, 2, ..., end-1]`
4. 做外积，得到每个位置、每个维度上的旋转角度
5. 对旋转角度取 `cos` 和 `sin`

该函数会在模型初始化时被调用一次，用于生成位置编码缓存，而不是每次前向都重新计算。

#### apply_rotary_pos_emb

函数定义如下：

```python
def apply_rotary_pos_emb(q, k, cos, sin, position_ids=None, unsqueeze_dim=1):
```

这个函数的作用，是把上一步得到的 `cos/sin` 真正应用到注意力层中的 query 和 key 上。实现方式不是直接“加位置向量”，而是把 `q` 和 `k` 的最后一个维度分成前后两半，通过

$$
x\cdot cos + rotate(x)\cdot sin
$$

的形式完成旋转。

在本项目实际使用时，各个输入张量的典型形状如下：

- `q`：`[bsz, seq_len, num_heads, head_dim]`
- `k`：`[bsz, seq_len, num_kv_heads, head_dim]`
- `cos`：`[seq_len, head_dim]`
- `sin`：`[seq_len, head_dim]`

返回值为：

- `q_embed`
- `k_embed`

它们的形状与输入的 `q`、`k` 保持一致。

需要注意的是，这个函数虽然定义了 `position_ids` 参数，但当前实现中并没有真正使用它。也就是说，本项目不是在函数内部根据 `position_ids` 选择位置，而是在外部先把对应位置范围的 `cos/sin` 切好，再传进来使用。

### 调用关系

这两个函数在模型中的调用链如下：

1. `MokioMindModel.__init__` 调用 `precompute_freqs`
2. 得到的 `freqs_cos` 和 `freqs_sin` 被注册为 buffer，作为整张位置编码表缓存下来
3. `MokioMindModel.forward` 根据当前序列起始位置 `start_pos` 和当前长度 `seq_length`，切出本轮所需的 `cos/sin`
4. 每个 `MokioMindBlock` 把这组 `position_embeddings` 继续传给 `Attention.forward`
5. `Attention.forward` 内部调用 `apply_rotary_pos_emb(xq, xk, cos, sin)`
