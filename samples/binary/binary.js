/*
 * 二进制的秘密（苏教版数学六年级上册 · 探索规律）
 *
 * 按《数学教师教学用书 六年级上册》的参考教案组织，共四个环节：
 * 提出问题 → 探究发现 → 拓展延伸 → 回顾反思。计算机背景只作引子，
 * 主线是对比十进制、理解「满 2 进 1」、认识二进制数的计数单位、
 * 把二进制数改写成十进制数，再类推五进制、八进制。
 *
 * 整个演示是一条 GSAP 时间线，按「步」切开：每一步有一句字幕、一组动画和一条
 * 给老师看的教学提示；播完一步停住，点击或按方向键进入下一步，也可以自动播放。
 */
(function () {
  "use strict";

  gsap.registerPlugin(TextPlugin, DrawSVGPlugin);

  // ---------- 视觉规范 ----------

  const PAPER = "#F1EEE7";
  const GRID = "#E2DDD2";
  const INK = "#15161A";
  const MUTE = "#8B867C";
  const GLASS = "#FBFAF6";
  const ON = "#FFC21A";
  const HOT = "#E5432D";
  const HEAD = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Zen Hei", sans-serif';
  const MONO = '"JetBrains Mono", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
  const STAGES = ["提出问题", "探究发现", "拓展延伸", "回顾反思"];

  const NS = "http://www.w3.org/2000/svg";
  const stage = document.getElementById("stage");

  function el(tag, attrs = {}, parent = stage) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    parent.appendChild(node);
    return node;
  }

  function txt(parent, x, y, str, opts = {}) {
    const node = el(
      "text",
      {
        x,
        y,
        "font-family": opts.mono ? MONO : HEAD,
        "font-size": opts.size || 40,
        "font-weight": opts.weight || 400,
        fill: opts.fill || INK,
        "text-anchor": opts.anchor || "start",
        ...(opts.attrs || {}),
      },
      parent,
    );
    node.textContent = str;
    return node;
  }

  // 进制数的规范写法，如 (10)₂
  const SUB = { 2: "₂", 5: "₅", 8: "₈" };
  const based = (digits, base) => `(${digits})${SUB[base]}`;
  const bin = (n) => n.toString(2);

  // ---------- 时间线与分步 ----------

  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.8, ease: "power3.inOut" } });
  const steps = [];
  let caption;

  /** 一步：先执行 build 里的动画，同时打出字幕，然后停住；note 是给老师的教学提示 */
  function step(text, note, build) {
    const start = tl.duration();
    build();
    tl.to(caption, { text: { value: text }, duration: Math.min(1.6, text.length * 0.035), ease: "none" }, start);
    const stop = tl.duration() + 0.05;
    const index = steps.length;
    steps.push({ text, note, stop });
    tl.addPause(stop, () => onStop(index));
  }

  function leave(targets, at = ">") {
    tl.to(targets, { opacity: 0, y: "-=40", duration: 0.45, stagger: 0.02, ease: "power2.in" }, at);
  }

  function show(group) {
    tl.set(group, { autoAlpha: 1 });
  }

  function hidden(group) {
    gsap.set(group, { autoAlpha: 0 });
    return group;
  }

  // ---------- 纸面、网格、角标、字幕 ----------

  el("rect", { width: 1920, height: 1080, fill: PAPER });

  const gridLines = [];
  const gridLayer = el("g", { stroke: GRID, "stroke-width": 1.5 });
  for (let x = 120; x < 1920; x += 120) gridLines.push(el("line", { x1: x, y1: 0, x2: x, y2: 1080 }, gridLayer));
  for (let y = 120; y < 1080; y += 120) gridLines.push(el("line", { x1: 0, y1: y, x2: 1920, y2: y }, gridLayer));

  const chrome = el("g");
  const cropMarks = [
    [60, 60, 1, 1],
    [1860, 60, -1, 1],
    [60, 1020, 1, -1],
    [1860, 1020, -1, -1],
  ].map(([x, y, dx, dy]) =>
    el("path", { d: `M${x} ${y + 36 * dy} V${y} H${x + 36 * dx}`, fill: "none", stroke: INK, "stroke-width": 3 }, chrome),
  );
  el("rect", { x: 96, y: 88, width: 18, height: 18, fill: INK }, chrome);
  txt(chrome, 128, 104, "二进制的秘密", { size: 26, weight: 700 });
  const stageNo = txt(chrome, 310, 104, "01", { size: 26, mono: true, fill: MUTE });
  const stageName = txt(chrome, 350, 104, STAGES[0], { size: 26, fill: MUTE });
  txt(chrome, 1824, 104, "六年级上册 · 探索规律", { size: 24, fill: MUTE, anchor: "end" });

  el("rect", { x: 96, y: 1052, width: 1728, height: 4, fill: GRID }, chrome);
  const progress = el("rect", { x: 96, y: 1052, width: 0, height: 4, fill: INK }, chrome);

  el("rect", { x: 96, y: 958, width: 10, height: 44, fill: ON }, chrome);
  caption = txt(chrome, 128, 992, "", { size: 32, weight: 500 });

  function stageTo(n) {
    tl.set(stageNo, { text: String(n).padStart(2, "0") });
    tl.set(stageName, { text: STAGES[n - 1] }, "<");
    tl.to(progress, { attr: { width: (1728 * n) / STAGES.length }, duration: 0.8, ease: "power2.out" }, "<");
  }

  // ---------- 灯泡（只在情境导入里用一次） ----------

  function makeLamp(parent, cx, cy, scale) {
    // 外层留给动画使用，定位放在内层，避免两者的 transform 互相覆盖
    const outer = el("g", {}, parent);
    const body = el("g", { transform: `translate(${cx} ${cy}) scale(${scale})` }, outer);
    const glow = el("circle", { r: 60, fill: ON, opacity: 0 }, body);
    const glass = el("circle", { r: 60, fill: GLASS, stroke: INK, "stroke-width": 5 }, body);
    const fil = el(
      "path",
      { d: "M-20 14 L-9 -14 L0 10 L9 -14 L20 14", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" },
      body,
    );
    const base = el("g", { fill: INK }, body);
    el("rect", { x: -28, y: 56, width: 56, height: 16, rx: 3 }, base);
    el("rect", { x: -24, y: 76, width: 48, height: 12, rx: 3 }, base);
    el("rect", { x: -12, y: 92, width: 24, height: 9, rx: 3 }, base);
    return { outer, glow, glass, fil };
  }

  function lampTo(lamp, on, at) {
    tl.to(lamp.glass, { attr: { fill: on ? ON : GLASS }, duration: 0.3 }, at);
    tl.to(lamp.fil, { attr: { stroke: on ? HOT : INK }, duration: 0.3 }, "<");
    tl.to(lamp.glow, { attr: { r: on ? 120 : 60 }, opacity: on ? 0.3 : 0, duration: 0.45 }, "<");
  }

  // ---------- 计数器 ----------

  const ROD_GAP = 170;

  /**
   * 计数器：places 个数位，每根档最多显示 3 颗珠（满 2 时能看到第 2 颗）。
   * x 为左下角横坐标，档从左到右依次是最高位到数位一。
   */
  function makeCounter(parent, x, labels) {
    const g = el("g", {}, parent);
    const places = labels.length;
    const baseY = 640;
    el("rect", { x, y: baseY, width: places * ROD_GAP + 40, height: 36, rx: 8, fill: INK }, g);
    const rods = labels.map((label, p) => {
      const rx = x + 90 + p * ROD_GAP;
      el("line", { x1: rx, y1: 300, x2: rx, y2: baseY, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, g);
      const name = txt(g, rx, baseY + 80, label, { size: 28, fill: MUTE, anchor: "middle" });
      const beads = [0, 1, 2].map((k) => {
        const cy = baseY - 26 - k * 50;
        const bead = el("ellipse", { cx: rx, cy, rx: 58, ry: 23, fill: ON, stroke: INK, "stroke-width": 4 }, g);
        gsap.set(bead, { autoAlpha: 0, scale: 0.4, svgOrigin: `${rx} ${cy}` });
        return bead;
      });
      return { x: rx, beads, name };
    });
    return { g, rods, places, state: new Array(places).fill(0) };
  }

  // 数位 i（从右往左，0 表示数位一）上显示 n 颗珠
  function beadsTo(counter, i, n, at) {
    const rod = counter.rods[counter.places - 1 - i];
    rod.beads.forEach((bead, k) => {
      tl.to(bead, { autoAlpha: k < n ? 1 : 0, scale: k < n ? 1 : 0.4, duration: 0.3, ease: k < n ? "back.out(2)" : "power2.in" }, k === 0 ? at : "<");
    });
    counter.state[i] = n;
  }

  // 拨上 1 颗珠；某一位满 2 时，这 2 颗珠变红、拨去，并向前一位进 1
  function addOne(counter) {
    let i = 0;
    beadsTo(counter, 0, counter.state[0] + 1, ">+0.15");
    while (counter.state[i] === 2) {
      const beads = counter.rods[counter.places - 1 - i].beads.slice(0, 2);
      tl.to(beads, { attr: { fill: HOT }, duration: 0.2 }, "+=0.2");
      beadsTo(counter, i, 0, "+=0.25");
      tl.set(beads, { attr: { fill: ON } });
      beadsTo(counter, i + 1, counter.state[i + 1] + 1, "<");
      i += 1;
    }
  }

  function clearCounter(counter, at = ">") {
    counter.state.forEach((_, i) => beadsTo(counter, i, 0, i === 0 ? at : "<"));
  }

  // =====================================================================
  // 一、提出问题
  // =====================================================================

  const s1 = el("g");
  const kicker = el("g", {}, s1);
  el("rect", { x: 160, y: 290, width: 300, height: 56, fill: INK }, kicker);
  txt(kicker, 310, 329, "探索规律 · 1 课时", { size: 28, fill: PAPER, anchor: "middle" });
  const titleChars = Array.from("二进制的秘密").map((ch, i) => txt(s1, 160 + i * 140, 520, ch, { size: 140, weight: 800 }));
  const subtitle = txt(s1, 164, 620, "一个十进制数，怎样用二进制数表示？", { size: 44, fill: MUTE });

  const digitRows = el("g", {}, s1);
  const decRow = el("g", {}, digitRows);
  txt(decRow, 1060, 770, "十进制", { size: 30, fill: MUTE });
  const decDigits = Array.from({ length: 10 }, (_, d) =>
    txt(decRow, 1200 + d * 62, 772, String(d), { size: 52, mono: true, weight: 700, anchor: "middle" }),
  );
  const binRow = el("g", {}, digitRows);
  txt(binRow, 1060, 860, "二进制", { size: 30, fill: MUTE });
  const binDigits = [0, 1].map((d) => txt(binRow, 1200 + d * 62, 862, String(d), { size: 52, mono: true, weight: 700, anchor: "middle", fill: HOT }));

  stageTo(1);
  step(
    "日常生活中，人们通常使用十进制数；而计算机传输信息时，需要把各种输入信息转化为二进制数进行处理。",
    "情境导入：可播放计算机内部处理信息的动画片段，提问「计算机内部是怎样表示数字和信息的？」明确计算机用的是二进制数，板书课题。",
    () => {
      tl.fromTo(gridLines, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.4, stagger: 0.012, ease: "power2.inOut" }, 0);
      tl.fromTo(cropMarks, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, stagger: 0.08 }, 0.2);
      tl.fromTo(kicker, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.5 }, 0.6);
      tl.fromTo(titleChars, { y: 70, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: "back.out(1.7)" }, 0.8);
      tl.fromTo(subtitle, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.6 }, 1.4);
      tl.fromTo(decRow, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.6);
      tl.fromTo(decDigits, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "back.out(2)" }, 1.6);
      tl.fromTo(binRow, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.2);
      tl.fromTo(binDigits, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4, ease: "back.out(2)" }, 2.2);
    },
  );

  const s1b = hidden(el("g"));
  const lamp = makeLamp(s1b, 760, 470, 1.6);
  const sw = el("g", {}, s1b);
  const swBody = el("g", { transform: "translate(1060 430)" }, sw);
  const track = el("rect", { width: 200, height: 90, rx: 45, fill: PAPER, stroke: INK, "stroke-width": 5 }, swBody);
  const knob = el("circle", { cx: 45, cy: 45, r: 30, fill: INK }, swBody);
  const swState = txt(s1b, 1480, 520, "", { size: 64, weight: 800, anchor: "middle" });

  step(
    "开关只有「开」「关」两种状态，正好可以对应 1 和 0 两个数字。",
    "用「开关只有开 / 关两种状态，对应 1 / 0 两个数字」简要说明即可，计算机背景只作引子，不要偏离数学探究的主线。",
    () => {
      leave([kicker, ...titleChars, subtitle, digitRows]);
      show(s1b);
      tl.fromTo([lamp.outer, sw], { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5 });
      tl.to(knob, { attr: { cx: 155 }, duration: 0.4 }, "+=0.2");
      tl.to(track, { attr: { fill: ON }, duration: 0.3 }, "<");
      lampTo(lamp, true, "<");
      tl.set(swState, { text: "开 → 1" }, "<");
      tl.fromTo(swState, { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<");
      tl.to(knob, { attr: { cx: 45 }, duration: 0.4 }, "+=0.8");
      tl.to(track, { attr: { fill: PAPER }, duration: 0.3 }, "<");
      lampTo(lamp, false, "<");
      tl.set(swState, { text: "关 → 0" }, "<");
    },
  );

  const s1c = hidden(el("g"));
  const questionMark = txt(s1c, 1500, 640, "？", { size: 420, weight: 800, fill: ON, anchor: "middle" });
  const questionText = [
    txt(s1c, 200, 440, "一个十进制数", { size: 96, weight: 800 }),
    txt(s1c, 200, 580, "怎样用二进制数表示呢？", { size: 96, weight: 800 }),
  ];

  step(
    "今天的核心问题：一个十进制数怎样用二进制数表示呢？先猜一猜。",
    "组织学生自由猜想，暴露已有认知，让认知冲突成为后续探究活动的起点。",
    () => {
      leave([lamp.outer, sw, swState]);
      show(s1c);
      tl.fromTo(questionText, { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: 0.15, duration: 0.6, ease: "power3.out" });
      tl.fromTo(questionMark, { opacity: 0, scale: 0.4, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, transformOrigin: "50% 70%", duration: 0.7, ease: "back.out(1.8)" }, "-=0.3");
    },
  );

  // =====================================================================
  // 二、探究发现
  // =====================================================================

  // 十进制数 0～9 与二进制数对比表（二进制数按数位四～数位一对齐）
  const s2 = hidden(el("g"));
  const COLS = [600, 770, 940, 1110];
  const rowY = (i) => 318 + i * 62;
  const rowHighlights = [0, 1, 2, 4].map((i) => {
    const rect = el("rect", { x: 262, y: rowY(i) - 44, width: 920, height: 58, fill: ON, opacity: 0 }, s2);
    return { i, rect };
  });
  const tableHead = el("g", {}, s2);
  txt(tableHead, 380, 236, "十进制数", { size: 32, weight: 800, anchor: "middle" });
  txt(tableHead, 855, 196, "二进制数", { size: 32, weight: 800, anchor: "middle" });
  ["数位四", "数位三", "数位二", "数位一"].forEach((name, c) => txt(tableHead, COLS[c], 244, name, { size: 26, fill: MUTE, anchor: "middle" }));
  el("line", { x1: 520, y1: 208, x2: 1190, y2: 208, stroke: INK, "stroke-width": 2 }, tableHead);
  const tableRule = el("line", { x1: 262, y1: 262, x2: 1182, y2: 262, stroke: INK, "stroke-width": 4 }, s2);
  const tableRows = Array.from({ length: 10 }, (_, n) => {
    const g = el("g", {}, s2);
    const y = rowY(n);
    txt(g, 380, y, String(n), { size: 44, mono: true, weight: 700, anchor: "middle" });
    const digits = bin(n).split("");
    digits.forEach((d, k) => {
      const c = 4 - digits.length + k;
      txt(g, COLS[c], y, d, { size: 44, mono: true, weight: 700, anchor: "middle", fill: d === "1" ? HOT : INK });
    });
    el("line", { x1: 262, y1: y + 16, x2: 1182, y2: y + 16, stroke: GRID, "stroke-width": 2 }, g);
    return g;
  });
  const binBlock = el("rect", { x: 530, y: 270, width: 650, height: 622, fill: "none", stroke: HOT, "stroke-width": 4, "stroke-dasharray": "14 10" }, s2);
  const ring2 = el("ellipse", { cx: 1025, cy: rowY(2) - 14, rx: 150, ry: 38, fill: "none", stroke: HOT, "stroke-width": 4 }, s2);
  const bracket4 = el("rect", { x: COLS[1] - 60, y: rowY(4) - 46, width: COLS[3] - COLS[1] + 120, height: 60, rx: 30, fill: "none", stroke: HOT, "stroke-width": 4 }, s2);

  const findings = [
    ["① 十进制数 0 和 1，", "在二进制数中也是 0 和 1。"],
    ["② 二进制数都是由 0、1", "这两个数字组成的。"],
    ["③ 二进制数「满 2 进 1」，", "十进制数 2 用「10」表示。"],
    ["④ 十进制数 4 用二进制表示，", "用了 3 个数位。"],
  ].map(([a, b], i) => {
    const g = el("g", {}, s2);
    const y = 330 + i * 150;
    txt(g, 1270, y, a, { size: 36, weight: 800 });
    txt(g, 1270, y + 50, b, { size: 36, weight: 800 });
    return g;
  });
  gsap.set(findings, { autoAlpha: 0 });

  step(
    "比一比十进制数 0～9 和相应的二进制数，你能发现什么？",
    "先引导学生独立思考，再在小组里交流自己的发现。可以从三个角度观察：由哪些数字组成？2 为什么用「10」表示？4 用了几个数位？",
    () => {
      leave([...questionText, questionMark]);
      stageTo(2);
      show(s2);
      tl.fromTo(tableHead, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.fromTo(tableRule, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 }, "<");
      tl.fromTo(tableRows, { opacity: 0, x: 40 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.45, ease: "power3.out" });
    },
  );

  step(
    "十进制数 0 和 1 在二进制数中也是 0 和 1；二进制数都是由 0、1 这两个数字组成的。",
    "引导学生用自己的话说出发现，再全班交流明确。",
    () => {
      rowHighlights.filter((h) => h.i < 2).forEach((h, k) => tl.to(h.rect, { opacity: 0.35, duration: 0.3 }, k ? "<0.1" : ">"));
      tl.fromTo(findings[0], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<");
      tl.fromTo(binBlock, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9 }, "+=0.2");
      tl.fromTo(findings[1], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "-=0.4");
    },
  );

  step(
    "二进制计数「满 2 进 1」，所以十进制数 2 要用「10」表示；十进制数 4 用二进制表示时，用了 3 个数位。",
    "追问：十进制中 10 表示什么？二进制中「10」表示什么？强化不同进制中相同数字组合所表示的不同含义。",
    () => {
      tl.to(binBlock, { opacity: 0, duration: 0.3 });
      tl.to(rowHighlights.filter((h) => h.i < 2).map((h) => h.rect), { opacity: 0, duration: 0.3 }, "<");
      tl.to(rowHighlights[2].rect, { opacity: 0.35, duration: 0.3 });
      tl.fromTo(ring2, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<");
      tl.fromTo(findings[2], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<0.2");
      tl.to(rowHighlights[3].rect, { opacity: 0.35, duration: 0.3 }, "+=0.4");
      tl.fromTo(bracket4, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<");
      tl.fromTo(findings[3], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<0.2");
    },
  );

  // 计数器拨珠
  const s3 = hidden(el("g"));
  const counterB = makeCounter(s3, 300, ["数位四", "数位三", "数位二", "数位一"]);
  const decShow = el("g", {}, s3);
  txt(decShow, 1180, 330, "十进制数", { size: 32, fill: MUTE });
  const decValue = txt(decShow, 1180, 500, "", { size: 170, mono: true, weight: 700 });
  txt(decShow, 1180, 590, "二进制数", { size: 32, fill: MUTE });
  const binValue = txt(decShow, 1180, 720, "", { size: 110, mono: true, weight: 700, fill: HOT });
  const notation = el("g", {}, s3);
  el("rect", { x: 1170, y: 790, width: 640, height: 110, fill: INK }, notation);
  txt(notation, 1200, 836, "为了便于区别，「10」记作 (10)₂", { size: 30, weight: 700, fill: PAPER });
  txt(notation, 1200, 880, "读作「一零」", { size: 30, weight: 700, fill: ON });
  gsap.set(notation, { autoAlpha: 0 });

  function showValue(n) {
    tl.set(decValue, { text: String(n) }, "<");
    tl.set(binValue, { text: based(bin(n), 2) }, "<");
  }

  step(
    "在计数器上，按照「满 2 进 1」的规则，从 1 开始依次拨一拨。先拨 1：数位一上拨 1 颗珠。",
    "确保全员参与计数器操作，让每一个学生都能亲手拨出表示 0～9 的二进制数。",
    () => {
      leave([tableHead, tableRule, ...tableRows, ring2, bracket4, ...findings, ...rowHighlights.map((h) => h.rect)]);
      show(s3);
      tl.fromTo(counterB.g, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 });
      tl.fromTo(decShow, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<0.2");
      addOne(counterB);
      showValue(1);
    },
  );

  step(
    "数位一上已经有 1 颗珠，再添 1 颗就满 2 了：拨去这 2 颗珠，在数位二上拨 1 颗。这个数就是 (10)₂。",
    "追问：右起第一位已经有 1 颗珠，如果再加 1 颗珠，作为二进制数，接下来该怎样拨？强调：每一位满 2 就向它的前一位进 1。",
    () => {
      addOne(counterB);
      showValue(2);
      tl.fromTo(notation, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "+=0.2");
    },
  );

  step(
    "照这样继续拨下去：3 是 (11)₂，4 是 (100)₂……一直拨到 9，就是 (1001)₂。",
    "追问：十进制数 3 呢？让学生边拨边说，注意观察每一次「满 2 进 1」。",
    () => {
      tl.to(notation, { autoAlpha: 0, duration: 0.3 });
      for (let n = 3; n <= 9; n += 1) {
        addOne(counterB);
        showValue(n);
        tl.to({}, { duration: 0.35 });
      }
    },
  );

  // 计数单位：十进制计数器与二进制计数器对照
  const s4 = hidden(el("g"));
  const counterD = makeCounter(s4, 100, ["千位", "百位", "十位", "个位"]);
  const decUnits = ["1000", "100", "10", "1"].map((u, p) => txt(s4, counterD.rods[p].x, 250, u, { size: 40, mono: true, weight: 700, anchor: "middle" }));
  const decTitle = txt(s4, 120, 180, "十进制数", { size: 34, weight: 800 });
  const binTitle = txt(s4, 1000, 180, "二进制数", { size: 34, weight: 800 });
  const binUnitX = [0, 1, 2, 3].map((p) => 1000 - 300 + 300 + 90 + p * ROD_GAP);
  const binUnits = ["1000", "100", "10", "1"].map((u, p) => txt(s4, binUnitX[p], 250, based(u, 2), { size: 36, mono: true, weight: 700, anchor: "middle" }));
  const binWorth = [8, 4, 2, 1].map((v, p) => txt(s4, binUnitX[p], 800, `= ${v}`, { size: 44, mono: true, weight: 700, anchor: "middle", fill: HOT }));
  const doubleArcs = [0, 1, 2].map((p) => {
    const g = el("g", {}, s4);
    const x1 = binUnitX[p + 1] - 10;
    const x0 = binUnitX[p] + 10;
    el("path", { d: `M${x1} 860 Q${(x0 + x1) / 2} 900 ${x0} 860`, fill: "none", stroke: MUTE, "stroke-width": 2.5 }, g);
    txt(g, (x0 + x1) / 2, 926, "×2", { size: 24, mono: true, fill: MUTE, anchor: "middle" });
    return g;
  });

  step(
    "十进制数的计数单位 1、10、100、1000……都可以用 1 颗珠摆在不同数位上表示。",
    "在计数器上分别表示出这些计数单位，明确：计数单位都可以用 1 颗珠摆在不同的数位上来表示。",
    () => {
      leave([decShow]);
      clearCounter(counterB, "<");
      tl.to(counterB.g, { x: 700, duration: 0.8 });
      show(s4);
      tl.fromTo([counterD.g, decTitle], { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6 }, "<");
      counterD.rods.forEach((rod, p) => {
        beadsTo(counterD, 3 - p, 1, "+=0.1");
        tl.fromTo(decUnits[p], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, "<");
      });
    },
  );

  step(
    "二进制数的计数单位是 (1)₂、(10)₂、(100)₂、(1000)₂……在十进制中分别是 1、2、4、8，后一个总是前一个的 2 倍。",
    "让学生用 1 颗珠在不同数位上摆一摆，对照表格找出二进制数的计数单位。追问：十进制数 4 在二进制中用了几个数位？十进制数 8 呢？",
    () => {
      tl.fromTo(binTitle, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      [3, 2, 1, 0].forEach((p) => {
        beadsTo(counterB, 3 - p, 1, "+=0.1");
        tl.fromTo(binUnits[p], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, "<");
        tl.fromTo(binWorth[p], { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<0.1");
      });
      tl.fromTo([...doubleArcs].reverse(), { opacity: 0 }, { opacity: 1, stagger: 0.15, duration: 0.3 });
    },
  );

  // 为什么 (100)₂ 是 4 而不是 100
  const s5 = hidden(el("g"));
  const whyLeft = [
    txt(s5, 300, 380, "十进制", { size: 36, fill: MUTE }),
    txt(s5, 300, 520, "100 = 10 × 10", { size: 76, mono: true, weight: 700 }),
  ];
  const whyRight = [
    txt(s5, 1000, 380, "二进制", { size: 36, fill: MUTE }),
    txt(s5, 1000, 520, "(100)₂ = 2 × 2 = 4", { size: 76, mono: true, weight: 700, fill: HOT }),
  ];
  const whyNote = el("g", {}, s5);
  el("rect", { x: 300, y: 650, width: 1320, height: 90, fill: ON }, whyNote);
  txt(whyNote, 960, 710, "数位相同，但计数单位不同：满 10 进 1 与满 2 进 1", { size: 40, weight: 800, anchor: "middle" });

  step(
    "为什么 (100)₂ 在十进制中是 4，而不是 100？因为数位不同，计数单位不同：(100)₂ 表示 2×2，不是 10×10。",
    "教学难点：借助这个追问，突出二进制计数单位的位值本质，突破十进制的认知定式。",
    () => {
      leave([counterD.g, counterB.g, decTitle, binTitle, ...decUnits, ...binUnits, ...binWorth, ...doubleArcs]);
      show(s5);
      tl.fromTo(whyLeft, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 });
      tl.fromTo(whyRight, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 }, "+=0.3");
      tl.fromTo(whyNote, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.6 }, "+=0.2");
    },
  );

  // 把 (10101)₂ 改写成十进制数
  const s6 = hidden(el("g"));
  const EX = [560, 720, 880, 1040, 1200];
  const exParen = [txt(s6, 470, 400, "(", { size: 150, mono: true, weight: 700, anchor: "middle" }), txt(s6, 1262, 400, ")₂", { size: 150, mono: true, weight: 700 })];
  const exDigits = "10101".split("").map((d, i) => txt(s6, EX[i], 400, d, { size: 150, mono: true, weight: 700, anchor: "middle", fill: d === "1" ? HOT : INK }));
  const exPlaces = ["数位五", "数位四", "数位三", "数位二", "数位一"].map((p, i) => txt(s6, EX[i], 250, p, { size: 26, fill: MUTE, anchor: "middle" }));
  const exMeans = ["1 个 (10000)₂", "0 个 (1000)₂", "1 个 (100)₂", "0 个 (10)₂", "1 个 (1)₂"].map((m, i) =>
    txt(s6, EX[i], 470, m, { size: 24, weight: 700, anchor: "middle", fill: i % 2 ? MUTE : HOT }),
  );
  const exLines = [
    "= (10000)₂×1 + (100)₂×1 + (1)₂×1",
    "= 16×1 + 4×1 + 1×1",
    "= 21",
  ].map((line, i) => txt(s6, 470, 600 + i * 96, line, { size: 56, mono: true, weight: 700, fill: i === 2 ? HOT : INK }));

  step(
    "一个二进制数可以写成不同计数单位的和，进而改写成十进制数：(10101)₂ = 21。",
    "追问：(10101)₂ 中每个 1 和 0 分别表示什么？引导学生先按数位展开，写成计数单位与个数相乘的形式，再对应到十进制数相加。",
    () => {
      leave([...whyLeft, ...whyRight, whyNote]);
      show(s6);
      tl.fromTo([...exParen, ...exDigits], { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5, ease: "back.out(1.6)" });
      tl.fromTo(exPlaces, { opacity: 0 }, { opacity: 1, stagger: 0.06, duration: 0.3 }, "<0.2");
      tl.fromTo(exMeans, { opacity: 0, y: -10 }, { opacity: 1, y: 0, stagger: 0.25, duration: 0.4 }, "+=0.2");
      exLines.forEach((line) => tl.fromTo(line, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, "+=0.35"));
    },
  );

  const s7 = hidden(el("g"));
  const problems = [
    ["(110101)₂", "= 32×1 + 16×1 + 4×1 + 1×1", "53"],
    ["(1010110)₂", "= 64×1 + 16×1 + 4×1 + 2×1", "86"],
  ].map(([q, work, ans], i) => {
    const y = 380 + i * 280;
    const g = el("g", {}, s7);
    txt(g, 300, y, q, { size: 80, mono: true, weight: 700 });
    const blank = txt(g, 860, y, "= ?", { size: 80, mono: true, weight: 700, fill: MUTE });
    const workText = txt(g, 300, y + 90, work, { size: 44, mono: true, fill: MUTE });
    const answer = txt(g, 860, y, `= ${ans}`, { size: 80, mono: true, weight: 700, fill: HOT });
    gsap.set([workText, answer], { autoAlpha: 0 });
    return { g, blank, workText, answer };
  });
  const tryTag = el("g", {}, s7);
  el("rect", { x: 300, y: 196, width: 170, height: 56, fill: INK }, tryTag);
  txt(tryTag, 385, 235, "试一试", { size: 30, weight: 800, fill: ON, anchor: "middle" });

  step(
    "用这样的方法，你会把 (110101)₂ 和 (1010110)₂ 改写成十进制数吗？",
    "学生独立改写，再交流「按数位展开 → 写成计数单位及其个数 → 求和」的过程。",
    () => {
      leave([...exParen, ...exDigits, ...exPlaces, ...exMeans, ...exLines]);
      show(s7);
      tl.fromTo(tryTag, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.4 });
      tl.fromTo(problems.map((p) => p.g), { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: 0.2, duration: 0.5 });
    },
  );

  step(
    "(110101)₂ = 32 + 16 + 4 + 1 = 53；(1010110)₂ = 64 + 16 + 4 + 2 = 86。",
    "核对答案时，请学生说出每个 1 所在数位的计数单位。",
    () => {
      problems.forEach((p) => {
        tl.to(p.blank, { autoAlpha: 0, duration: 0.2 }, "+=0.2");
        tl.fromTo(p.workText, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.4 });
        tl.fromTo(p.answer, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, transformOrigin: "0% 60%", duration: 0.45, ease: "back.out(2)" });
      });
    },
  );

  // =====================================================================
  // 三、拓展延伸：五进制、八进制
  // =====================================================================

  const s8 = hidden(el("g"));
  const UX = [690, 960, 1230, 1500];
  const RY = [370, 480, 590, 700];
  const baseNames = ["十进制数", "二进制数", "五进制数", "八进制数"];
  const extHead = el("g", {}, s8);
  txt(extHead, 1095, 196, "计数单位", { size: 32, weight: 800, anchor: "middle" });
  ["数位四", "数位三", "数位二", "数位一"].forEach((p, c) => txt(extHead, UX[c], 262, p, { size: 26, fill: MUTE, anchor: "middle" }));
  txt(extHead, 1730, 262, "相邻关系", { size: 26, fill: MUTE, anchor: "middle" });
  el("line", { x1: 260, y1: 290, x2: 1820, y2: 290, stroke: INK, "stroke-width": 4 }, extHead);
  const unitsOf = (b) => ["1000", "100", "10", "1"].map((u) => (b === 10 ? u : `${based(u, b)}=${parseInt(u, b)}`));
  const extRows = [10, 2, 5, 8].map((b, r) => {
    const g = el("g", {}, s8);
    txt(g, 280, RY[r], baseNames[r], { size: 36, weight: 800 });
    el("line", { x1: 260, y1: RY[r] + 36, x2: 1820, y2: RY[r] + 36, stroke: GRID, "stroke-width": 2 }, g);
    const cells = unitsOf(b).map((u, c) => {
      const known = b === 10 || b === 2;
      const cell = txt(g, UX[c], RY[r], known ? u : `${based(["1000", "100", "10", "1"][c], b)}=`, {
        size: 34,
        mono: true,
        weight: 700,
        anchor: "middle",
        fill: known ? INK : MUTE,
      });
      return { cell, full: u };
    });
    const ratio = txt(g, 1730, RY[r], b === 10 || b === 2 ? `×${b}` : "×?", { size: 40, mono: true, weight: 700, anchor: "middle", fill: b === 10 || b === 2 ? INK : MUTE });
    return { g, b, cells, ratio };
  });

  step(
    "你还知道其他进制的数吗？五进制数、八进制数的计数单位各是多少？相邻计数单位之间有什么关系？先填一填。",
    "出示五进制、八进制计数单位对比表，让学生各自填表后交流：你是怎样想到的？",
    () => {
      leave(problems.map((p) => p.g).concat([tryTag]));
      stageTo(3);
      show(s8);
      tl.fromTo(extHead, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.fromTo(extRows.map((r) => r.g), { opacity: 0, x: 40 }, { opacity: 1, x: 0, stagger: 0.15, duration: 0.5, ease: "power3.out" });
    },
  );

  step(
    "五进制：1、5、25、125……后一个总是前一个的 5 倍；八进制：1、8、64、512……后一个总是前一个的 8 倍。",
    "引导学生从二进制、十进制的计数单位出发，自主类推其他进制的计数单位。",
    () => {
      extRows.slice(2).forEach((row) => {
        [3, 2, 1, 0].forEach((c, k) => {
          tl.set(row.cells[c].cell, { text: row.cells[c].full, attr: { fill: HOT } }, k === 0 ? "+=0.2" : "+=0.25");
          tl.fromTo(row.cells[c].cell, { scale: 0.6 }, { scale: 1, transformOrigin: "50% 60%", duration: 0.3, ease: "back.out(2)", immediateRender: false }, "<");
        });
        tl.set(row.ratio, { text: `×${row.b}`, attr: { fill: HOT } }, "+=0.15");
      });
    },
  );

  const compare = hidden(el("g", {}, s8));
  const same = el("g", {}, compare);
  el("rect", { x: 260, y: 790, width: 760, height: 120, fill: INK }, same);
  txt(same, 290, 840, "相同点", { size: 28, weight: 800, fill: ON });
  txt(same, 290, 886, "都用计数单位和计数单位的个数表示数", { size: 32, weight: 700, fill: PAPER });
  const diff = el("g", {}, compare);
  el("rect", { x: 1060, y: 790, width: 760, height: 120, fill: ON }, diff);
  txt(diff, 1090, 840, "不同点", { size: 28, weight: 800 });
  txt(diff, 1090, 886, "进位规则不同：满 2 进 1、满 5 进 1……", { size: 32, weight: 700 });

  step(
    "二进制、五进制、八进制、十进制有什么相同点和不同点？",
    "引导学生抽象出「都要用计数单位以及计数单位的个数来表示数」，只是进位规则不一样，感悟位值制的本质。",
    () => {
      show(compare);
      tl.fromTo(same, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 });
      tl.fromTo(diff, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, "+=0.2");
    },
  );

  // =====================================================================
  // 四、回顾反思
  // =====================================================================

  const s9 = hidden(el("g"));
  const reflectQs = ["我知道了什么？", "我是怎样知道的？", "我还有什么疑问？"].map((q, i) => {
    const g = el("g", {}, s9);
    const x = 260 + i * 480;
    el("rect", { x, y: 330, width: 440, height: 220, fill: GLASS, stroke: INK, "stroke-width": 4 }, g);
    txt(g, x + 30, 400, String(i + 1).padStart(2, "0"), { size: 40, mono: true, weight: 700, fill: HOT });
    txt(g, x + 30, 480, q, { size: 44, weight: 800 });
    return g;
  });

  step(
    "回顾探索和发现规律的过程，你有哪些收获？从这三个方面说一说。",
    "学生小组交流后全班分享。要珍视学生个性化的收获与疑问，并将其作为进阶探究的起点。",
    () => {
      leave([extHead, ...extRows.map((r) => r.g), compare]);
      stageTo(4);
      show(s9);
      tl.fromTo(reflectQs, { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: "power3.out" });
    },
  );

  const conclusions = [
    "同一个数可以用不同的进制表示。",
    "无论是几进制数，都要表示出计数单位和计数单位的个数。",
    "二进制、五进制表示数的方法和十进制是类似的。",
  ].map((line, i) => {
    const g = el("g", {}, s9);
    const y = 360 + i * 150;
    el("rect", { x: 260, y: y - 50, width: 14, height: 64, fill: ON }, g);
    txt(g, 300, y, line, { size: 52, weight: 800 });
    return g;
  });
  gsap.set(conclusions, { autoAlpha: 0 });

  step(
    "不管是几进制，都是用计数单位和计数单位的个数来表示数；观察、比较、类比迁移，也是探索规律的好方法。",
    "小结时强调位值制的本质与类比迁移的方法，为学生探究其他数学规律提供思维工具。",
    () => {
      leave(reflectQs);
      tl.fromTo(conclusions, { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, stagger: 0.25, duration: 0.6, ease: "power3.out" });
    },
  );

  // ---------- 播放控制 ----------

  const stepLabel = document.getElementById("step");
  const noteEl = document.getElementById("note");
  const playBtn = document.getElementById("play");
  const frame = document.getElementById("frame");
  let autoplay = false;
  let hold = null;

  function currentStep() {
    const t = tl.time();
    return steps.filter((s) => s.stop <= t + 1e-3).length;
  }

  function updateUI() {
    const index = Math.max(1, Math.min(currentStep() + (tl.isActive() ? 1 : 0), steps.length));
    stepLabel.textContent = `${index} / ${steps.length}`;
    noteEl.textContent = steps[index - 1].note;
    playBtn.textContent = autoplay ? "暂停自动播放" : "自动播放";
  }

  function onStop(index) {
    updateUI();
    if (hold) hold.kill();
    if (autoplay && index < steps.length - 1) {
      // 按字幕长度留出阅读时间再继续
      hold = gsap.delayedCall(1.4 + steps[index].text.length * 0.06, () => tl.play());
    } else if (index === steps.length - 1) {
      autoplay = false;
      updateUI();
    }
  }

  function next() {
    if (hold) hold.kill();
    const t = tl.time();
    const stop = steps.find((s) => s.stop > t + 1e-3);
    if (!stop) return;
    if (tl.isActive()) {
      // 正在播放这一步：直接跳到这一步的结尾
      tl.pause(stop.stop);
      onStop(steps.indexOf(stop));
    } else {
      tl.play();
      updateUI();
    }
  }

  function prev() {
    if (hold) hold.kill();
    autoplay = false;
    const t = tl.time();
    const earlier = steps.filter((s) => s.stop < t - 1e-3);
    tl.pause(earlier.length ? earlier[earlier.length - 1].stop : steps[0].stop);
    updateUI();
  }

  function toggleAutoplay() {
    autoplay = !autoplay;
    if (hold) hold.kill();
    if (autoplay && !tl.isActive()) {
      if (currentStep() >= steps.length) tl.pause(0);
      tl.play();
    }
    updateUI();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
  }

  document.getElementById("next").addEventListener("click", next);
  document.getElementById("prev").addEventListener("click", prev);
  playBtn.addEventListener("click", toggleAutoplay);
  const fullscreenBtn = document.getElementById("fullscreen");
  fullscreenBtn.hidden = !document.fullscreenEnabled;
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  frame.addEventListener("click", (event) => {
    const rect = frame.getBoundingClientRect();
    if (event.clientX - rect.left < rect.width * 0.25) prev();
    else next();
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("button, a")) {
      if (event.key === " " || event.key === "Enter") return;
    }
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        prev();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "p":
      case "P":
        toggleAutoplay();
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  // 系统开启「减少动态效果」时加快播放
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.timeScale(3);

  window.binaryDemo = { tl, steps, next, prev };
  tl.play();
  updateUI();
})();
