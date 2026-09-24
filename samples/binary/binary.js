/*
 * 认识二进制：科普动画样片
 *
 * 整个演示是一条 GSAP 时间线，按「步」切开：每一步有一句解说字幕和一组动画，
 * 播完一步自动停住，点击或按方向键进入下一步；「自动播放」会按字幕长度停留后继续，
 * 像看一段科普视频。所有画面都用 SVG 绘制，1920×1080 画布随窗口缩放。
 */
(function () {
  "use strict";

  gsap.registerPlugin(TextPlugin, DrawSVGPlugin);

  // ---------- 视觉规范 ----------

  const PAPER = "#F1EEE7";
  const GRID = "#E2DDD2";
  const INK = "#15161A";
  const MUTE = "#8B867C";
  const OFF = "#D6D0C4";
  const GLASS = "#FBFAF6";
  const ON = "#FFC21A";
  const HOT = "#E5432D";
  const HEAD = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Zen Hei", sans-serif';
  const MONO = '"JetBrains Mono", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
  const TOTAL_SCENES = 8;

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
        "dominant-baseline": opts.baseline || "alphabetic",
        ...(opts.attrs || {}),
      },
      parent,
    );
    node.textContent = str;
    return node;
  }

  const pad2 = (n) => String(n).padStart(2, "0");
  const bits = (n, width) => n.toString(2).padStart(width, "0");

  // ---------- 时间线与分步 ----------

  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.8, ease: "power3.inOut" } });
  const steps = [];

  let caption;

  /** 一步：先执行 build 里的动画，同时打出字幕，然后停住等待下一次点击 */
  function step(text, build) {
    const start = tl.duration();
    build();
    tl.to(caption, { text: { value: text }, duration: Math.min(1.6, text.length * 0.04), ease: "none" }, start);
    const stop = tl.duration() + 0.05;
    const index = steps.length;
    steps.push({ text, stop });
    tl.addPause(stop, () => onStop(index));
  }

  // 让一组元素离场：向上淡出
  function leave(targets, at = ">") {
    tl.to(targets, { opacity: 0, y: "-=40", duration: 0.45, stagger: 0.025, ease: "power2.in" }, at);
  }

  // ---------- 固定的画面元素：纸面、网格、角标、字幕 ----------

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
  const brand = txt(chrome, 128, 104, "认识二进制", { size: 26, weight: 700 });
  const counter = txt(chrome, 280, 104, "01", { size: 26, mono: true, fill: MUTE });
  txt(chrome, 330, 104, `/ ${pad2(TOTAL_SCENES)}`, { size: 26, mono: true, fill: MUTE });
  const tagline = txt(chrome, 1824, 104, "BINARY · 基础科普", { size: 24, mono: true, fill: MUTE, anchor: "end" });

  const progressTrack = el("rect", { x: 96, y: 1052, width: 1728, height: 4, fill: GRID }, chrome);
  const progress = el("rect", { x: 96, y: 1052, width: 0, height: 4, fill: INK }, chrome);

  el("rect", { x: 96, y: 958, width: 10, height: 44, fill: ON }, chrome);
  caption = txt(chrome, 128, 992, "", { size: 34, weight: 500 });

  function scene(n) {
    tl.set(counter, { text: pad2(n) });
    tl.to(progress, { attr: { width: (1728 * n) / TOTAL_SCENES }, duration: 0.8, ease: "power2.out" }, "<");
  }

  // ---------- 灯泡组件 ----------

  function makeLamp(parent) {
    const outer = el("g", {}, parent);
    const body = el("g", {}, outer);
    const glow = el("circle", { r: 60, fill: ON, opacity: 0 }, body);
    const rays = el("g", { stroke: ON, "stroke-width": 7, "stroke-linecap": "round", opacity: 0 }, body);
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      el("line", { x1: Math.cos(a) * 86, y1: Math.sin(a) * 86, x2: Math.cos(a) * 112, y2: Math.sin(a) * 112 }, rays);
    }
    const glass = el("circle", { r: 60, fill: GLASS, stroke: INK, "stroke-width": 5 }, body);
    const fil = el(
      "path",
      {
        d: "M-20 14 L-9 -14 L0 10 L9 -14 L20 14",
        fill: "none",
        stroke: INK,
        "stroke-width": 4,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      },
      body,
    );
    const base = el("g", { fill: INK }, body);
    el("rect", { x: -28, y: 56, width: 56, height: 16, rx: 3 }, base);
    el("rect", { x: -24, y: 76, width: 48, height: 12, rx: 3 }, base);
    el("rect", { x: -12, y: 92, width: 24, height: 9, rx: 3 }, base);
    gsap.set(outer, { x: 960, y: 540, autoAlpha: 0 });
    return { outer, body, glow, rays, glass, fil, base };
  }

  function lampTo(lamp, on, at, dur = 0.35) {
    tl.to(lamp.glass, { attr: { fill: on ? ON : GLASS }, duration: dur, ease: "power2.out" }, at);
    tl.to(lamp.fil, { attr: { stroke: on ? HOT : INK }, duration: dur }, "<");
    tl.to(lamp.glow, { attr: { r: on ? 128 : 60 }, opacity: on ? 0.3 : 0, duration: dur * 1.5, ease: "power2.out" }, "<");
    tl.to(lamp.rays, { opacity: on ? 1 : 0, scale: on ? 1 : 0.7, svgOrigin: "0 0", duration: dur }, "<");
  }

  function placeLamp(lamp, x, y, scale, at, dur = 0.8) {
    tl.to(lamp.outer, { x, y, autoAlpha: 1, duration: dur }, at);
    tl.to(lamp.body, { scale, svgOrigin: "0 0", duration: dur }, "<");
  }

  const lampLayer = el("g");
  const lamps = Array.from({ length: 8 }, () => makeLamp(lampLayer));

  // =====================================================================
  // 01 开场
  // =====================================================================

  const s1 = el("g");
  const kicker = el("g", {}, s1);
  el("rect", { x: 160, y: 300, width: 200, height: 56, fill: INK }, kicker);
  txt(kicker, 260, 338, "科普 · 01", { size: 28, mono: true, fill: PAPER, anchor: "middle" });
  const titleChars = Array.from("认识二进制").map((ch, i) =>
    txt(s1, 160 + i * 150, 530, ch, { size: 150, weight: 800 }),
  );
  const subtitle = txt(s1, 164, 640, "计算机只认识两个数字", { size: 48, fill: MUTE });
  const big0 = txt(s1, 1160, 700, "0", {
    size: 560,
    mono: true,
    weight: 700,
    fill: "none",
    anchor: "middle",
    attrs: { stroke: INK, "stroke-width": 5 },
  });
  const big1 = txt(s1, 1640, 700, "1", {
    size: 560,
    mono: true,
    weight: 700,
    fill: ON,
    anchor: "middle",
    attrs: { stroke: INK, "stroke-width": 5 },
  });
  const note = el("g", {}, s1);
  const noteLine = el("path", { d: "M1620 740 V820 H1740", fill: "none", stroke: INK, "stroke-width": 3 }, note);
  el("circle", { cx: 1620, cy: 740, r: 8, fill: INK }, note);
  const noteText = txt(note, 1752, 830, "BIT", { size: 30, mono: true, weight: 700 });

  scene(1);
  step("我们每天用的手机和电脑，其实只认识两个数字：0 和 1。", () => {
    tl.fromTo(gridLines, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.4, stagger: 0.012, ease: "power2.inOut" }, 0);
    tl.fromTo(cropMarks, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, stagger: 0.08 }, 0.2);
    tl.fromTo(kicker, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.5 }, 0.6);
    tl.fromTo(
      titleChars,
      { y: 70, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: "back.out(1.7)" },
      0.8,
    );
    tl.fromTo(subtitle, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.6 }, 1.3);
    tl.fromTo(
      [big0, big1],
      { y: 360, opacity: 0, rotation: (i) => (i ? 14 : -14) },
      { y: 0, opacity: 1, rotation: 0, transformOrigin: "50% 50%", duration: 1.1, stagger: 0.15, ease: "expo.out" },
      0.9,
    );
    tl.fromTo(noteLine, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 }, 1.8);
    tl.fromTo(noteText, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.2);
  });

  // =====================================================================
  // 02 一盏灯 = 1 位
  // =====================================================================

  const s2 = el("g");
  const sw = el("g", { transform: "translate(1080 460)" }, s2);
  const track = el("rect", { width: 200, height: 90, rx: 45, fill: PAPER, stroke: INK, "stroke-width": 5 }, sw);
  const knob = el("circle", { cx: 45, cy: 45, r: 30, fill: INK }, sw);
  const swLabel = txt(sw, 100, -26, "开关", { size: 28, fill: MUTE, anchor: "middle" });
  const stateDigit = txt(s2, 1560, 610, "", { size: 300, mono: true, weight: 700, anchor: "middle" });
  const stateWord = txt(s2, 1560, 760, "", { size: 40, weight: 700, anchor: "middle" });
  const lampName = txt(s2, 760, 760, "一盏灯", { size: 36, fill: MUTE, anchor: "middle" });
  const bitBracket = el("path", { d: "M600 820 V850 H1720 V820", fill: "none", stroke: INK, "stroke-width": 4 }, s2);
  const bitBadge = el("g", {}, s2);
  el("rect", { x: 900, y: 872, width: 520, height: 64, fill: ON }, bitBadge);
  txt(bitBadge, 1160, 916, "1 位（bit）= 2 种状态", { size: 36, weight: 800, anchor: "middle" });

  step("先从一盏灯说起。", () => {
    tl.to([big0, big1], { x: "+=700", opacity: 0, duration: 0.6, ease: "power3.in", stagger: 0.05 });
    leave([kicker, ...titleChars, subtitle, note], "<");
    scene(2);
    const lamp = lamps[0];
    tl.set(lamp.outer, { x: 760, y: 470, autoAlpha: 1 });
    tl.set(lamp.body, { scale: 1.7, svgOrigin: "0 0" });
    tl.fromTo(lamp.glass, { drawSVG: "0%", attr: { "fill-opacity": 0 } }, { drawSVG: "100%", duration: 0.9 }, "-=0.1");
    tl.to(lamp.glass, { attr: { "fill-opacity": 1 }, duration: 0.3 });
    tl.fromTo(lamp.fil, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "-=0.6");
    tl.fromTo(lamp.base.children, { y: -24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4 }, "-=0.3");
    tl.fromTo(lampName, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<");
    tl.fromTo(track, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7 }, "-=0.4");
    tl.fromTo([knob, swLabel], { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)" });
  });

  step("打开开关，灯亮了，我们把它记作 1。", () => {
    tl.to(knob, { attr: { cx: 155 }, duration: 0.45, ease: "power2.inOut" });
    tl.to(track, { attr: { fill: ON }, duration: 0.3 }, "<0.1");
    lampTo(lamps[0], true, "<");
    tl.set(stateDigit, { text: "1" }, "<");
    tl.fromTo(stateDigit, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.8)" }, "<");
    tl.set(stateWord, { text: "开 = 1" }, "<");
    tl.fromTo(stateWord, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, "<0.2");
  });

  step("关上开关，灯灭了，记作 0。一盏灯只有这两种状态，这就是 1 个「位」。", () => {
    tl.to(knob, { attr: { cx: 45 }, duration: 0.45 });
    tl.to(track, { attr: { fill: PAPER }, duration: 0.3 }, "<0.1");
    lampTo(lamps[0], false, "<");
    tl.to(stateDigit, { opacity: 0, y: -30, duration: 0.2 }, "<");
    tl.set(stateDigit, { text: "0" });
    tl.to(stateDigit, { opacity: 1, y: 0, duration: 0.3 });
    tl.set(stateWord, { text: "关 = 0" }, "<");
    tl.fromTo(bitBracket, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.7 }, "+=0.2");
    tl.fromTo(bitBadge, { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", duration: 0.4, ease: "back.out(2)" }, "-=0.2");
  });

  // =====================================================================
  // 03 每多一盏灯，组合翻一倍
  // =====================================================================

  const s3 = el("g");
  const lampCountLabel = txt(s3, 530, 640, "", { size: 36, fill: MUTE, anchor: "middle" });

  // 状态表：一行是一种组合（小圆点 + 二进制写法 + 序号）
  function stateTable(width, columns) {
    const group = el("g", {}, s3);
    const rows = [];
    const perColumn = Math.ceil(2 ** width / columns);
    const highlight = el("rect", { x: 0, y: 0, width: 440, height: 92, fill: ON, opacity: 0 }, group);
    for (let n = 0; n < 2 ** width; n += 1) {
      const col = Math.floor(n / perColumn);
      const x = 880 + col * 500;
      const y = 250 + (n % perColumn) * 112;
      const row = el("g", {}, group);
      el("line", { x1: x, y1: y + 94, x2: x + 440, y2: y + 94, stroke: GRID, "stroke-width": 2 }, row);
      bits(n, width)
        .split("")
        .forEach((b, j) => {
          el("circle", { cx: x + 36 + j * 62, cy: y + 46, r: 24, fill: b === "1" ? ON : GLASS, stroke: INK, "stroke-width": 3 }, row);
        });
      txt(row, x + 60 + width * 62, y + 62, bits(n, width), { size: 48, mono: true, weight: 700 });
      txt(row, x + 430, y + 60, `第 ${n + 1} 种`, { size: 28, fill: MUTE, anchor: "end" });
      rows.push({ row, x, y });
    }
    gsap.set(group, { autoAlpha: 0 });
    return { group, rows, highlight };
  }

  const table2 = stateTable(2, 1);
  const table3 = stateTable(3, 2);

  // 依次高亮每一行，灯泡同步亮灭，演示所有组合
  function walkTable(table, width, lampList, gap) {
    table.rows.forEach(({ x, y }, n) => {
      const at = `>${n === 0 ? 0.1 : gap - 0.35}`;
      tl.to(table.highlight, { attr: { x: x - 10, y: y - 2 }, opacity: 1, duration: n === 0 ? 0.01 : 0.25, ease: "power2.inOut" }, at);
      bits(n, width)
        .split("")
        .forEach((b, j) => {
          lampTo(lampList[j], b === "1", "<", 0.2);
        });
    });
    tl.to(table.highlight, { opacity: 0, duration: 0.3 }, "+=0.3");
    lampList.forEach((lamp) => lampTo(lamp, false, "<", 0.2));
  }

  step("两盏灯呢？亮和灭组合起来，一共有 4 种。", () => {
    leave([sw, stateDigit, stateWord, lampName, bitBracket, bitBadge]);
    scene(3);
    placeLamp(lamps[0], 330, 440, 1.05, "<0.2");
    tl.set(lamps[1].outer, { x: 530, y: 560 });
    tl.set(lamps[1].body, { scale: 1.05, svgOrigin: "0 0" });
    tl.to(lamps[1].outer, { y: 440, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)" }, "<0.3");
    tl.set(lampCountLabel, { text: "2 盏灯" });
    tl.fromTo(lampCountLabel, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    tl.set(table2.group, { autoAlpha: 1 }, "<");
    tl.fromTo(table2.rows.map((r) => r.row), { opacity: 0, x: 60 }, { opacity: 1, x: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" }, "<");
    walkTable(table2, 2, lamps.slice(0, 2), 0.55);
  });

  step("三盏灯，就有 8 种。每多一盏灯，组合的数量就翻一倍。", () => {
    tl.to(table2.rows.map((r) => r.row), { opacity: 0, x: -40, stagger: 0.05, duration: 0.3, ease: "power2.in" });
    tl.set(table2.group, { autoAlpha: 0 });
    placeLamp(lamps[0], 290, 440, 0.95, "<");
    placeLamp(lamps[1], 470, 440, 0.95, "<");
    tl.set(lamps[2].outer, { x: 650, y: 560 });
    tl.set(lamps[2].body, { scale: 0.95, svgOrigin: "0 0" });
    tl.to(lamps[2].outer, { y: 440, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)" }, "<0.3");
    tl.to(lampCountLabel, { attr: { x: 470 }, text: "3 盏灯", duration: 0.4 }, "<");
    tl.set(table3.group, { autoAlpha: 1 });
    tl.fromTo(table3.rows.map((r) => r.row), { opacity: 0, x: 60 }, { opacity: 1, x: 0, stagger: 0.06, duration: 0.45, ease: "power3.out" });
    walkTable(table3, 3, lamps.slice(0, 3), 0.42);
  });

  // 翻倍柱状图
  const chart = el("g", {}, s3);
  const chartBase = el("line", { x1: 300, y1: 840, x2: 1640, y2: 840, stroke: INK, "stroke-width": 4 }, chart);
  const chartTitle = txt(chart, 300, 250, "n 个位 → 2ⁿ 种组合", { size: 60, weight: 800 });
  const bars = [];
  const barValues = [];
  const barNames = [];
  for (let n = 1; n <= 8; n += 1) {
    const value = 2 ** n;
    const h = Math.max(6, (value / 256) * 520);
    const x = 360 + (n - 1) * 156;
    bars.push(el("rect", { x, y: 840, width: 100, height: 0, fill: n === 8 ? ON : INK, stroke: INK, "stroke-width": 3 }, chart));
    barValues.push(txt(chart, x + 50, 840 - h - 22, "0", { size: 38, mono: true, weight: 700, anchor: "middle" }));
    barNames.push(txt(chart, x + 50, 890, `${n} 位`, { size: 28, fill: MUTE, anchor: "middle" }));
  }
  const callout = el("g", {}, chart);
  const calloutLine = el("path", { d: "M1556 330 L1620 214", fill: "none", stroke: INK, "stroke-width": 3 }, callout);
  const calloutBox = el("g", {}, callout);
  el("rect", { x: 1280, y: 150, width: 540, height: 64, fill: INK }, calloutBox);
  txt(calloutBox, 1550, 194, "8 位 = 1 字节 = 256 种", { size: 34, weight: 800, fill: ON, anchor: "middle" });
  gsap.set(chart, { autoAlpha: 0 });

  step("照这样翻倍，8 盏灯就有 256 种组合。8 个位合在一起，叫作 1 个字节。", () => {
    leave([lampCountLabel, ...table3.rows.map((r) => r.row)]);
    tl.to(lamps.slice(0, 3).map((l) => l.outer), { autoAlpha: 0, y: "+=60", duration: 0.4, stagger: 0.05, ease: "power2.in" }, "<");
    tl.set(chart, { autoAlpha: 1 });
    tl.fromTo(chartBase, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7 });
    tl.fromTo(chartTitle, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, "<0.2");
    tl.fromTo(barNames, { opacity: 0 }, { opacity: 1, stagger: 0.05, duration: 0.3 }, "<");
    const t0 = tl.duration();
    bars.forEach((bar, i) => {
      const h = Math.max(6, (2 ** (i + 1) / 256) * 520);
      tl.to(bar, { attr: { y: 840 - h, height: h }, duration: 0.7, ease: "power4.out" }, t0 + i * 0.16);
      tl.fromTo(barValues[i], { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + i * 0.16);
      // 数字随柱子一起涨上去；直接用 textContent 补间，跳步和后退时也能正确还原
      tl.fromTo(
        barValues[i],
        { textContent: 0 },
        { textContent: 2 ** (i + 1), snap: { textContent: 1 }, duration: 0.7, ease: "power2.out" },
        t0 + i * 0.16,
      );
    });
    tl.fromTo(calloutLine, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.4 }, ">-0.1");
    tl.fromTo(calloutBox, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" });
  });

  // =====================================================================
  // 04 数数：逢二进一
  // =====================================================================

  const s4 = el("g");
  const decLabel = txt(s4, 300, 330, "十进制", { size: 36, fill: MUTE });
  const binLabel = txt(s4, 880, 330, "二进制", { size: 36, fill: MUTE });
  const decBoxes = [300, 480].map((x) => el("rect", { x, y: 380, width: 160, height: 220, rx: 12, fill: GLASS, stroke: INK, "stroke-width": 4 }, s4));
  const decTens = txt(s4, 380, 552, "0", { size: 160, mono: true, weight: 700, anchor: "middle", fill: OFF });
  const decOnes = txt(s4, 560, 552, "0", { size: 160, mono: true, weight: 700, anchor: "middle" });
  const binX = [980, 1180, 1380, 1580];
  const bitTexts = binX.map((x) => txt(s4, x, 740, "0", { size: 64, mono: true, weight: 700, anchor: "middle" }));
  const rule = el("g", {}, s4);
  el("rect", { x: 300, y: 690, width: 340, height: 70, fill: ON }, rule);
  txt(rule, 470, 738, "逢二进一", { size: 40, weight: 800, anchor: "middle" });
  const carry = el("g", { opacity: 0 }, s4);
  el("rect", { x: -54, y: -26, width: 108, height: 52, rx: 26, fill: HOT }, carry);
  txt(carry, 0, 12, "进位", { size: 28, weight: 800, fill: GLASS, anchor: "middle" });
  gsap.set(s4, { autoAlpha: 0 });

  // 数到 n：更新十进制数字、四盏灯和下面的 0/1；出现进位时，「进位」标签从最右边跳到进位的那一位
  function countTo(n) {
    const prev = n - 1;
    const at = ">+0.35";
    tl.set(decOnes, { text: String(n % 10) }, at);
    tl.set(decTens, { text: String(Math.floor(n / 10)), attr: { fill: n >= 10 ? INK : OFF } }, "<");
    if (n % 10 === 0) {
      tl.fromTo(decBoxes[0], { attr: { fill: ON } }, { attr: { fill: GLASS }, duration: 0.6, immediateRender: false }, "<");
    }
    const now = bits(n, 4);
    const before = bits(prev, 4);
    now.split("").forEach((b, j) => {
      if (b !== before[j]) {
        lampTo(lamps[j], b === "1", "<", 0.2);
        tl.set(bitTexts[j], { text: b, attr: { fill: b === "1" ? HOT : INK } }, "<");
      }
    });
    if (n % 2 === 0 && n < 16) {
      const target = 3 - Math.log2(n & -n);
      tl.fromTo(
        carry,
        { x: binX[3], y: 360, opacity: 1 },
        { x: binX[target], y: 360, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false },
        "<",
      );
    }
    tl.to({}, { duration: 0.25 });
  }

  step("用二进制数数，规则只有一条：逢二进一。", () => {
    tl.to(chart, { autoAlpha: 0, y: -40, duration: 0.5, ease: "power2.in" });
    scene(4);
    tl.set(s4, { autoAlpha: 1 });
    tl.fromTo([decLabel, binLabel], { opacity: 0 }, { opacity: 1, duration: 0.4 });
    tl.fromTo(decBoxes, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, stagger: 0.1 }, "<");
    tl.fromTo([decTens, decOnes], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, "-=0.2");
    binX.forEach((x, j) => {
      tl.set(lamps[j].outer, { x, y: 640 });
      tl.set(lamps[j].body, { scale: 0.8, svgOrigin: "0 0" });
    });
    tl.to(lamps.slice(0, 4).map((l) => l.outer), { y: 520, autoAlpha: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.4)" }, "<");
    tl.fromTo(bitTexts, { opacity: 0 }, { opacity: 1, stagger: 0.08, duration: 0.3 }, "<0.2");
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.4, ease: "back.out(1.5)" });
  });

  step("十进制要满 10 才进一位，二进制满 2 就进一位。", () => {
    for (let n = 1; n <= 7; n += 1) countTo(n);
  });

  step("继续数到 15，四盏灯全亮：1111。再加 1，就需要第五盏灯了。", () => {
    for (let n = 8; n <= 15; n += 1) countTo(n);
  });

  // =====================================================================
  // 05 位权：8 + 4 + 1 = 13
  // =====================================================================

  const s5 = el("g");
  const rowX = Array.from({ length: 8 }, (_, k) => 330 + k * 180);
  const weights = [128, 64, 32, 16, 8, 4, 2, 1];
  // 画面从左到右第 k 个位置用哪盏灯：上一幕的四盏灯（0～3）接着当最右边四位
  const rowLamps = [lamps[4], lamps[5], lamps[6], lamps[7], lamps[0], lamps[1], lamps[2], lamps[3]];
  const weightTexts = weights.map((w, k) => txt(s5, rowX[k], 360, String(w), { size: 54, mono: true, weight: 700, anchor: "middle" }));
  const doubleArcs = rowX.slice(0, 7).map((x, k) => {
    const g = el("g", {}, s5);
    el("path", { d: `M${rowX[k + 1] - 20} 300 Q${x + 90} 250 ${x + 20} 300`, fill: "none", stroke: MUTE, "stroke-width": 2.5 }, g);
    txt(g, x + 90, 262, "×2", { size: 22, mono: true, fill: MUTE, anchor: "middle" });
    return g;
  });
  const placeBits = rowX.map((x) => txt(s5, x, 720, "0", { size: 56, mono: true, weight: 700, anchor: "middle" }));
  const weightLabel = txt(s5, 150, 368, "位权", { size: 32, fill: MUTE });
  const eqParts = ["8", "+", "4", "+", "1", "=", "13"];
  const eqX = [680, 770, 860, 950, 1040, 1130, 1280];
  const eqTexts = eqParts.map((s, i) =>
    txt(s5, eqX[i], 890, s, { size: i === 6 ? 110 : 76, mono: true, weight: 700, anchor: "middle", fill: i === 6 ? HOT : INK }),
  );
  gsap.set(s5, { autoAlpha: 0 });

  step("每一位都有自己的「位权」：从右往左，1、2、4、8……依次翻倍。", () => {
    leave([decLabel, binLabel, ...decBoxes, decTens, decOnes, ...bitTexts, rule]);
    scene(5);
    lamps.slice(0, 4).forEach((lamp) => lampTo(lamp, false, "<", 0.3));
    tl.set(s5, { autoAlpha: 1 });
    rowLamps.forEach((lamp, k) => {
      if (k < 4) {
        tl.set(lamp.outer, { x: rowX[k] - 200, y: 540 }, "<");
        tl.set(lamp.body, { scale: 0.62, svgOrigin: "0 0" }, "<");
      }
    });
    const t0 = tl.duration();
    rowLamps.forEach((lamp, k) => placeLamp(lamp, rowX[k], 540, 0.62, t0 + (k < 4 ? k * 0.06 : 0.1), 0.8));
    tl.fromTo(placeBits, { opacity: 0 }, { opacity: 1, stagger: 0.04, duration: 0.3 }, t0 + 0.6);
    tl.fromTo(weightLabel, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t0 + 0.8);
    tl.fromTo(
      [...weightTexts].reverse(),
      { opacity: 0, y: -40 },
      { opacity: 1, y: 0, stagger: 0.12, duration: 0.45, ease: "back.out(1.6)" },
      t0 + 0.9,
    );
    tl.fromTo([...doubleArcs].reverse(), { opacity: 0 }, { opacity: 1, stagger: 0.12, duration: 0.3 }, t0 + 1.0);
  });

  step("比如 00001101：把亮着的灯对应的位权加起来，8 + 4 + 1 = 13。", () => {
    bits(13, 8)
      .split("")
      .forEach((b, k) => {
        if (b === "1") {
          lampTo(rowLamps[k], true, k === 4 ? ">" : "<0.12", 0.3);
          tl.set(placeBits[k], { text: "1", attr: { fill: HOT } }, "<");
          tl.to(weightTexts[k], { attr: { fill: HOT }, scale: 1.2, transformOrigin: "50% 50%", duration: 0.3 }, "<");
        }
      });
    const t0 = tl.duration() + 0.2;
    [4, 5, 7].forEach((k, i) => {
      const part = eqTexts[i * 2];
      tl.fromTo(
        part,
        { x: rowX[k] - eqX[i * 2], y: 360 - 890, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: "power3.inOut" },
        t0 + i * 0.15,
      );
    });
    tl.fromTo([eqTexts[1], eqTexts[3], eqTexts[5]], { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.1 }, t0 + 0.6);
    tl.fromTo(eqTexts[6], { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, transformOrigin: "50% 60%", duration: 0.6, ease: "back.out(2)" }, t0 + 1.0);
  });

  // =====================================================================
  // 06 十进制转二进制：除 2 取余
  // =====================================================================

  const s6 = el("g");
  const divTitle = txt(s6, 300, 280, "13 = ？（二进制）", { size: 60, weight: 800 });
  const divRows = [
    [13, 6, 1],
    [6, 3, 0],
    [3, 1, 1],
    [1, 0, 1],
  ].map(([a, q, r], k) => {
    const y = 400 + k * 118;
    const line = txt(s6, 300, y + 56, `${a} ÷ 2 = ${q}`, { size: 60, mono: true, weight: 700 });
    const box = el("g", {}, s6);
    el("rect", { x: 800, y, width: 170, height: 80, fill: r ? ON : GLASS, stroke: INK, "stroke-width": 4 }, box);
    txt(box, 885, y + 56, `余 ${r}`, { size: 44, weight: 800, anchor: "middle" });
    return { line, box, r, y };
  });
  const readArrow = el("path", { d: "M1030 800 V410 M1010 440 L1030 410 L1050 440", fill: "none", stroke: HOT, "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, s6);
  const readLabel = txt(s6, 1075, 620, "从下往上读", { size: 34, weight: 700, fill: HOT });
  const resultDigits = [1, 1, 0, 1].map((d, i) => txt(s6, 1340 + i * 120, 640, String(d), { size: 190, mono: true, weight: 700, anchor: "middle" }));
  const resultLine = el("line", { x1: 1270, y1: 690, x2: 1770, y2: 690, stroke: INK, "stroke-width": 5 }, s6);
  gsap.set(s6, { autoAlpha: 0 });

  step("反过来，十进制怎样变成二进制？不断除以 2，记下每一步的余数。", () => {
    tl.to(rowLamps.map((l) => l.outer), { autoAlpha: 0, y: "+=50", stagger: 0.03, duration: 0.4, ease: "power2.in" });
    tl.to(s5, { autoAlpha: 0, duration: 0.4 }, "<0.1");
    scene(6);
    tl.set(s6, { autoAlpha: 1 });
    tl.fromTo(divTitle, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 });
    divRows.forEach(({ line, box }) => {
      tl.fromTo(line, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, "+=0.15");
      tl.fromTo(box, { scale: 0 }, { scale: 1, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)" }, "-=0.1");
    });
  });

  step("把余数从下往上读，13 的二进制就是 1101。", () => {
    tl.fromTo(readArrow, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.8, ease: "power2.inOut" });
    tl.fromTo(readLabel, { opacity: 0 }, { opacity: 1, duration: 0.3 }, "-=0.3");
    const t0 = tl.duration();
    [...divRows].reverse().forEach(({ y }, i) => {
      tl.fromTo(
        resultDigits[i],
        { x: 885 - (1340 + i * 120), y: y + 56 - 640, opacity: 0, scale: 0.3 },
        { x: 0, y: 0, opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.7, ease: "power3.inOut" },
        t0 + i * 0.18,
      );
    });
    tl.fromTo(resultLine, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 });
  });

  // =====================================================================
  // 07 计算机里的二进制：文字和图片
  // =====================================================================

  const s7 = el("g");
  const letterA = txt(s7, 400, 700, "A", { size: 440, weight: 800, anchor: "middle" });
  const arrows7 = [
    el("path", { d: "M600 540 H700 M680 520 L700 540 L680 560", fill: "none", stroke: INK, "stroke-width": 5 }, s7),
    el("path", { d: "M1000 540 H1080 M1060 520 L1080 540 L1060 560", fill: "none", stroke: INK, "stroke-width": 5 }, s7),
  ];
  const code65 = txt(s7, 850, 600, "65", { size: 170, mono: true, weight: 700, anchor: "middle" });
  const byteCells = bits(65, 8)
    .split("")
    .map((b, i) => {
      const g = el("g", {}, s7);
      const x = 1110 + i * 92;
      el("rect", { x, y: 480, width: 80, height: 120, fill: b === "1" ? INK : GLASS, stroke: INK, "stroke-width": 4 }, g);
      txt(g, x + 40, 560, b, { size: 60, mono: true, weight: 700, anchor: "middle", fill: b === "1" ? ON : INK });
      return g;
    });
  const labels7 = [
    txt(s7, 400, 790, "字符", { size: 34, fill: MUTE, anchor: "middle" }),
    txt(s7, 850, 790, "编号", { size: 34, fill: MUTE, anchor: "middle" }),
    txt(s7, 1474, 790, "8 位 = 1 字节", { size: 34, fill: MUTE, anchor: "middle" }),
  ];

  const pixelArt = [
    "..11...11..",
    ".1111.1111.",
    "11111111111",
    "11111111111",
    "11111111111",
    ".111111111.",
    "..1111111..",
    "...11111...",
    "....111....",
    ".....1.....",
  ];
  const pixelGroup = el("g", {}, s7);
  const pixelCells = [];
  const pixelDigits = [];
  const pixelOn = [];
  pixelArt.forEach((line, r) => {
    line.split("").forEach((c, col) => {
      const x = 960 + col * 64;
      const y = 200 + r * 64;
      const on = c === "1";
      pixelCells.push(el("rect", { x, y, width: 58, height: 58, fill: GLASS, stroke: OFF, "stroke-width": 2 }, pixelGroup));
      pixelDigits.push(txt(pixelGroup, x + 29, y + 39, on ? "1" : "0", { size: 26, mono: true, weight: 700, anchor: "middle", fill: MUTE }));
      pixelOn.push(on);
    });
  });
  const pixelTitle = txt(s7, 300, 470, "像素", { size: 120, weight: 800 });
  const pixelNote = txt(s7, 304, 560, "1 = 涂色，0 = 空白", { size: 40, fill: MUTE });
  gsap.set(s7, { autoAlpha: 0 });
  gsap.set([pixelGroup, pixelTitle, pixelNote], { autoAlpha: 0 });

  step("文字也是这样存储的：字母 A 的编号是 65，写成二进制就是 01000001。", () => {
    tl.to(s6, { autoAlpha: 0, y: -40, duration: 0.5, ease: "power2.in" });
    scene(7);
    tl.set(s7, { autoAlpha: 1 });
    tl.fromTo(letterA, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, transformOrigin: "50% 60%", duration: 0.7, ease: "back.out(1.6)" });
    tl.fromTo(arrows7[0], { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.4 });
    tl.fromTo(code65, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 });
    tl.fromTo(arrows7[1], { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.4 });
    tl.fromTo(byteCells, { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: "back.out(1.6)" });
    tl.fromTo(labels7, { opacity: 0 }, { opacity: 1, stagger: 0.15, duration: 0.3 });
  });

  step("图片也一样：每个像素的颜色，都记成一串 0 和 1。", () => {
    leave([letterA, code65, ...arrows7, ...byteCells, ...labels7]);
    tl.set([pixelGroup, pixelTitle, pixelNote], { autoAlpha: 1 });
    tl.fromTo(pixelTitle, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 });
    tl.fromTo(pixelNote, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<0.2");
    tl.fromTo(pixelCells, { scale: 0 }, { scale: 1, transformOrigin: "50% 50%", duration: 0.35, stagger: { each: 0.008, grid: [10, 11], from: "center" } }, "<");
    tl.fromTo(pixelDigits, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: { each: 0.006, grid: [10, 11], from: "start" } }, "-=0.4");
    const onCells = pixelCells.filter((_, i) => pixelOn[i]);
    const onDigits = pixelDigits.filter((_, i) => pixelOn[i]);
    tl.to(onCells, { attr: { fill: HOT, stroke: HOT }, duration: 0.3, stagger: { each: 0.02, from: "random" } }, "+=0.3");
    tl.to(onDigits, { attr: { fill: GLASS }, duration: 0.3, stagger: { each: 0.02, from: "random" } }, "<");
    tl.to(pixelDigits.filter((_, i) => !pixelOn[i]), { opacity: 0.35, duration: 0.4 }, ">-0.2");
  });

  // =====================================================================
  // 08 总结
  // =====================================================================

  const s8 = el("g");
  const points = [
    ["1 位（bit）只有 0 和 1 两种状态", "一盏灯：亮或灭"],
    ["每多一位，组合数量翻一倍", "8 位 = 1 字节 = 256 种"],
    ["二进制逢二进一，位权依次翻倍", "13 = 8 + 4 + 1 = 1101"],
  ].map(([main, sub], i) => {
    const g = el("g", {}, s8);
    const y = 300 + i * 190;
    el("circle", { cx: 340, cy: y, r: 44, fill: INK }, g);
    txt(g, 340, y + 16, String(i + 1), { size: 46, mono: true, weight: 700, fill: ON, anchor: "middle" });
    txt(g, 420, y + 4, main, { size: 56, weight: 800 });
    txt(g, 420, y + 62, sub, { size: 34, fill: MUTE, mono: true });
    const rule8 = el("line", { x1: 300, y1: y + 94, x2: 1620, y2: y + 94, stroke: GRID, "stroke-width": 3 }, g);
    return { g, rule8 };
  });
  const finale = el("g", {}, s8);
  const finaleMark = el("rect", { x: 0, y: 470, width: 0, height: 110, fill: ON }, finale);
  const finaleText = txt(finale, 960, 560, "0 和 1，搭起了整个数字世界", { size: 96, weight: 800, anchor: "middle" });
  // 高亮条按「数字世界」四个字的实际位置摆放
  {
    const words = "数字世界";
    const start = finaleText.textContent.indexOf(words);
    const x0 = finaleText.getStartPositionOfChar(start).x;
    finaleMark.setAttribute("x", x0 - 12);
    finaleMark.setAttribute("width", finaleText.getSubStringLength(start, words.length) + 24);
  }
  const rain = el("g", { opacity: 0.5 }, finale);
  const rainBits = [];
  for (let i = 0; i < 28; i += 1) {
    rainBits.push(txt(rain, 180 + i * 57, 760 + (i % 3) * 36, String((i * 7) % 3 === 0 ? 1 : 0), { size: 34, mono: true, weight: 700, fill: MUTE, anchor: "middle" }));
  }
  gsap.set(s8, { autoAlpha: 0 });
  gsap.set(finale, { autoAlpha: 0 });

  step("记住三件事：位只有 0 和 1；每多一位翻一倍；二进制逢二进一。", () => {
    tl.to(s7, { autoAlpha: 0, y: -40, duration: 0.5, ease: "power2.in" });
    scene(8);
    tl.set(s8, { autoAlpha: 1 });
    points.forEach(({ g, rule8 }, i) => {
      tl.fromTo(g, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, i === 0 ? ">" : "-=0.3");
      tl.fromTo(rule8, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6 }, "<0.2");
    });
  });

  step("0 和 1，搭起了整个数字世界。", () => {
    leave(points.map((p) => p.g));
    tl.set(finale, { autoAlpha: 1 });
    tl.fromTo(finaleText, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
    tl.fromTo(finaleMark, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.6, ease: "power3.inOut" }, "-=0.2");
    tl.fromTo(rainBits, { opacity: 0, y: -30 }, { opacity: 1, y: 0, stagger: { each: 0.03, from: "random" }, duration: 0.4 }, "<");
    tl.to(progressTrack, { attr: { fill: ON }, duration: 0.5 }, "<");
  });

  // ---------- 播放控制 ----------

  const stepLabel = document.getElementById("step");
  const playBtn = document.getElementById("play");
  const frame = document.getElementById("frame");
  let autoplay = false;
  let hold = null;

  function currentStep() {
    const t = tl.time();
    return steps.filter((s) => s.stop <= t + 1e-3).length;
  }

  function updateUI() {
    stepLabel.textContent = `${Math.max(1, Math.min(currentStep() + (tl.isActive() ? 1 : 0), steps.length))} / ${steps.length}`;
    playBtn.textContent = autoplay ? "暂停自动播放" : "自动播放";
  }

  function onStop(index) {
    updateUI();
    if (hold) hold.kill();
    if (autoplay && index < steps.length - 1) {
      // 按字幕长度留出阅读时间再继续
      hold = gsap.delayedCall(1.4 + steps[index].text.length * 0.07, () => tl.play());
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
