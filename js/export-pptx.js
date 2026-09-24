/*
 * export-pptx.js：把课件导出为 .pptx，并写入 PowerPoint 的「平滑」切换
 *
 * PowerPoint 的平滑切换会按对象名称配对：两页里名称相同、且以「!!」开头的对象
 * 会被强制当作同一个对象来补间。所以这里把每个元素命名为 "!!" + key，
 * 再给第 2 页起的每一页写入平滑切换（p159:morph）。
 * 不支持平滑切换的软件会改用文件里预留的「淡出」切换。
 */
(function (global) {
  "use strict";

  // 导出库只在点击导出时才加载；jsDelivr 与 unpkg 提供的是同一份 npm 文件
  const LIBRARY = {
    urls: [
      "https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js",
      "https://unpkg.com/pptxgenjs@4.0.1/dist/pptxgen.bundle.js",
    ],
    integrity: "sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8",
  };

  const PX_PER_INCH = 96; // 1280×720 画布正好是 13.333×7.5 英寸的 PowerPoint 宽屏
  const PT_PER_PX = 0.75;
  const FONT_FACE = "Microsoft YaHei";
  const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  function transitionXml(mode, durationMs) {
    if (mode === "fade") return '<p:transition spd="med"><p:fade/></p:transition>';
    // 与 PowerPoint 保存平滑切换时写出的结构一致
    return (
      '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">' +
      '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">' +
      `<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="${durationMs}">` +
      '<p159:morph option="byObject"/>' +
      "</p:transition>" +
      "</mc:Choice>" +
      '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>' +
      "</mc:AlternateContent>"
    );
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.integrity = LIBRARY.integrity;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error(`无法加载 ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadLibrary() {
    // pptxgen.bundle.js 同时提供 PptxGenJS 和它内置的 JSZip
    if (global.PptxGenJS && global.JSZip) return;
    for (const url of LIBRARY.urls) {
      try {
        await loadScript(url);
        if (global.PptxGenJS && global.JSZip) return;
      } catch (error) {
        // 当前地址不可用，换下一个
      }
    }
    throw new Error("导出组件加载失败，请检查网络连接后重试。");
  }

  function hex(color) {
    return color.replace("#", "").toUpperCase();
  }

  function transparency(alpha) {
    return Math.round((1 - alpha) * 100);
  }

  function addElement(pptx, slide, el) {
    const opacity = el.opacity == null ? 1 : el.opacity;
    const opts = {
      x: el.x / PX_PER_INCH,
      y: el.y / PX_PER_INCH,
      w: el.w / PX_PER_INCH,
      h: el.h / PX_PER_INCH,
      objectName: "!!" + el.key,
    };
    if (el.rotate) opts.rotate = el.rotate;

    let shapeType = pptx.ShapeType.rect;
    if (el.geom === "ellipse") {
      shapeType = pptx.ShapeType.ellipse;
    } else if (el.radius) {
      shapeType = pptx.ShapeType.roundRect;
      opts.rectRadius = Math.min(el.radius, el.w / 2, el.h / 2) / PX_PER_INCH;
    }

    if (el.fill) {
      opts.fill = { color: hex(el.fill), transparency: transparency((el.fillAlpha ?? 1) * opacity) };
    }
    if (el.line) {
      // PowerPoint 的线条压在形状边缘的中线上，网页的边框画在内侧，这里向内收半个线宽
      const inset = el.line.width / 2 / PX_PER_INCH;
      opts.x += inset;
      opts.y += inset;
      opts.w -= inset * 2;
      opts.h -= inset * 2;
      opts.line = {
        color: hex(el.line.color),
        width: el.line.width * PT_PER_PX,
        transparency: transparency((el.line.alpha ?? 1) * opacity),
      };
    }
    if (el.shadow) {
      opts.shadow = { type: "outer", color: "101828", opacity: 0.12, blur: 18, offset: 6, angle: 90 };
    }

    if (el.text == null) {
      slide.addShape(shapeType, opts);
      return;
    }

    const [top, right, bottom, left] = global.CourseDeck.padding(el.pad);
    const paragraphs = Array.isArray(el.text) ? el.text : [el.text];
    const runs = paragraphs.map((line, i) => ({
      text: line,
      options: {
        breakLine: i < paragraphs.length - 1,
        bullet: el.bullets ? { indent: el.size * PT_PER_PX } : false,
        paraSpaceBefore: i > 0 ? el.size * 0.35 * PT_PER_PX : 0,
      },
    }));
    slide.addText(runs, {
      ...opts,
      shape: shapeType,
      fontFace: FONT_FACE,
      fontSize: el.size * PT_PER_PX,
      bold: Boolean(el.bold),
      color: hex(el.color),
      transparency: transparency((el.colorAlpha ?? 1) * opacity),
      align: el.align || "left",
      valign: el.valign || "top",
      // 用固定行距，和网页里的 line-height 保持一致
      lineSpacing: el.size * (el.lineHeight || 1.3) * PT_PER_PX,
      // PptxGenJS 的 margin 顺序是 [左, 右, 下, 上]，单位为磅
      margin: [left, right, bottom, top].map((value) => value * PT_PER_PX),
      lang: "zh-CN",
    });
  }

  function saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * 生成 .pptx 并触发下载
   * @param {Array} scenes CourseDeck.buildScenes 的结果
   * @param {{title: string, fileName: string, mode?: "morph"|"fade"|"none", duration?: number}} options
   */
  async function download(scenes, { title, fileName, mode = "morph", duration = 1200 }) {
    await loadLibrary();

    const pptx = new global.PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = title;
    pptx.subject = "课程课件";
    pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE };

    scenes.forEach((scene) => {
      const slide = pptx.addSlide();
      slide.background = { color: hex(scene.bg) };
      scene.elements.forEach((el) => addElement(pptx, slide, el));
      if (scene.notes) slide.addNotes(scene.notes);
    });

    const data = await pptx.write({ outputType: "arraybuffer" });
    const zip = await global.JSZip.loadAsync(data);

    if (mode !== "none") {
      const transition = transitionXml(mode, duration);
      const slideFiles = Object.keys(zip.files).filter(
        (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name) && name !== "ppt/slides/slide1.xml",
      );
      await Promise.all(
        slideFiles.map(async (name) => {
          const xml = await zip.file(name).async("string");
          // <p:transition> 必须紧跟在 <p:clrMapOvr> 之后
          const anchor = "</p:clrMapOvr>";
          const found = xml.lastIndexOf(anchor);
          if (found === -1) return;
          const at = found + anchor.length;
          zip.file(name, xml.slice(0, at) + transition + xml.slice(at));
        }),
      );
    }

    const blob = await zip.generateAsync({ type: "blob", mimeType: PPTX_MIME, compression: "DEFLATE" });
    saveBlob(blob, fileName);
  }

  global.PptxExport = { download };
})(window);
