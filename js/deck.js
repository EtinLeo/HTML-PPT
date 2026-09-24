/*
 * deck.js：把课程信息变成一整套课件
 *
 * 每一页描述为一组元素（位置、尺寸、颜色、文字……），坐标基于 1280×720 画布。
 * 同一个 key 会在多页中反复出现：封面的大标题、目录里的章节卡片、侧边栏里的
 * 章节条目……它们在不同页面换了位置和样式，切换时就会被「平滑」地连起来。
 * 同一份描述既用于网页播放（renderScene），也用于导出 PPTX（export-pptx.js）。
 */
(function (global) {
  "use strict";

  const W = 1280;
  const H = 720;
  const FONT_STACK =
    '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "WenQuanYi Zen Hei", sans-serif';

  const THEMES = {
    简洁教学风: {
      bg: "#F5F7FB",
      panel: "#FFFFFF",
      tint: "#E7EEFD",
      primary: "#2F6FED",
      accent: "#0E9F8E",
      warm: "#F5A524",
      ink: "#18212F",
      muted: "#5B6678",
      dark: "#18212F",
      onPrimary: "#FFFFFF",
      radius: 18,
      shadow: true,
    },
    活泼互动风: {
      bg: "#FFF6EA",
      panel: "#FFFFFF",
      tint: "#FFE3D3",
      primary: "#E9552F",
      accent: "#139E8F",
      warm: "#FFBE2E",
      ink: "#2A1E2C",
      muted: "#6F6273",
      dark: "#2A1E2C",
      onPrimary: "#FFFFFF",
      radius: 28,
      shadow: true,
    },
    学术汇报风: {
      bg: "#0E1A2F",
      panel: "#16253F",
      tint: "#1E3150",
      primary: "#D8A93F",
      accent: "#58B4E0",
      warm: "#E4875F",
      ink: "#EDF1F8",
      muted: "#9DAAC2",
      dark: "#0E1A2F",
      onPrimary: "#0E1A2F",
      radius: 6,
      shadow: false,
    },
  };

  const SECTIONS = [
    { title: "导入", subtitle: "生活场景引入主题", brief: "从熟悉的生活场景出发，引出本课问题", body: "情境问题" },
    { title: "新知讲解", subtitle: "核心概念 + 示例", brief: "讲清概念，配合例题逐步演示", body: "讲解步骤" },
    { title: "课堂练习", subtitle: "由浅入深 3 道题", brief: "基础、提高、拓展三级练习", body: "分层练习" },
    { title: "课堂总结", subtitle: "知识回顾 + 易错点", brief: "对照目标回顾，提醒易错点", body: "目标回顾" },
    { title: "课后作业", subtitle: "分层作业建议", brief: "必做、选做、挑战分层布置", body: "分层作业" },
  ];

  const DEFAULT_GOALS = ["理解本课核心概念", "掌握基本方法与步骤", "能独立完成基础练习"];

  // 装饰圆在每一页的位置 [x, y, 直径]，翻页时会平滑漂移，像镜头在移动
  const ORBS = {
    cover: { a: [780, -150, 620], b: [1010, 440, 230], c: [700, 520, 110] },
    agenda: { a: [1090, -110, 290], b: [1170, 600, 150], c: [40, 610, 70] },
    intro: [
      { a: [900, 60, 400], b: [1130, 520, 130], c: [820, 560, 80] },
      { a: [960, 300, 380], b: [1110, 90, 120], c: [860, 130, 64] },
      { a: [930, -80, 360], b: [1150, 420, 140], c: [860, 250, 90] },
      { a: [980, 280, 420], b: [860, 70, 110], c: [1150, 120, 70] },
      { a: [900, 40, 380], b: [1120, 540, 150], c: [820, 560, 76] },
    ],
    body: { a: [1170, -70, 170], b: [1236, 664, 96], c: [1130, 40, 36] },
    closing: { a: [-120, -160, 520], b: [1020, 460, 320], c: [960, 100, 120] },
  };

  const RAIL_TOP = 150;
  const RAIL_STEP = 92;
  const BAR_BASE = 610;

  // ---------- 课程大纲 ----------

  function splitGoals(text) {
    const goals = String(text || "")
      .split(/[；;。\n]+/)
      .map((item) => item.trim().replace(/^[0-9一二三四五六七八九十]+[、.．)）]\s*/, ""))
      .filter(Boolean);
    return goals.length ? goals.slice(0, 3) : DEFAULT_GOALS.slice();
  }

  // 各页正文的默认文字（本地模板）。AI 生成的内容使用同样的结构，缺什么就用这里的补上。
  function defaultContent(subject) {
    return {
      intro: {
        question: `生活中，哪些现象和「${subject}」有关？`,
        tip: "先请学生举例，再由例子引出本节课题",
        steps: [
          { title: "观察现象", desc: "展示图片或视频，唤起学生的生活经验" },
          { title: "提出问题", desc: "引导学生说出心中的疑问" },
          { title: "引出课题", desc: "顺势揭示本节课题和目标" },
        ],
      },
      learn: {
        steps: [
          { title: "理解概念", desc: "用生活实例解释定义" },
          { title: "例题示范", desc: "板书关键步骤，边讲边练" },
          { title: "归纳方法", desc: "提炼通用的解题步骤" },
        ],
      },
      practice: {
        levels: [
          { title: "基础题", desc: "巩固概念 · 约 3 分钟" },
          { title: "提高题", desc: "综合运用 · 约 5 分钟" },
          { title: "拓展题", desc: "迁移创新 · 约 7 分钟" },
        ],
      },
      summary: { pitfalls: "概念理解不透彻 · 解题步骤有遗漏 · 审题不仔细" },
      homework: {
        tiers: [
          { title: "课本基础练习", desc: "完成课本课后练习 1–3 题，巩固核心概念", note: "全体完成 · 约 15 分钟" },
          { title: "综合应用练习", desc: "完成学习单上的综合题 2 道，尝试一题多解", note: "学有余力 · 约 10 分钟" },
          { title: "开放探究任务", desc: "结合生活实际自拟一道题，并写出完整解答", note: "自愿挑战 · 不限时" },
        ],
      },
      notes: [
        "请 2～3 名学生分享生活中的例子，教师顺势板书课题。",
        "先讲概念，再用例题示范步骤，最后和学生一起归纳方法。",
        "三道题由易到难，巡视时多关注中等生，拓展题可以作为抢答题。",
        "请学生对照目标自评，重点强调易错点。",
        "说明分层作业要求，鼓励学有余力的同学挑战开放任务。",
      ],
    };
  }

  // 每类文字的长度上限，保证放得进版面
  const LIMITS = { title: 8, desc: 26, question: 40, tip: 26, pitfalls: 40, note: 14, notes: 80, goal: 30 };

  function clean(value, max, fallback) {
    if (typeof value !== "string") return fallback;
    const str = value.replace(/\s+/g, " ").trim();
    if (!str) return fallback;
    return str.length > max ? `${str.slice(0, max - 1)}…` : str;
  }

  function cleanItems(items, fallback, fields) {
    return fallback.map((base, i) => {
      const item = Array.isArray(items) && items[i] && typeof items[i] === "object" ? items[i] : {};
      const out = {};
      Object.keys(base).forEach((field) => {
        out[field] = clean(item[field], LIMITS[fields[field]], base[field]);
      });
      return out;
    });
  }

  // 把 AI 返回的内容与默认内容合并：只接受结构和长度都合适的字段
  function mergeContent(base, ai) {
    if (!ai || typeof ai !== "object") return base;
    const pick = (key) => (ai[key] && typeof ai[key] === "object" ? ai[key] : {});
    return {
      intro: {
        question: clean(pick("intro").question, LIMITS.question, base.intro.question),
        tip: clean(pick("intro").tip, LIMITS.tip, base.intro.tip),
        steps: cleanItems(pick("intro").steps, base.intro.steps, { title: "title", desc: "desc" }),
      },
      learn: { steps: cleanItems(pick("learn").steps, base.learn.steps, { title: "title", desc: "desc" }) },
      practice: {
        levels: cleanItems(pick("practice").levels, base.practice.levels, { title: "title", desc: "desc" }),
      },
      summary: { pitfalls: clean(pick("summary").pitfalls, LIMITS.pitfalls, base.summary.pitfalls) },
      homework: {
        tiers: cleanItems(pick("homework").tiers, base.homework.tiers, {
          title: "title",
          desc: "desc",
          note: "note",
        }),
      },
      notes: base.notes.map((note, i) => clean(Array.isArray(ai.notes) ? ai.notes[i] : null, LIMITS.notes, note)),
    };
  }

  /**
   * @param input 表单内容
   * @param ai 可选，AI 生成的正文（结构同 defaultContent，另可带 goals）
   */
  function buildOutline(input, ai) {
    const subject = String(input.subject || "").trim() || "未命名课程";
    const typed = String(input.goals || "").trim();
    // 老师填写了教学目标就以老师的为准；没填时才采用 AI 给出的目标
    let goals = splitGoals(typed);
    if (!typed && ai && Array.isArray(ai.goals)) {
      const aiGoals = ai.goals.map((g) => clean(g, LIMITS.goal, "")).filter(Boolean).slice(0, 3);
      if (aiGoals.length) goals = aiGoals;
    }
    return {
      subject,
      grade: input.grade || "初中",
      template: THEMES[input.template] ? input.template : "简洁教学风",
      goals,
      sections: SECTIONS,
      content: mergeContent(defaultContent(subject), ai),
    };
  }

  // ---------- 工具函数 ----------

  const measurer = document.createElement("canvas").getContext("2d");

  function textWidth(str, size, bold) {
    measurer.font = `${bold ? 700 : 400} ${size}px ${FONT_STACK}`;
    return measurer.measureText(str).width;
  }

  function lineCount(str, size, width, bold) {
    // 留出一点余量，给 PowerPoint 里字体度量的差异
    return Math.max(1, Math.ceil(textWidth(str, size, bold) / (width * 0.94)));
  }

  // 在给定宽度和行数内，找出能放下文字的最大字号
  function fitSize(str, { max, min, width, lines = 1, bold = true }) {
    for (let size = max; size > min; size -= 2) {
      if (lineCount(str, size, width, bold) <= lines) return size;
    }
    return min;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function rgba(hex, alpha = 1) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  // 在彩色底上选白字还是深色字，取对比度更高的一种
  function textOn(t, fill) {
    return contrast(fill, "#FFFFFF") >= contrast(fill, t.dark) ? "#FFFFFF" : t.dark;
  }

  function shape(key, x, y, w, h, style) {
    return Object.assign({ key, x, y, w, h }, style);
  }

  function text(key, x, y, w, h, content, style) {
    return Object.assign({ key, x, y, w, h, text: content }, style);
  }

  function pill(t, key, x, y, h, content, size) {
    const w = Math.round(textWidth(content, size, true)) + 40;
    return text(key, x, y, w, h, content, {
      fill: t.tint,
      radius: h / 2,
      size,
      bold: true,
      color: t.primary,
      align: "center",
      valign: "middle",
    });
  }

  // ---------- 各页的公共部分 ----------

  function decor(t, layout, index) {
    const pos = layout === "intro" ? ORBS.intro[index] : ORBS[layout];
    const closing = layout === "closing";
    const ringWidth = { cover: 14, body: 6 }[layout] || 10;
    const [ax, ay, ad] = pos.a;
    const [bx, by, bd] = pos.b;
    const [cx, cy, cd] = pos.c;
    return [
      shape("orb-a", ax, ay, ad, ad, {
        geom: "ellipse",
        fill: closing ? t.onPrimary : layout === "cover" ? t.primary : t.tint,
        fillAlpha: closing ? 0.1 : 1,
      }),
      shape("orb-b", bx, by, bd, bd, {
        geom: "ellipse",
        fill: closing ? t.onPrimary : t.accent,
        fillAlpha: closing ? 0.12 : 1,
      }),
      shape("orb-c", cx, cy, cd, cd, {
        geom: "ellipse",
        line: { color: closing ? t.onPrimary : t.warm, width: ringWidth, alpha: closing ? 0.45 : 1 },
      }),
    ];
  }

  // 章节侧边栏：目录页的五张卡片会收拢成这里的五个条目，高亮块随章节下移
  function rail({ t, o }, active) {
    const radius = Math.min(t.radius, 16);
    const titleSize = fitSize(o.subject, { max: 24, min: 16, width: 236, lines: 2 });
    const els = [
      shape("rail-bg", 0, 0, 300, H, { fill: t.panel, shadow: t.shadow }),
      text("title", 32, 44, 236, 72, o.subject, { size: titleSize, bold: true, color: t.ink, lineHeight: 1.35 }),
      shape("rail-hl", 20, RAIL_TOP + active * RAIL_STEP, 260, 72, { fill: t.primary, radius, shadow: t.shadow }),
    ];
    o.sections.forEach((section, i) => {
      const y = RAIL_TOP + i * RAIL_STEP;
      const on = i === active;
      els.push(
        shape(`sec-${i}`, 20, y, 260, 72, { fill: t.panel, fillAlpha: 0, radius }),
        text(`num-${i}`, 40, y + 14, 48, 44, pad2(i + 1), {
          size: 22,
          bold: true,
          color: on ? t.onPrimary : t.muted,
          valign: "middle",
        }),
        text(`label-${i}`, 92, y + 14, 172, 44, section.title, {
          size: 22,
          bold: on,
          color: on ? t.onPrimary : t.ink,
          valign: "middle",
        }),
      );
    });
    return els;
  }

  function practiceBars(t, collapsed) {
    const fills = [t.accent, t.primary, t.warm];
    const heights = [150, 250, 350];
    return fills.map((fill, j) => {
      const x = 440 + j * 260;
      // 在章节页里，柱子先以「压扁、透明」的状态藏在基线上，进入练习页时长高
      return collapsed
        ? shape(`c2-bar-${j}`, x, BAR_BASE - 4, 180, 4, { fill, radius: 2, opacity: 0 })
        : shape(`c2-bar-${j}`, x, BAR_BASE - heights[j], 180, heights[j], { fill, radius: Math.min(t.radius, 14) });
    });
  }

  // ---------- 各章节正文 ----------

  const BODY = [
    // 导入：情境问题 + 三个步骤
    function intro({ t, o }) {
      const { question, tip, steps } = o.content.intro;
      const els = [
        text("c0-q", 360, 184, 856, 196, question, {
          fill: t.tint,
          radius: t.radius,
          pad: [34, 36],
          size: fitSize(question, { max: 30, min: 22, width: 784, lines: 2 }),
          bold: true,
          color: t.ink,
          lineHeight: 1.4,
        }),
        text("c0-tip", 396, 318, 780, 40, tip, {
          size: 20,
          color: t.muted,
          lineHeight: 1.6,
        }),
      ];
      steps.forEach(({ title, desc }, j) => {
        const x = 360 + j * 292;
        els.push(
          shape(`c0-s${j}`, x, 408, 272, 244, { fill: t.panel, radius: t.radius, shadow: t.shadow }),
          text(`c0-s${j}-n`, x + 28, 436, 52, 52, String(j + 1), {
            geom: "ellipse",
            fill: t.primary,
            size: 24,
            bold: true,
            color: t.onPrimary,
            align: "center",
            valign: "middle",
            lineHeight: 1,
          }),
          text(`c0-s${j}-t`, x + 28, 508, 216, 40, title, { size: 26, bold: true, color: t.ink }),
          text(`c0-s${j}-d`, x + 28, 554, 216, 80, desc, { size: 18, color: t.muted, lineHeight: 1.5 }),
        );
      });
      return els;
    },

    // 新知讲解：三步流程 + 本课要点
    function learn({ t, o }) {
      const { steps } = o.content.learn;
      const els = [];
      steps.forEach(({ title, desc }, j) => {
        const x = 360 + j * 300;
        els.push(
          shape(`c1-b${j}`, x, 184, 256, 196, { fill: t.panel, radius: t.radius, shadow: t.shadow }),
          pill(t, `c1-b${j}-tag`, x + 24, 208, 34, `第 ${j + 1} 步`, 16),
          text(`c1-b${j}-t`, x + 24, 258, 208, 40, title, { size: 28, bold: true, color: t.ink }),
          text(`c1-b${j}-d`, x + 24, 306, 208, 56, desc, { size: 18, color: t.muted, lineHeight: 1.5 }),
        );
        if (j < steps.length - 1) {
          els.push(
            text(`c1-arrow-${j}`, x + 256, 252, 44, 60, "→", {
              size: 32,
              bold: true,
              color: t.primary,
              align: "center",
              valign: "middle",
            }),
          );
        }
      });
      els.push(
        shape("c1-key", 360, 408, 856, 244, { fill: t.tint, radius: t.radius }),
        text("c1-key-t", 396, 432, 400, 40, "本课要点", { size: 24, bold: true, color: t.primary }),
        text("c1-key-list", 396, 482, 784, 150, o.goals, { size: 22, color: t.ink, lineHeight: 1.5, bullets: true }),
      );
      return els;
    },

    // 课堂练习：难度逐级升高的三根柱子
    function practice({ t, o }) {
      const { levels } = o.content.practice;
      const heights = [150, 250, 350];
      const els = [
        text("c2-cap", 380, 184, 400, 32, "难度逐级提升", { size: 18, bold: true, color: t.muted }),
        shape("c2-axis", 380, BAR_BASE, 816, 3, { fill: t.muted, fillAlpha: 0.35 }),
        ...practiceBars(t, false),
      ];
      levels.forEach(({ title, desc }, j) => {
        const x = 440 + j * 260;
        els.push(
          text(`c2-bar-${j}-t`, x - 20, BAR_BASE - heights[j] - 52, 220, 40, title, {
            size: 26,
            bold: true,
            color: t.ink,
            align: "center",
            enterDelay: 250,
          }),
          text(`c2-bar-${j}-d`, x - 30, BAR_BASE + 16, 240, 32, desc, {
            size: 18,
            color: t.muted,
            align: "center",
            enterDelay: 250,
          }),
        );
      });
      return els;
    },

    // 课堂总结：对照教学目标逐条回顾 + 易错提醒
    function summary({ t, o }) {
      const els = [];
      o.goals.forEach((goal, j) => {
        const y = 184 + j * 104;
        els.push(
          shape(`c3-r${j}`, 360, y, 856, 88, { fill: t.panel, radius: t.radius, shadow: t.shadow }),
          text(`c3-r${j}-dot`, 384, y + 20, 48, 48, "✓", {
            geom: "ellipse",
            fill: t.accent,
            size: 24,
            bold: true,
            color: textOn(t, t.accent),
            align: "center",
            valign: "middle",
            lineHeight: 1,
          }),
          text(`c3-r${j}-t`, 452, y + 12, 740, 64, goal, {
            size: fitSize(goal, { max: 24, min: 18, width: 740, lines: 2, bold: false }),
            color: t.ink,
            valign: "middle",
            lineHeight: 1.35,
          }),
        );
      });
      els.push(
        shape("c3-warn", 360, 512, 856, 140, { fill: t.warm, fillAlpha: 0.16, radius: t.radius }),
        text("c3-warn-t", 392, 534, 300, 36, "易错提醒", { size: 22, bold: true, color: t.ink }),
        text("c3-warn-d", 392, 580, 792, 40, o.content.summary.pitfalls, {
          size: 20,
          color: t.muted,
        }),
      );
      return els;
    },

    // 课后作业：必做 / 选做 / 挑战
    function homework({ t, o }) {
      const tags = [
        ["必做", t.accent],
        ["选做", t.primary],
        ["挑战", t.warm],
      ];
      const els = [];
      o.content.homework.tiers.forEach(({ title, desc, note }, j) => {
        const [tag, color] = tags[j];
        const x = 360 + j * 292;
        els.push(
          shape(`c4-t${j}`, x, 184, 272, 468, { fill: t.panel, radius: t.radius, shadow: t.shadow }),
          text(`c4-t${j}-tag`, x + 24, 208, 76, 36, tag, {
            fill: color,
            radius: 18,
            size: 18,
            bold: true,
            color: textOn(t, color),
            align: "center",
            valign: "middle",
          }),
          text(`c4-t${j}-t`, x + 24, 268, 224, 76, title, { size: 26, bold: true, color: t.ink, lineHeight: 1.35 }),
          text(`c4-t${j}-d`, x + 24, 352, 224, 150, desc, { size: 18, color: t.muted, lineHeight: 1.6 }),
          text(`c4-t${j}-n`, x + 24, 596, 224, 32, note, { size: 16, bold: true, color: t.primary }),
        );
      });
      return els;
    },
  ];

  // ---------- 各页 ----------

  function cover(ctx) {
    const { t, o } = ctx;
    const titleSize = fitSize(o.subject, { max: 76, min: 40, width: 640, lines: 2 });
    const titleH = Math.round(titleSize * 1.2 * lineCount(o.subject, titleSize, 640, true));
    const goal = `本课目标：${o.goals[0]}`;
    const goalH = Math.round(24 * 1.5 * Math.min(2, lineCount(goal, 24, 600, false)));
    let y = Math.round((H - (44 + 28 + titleH + 24 + goalH)) / 2);

    const els = [...decor(t, "cover"), pill(t, "kicker", 96, y, 44, `${o.grade} · 课程课件`, 18)];
    y += 44 + 28;
    els.push(text("title", 96, y, 640, titleH, o.subject, { size: titleSize, bold: true, color: t.ink, lineHeight: 1.2 }));
    y += titleH + 24;
    els.push(text("subtitle", 96, y, 600, goalH, goal, { size: 24, color: t.muted, lineHeight: 1.5 }));
    return {
      label: "封面",
      bg: t.bg,
      notes: `开场：展示课题「${o.subject}」，用一句话说明今天要解决的问题。`,
      elements: els,
    };
  }

  function agenda(ctx) {
    const { t, o } = ctx;
    const els = [
      ...decor(t, "agenda"),
      pill(t, "kicker", 80, 52, 40, "课程目录", 16),
      text("title", 80, 104, 900, 56, o.subject, {
        size: fitSize(o.subject, { max: 40, min: 24, width: 900 }),
        bold: true,
        color: t.ink,
        lineHeight: 1.3,
      }),
    ];
    o.sections.forEach((section, i) => {
      const x = 80 + i * 228;
      els.push(
        shape(`sec-${i}`, x, 214, 208, 330, { fill: t.panel, radius: t.radius, shadow: t.shadow }),
        text(`num-${i}`, x + 24, 238, 150, 56, pad2(i + 1), { size: 44, bold: true, color: t.primary, lineHeight: 1.2 }),
        text(`label-${i}`, x + 24, 318, 164, 40, section.title, { size: 28, bold: true, color: t.ink }),
        text(`desc-${i}`, x + 24, 372, 164, 120, section.brief, { size: 18, color: t.muted, lineHeight: 1.6 }),
      );
    });
    return {
      label: "课程目录",
      bg: t.bg,
      notes: "用 30 秒介绍本课的五个环节，让学生对整节课心中有数。",
      elements: els,
    };
  }

  function sectionIntro(ctx, i) {
    const { t, o } = ctx;
    const section = o.sections[i];
    const els = [
      ...decor(t, "intro", i),
      ...rail(ctx, i),
      text("big-num", 360, 150, 420, 200, pad2(i + 1), { size: 190, bold: true, color: t.primary, lineHeight: 1.05 }),
      text("sec-title", 360, 372, 860, 96, section.title, { size: 76, bold: true, color: t.ink, lineHeight: 1.2 }),
      text("sec-sub", 364, 478, 820, 46, section.subtitle, { size: 30, color: t.muted, lineHeight: 1.4 }),
      shape("divider", 366, 548, 120, 8, { fill: t.accent, radius: 4 }),
    ];
    if (i === 2) els.push(...practiceBars(t, true));
    return {
      label: `第 ${i + 1} 部分：${section.title}`,
      bg: t.bg,
      notes: `进入第 ${i + 1} 部分「${section.title}」：${section.subtitle}。`,
      elements: els,
    };
  }

  function sectionBody(ctx, i) {
    const { t, o } = ctx;
    const section = o.sections[i];
    const els = [
      ...decor(t, "body"),
      ...rail(ctx, i),
      text("big-num", 360, 44, 80, 56, pad2(i + 1), { size: 40, bold: true, color: t.primary, lineHeight: 1.4 }),
      text("sec-title", 430, 44, 760, 56, section.title, { size: 40, bold: true, color: t.ink, lineHeight: 1.4 }),
      text("sec-sub", 362, 104, 820, 34, section.subtitle, { size: 20, color: t.muted, lineHeight: 1.6 }),
      shape("divider", 360, 152, 856, 2, { fill: t.accent, fillAlpha: 0.5, radius: 1 }),
      ...BODY[i](ctx),
    ];
    return { label: `${section.title}：${section.body}`, bg: t.bg, notes: o.content.notes[i], elements: els };
  }

  function closing(ctx) {
    const { t, o } = ctx;
    const on = t.onPrimary;
    const els = [
      // 侧边栏的底板铺满整页，成为结束页的背景
      shape("rail-bg", 0, 0, W, H, { fill: t.primary }),
      ...decor(t, "closing"),
      text("title", 140, 232, 1000, 50, o.subject, {
        size: fitSize(o.subject, { max: 32, min: 20, width: 1000 }),
        bold: true,
        color: on,
        colorAlpha: 0.85,
        align: "center",
        lineHeight: 1.5,
      }),
      text("end-title", 140, 296, 1000, 130, "谢谢聆听", {
        size: 100,
        bold: true,
        color: on,
        align: "center",
        lineHeight: 1.25,
      }),
      text("end-sub", 140, 446, 1000, 44, "课后请完成分层作业，我们下节课见", {
        size: 26,
        color: on,
        colorAlpha: 0.8,
        align: "center",
        lineHeight: 1.6,
      }),
    ];
    return { label: "结束页", bg: t.bg, notes: "总结全课，感谢学生的参与，提醒课后作业。", elements: els, closing: true };
  }

  function progress({ t, total }, index, onPrimary) {
    const w = Math.round((W * (index + 1)) / total);
    return shape("progress", 0, H - 6, w, 6, onPrimary ? { fill: t.onPrimary, fillAlpha: 0.6 } : { fill: t.primary });
  }

  function buildScenes(outline) {
    const t = THEMES[outline.template];
    const ctx = { t, o: outline, total: outline.sections.length * 2 + 3 };
    const scenes = [cover(ctx), agenda(ctx)];
    outline.sections.forEach((_, i) => scenes.push(sectionIntro(ctx, i), sectionBody(ctx, i)));
    scenes.push(closing(ctx));
    scenes.forEach((scene, i) => scene.elements.push(progress(ctx, i, scene.closing)));
    return scenes;
  }

  // ---------- 渲染成网页 ----------

  const VALIGN = { top: "flex-start", middle: "center", bottom: "flex-end" };

  function px(value) {
    return `${value}px`;
  }

  // pad 支持 数字 / [上下, 左右] / [上, 右, 下, 左]，统一成四个值
  function padding(pad) {
    if (pad == null) return [0, 0, 0, 0];
    if (typeof pad === "number") return [pad, pad, pad, pad];
    if (pad.length === 2) return [pad[0], pad[1], pad[0], pad[1]];
    return pad;
  }

  function renderElement(spec) {
    const el = document.createElement("div");
    el.className = "m";
    el.dataset.morph = spec.key;
    if (spec.enterDelay) el.dataset.enterDelay = String(spec.enterDelay);

    const s = el.style;
    s.left = px(spec.x);
    s.top = px(spec.y);
    s.width = px(spec.w);
    s.height = px(spec.h);
    s.rotate = `${spec.rotate || 0}deg`;
    s.opacity = String(spec.opacity == null ? 1 : spec.opacity);
    s.backgroundColor = spec.fill ? rgba(spec.fill, spec.fillAlpha) : "rgba(0, 0, 0, 0)";
    s.borderRadius = spec.geom === "ellipse" ? "50%" : px(spec.radius || 0);
    s.borderWidth = spec.line ? px(spec.line.width) : "0px";
    s.borderColor = spec.line ? rgba(spec.line.color, spec.line.alpha) : "rgba(0, 0, 0, 0)";
    s.boxShadow = spec.shadow ? "0 12px 32px rgba(16, 24, 40, 0.10)" : "none";

    if (spec.text != null) {
      s.color = rgba(spec.color, spec.colorAlpha);
      s.fontSize = px(spec.size);
      s.fontWeight = spec.bold ? "700" : "400";
      s.lineHeight = String(spec.lineHeight || 1.3);
      s.textAlign = spec.align || "left";
      s.justifyContent = VALIGN[spec.valign || "top"];
      s.padding = padding(spec.pad).map(px).join(" ");
      const paragraphs = Array.isArray(spec.text) ? spec.text : [spec.text];
      paragraphs.forEach((line) => {
        const p = document.createElement("p");
        if (spec.bullets) p.className = "bullet";
        p.textContent = line;
        el.appendChild(p);
      });
    }
    return el;
  }

  function renderScene(scene) {
    const section = document.createElement("section");
    section.className = "slide";
    section.dataset.bg = scene.bg;
    section.setAttribute("aria-label", scene.label);
    scene.elements.forEach((spec) => section.appendChild(renderElement(spec)));
    return section;
  }

  global.CourseDeck = {
    WIDTH: W,
    HEIGHT: H,
    THEMES,
    buildOutline,
    buildScenes,
    renderScene,
    padding,
  };
})(window);
