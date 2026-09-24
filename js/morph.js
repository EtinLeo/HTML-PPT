/*
 * morph.js：网页版「平滑」切换引擎
 *
 * 思路与 PowerPoint 的「平滑」(Morph) 切换一致：相邻两页中名字相同的对象
 * 会被配对，位置、大小、颜色、圆角、旋转、字号等属性在两页之间自动补间；
 * 只在上一页出现的对象淡出，只在下一页出现的对象淡入。
 *
 * 页面结构：
 *   <div class="deck-viewport" tabindex="0">      播放区域，可全屏
 *     <div class="deck-stage">                    固定 1280×720 的画布，按比例缩放
 *       <section class="slide" data-bg="#F6F8FC">
 *         <div class="m" data-morph="title" style="left:96px; top:260px; …">…</div>
 *       </section>
 *     </div>
 *   </div>
 *
 * 页内元素请直接放在 section 下并使用绝对定位，data-morph 的值就是配对用的名字。
 */
(function (global) {
  "use strict";

  const STAGE_WIDTH = 1280;
  const STAGE_HEIGHT = 720;

  // 配对元素之间需要补间的样式，全部使用可插值的长写属性
  const MORPH_PROPS = [
    "left", "top", "width", "height", "rotate",
    "backgroundColor", "color", "boxShadow",
    "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontSize", "lineHeight", "letterSpacing",
  ];

  const EASE_MORPH = "cubic-bezier(0.65, 0, 0.35, 1)";
  const EASE_ENTER = "cubic-bezier(0.22, 1, 0.36, 1)";
  const Z_STEP = 1000;

  function readFrame(el) {
    const style = getComputedStyle(el);
    const frame = {};
    MORPH_PROPS.forEach((prop) => {
      frame[prop] = style[prop];
    });
    // 用布局尺寸而不是 getBoundingClientRect，避免受舞台缩放和旋转影响
    frame.left = el.offsetLeft + "px";
    frame.top = el.offsetTop + "px";
    frame.width = el.offsetWidth + "px";
    frame.height = el.offsetHeight + "px";
    return frame;
  }

  function collect(slide) {
    const map = new Map();
    slide.querySelectorAll("[data-morph]").forEach((el) => map.set(el.dataset.morph, el));
    return map;
  }

  class MorphDeck {
    /**
     * @param {HTMLElement} viewport 播放区域（内部需要有 .deck-stage）
     * @param {{duration?: number, mode?: "morph"|"fade"|"none", onChange?: Function}} options
     */
    constructor(viewport, options = {}) {
      this.viewport = viewport;
      this.stage = viewport.querySelector(".deck-stage");
      this.duration = options.duration || 1200;
      this.mode = options.mode || "morph";
      this.onChange = options.onChange || null;
      this.slides = [];
      this.index = -1;
      this.running = null;
      this.pointer = null;
      this.reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");

      new ResizeObserver(() => this.fit()).observe(viewport);
      viewport.addEventListener("keydown", (event) => this.handleKey(event));
      viewport.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
      viewport.addEventListener("pointerup", (event) => this.handlePointerUp(event));
      viewport.addEventListener("pointercancel", () => {
        this.pointer = null;
      });
      this.fit();
    }

    get count() {
      return this.slides.length;
    }

    /** 重新读取舞台中的所有页面，并直接显示第 start 页 */
    load(start = 0) {
      this.settle();
      this.slides = Array.from(this.stage.children).filter((el) => el.classList.contains("slide"));
      this.index = -1;
      if (this.slides.length) {
        this.go(Math.min(start, this.slides.length - 1), { instant: true });
      }
    }

    next() {
      this.go(this.index + 1);
    }

    prev() {
      this.go(this.index - 1);
    }

    go(target, { instant = false } = {}) {
      if (!this.slides.length) return;
      const index = Math.max(0, Math.min(this.slides.length - 1, target));
      if (index === this.index) return;

      // 上一段动画还没播完时，先让它直接到达终点，再开始新的切换
      this.settle();
      const from = this.slides[this.index];
      const to = this.slides[index];
      this.index = index;

      const mode = this.currentMode();
      if (!from || instant || mode === "none") {
        if (from) from.classList.remove("is-active");
        to.classList.add("is-active");
        this.stage.style.backgroundColor = to.dataset.bg || "";
      } else {
        const animations = mode === "fade" ? this.fade(from, to) : this.morph(from, to);
        this.track(from, to, animations);
      }
      if (this.onChange) this.onChange(this.index, this.slides.length, to);
    }

    currentMode() {
      // 系统开启「减少动态效果」时，平滑切换降级为短暂淡入淡出
      if (this.mode === "morph" && this.reducedMotion.matches) return "fade";
      return this.mode;
    }

    morph(from, to) {
      const duration = this.duration;
      const animations = [];
      const before = collect(from);
      const after = collect(to);

      // 1. 趁上一页还在原位，记录它的状态
      const frames = new Map();
      const opacities = new Map();
      before.forEach((el, key) => {
        opacities.set(key, getComputedStyle(el).opacity);
        if (after.has(key)) frames.set(key, readFrame(el));
      });

      // 2. 两页同时显示，直到动画结束
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
      to.classList.add("is-active");
      animations.push(this.paintBackground(from, to, duration));

      // 3. 统一排定前后层次：下一页按自身顺序排列；上一页要淡出的元素
      //    紧跟在它前面最近的配对元素之后，避免被新页的元素提前盖住
      const layer = new Map();
      after.forEach((el, key) => {
        layer.set(key, (layer.size + 1) * Z_STEP);
        el.style.zIndex = String(layer.get(key));
      });
      let base = 0;
      let offset = 0;
      before.forEach((el, key) => {
        if (layer.has(key)) {
          base = layer.get(key);
          offset = 0;
          el.style.zIndex = String(base - 1);
        } else {
          offset += 1;
          el.style.zIndex = String(base + offset);
        }
      });

      let entering = 0;
      after.forEach((el, key) => {
        const source = before.get(key);
        const endOpacity = getComputedStyle(el).opacity;

        if (!source) {
          // 只在下一页出现：等配对元素基本就位后再淡入并轻轻上浮，多个元素依次出现
          const delay = duration * 0.45 + Math.min(entering, 6) * 40 + Number(el.dataset.enterDelay || 0);
          entering += 1;
          animations.push(
            el.animate(
              [
                { opacity: 0, transform: "translateY(24px)" },
                { opacity: endOpacity, transform: "none" },
              ],
              { duration: duration * 0.55, delay, easing: EASE_ENTER, fill: "backwards" },
            ),
          );
          return;
        }

        const start = frames.get(key);
        const end = readFrame(el);
        const startOpacity = opacities.get(key);
        animations.push(el.animate([start, end], { duration, easing: EASE_MORPH }));

        if (source.innerHTML === el.innerHTML) {
          // 内容相同：由下一页的元素独自完成整段变形
          source.style.visibility = "hidden";
          if (startOpacity !== endOpacity) {
            animations.push(
              el.animate([{ opacity: startOpacity }, { opacity: endOpacity }], { duration, easing: EASE_MORPH }),
            );
          }
        } else {
          // 内容不同（比如换了文字）：新旧两份沿同一路径变形，同时交叉淡化
          animations.push(source.animate([start, end], { duration, easing: EASE_MORPH, fill: "forwards" }));
          animations.push(
            source.animate([{ opacity: startOpacity }, { opacity: 0 }], {
              duration: duration * 0.55,
              easing: "ease-in",
              fill: "forwards",
            }),
          );
          animations.push(
            el.animate([{ opacity: 0 }, { opacity: endOpacity }], {
              duration: duration * 0.55,
              delay: duration * 0.45,
              easing: "ease-out",
              fill: "backwards",
            }),
          );
        }
      });

      // 4. 只在上一页出现：原地淡出
      before.forEach((el, key) => {
        if (after.has(key)) return;
        animations.push(
          el.animate([{ opacity: opacities.get(key) }, { opacity: 0 }], {
            duration: duration * 0.45,
            easing: "ease-out",
            fill: "forwards",
          }),
        );
      });

      return animations;
    }

    fade(from, to) {
      const duration = this.reducedMotion.matches ? 250 : this.duration * 0.6;
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
      to.classList.add("is-active");
      return [
        this.paintBackground(from, to, duration),
        from.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease", fill: "forwards" }),
        to.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: "ease" }),
      ];
    }

    paintBackground(from, to, duration) {
      const fromColor = from.dataset.bg || "transparent";
      const toColor = to.dataset.bg || "transparent";
      this.stage.style.backgroundColor = toColor;
      return this.stage.animate([{ backgroundColor: fromColor }, { backgroundColor: toColor }], {
        duration,
        easing: EASE_MORPH,
      });
    }

    track(from, to, animations) {
      const run = { from, to, animations };
      this.running = run;
      Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (this.running === run) this.settle();
        })
        // 动画被提前结束时 finished 会 reject，这是预期情况
        .catch(() => {});
    }

    /** 立即结束正在进行的切换，并清理上一页留下的临时状态 */
    settle() {
      const run = this.running;
      if (!run) return;
      this.running = null;
      run.animations.forEach((animation) => animation.cancel());
      run.from.classList.remove("is-leaving");
      [run.from, run.to].forEach((slide) => {
        slide.querySelectorAll("[data-morph]").forEach((el) => {
          el.style.visibility = "";
          el.style.zIndex = "";
        });
      });
    }

    fit() {
      const scale = Math.min(
        this.viewport.clientWidth / STAGE_WIDTH,
        this.viewport.clientHeight / STAGE_HEIGHT,
      );
      this.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (this.viewport.requestFullscreen) {
        this.viewport
          .requestFullscreen()
          .then(() => this.viewport.focus())
          .catch(() => {});
      }
    }

    handleKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
        case "Enter":
          this.next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
          this.prev();
          break;
        case "Home":
          this.go(0);
          break;
        case "End":
          this.go(this.slides.length - 1);
          break;
        case "f":
        case "F":
          this.toggleFullscreen();
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    handlePointerDown(event) {
      if (event.button !== 0) return;
      this.pointer = { x: event.clientX, y: event.clientY };
    }

    handlePointerUp(event) {
      const start = this.pointer;
      this.pointer = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // 左右滑动翻页
        if (dx < 0) this.next();
        else this.prev();
      } else if (Math.hypot(dx, dy) < 6) {
        // 点击画面左侧三分之一回到上一页，其余位置前进
        const rect = this.viewport.getBoundingClientRect();
        if (event.clientX - rect.left < rect.width * 0.3) this.prev();
        else this.next();
      }
    }
  }

  MorphDeck.STAGE_WIDTH = STAGE_WIDTH;
  MorphDeck.STAGE_HEIGHT = STAGE_HEIGHT;
  global.MorphDeck = MorphDeck;
})(window);
