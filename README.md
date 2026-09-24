# HTML-PPT

老师一键制作课程 PPT 的网页原型。填写课程主题、年级、模板和教学目标后，一键生成整套课件，并在网页里用「平滑」切换播放；也可以导出为带 PowerPoint「平滑」切换的 `.pptx` 文件。

## 功能

- **一键生成 13 页课件**：封面、目录、五个教学环节（导入、新知讲解、课堂练习、课堂总结、课后作业，每个环节一张章节页和一张内容页）、结束页。
- **三套模板**：简洁教学风、活泼互动风、学术汇报风。
- **网页端平滑切换**：相邻两页中相同的元素会自动移动、缩放、变色，整套课件前后连贯。比如封面大标题缩成页眉，目录里的五张卡片收拢成侧边栏，侧边栏的高亮块随章节下移，练习页的柱形从基线长出来，结束页由侧边栏铺满整页。
- **导出 PPTX**：导出的文件为每一页写入 PowerPoint 的平滑切换，并附带每页的讲解提示（写在备注里）。
- **AI 生成正文**：部署 `server.js` 并配置 NVIDIA API 密钥后，可由 AI 按课题编写各页内容。
- **放映**：点击画面、左右滑动、方向键 / 空格 / PageUp / PageDown 翻页，按 F 键或点「全屏放映」进入全屏。

## 样片课：二进制的秘密

`samples/binary/` 是一节按科普视频风格制作的完整课例，内容依据江苏凤凰教育出版社《数学教师教学用书 六年级上册》中的「探索规律 · 二进制的秘密」（1 课时），按参考教案的四个环节组织：

1. **提出问题**：计算机背景只作引子（开关的开 / 关对应 1 / 0），聚焦核心问题「一个十进制数怎样用二进制数表示呢」。
2. **探究发现**：对比十进制数 0～9 与二进制数，得出「满 2 进 1」等发现；在计数器上拨珠，看到满 2 颗珠向前一位进 1；认识计数单位 (1)₂、(10)₂、(100)₂、(1000)₂ 分别是 1、2、4、8；辨析 (100)₂ 为什么是 4 而不是 100；把 (10101)₂ 改写成十进制数，再练习 (110101)₂、(1010110)₂。
3. **拓展延伸**：填写五进制、八进制计数单位表，比较不同进制的相同点和不同点。
4. **回顾反思**：从「我知道了什么」「我是怎样知道的」「我还有什么疑问」回顾，提炼结论。

