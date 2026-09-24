# HTML-PPT

老师一键制作课程 PPT 的网页原型。填写课程主题、年级、模板和教学目标后，一键生成整套课件，并在网页里用「平滑」切换播放；也可以导出为带 PowerPoint「平滑」切换的 `.pptx` 文件。

## 功能

- **一键生成 13 页课件**：封面、目录、五个教学环节（导入、新知讲解、课堂练习、课堂总结、课后作业，每个环节一张章节页和一张内容页）、结束页。
- **三套模板**：简洁教学风、活泼互动风、学术汇报风。
- **网页端平滑切换**：相邻两页中相同的元素会自动移动、缩放、变色，整套课件前后连贯。比如封面大标题缩成页眉，目录里的五张卡片收拢成侧边栏，侧边栏的高亮块随章节下移，练习页的柱形从基线长出来，结束页由侧边栏铺满整页。
- **导出 PPTX**：导出的文件为每一页写入 PowerPoint 的平滑切换，并附带每页的讲解提示（写在备注里）。
- **放映**：点击画面、左右滑动、方向键 / 空格 / PageUp / PageDown 翻页，按 F 键或点「全屏放映」进入全屏。

## 使用

用新版 Chrome、Edge、Safari 或 Firefox 直接打开 `index.html` 即可，不需要安装或构建。

导出 PPTX 时会从 jsDelivr（备用 unpkg）加载 [PptxGenJS](https://github.com/gitbrent/PptxGenJS) 4.0.1，需要联网。平滑效果需要用 PowerPoint 2019 及以上版本或 Microsoft 365 放映；不支持平滑切换的软件会改用文件里预留的「淡出」切换。

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
js/morph.js         网页版平滑切换引擎（MorphDeck）
js/deck.js          课程大纲 → 课件页面描述，以及渲染成网页
js/export-pptx.js   导出 .pptx 并写入平滑切换
```

## 后续计划

- 接入真实 AI 生成课件内容。模型的 API 密钥需要放在后端代理或服务器环境变量里，不能写进前端代码。
- 支持在页面上直接编辑每页文字。
