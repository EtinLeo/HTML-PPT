/*
 * 二进制的秘密（苏教版数学六年级上册 · 探索规律）
 *
 * 按《数学教师教学用书 六年级上册》的参考教案组织，共四个环节：
 * 提出问题 → 探究发现 → 拓展延伸 → 回顾反思。计算机背景只作引子，
 * 主线是对比十进制、理解「满 2 进 1」、认识二进制数的计数单位、
 * 把二进制数改写成十进制数，再类推五进制、八进制。
 *
 * 每个提问单独成一步，停在问题上留给学生思考、操作或讨论，下一步才给出明确结论。
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

  /**
   * 一步：先执行 build 里的动画，同时打出字幕，然后停住。
   * note 是给老师的教学提示；opts.act 是右上角的学生活动标签（如「想一想」），
   * opts.hold 是自动播放时额外停留的秒数，留给学生思考。
   */
  function step(text, note, build, opts = {}) {
    const start = tl.duration();
    build();
    tl.to(caption, { text: { value: text }, duration: Math.min(1.8, text.length * 0.03), ease: "none" }, start);
    // 稍晚于上一步的停顿点，避免停在上一步时提前显示这一步的标签
    tl.set(actText, { text: opts.act || "" }, start + 0.02);
    tl.to(actBadge, { autoAlpha: opts.act ? 1 : 0, duration: 0.3 }, start + 0.02);
    const stop = tl.duration() + 0.05;
    const index = steps.length;
    steps.push({ text, note, stop, hold: opts.hold || 0 });
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
  caption = txt(chrome, 128, 992, "", { size: 30, weight: 500 });

  // 右上角的学生活动标签：想一想、小组交流、动手拨一拨……
  const actBadge = el("g", {}, chrome);
  el("rect", { x: 1600, y: 132, width: 224, height: 56, rx: 28, fill: HOT }, actBadge);
  const actText = txt(actBadge, 1712, 170, "", { size: 28, weight: 800, fill: GLASS, anchor: "middle" });
  gsap.set(actBadge, { autoAlpha: 0 });

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
  // 一、提出问题，引发思考
  // =====================================================================

  const s1 = el("g");
  const kicker = el("g", {}, s1);
  el("rect", { x: 160, y: 290, width: 300, height: 56, fill: INK }, kicker);
  txt(kicker, 310, 329, "探索规律 · 1 课时", { size: 28, fill: PAPER, anchor: "middle" });
  const titleChars = Array.from("二进制的秘密").map((ch, i) => txt(s1, 160 + i * 140, 520, ch, { size: 140, weight: 800 }));
  const subtitle = txt(s1, 164, 620, "数学 · 六年级上册", { size: 44, fill: MUTE });

  const digitRows = el("g", {}, s1);
  const decRow = el("g", {}, digitRows);
  txt(decRow, 1060, 770, "日常生活", { size: 30, fill: MUTE });
  const decDigits = Array.from({ length: 10 }, (_, d) =>
    txt(decRow, 1220 + d * 60, 772, String(d), { size: 52, mono: true, weight: 700, anchor: "middle" }),
  );
  const binRow = el("g", {}, digitRows);
  txt(binRow, 1060, 860, "计算机", { size: 30, fill: MUTE });
  const binDigits = [0, 1].map((d) => txt(binRow, 1220 + d * 60, 862, String(d), { size: 52, mono: true, weight: 700, anchor: "middle", fill: HOT }));

  stageTo(1);
  step(
    "日常生活中，人们通常使用十进制数；而计算机传输信息时，需要把各种输入信息转化为二进制数进行处理。",
    "情境导入：可播放一小段计算机内部处理信息的动画，引出课题。计算机背景只作引子，时间控制在 2 分钟以内。",
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
    "计算机内部是怎样表示数字和信息的？开关只有「开」「关」两种状态，正好对应 1 和 0 两个数字。",
    "提问后请一两名学生说说想法，再用开关简要说明。点到为止，不展开计算机原理。",
    () => {
      leave([kicker, ...titleChars, subtitle, digitRows]);
      show(s1b);
      tl.fromTo([lamp.outer, sw], { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5 });
      tl.to(knob, { attr: { cx: 155 }, duration: 0.4 }, "+=0.3");
      tl.to(track, { attr: { fill: ON }, duration: 0.3 }, "<");
      lampTo(lamp, true, "<");
      tl.set(swState, { text: "开 → 1" }, "<");
      tl.fromTo(swState, { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<");
      tl.to(knob, { attr: { cx: 45 }, duration: 0.4 }, "+=1.2");
      tl.to(track, { attr: { fill: PAPER }, duration: 0.3 }, "<");
      lampTo(lamp, false, "<");
      tl.set(swState, { text: "关 → 0" }, "<");
    },
  );

  const s1c = hidden(el("g"));
  const questionMark = txt(s1c, 1520, 600, "？", { size: 380, weight: 800, fill: ON, anchor: "middle" });
  const questionText = [
    txt(s1c, 200, 400, "一个十进制数", { size: 92, weight: 800 }),
    txt(s1c, 200, 530, "怎样用二进制数表示呢？", { size: 92, weight: 800 }),
  ];
  const guesses = ["只有 0 和 1，2 该怎么写？", "会不会也要「进位」？", "二进制里也有「10」吗？"].map((g, i) => {
    const group = el("g", {}, s1c);
    el("rect", { x: 200 + i * 520, y: 660, width: 480, height: 88, rx: 44, fill: GLASS, stroke: INK, "stroke-width": 3 }, group);
    txt(group, 440 + i * 520, 716, g, { size: 32, weight: 700, anchor: "middle" });
    return group;
  });

  step(
    "今天要研究的核心问题：一个十进制数怎样用二进制数表示呢？先大胆猜一猜。",
    "组织学生自由猜想，把不同想法写在黑板一角，课末回头验证。画面下方是学生可能出现的猜想，可根据课堂实际替换。",
    () => {
      leave([lamp.outer, sw, swState]);
      show(s1c);
      tl.fromTo(questionText, { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: 0.15, duration: 0.6, ease: "power3.out" });
      tl.fromTo(questionMark, { opacity: 0, scale: 0.4, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, transformOrigin: "50% 70%", duration: 0.7, ease: "back.out(1.8)" }, "-=0.3");
      tl.fromTo(guesses, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.25, duration: 0.5, ease: "back.out(1.6)" }, "+=0.4");
    },
    { act: "猜一猜", hold: 4 },
  );

  // =====================================================================
  // 二、探究发现，理解规则
  // =====================================================================

  // ---- 1. 对比观察，初识二进制 ----

  const s2 = hidden(el("g"));
  const COLS = [600, 770, 940, 1110];
  const rowY = (i) => 318 + i * 62;
  const rowHighlights = Array.from({ length: 10 }, (_, i) => el("rect", { x: 262, y: rowY(i) - 44, width: 920, height: 58, fill: ON, opacity: 0 }, s2));
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
  const ringRow = (n) =>
    el("rect", { x: COLS[4 - bin(n).length] - 60, y: rowY(n) - 46, width: COLS[3] - COLS[4 - bin(n).length] + 120, height: 60, rx: 30, fill: "none", stroke: HOT, "stroke-width": 4 }, s2);
  const ring4 = ringRow(4);
  const ring8 = ringRow(8);

  const findings = [
    ["① 十进制数 0 和 1，", "在二进制数中也是 0 和 1。"],
    ["② 二进制数都是由 0、1", "这两个数字组成的。"],
    ["③ 二进制数「满 2 进 1」，", "十进制数 2 用「10」表示。"],
    ["④ 十进制数 4 用二进制表示，", "用了 3 个数位。"],
  ].map(([a, b], i) => {
    const g = el("g", {}, s2);
    const y = 320 + i * 125;
    txt(g, 1270, y, a, { size: 34, weight: 800 });
    txt(g, 1270, y + 46, b, { size: 34, weight: 800 });
    return g;
  });
  gsap.set(findings, { autoAlpha: 0 });

  // 右下角的「追问」卡片：问题和回答分两步出现
  function askCard(parent, question, answer) {
    const g = el("g", {}, parent);
    el("rect", { x: 1250, y: 800, width: 600, height: 120, fill: INK }, g);
    txt(g, 1276, 846, `追问：${question}`, { size: 28, weight: 800, fill: ON });
    const ans = txt(g, 1276, 896, answer, { size: 28, weight: 700, fill: PAPER });
    gsap.set(g, { autoAlpha: 0 });
    gsap.set(ans, { autoAlpha: 0 });
    return { g, ans };
  }
  const askNo2 = askCard(s2, "二进制里为什么没有数字 2？", "因为每一位满 2 就要进 1，写不出「2」。");
  const ask10 = askCard(s2, "两个「10」表示的一样吗？", "十进制 10 是 1 个十；(10)₂ 是 1 个二。");
  const ask8 = askCard(s2, "十进制数 8 用了几个数位？", "(1000)₂，用了 4 个数位。");

  step(
    "比一比十进制数 0～9 和相应的二进制数，你能发现什么？先独立观察，再在小组里说一说。",
    "给学生 2～3 分钟：先独立观察，再小组交流。提示观察角度：二进制数由哪些数字组成？十进制数 2 为什么用「10」表示？十进制数 4 用了几个数位？",
    () => {
      leave([...questionText, questionMark, ...guesses]);
      stageTo(2);
      show(s2);
      tl.fromTo(tableHead, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.fromTo(tableRule, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 }, "<");
      tl.fromTo(tableRows, { opacity: 0, x: 40 }, { opacity: 1, x: 0, stagger: 0.12, duration: 0.45, ease: "power3.out" });
    },
    { act: "小组交流", hold: 5 },
  );

  step(
    "发现一：十进制数 0 和 1，在二进制数中也是 0 和 1。",
    "请学生指着表格说，教师随即圈出 0、1 两行。",
    () => {
      tl.to([rowHighlights[0], rowHighlights[1]], { opacity: 0.35, stagger: 0.15, duration: 0.3 });
      tl.fromTo(findings[0], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<");
    },
  );

  step(
    "发现二：二进制数都是由 0、1 这两个数字组成的。想一想：二进制里为什么没有数字 2？",
    "先让学生思考「为什么没有 2」，不急于给出答案，为下一步「满 2 进 1」埋下伏笔。",
    () => {
      tl.to([rowHighlights[0], rowHighlights[1]], { opacity: 0, duration: 0.3 });
      tl.fromTo(binBlock, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9 });
      tl.fromTo(findings[1], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "-=0.4");
      tl.to(askNo2.g, { autoAlpha: 1, duration: 0.4 }, "+=0.2");
    },
    { act: "想一想", hold: 3 },
  );

  step(
    "因为二进制计数「满 2 进 1」：十进制数 2，在二进制中就要用「10」表示。",
    "结合表格中 1 → 2 的变化说明：数位一满 2，就向数位二进 1。",
    () => {
      tl.to(askNo2.ans, { autoAlpha: 1, duration: 0.4 });
      tl.to(binBlock, { opacity: 0, duration: 0.3 }, "+=0.6");
      tl.to(rowHighlights[2], { opacity: 0.35, duration: 0.3 }, "<");
      tl.fromTo(ring2, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<");
      tl.fromTo(findings[2], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<0.2");
    },
  );

  step(
    "追问：十进制中的 10 表示什么？二进制中的「10」又表示什么？",
    "这一问是理解「满 2 进 1」的关键：同样写作「10」，十进制表示 1 个十，二进制表示 1 个二。可让学生同桌互说。",
    () => {
      tl.to(askNo2.g, { autoAlpha: 0, duration: 0.3 });
      tl.to(ask10.g, { autoAlpha: 1, duration: 0.4 });
      tl.to(ask10.ans, { autoAlpha: 1, duration: 0.4 }, "+=1.2");
    },
    { act: "同桌说", hold: 3 },
  );

  step(
    "再追问：十进制数 4 用二进制怎样表示？用了几个数位？",
    "引导学生关注数位的变化：从 3 到 4，数位一、数位二接连满 2，数位增加到 3 个。",
    () => {
      tl.to(ask10.g, { autoAlpha: 0, duration: 0.3 });
      tl.to(rowHighlights[2], { opacity: 0, duration: 0.3 }, "<");
      tl.to(rowHighlights[4], { opacity: 0.35, duration: 0.3 });
      tl.fromTo(ring4, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<");
      tl.fromTo(findings[3], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "<0.2");
    },
    { act: "想一想", hold: 2 },
  );

  step(
    "那么十进制数 8 呢？在二进制中用了几个数位？",
    "为后面认识计数单位埋下伏笔：数位增加的地方正好是 2、4、8。",
    () => {
      tl.to(ask8.g, { autoAlpha: 1, duration: 0.4 });
      tl.to(rowHighlights[8], { opacity: 0.35, duration: 0.3 }, "+=0.8");
      tl.fromTo(ring8, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<");
      tl.to(ask8.ans, { autoAlpha: 1, duration: 0.4 }, "<0.3");
    },
  );

  // ---- 2. 操作交流，理解「满 2 进 1」 ----

  const s3 = hidden(el("g"));
  const counterB = makeCounter(s3, 300, ["数位四", "数位三", "数位二", "数位一"]);
  const carryTag = el("g", { opacity: 0 }, s3);
  el("rect", { x: -80, y: -30, width: 160, height: 52, rx: 26, fill: HOT }, carryTag);
  txt(carryTag, 0, 8, "满 2 进 1", { size: 28, weight: 800, fill: GLASS, anchor: "middle" });
  const decShow = el("g", {}, s3);
  txt(decShow, 1180, 330, "十进制数", { size: 32, fill: MUTE });
  const decValue = txt(decShow, 1180, 500, "", { size: 170, mono: true, weight: 700 });
  txt(decShow, 1180, 590, "二进制数", { size: 32, fill: MUTE });
  const binValue = txt(decShow, 1180, 720, "", { size: 110, mono: true, weight: 700, fill: HOT });
  const taskCard = el("g", {}, s3);
  el("rect", { x: 1170, y: 790, width: 660, height: 120, fill: INK }, taskCard);
  txt(taskCard, 1196, 838, "活动：从 1 开始，按「满 2 进 1」的规则", { size: 28, weight: 700, fill: PAPER });
  txt(taskCard, 1196, 884, "依次拨出 1～9，小组里逐个确认", { size: 28, weight: 700, fill: ON });
  const notation = el("g", {}, s3);
  el("rect", { x: 1170, y: 790, width: 660, height: 120, fill: INK }, notation);
  txt(notation, 1196, 838, "为了便于区别，「10」记作 (10)₂", { size: 30, weight: 700, fill: PAPER });
  txt(notation, 1196, 884, "读作「一零」", { size: 30, weight: 700, fill: ON });
  gsap.set([taskCard, notation], { autoAlpha: 0 });

  function showValue(n, at = "<") {
    tl.set(decValue, { text: String(n) }, at);
    tl.set(binValue, { text: n ? based(bin(n), 2) : "" }, "<");
  }

  // 慢速拨上 1 颗珠：满 2 时先停一下，出现「满 2 进 1」标签，再进位
  function addOneSlow(counter) {
    let i = 0;
    beadsTo(counter, 0, counter.state[0] + 1, ">+0.2");
    while (counter.state[i] === 2) {
      const rod = counter.rods[counter.places - 1 - i];
      const beads = rod.beads.slice(0, 2);
      tl.to(beads, { attr: { fill: HOT }, duration: 0.25 }, "+=0.35");
      tl.fromTo(carryTag, { x: rod.x, y: 250, opacity: 0 }, { x: rod.x, y: 250, opacity: 1, duration: 0.25, immediateRender: false }, "<");
      tl.to(carryTag, { x: rod.x - ROD_GAP, duration: 0.5, ease: "power2.inOut" }, "+=0.5");
      beadsTo(counter, i, 0, "<");
      tl.set(beads, { attr: { fill: ON } });
      beadsTo(counter, i + 1, counter.state[i + 1] + 1, "<");
      tl.to(carryTag, { opacity: 0, duration: 0.25 }, "+=0.3");
      i += 1;
    }
  }

  step(
    "动手拨一拨：在计数器上从 1 开始，按照「满 2 进 1」的规则，依次拨出 1～9 各数。",
    "确保全员参与：每个小组一个计数器，一人拨、一人说、其他人确认，轮流进行。",
    () => {
      leave([tableHead, tableRule, ...tableRows, ring2, ring4, ring8, ...findings, ...rowHighlights, askNo2.g, ask10.g, ask8.g]);
      show(s3);
      tl.fromTo(counterB.g, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 });
      tl.fromTo(decShow, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<0.2");
      tl.to(taskCard, { autoAlpha: 1, duration: 0.4 });
    },
    { act: "动手拨一拨", hold: 3 },
  );

  step("先拨 1：在数位一上拨 1 颗珠，就是二进制数 1。", "边拨边说：「数位一上 1 颗珠，表示 1。」", () => {
    addOne(counterB);
    showValue(1);
  });

  step(
    "接着拨 2：数位一上已经有 1 颗珠，如果再添 1 颗珠，作为二进制数，接下来该怎样拨？",
    "这是本环节的关键追问。先让学生想一想、试一试，画面停在「2 颗珠」的状态，不急于进位。",
    () => {
      tl.to(taskCard, { autoAlpha: 0, duration: 0.3 });
      beadsTo(counterB, 0, 2, "+=0.2");
      tl.to(counterB.rods[3].beads.slice(0, 2), { attr: { fill: HOT }, duration: 0.3 }, "+=0.2");
      tl.set(decValue, { text: "2" }, "<");
      tl.set(binValue, { text: "？" }, "<");
    },
    { act: "想一想", hold: 4 },
  );

  step(
    "满 2 了！拨去数位一上的 2 颗珠，同时在数位二上拨 1 颗珠。这个数就是 (10)₂，读作「一零」。",
    "追问：你是怎样把十进制数 2 按二进制规则拨出来的？强调：每一位满 2，就向它的前一位进 1。",
    () => {
      const rod = counterB.rods[3];
      tl.fromTo(carryTag, { x: rod.x, y: 250, opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false });
      tl.to(carryTag, { x: rod.x - ROD_GAP, duration: 0.5 }, "+=0.4");
      beadsTo(counterB, 0, 0, "<");
      tl.set(rod.beads.slice(0, 2), { attr: { fill: ON } });
      beadsTo(counterB, 1, 1, "<");
      tl.to(carryTag, { opacity: 0, duration: 0.25 }, "+=0.3");
      tl.set(binValue, { text: based("10", 2) });
      tl.to(notation, { autoAlpha: 1, duration: 0.4 }, "+=0.2");
    },
  );

  step("十进制数 3 呢？在数位一上再拨 1 颗珠，就是 (11)₂。", "请学生边拨边说，没有满 2，不用进位。", () => {
    tl.to(notation, { autoAlpha: 0, duration: 0.3 });
    addOneSlow(counterB);
    showValue(3);
  });

  step(
    "十进制数 4：数位一满 2 进 1，数位二又满 2 再进 1——连续进位，得到 (100)₂。",
    "放慢速度，让学生看清两次进位的过程，并说出每一次是哪一位满 2、向哪一位进 1。",
    () => {
      addOneSlow(counterB);
      showValue(4);
    },
    { hold: 2 },
  );

  step("照这样拨出 5、6、7。", "请不同小组汇报 5、6、7 的拨法，其他小组判断对不对。", () => {
    for (let n = 5; n <= 7; n += 1) {
      addOneSlow(counterB);
      showValue(n);
      tl.to({}, { duration: 0.5 });
    }
  });

  step(
    "十进制数 8：三次连续进位，得到 (1000)₂；再拨 1 颗，9 就是 (1001)₂。",
    "小结操作过程：不管拨到哪一位，都是「满 2 进 1」。",
    () => {
      addOneSlow(counterB);
      showValue(8);
      tl.to({}, { duration: 0.8 });
      addOneSlow(counterB);
      showValue(9);
    },
    { hold: 2 },
  );

  const s3r = hidden(el("g"));
  const readRows = [
    ["(10)₂", "一零"],
    ["(11)₂", "一一"],
    ["(101)₂", "一零一"],
    ["(1001)₂", "一零零一"],
  ].map(([w, r], i) => {
    const g = el("g", {}, s3r);
    const y = 340 + i * 130;
    txt(g, 300, y, w, { size: 72, mono: true, weight: 700 });
    txt(g, 760, y, `读作「${r}」`, { size: 52, weight: 800, fill: HOT });
    el("line", { x1: 300, y1: y + 36, x2: 1300, y2: y + 36, stroke: GRID, "stroke-width": 2 }, g);
    return g;
  });
  const readTip = el("g", {}, s3r);
  el("rect", { x: 1360, y: 280, width: 460, height: 200, fill: ON }, readTip);
  txt(readTip, 1390, 350, "注意", { size: 32, weight: 800 });
  txt(readTip, 1390, 405, "写：右下角标出 2", { size: 32, weight: 700 });
  txt(readTip, 1390, 452, "读：按顺序读出各数字", { size: 32, weight: 700 });

  step(
    "二进制数要规范地读和写：写的时候在右下角标出「2」，读的时候按顺序读出每个数字。",
    "规范读写能避免和十进制数混淆。可请学生读一读刚才拨出的几个数。",
    () => {
      leave([counterB.g, decShow]);
      show(s3r);
      tl.fromTo(readRows, { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: 0.2, duration: 0.5 });
      tl.fromTo(readTip, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, "+=0.2");
    },
    { act: "读一读" },
  );

  // ---- 3. 探究发现，了解二进制数的计数单位 ----

  const s4 = hidden(el("g"));
  const counterD = makeCounter(s4, 100, ["千位", "百位", "十位", "个位"]);
  const decUnits = ["1000", "100", "10", "1"].map((u, p) => txt(s4, counterD.rods[p].x, 250, u, { size: 40, mono: true, weight: 700, anchor: "middle" }));
  const decRatio = [0, 1, 2].map((p) => {
    const g = el("g", {}, s4);
    const x0 = counterD.rods[p].x + 10;
    const x1 = counterD.rods[p + 1].x - 10;
    el("path", { d: `M${x1} 860 Q${(x0 + x1) / 2} 900 ${x0} 860`, fill: "none", stroke: MUTE, "stroke-width": 2.5 }, g);
    txt(g, (x0 + x1) / 2, 926, "×10", { size: 24, mono: true, fill: MUTE, anchor: "middle" });
    return g;
  });
  const decTitle = txt(s4, 120, 180, "十进制数", { size: 34, weight: 800 });
  const binTitle = txt(s4, 1000, 180, "二进制数", { size: 34, weight: 800 });
  const binUnitX = [0, 1, 2, 3].map((p) => 1090 + p * ROD_GAP);
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
    "十进制数的计数单位 1、10、100、1000……都可以用 1 颗珠摆在不同的数位上来表示，相邻计数单位之间的进率是 10。",
    "先在计数器上分别表示出十进制数的计数单位，唤起旧知，为类比做准备。",
    () => {
      leave([...readRows, readTip]);
      clearCounter(counterB, "<");
      tl.set(counterB.g, { x: 700, opacity: 0, y: 0 });
      show(s4);
      tl.fromTo([counterD.g, decTitle], { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6 });
      counterD.rods.forEach((rod, p) => {
        beadsTo(counterD, 3 - p, 1, "+=0.15");
        tl.fromTo(decUnits[p], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, "<");
      });
      tl.fromTo(decRatio, { opacity: 0 }, { opacity: 1, stagger: 0.15, duration: 0.3 });
    },
  );

  step(
    "二进制数的计数单位有哪些？试一试：用 1 颗珠在不同的数位上摆一摆，对照表格，看看分别表示十进制数中的几。",
    "学生在计数器上摆一摆、查一查表格，自己找出二进制数的计数单位。",
    () => {
      tl.to(counterB.g, { opacity: 1, duration: 0.5 });
      tl.fromTo(binTitle, { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<");
    },
    { act: "摆一摆", hold: 3 },
  );

  step(
    "二进制数的计数单位分别是 (1)₂、(10)₂、(100)₂、(1000)₂……在十进制中分别是 1、2、4、8。",
    "一颗一颗地摆：每摆一个数位，请学生说出它对应的十进制数。",
    () => {
      [3, 2, 1, 0].forEach((p) => {
        clearCounter(counterB, "+=0.3");
        beadsTo(counterB, 3 - p, 1, "<0.2");
        tl.fromTo(binUnits[p], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, "<");
        tl.fromTo(binWorth[p], { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<0.2");
        tl.to({}, { duration: 0.4 });
      });
    },
  );

  const unitRule = el("g", {}, s4);
  el("rect", { x: 1000, y: 120, width: 820, height: 70, fill: ON }, unitRule);
  txt(unitRule, 1410, 168, "1、2、2×2、2×2×2……后一个是前一个的 2 倍", { size: 32, weight: 800, anchor: "middle" });
  gsap.set(unitRule, { autoAlpha: 0 });

  step(
    "比较一下：1、2、4、8 其实就是 1、2、2×2、2×2×2……后一个计数单位总是前一个的 2 倍。",
    "与十进制「后一个是前一个的 10 倍」对照，体会进率不同。也可以回头问：为什么 4、8 在二进制中数位会增加？",
    () => {
      tl.fromTo([...doubleArcs].reverse(), { opacity: 0 }, { opacity: 1, stagger: 0.2, duration: 0.3 });
      tl.to(binTitle, { opacity: 0, duration: 0.2 }, "<");
      tl.fromTo(unitRule, { autoAlpha: 0, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, transformOrigin: "0% 50%", duration: 0.5 });
    },
  );

  const s5 = hidden(el("g"));
  const whyAsk = txt(s5, 300, 300, "为什么 (100)₂ 在十进制中是 4，而不是 100？", { size: 56, weight: 800 });
  const whyLeft = [
    txt(s5, 300, 460, "十进制", { size: 36, fill: MUTE }),
    txt(s5, 300, 580, "100 = 10 × 10", { size: 76, mono: true, weight: 700 }),
  ];
  const whyRight = [
    txt(s5, 1000, 460, "二进制", { size: 36, fill: MUTE }),
    txt(s5, 1000, 580, "(100)₂ = 2 × 2 = 4", { size: 76, mono: true, weight: 700, fill: HOT }),
  ];
  const whyNote = el("g", {}, s5);
  el("rect", { x: 300, y: 690, width: 1320, height: 90, fill: ON }, whyNote);
  txt(whyNote, 960, 750, "数位不同，计数单位不同：(100)₂ 表示 2×2，不是 10×10", { size: 38, weight: 800, anchor: "middle" });

  step(
    "再想一想：为什么 (100)₂ 在十进制中是 4，而不是 100？",
    "教学难点。给学生时间独立思考，再请学生结合计数器上「数位三上 1 颗珠」来解释。",
    () => {
      leave([counterD.g, counterB.g, decTitle, ...decUnits, ...decRatio, ...binUnits, ...binWorth, ...doubleArcs, unitRule]);
      show(s5);
      tl.fromTo(whyAsk, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 });
    },
    { act: "想一想", hold: 4 },
  );

  step(
    "因为数位不同，计数单位就不同：(100)₂ 表示 2×2，而不是 10×10，所以是 4，而不是 100。",
    "突出二进制计数单位的位值本质，帮助学生突破十进制的认知定式。",
    () => {
      tl.fromTo(whyLeft, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 });
      tl.fromTo(whyRight, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 }, "+=0.4");
      tl.fromTo(whyNote, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.6 }, "+=0.3");
    },
  );

  // ---- 4. 应用练习，掌握改写方法 ----

  const s6 = hidden(el("g"));
  const EX = [560, 720, 880, 1040, 1200];
  const exAsk = txt(s6, 300, 190, "一个二进制数，怎样改写成相应的十进制数呢？", { size: 44, weight: 800 });
  const exParen = [txt(s6, 470, 400, "(", { size: 150, mono: true, weight: 700, anchor: "middle" }), txt(s6, 1262, 400, ")₂", { size: 150, mono: true, weight: 700 })];
  const exDigits = "10101".split("").map((d, i) => txt(s6, EX[i], 400, d, { size: 150, mono: true, weight: 700, anchor: "middle", fill: d === "1" ? HOT : INK }));
  const exPlaces = ["数位五", "数位四", "数位三", "数位二", "数位一"].map((p, i) => txt(s6, EX[i], 262, p, { size: 26, fill: MUTE, anchor: "middle" }));
  const exMeans = ["1 个 (10000)₂", "0 个 (1000)₂", "1 个 (100)₂", "0 个 (10)₂", "1 个 (1)₂"].map((m, i) =>
    txt(s6, EX[i], 470, m, { size: 24, weight: 700, anchor: "middle", fill: i % 2 ? MUTE : HOT }),
  );
  const exWorth = ["16", "0 个 8", "4", "0 个 2", "1"].map((m, i) => txt(s6, EX[i], 506, i % 2 ? m : `即 ${m}`, { size: 24, anchor: "middle", fill: MUTE }));
  const exLines = ["= (10000)₂×1 + (100)₂×1 + (1)₂×1", "= 16×1 + 4×1 + 1×1", "= 21"].map((line, i) =>
    txt(s6, 470, 620 + i * 96, line, { size: 56, mono: true, weight: 700, fill: i === 2 ? HOT : INK }),
  );
  const exSteps = el("g", {}, s6);
  el("rect", { x: 1470, y: 230, width: 380, height: 250, fill: INK }, exSteps);
  ["改写三步", "① 按数位展开", "② 计数单位 × 个数", "③ 换成十进制数相加"].forEach((line, i) =>
    txt(exSteps, 1496, 282 + i * 56, line, { size: i ? 28 : 30, weight: 800, fill: i ? PAPER : ON }),
  );

  step(
    "一个二进制数，怎样才能改写成相应的十进制数呢？比如 (10101)₂。",
    "出示要求后先让学生独立尝试，再交流。",
    () => {
      leave([whyAsk, ...whyLeft, ...whyRight, whyNote]);
      show(s6);
      tl.fromTo(exAsk, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 });
      tl.fromTo([...exParen, ...exDigits], { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5, ease: "back.out(1.6)" });
      tl.fromTo(exPlaces, { opacity: 0 }, { opacity: 1, stagger: 0.06, duration: 0.3 }, "<0.2");
    },
    { act: "试一试", hold: 3 },
  );

  step(
    "追问：(10101)₂ 中每个 1 和 0 分别表示什么？从左往右一位一位地说。",
    "明确：数位五上的 1 表示 1 个 (10000)₂，也就是 16；数位四上的 0 表示 0 个 (1000)₂……数位一上的 1 表示 1 个 1。",
    () => {
      exMeans.forEach((m, i) => {
        tl.fromTo(m, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 }, i ? "+=0.5" : ">");
        tl.fromTo(exWorth[i], { opacity: 0 }, { opacity: 1, duration: 0.3 }, "<0.15");
      });
    },
    { act: "说一说", hold: 2 },
  );

  step(
    "把这个数写成不同计数单位的和，再换成十进制数相加：(10101)₂ = 16 + 4 + 1 = 21。",
    "板书完整过程，并请学生概括改写的步骤。",
    () => {
      exLines.forEach((line) => tl.fromTo(line, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, "+=0.5"));
      tl.fromTo(exSteps, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5 }, "+=0.3");
    },
  );

  const s7 = hidden(el("g"));
  const problems = [
    ["(110101)₂", "= (100000)₂×1 + (10000)₂×1 + (100)₂×1 + (1)₂×1", "= 32 + 16 + 4 + 1", "53"],
    ["(1010110)₂", "= (1000000)₂×1 + (10000)₂×1 + (100)₂×1 + (10)₂×1", "= 64 + 16 + 4 + 2", "86"],
  ].map(([q, work1, work2, ans], i) => {
    const y = 360 + i * 300;
    const g = el("g", {}, s7);
    txt(g, 300, y, q, { size: 76, mono: true, weight: 700 });
    const blank = txt(g, 880, y, "= ?", { size: 76, mono: true, weight: 700, fill: MUTE });
    const answer = txt(g, 880, y, `= ${ans}`, { size: 76, mono: true, weight: 700, fill: HOT });
    const w1 = txt(g, 300, y + 80, work1, { size: 36, mono: true, fill: MUTE });
    const w2 = txt(g, 300, y + 136, work2, { size: 36, mono: true, fill: MUTE });
    gsap.set([answer, w1, w2], { autoAlpha: 0 });
    return { g, blank, answer, w1, w2 };
  });
  const tryTag = el("g", {}, s7);
  el("rect", { x: 300, y: 186, width: 170, height: 56, fill: INK }, tryTag);
  txt(tryTag, 385, 225, "练一练", { size: 30, weight: 800, fill: ON, anchor: "middle" });

  step(
    "用这样的方法，把 (110101)₂ 和 (1010110)₂ 分别改写成十进制数。",
    "学生独立完成，教师巡视，重点关注是否每一位都找对了计数单位。",
    () => {
      leave([exAsk, ...exParen, ...exDigits, ...exPlaces, ...exMeans, ...exWorth, ...exLines, exSteps]);
      show(s7);
      tl.fromTo(tryTag, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.4 });
      tl.fromTo(problems.map((p) => p.g), { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: 0.2, duration: 0.5 });
    },
    { act: "独立练习", hold: 5 },
  );

  problems.forEach((p, i) => {
    step(
      i === 0 ? "核对第一题：(110101)₂ = 32 + 16 + 4 + 1 = 53。" : "核对第二题：(1010110)₂ = 64 + 16 + 4 + 2 = 86。",
      "请学生说出每个 1 所在的数位和计数单位，0 所在的数位为什么可以不写。",
      () => {
        tl.fromTo(p.w1, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.5 });
        tl.fromTo(p.w2, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "+=0.6");
        tl.to(p.blank, { autoAlpha: 0, duration: 0.2 }, "+=0.4");
        tl.fromTo(p.answer, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, transformOrigin: "0% 60%", duration: 0.45, ease: "back.out(2)" });
      },
    );
  });

  // =====================================================================
  // 三、自主思考，拓展深化
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
    const known = b === 10 || b === 2;
    const cells = unitsOf(b).map((u, c) => {
      const cell = txt(g, UX[c], RY[r], known ? u : `${based(["1000", "100", "10", "1"][c], b)}=`, {
        size: 34,
        mono: true,
        weight: 700,
        anchor: "middle",
        fill: known ? INK : MUTE,
      });
      return { cell, full: u };
    });
    const ratio = txt(g, 1730, RY[r], known ? `×${b}` : "×?", { size: 40, mono: true, weight: 700, anchor: "middle", fill: known ? INK : MUTE });
    return { g, b, cells, ratio };
  });

  function fillRow(row) {
    [3, 2, 1, 0].forEach((c, k) => {
      tl.set(row.cells[c].cell, { text: row.cells[c].full, attr: { fill: HOT } }, k === 0 ? "+=0.3" : "+=0.45");
      tl.fromTo(row.cells[c].cell, { scale: 0.6 }, { scale: 1, transformOrigin: "50% 60%", duration: 0.3, ease: "back.out(2)", immediateRender: false }, "<");
    });
    tl.set(row.ratio, { text: `×${row.b}`, attr: { fill: HOT } }, "+=0.3");
  }

  step(
    "你还知道其他进制的数吗？五进制数、八进制数的计数单位各是多少？相邻计数单位之间有什么关系？先填一填。",
    "出示计数单位对比表，学生各自填表，再小组交流：你是怎样想到的？",
    () => {
      leave(problems.map((p) => p.g).concat([tryTag]));
      stageTo(3);
      show(s8);
      tl.fromTo(extHead, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.fromTo(extRows.map((r) => r.g), { opacity: 0, x: 40 }, { opacity: 1, x: 0, stagger: 0.15, duration: 0.5, ease: "power3.out" });
    },
    { act: "填一填", hold: 5 },
  );

  step(
    "五进制「满 5 进 1」：计数单位在十进制中分别是 1、5、25、125……后一个总是前一个的 5 倍。",
    "请学生说说推理过程：二进制满 2 进 1，所以后一个是前一个的 2 倍；五进制满 5 进 1，所以……",
    () => fillRow(extRows[2]),
  );

  step(
    "八进制「满 8 进 1」：计数单位在十进制中分别是 1、8、64、512……后一个总是前一个的 8 倍。",
    "让学生独立类推八进制，再全班核对。",
    () => fillRow(extRows[3]),
  );

  const compare = hidden(el("g", {}, s8));
  const same = el("g", {}, compare);
  el("rect", { x: 260, y: 790, width: 760, height: 120, fill: INK }, same);
  txt(same, 290, 840, "相同点", { size: 28, weight: 800, fill: ON });
  txt(same, 290, 886, "都用计数单位和计数单位的个数表示数", { size: 32, weight: 700, fill: PAPER });
  const diff = el("g", {}, compare);
  el("rect", { x: 1060, y: 790, width: 760, height: 120, fill: ON }, diff);
  txt(diff, 1090, 840, "不同点", { size: 28, weight: 800 });
  txt(diff, 1090, 886, "进位规则不同，计数单位表示的数值不同", { size: 32, weight: 700 });

  step(
    "比较：二进制、五进制、八进制、十进制有什么相同点和不同点？",
    "先小组讨论，再全班交流。",
    () => {
      show(compare);
    },
    { act: "小组讨论", hold: 4 },
  );

  step(
    "相同点：都要用计数单位以及计数单位的个数来表示数；不同点：进位规则不一样，所以每个数位上的计数单位表示的数值也不一样。",
    "引导学生抽象出位值制的本质，体会类比迁移的方法。",
    () => {
      tl.fromTo(same, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 });
      tl.fromTo(diff, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, "+=0.4");
    },
  );

  // =====================================================================
  // 四、回顾反思，总结提升
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
    "回顾今天探索和发现不同进位制计数法规律的过程，你有哪些收获？从这三个方面说一说。",
    "学生小组交流后全班分享。珍视学生个性化的收获与疑问，可以作为课后探究的起点；也可以回看课始的猜想，验证对不对。",
    () => {
      leave([extHead, ...extRows.map((r) => r.g), compare]);
      stageTo(4);
      show(s9);
      tl.fromTo(reflectQs, { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.2, duration: 0.5, ease: "power3.out" });
    },
    { act: "交流分享", hold: 5 },
  );

  const conclusions = [
    "同一个数可以用不同的进制表示。",
    "无论是几进制数，都要表示出计数单位和计数单位的个数。",
    "二进制、五进制表示数的方法和十进制是类似的。",
  ].map((line, i) => {
    const g = el("g", {}, s9);
    const y = 330 + i * 140;
    el("rect", { x: 260, y: y - 50, width: 14, height: 64, fill: ON }, g);
    txt(g, 300, y, line, { size: 52, weight: 800 });
    return g;
  });
  const methodNote = txt(s9, 300, 800, "观察、比较、类比迁移，也是探索规律的好方法。", { size: 40, weight: 700, fill: HOT });
  gsap.set([...conclusions, methodNote], { autoAlpha: 0 });

  step(
    "不管是二进制、五进制还是十进制，都是用计数单位和计数单位的个数来表示数；观察、比较、类比迁移，也是探索规律的重要方法。",
    "小结时强调位值制的本质与类比迁移的方法。",
    () => {
      leave(reflectQs);
      tl.fromTo(conclusions, { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, stagger: 0.4, duration: 0.6, ease: "power3.out" });
      tl.fromTo(methodNote, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, "+=0.4");
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
      hold = gsap.delayedCall(1.4 + steps[index].text.length * 0.06 + steps[index].hold, () => tl.play());
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

  // 全屏：Safari（含 iPad）旧版本只支持带 webkit 前缀的接口
  const fullscreenEnabled = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  function toggleFullscreen() {
    const current = document.fullscreenElement || document.webkitFullscreenElement;
    const call = current
      ? document.exitFullscreen || document.webkitExitFullscreen
      : frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (!call) return;
    Promise.resolve(call.call(current ? document : frame)).catch(() => {});
  }

  document.getElementById("next").addEventListener("click", next);
  document.getElementById("prev").addEventListener("click", prev);
  playBtn.addEventListener("click", toggleAutoplay);
  const fullscreenBtn = document.getElementById("fullscreen");
  fullscreenBtn.hidden = !fullscreenEnabled;
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