全课 20 步，由一条 [GSAP](https://gsap.com) 时间线驱动。点击画面或按方向键逐步讲解，每一步下方会显示取自教参的教学提示（追问、组织建议）；也可以点「自动播放」连续播放。GSAP 的核心和插件放在 `vendor/gsap/`，离线也能打开。

## 使用

用新版 Chrome、Edge、Safari 或 Firefox 直接打开 `index.html` 即可，不需要安装或构建。

导出 PPTX 时会从 jsDelivr（备用 unpkg）加载 [PptxGenJS](https://github.com/gitbrent/PptxGenJS) 4.0.1，需要联网。平滑效果需要用 PowerPoint 2019 及以上版本或 Microsoft 365 放映；不支持平滑切换的软件会改用文件里预留的「淡出」切换。

## AI 生成课件内容

用 `server.js` 启动时，页面会出现「用 AI 生成课件正文」选项。服务器调用 NVIDIA 的模型接口（OpenAI 兼容格式），根据课题、年级和教学目标生成导入问题、讲解步骤、分层练习、易错点、分层作业和每页讲解提示；老师没填教学目标时也由 AI 拟定。AI 返回的每段文字都会按版面限制截断，缺失或格式不对的部分自动改用本地模板，AI 调用失败时整套课件也会退回本地模板。

密钥只保存在服务器的环境变量里，浏览器只访问本服务的 `/api/generate`，看不到密钥。本地试用：

```bash
NVIDIA_API_KEY=你的密钥 node server.js   # 需要 Node.js 18 及以上
# 打开 http://localhost:8080
```

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NVIDIA_API_KEY` | NVIDIA API 密钥（在 build.nvidia.com 申请） | 无，不填则只有本地模板 |
| `NVIDIA_MODEL` | 模型名称 | `meta/llama-3.3-70b-instruct` |
| `NVIDIA_BASE_URL` | 接口地址 | `https://integrate.api.nvidia.com/v1` |
| `PORT` / `HOST` | 监听端口 / 地址 | `8080` / `0.0.0.0` |
| `RATE_LIMIT` | 每个 IP 每分钟最多生成次数 | `6` |
| `TRUST_PROXY` | 放在 Nginx 后面时设为 `1` | 关闭 |

## 部署到服务器（以香港服务器为例）

香港服务器可以直接访问 NVIDIA 接口和导出用的 CDN，内地访客访问也不需要备案。以下两种方式任选其一，配置文件都在 `deploy/` 目录。

**方式一：Docker**

```bash
git clone https://github.com/EtinLeo/HTML-PPT.git /opt/html-ppt && cd /opt/html-ppt
cp deploy/html-ppt.env.example .env && chmod 600 .env   # 填入密钥；HOST 改为 0.0.0.0
docker build -t html-ppt .
docker run -d --name html-ppt --restart unless-stopped --env-file .env -p 127.0.0.1:8080:8080 html-ppt
```

**方式二：systemd**（服务器需先安装 Node.js 18 及以上）

```bash
git clone https://github.com/EtinLeo/HTML-PPT.git /opt/html-ppt
sudo cp /opt/html-ppt/deploy/html-ppt.env.example /etc/html-ppt.env   # 填入密钥
sudo chmod 600 /etc/html-ppt.env
sudo cp /opt/html-ppt/deploy/html-ppt.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now html-ppt
```

两种方式都只在本机 8080 端口监听，再用 Nginx 对外提供 HTTPS：把 `deploy/nginx.conf`（已按 ppt.meridion.com 配好）放进 `/etc/nginx/conf.d/`，用 certbot 申请证书后 `nginx -s reload`。更新版本时 `git pull` 后重新构建镜像，或执行 `systemctl restart html-ppt`。

## 平滑切换的实现

课件的每一页都用同一种结构描述：一组带 `key` 的元素，包括位置、尺寸、颜色、圆角和文字（见 `js/deck.js`）。同一个 `key` 在不同页面重复出现，就是切换时需要连起来的对象。

### 网页端（`js/morph.js`）

与 PowerPoint「平滑」切换按对象配对的思路一致：

1. 相邻两页中 `data-morph` 名称相同的元素配成一对，用 Web Animations API 补间位置、尺寸、颜色、圆角、边框、旋转、内边距和字号。
2. 配对元素的文字不同时，新旧两份沿同一路径变形，同时交叉淡化。
3. 只在上一页出现的元素原地淡出，并保持原来的前后层次；只在下一页出现的元素等配对元素基本就位后再依次淡入。
4. 系统开启「减少动态效果」时，自动改为短暂的淡入淡出。

`MorphDeck` 不依赖课件生成器，手写的页面也能用：

```html
<div class="deck-viewport" tabindex="0">
  <div class="deck-stage">
    <section class="slide" data-bg="#F5F7FB">
      <div class="m" data-morph="title" style="left: 96px; top: 280px; width: 700px; height: 100px; font-size: 72px">二次函数</div>
    </section>
    <section class="slide" data-bg="#F5F7FB">
      <div class="m" data-morph="title" style="left: 80px; top: 48px; width: 400px; height: 56px; font-size: 36px">二次函数</div>
    </section>
  </div>
</div>
<script src="js/morph.js"></script>
<script>
  const deck = new MorphDeck(document.querySelector(".deck-viewport"));
  deck.load();
</script>
```

画布固定为 1280×720，会按比例缩放到播放区域；元素请直接放在 `section` 下并使用绝对定位。播放器所需的 CSS 见 `index.html` 中的「课件播放器」部分。

### PPTX（`js/export-pptx.js`）

- 1280×720 画布正好对应 PowerPoint 宽屏的 13.333×7.5 英寸（1 英寸 = 96 像素），元素一一换算成形状和文本框。
- 同一个 `key` 的对象在每一页都命名为 `!!key`。PowerPoint 的平滑切换会把名称相同、且以 `!!` 开头的对象强制配对。
- 从第 2 页起写入平滑切换（`<p159:morph option="byObject"/>`，时长 1.2 秒），并用 `mc:AlternateContent` 预留「淡出」切换作为兼容方案。

## 文件结构

```
index.html          页面与交互
server.js           静态文件 + AI 生成接口（/api/generate）
Dockerfile          Docker 镜像
deploy/             systemd、Nginx 配置和环境变量示例
samples/binary/     样片课「二进制的秘密」
vendor/gsap/        GSAP 动画库（样片使用）
js/morph.js         网页版平滑切换引擎（MorphDeck）
js/deck.js          课程大纲 → 课件页面描述，以及渲染成网页
js/export-pptx.js   导出 .pptx 并写入平滑切换
```

## 后续计划

- 支持在页面上直接编辑每页文字。
