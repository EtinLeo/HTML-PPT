// Theme toggle
(function initTheme() {
  const root = document.documentElement;
  const key = 'polygon-theme';
  const saved = localStorage.getItem(key);
  if (saved === 'dark') root.classList.add('dark');
  const btn = document.getElementById('toggle-theme');
  if (btn) {
    btn.addEventListener('click', () => {
      root.classList.toggle('dark');
      localStorage.setItem(key, root.classList.contains('dark') ? 'dark' : 'light');
    });
  }
})();

// Print handout
(function initPrint() {
  const btn = document.getElementById('print-handout');
  if (!btn) return;
  btn.addEventListener('click', () => window.print());
})();

// Regular polygon rendering
(function initRegularPolygonLab() {
  const canvas = document.getElementById('regular-canvas');
  const range = document.getElementById('sides-range');
  const label = document.getElementById('sides-value');
  const vOut = document.getElementById('facts-vertices');
  const eOut = document.getElementById('facts-edges');
  if (!canvas || !range) return;

  const svgNS = 'http://www.w3.org/2000/svg';

  function render(n) {
    while (canvas.firstChild) canvas.removeChild(canvas.firstChild);
    const width = 400; const height = 300;
    const cx = width / 2; const cy = height / 2; const r = Math.min(width, height) * 0.35;
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const polygon = document.createElementNS(svgNS, 'polygon');
    polygon.setAttribute('points', points.join(' '));
    polygon.setAttribute('class', 'poly');
    canvas.appendChild(polygon);

    // Dots for vertices
    for (let i = 0; i < n; i++) {
      const [x, y] = points[i].split(',').map(Number);
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', 3);
      dot.setAttribute('fill', 'currentColor');
      canvas.appendChild(dot);
    }

    vOut && (vOut.textContent = String(n));
    eOut && (eOut.textContent = String(n));
  }

  function sync() {
    const n = parseInt(range.value, 10);
    if (label) label.textContent = String(n);
    render(n);
  }

  range.addEventListener('input', sync);
  sync();
})();

// Perimeter calculator
(function initPerimeter() {
  const btn = document.getElementById('calc-perimeter');
  const lenInput = document.getElementById('len-input');
  const sidesRange = document.getElementById('sides-range');
  const result = document.getElementById('perimeter-result');
  if (!btn || !lenInput || !sidesRange) return;

  btn.addEventListener('click', () => {
    const n = parseInt(sidesRange.value, 10);
    const len = parseFloat(lenInput.value);
    if (!isFinite(len) || len <= 0) {
      result.textContent = '请输入大于 0 的边长。';
      return;
    }
    const p = n * len;
    result.textContent = `当 n = ${n}，边长 = ${len}，周长 P = n × 边长 = ${p}`;
  });
})();

// Drag & drop classification
(function initDragDrop() {
  const cardsWrap = document.getElementById('cards');
  const zones = Array.from(document.querySelectorAll('.dropzone'));
  const checkBtn = document.getElementById('check-classify');
  const feedback = document.getElementById('classify-feedback');
  if (!cardsWrap || zones.length === 0) return;

  const svgNS = 'http://www.w3.org/2000/svg';

  const items = [
    { id: 'tri', label: '三角形', type: 'polygon', draw: (svg) => {
      const p = document.createElementNS(svgNS, 'polygon');
      p.setAttribute('points', '15,140 165,140 90,20'); p.setAttribute('class', 'poly'); svg.appendChild(p);
    } },
    { id: 'rect', label: '长方形', type: 'polygon', draw: (svg) => {
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', '20'); r.setAttribute('y', '30'); r.setAttribute('width', '150'); r.setAttribute('height', '90'); r.setAttribute('class', 'poly'); svg.appendChild(r);
    } },
    { id: 'pent', label: '五边形', type: 'polygon', draw: (svg) => {
      const p = document.createElementNS(svgNS, 'polygon');
      p.setAttribute('points', '90,20 150,70 125,140 55,140 30,70'); p.setAttribute('class', 'poly'); svg.appendChild(p);
    } },
    { id: 'circle', label: '圆', type: 'non-polygon', draw: (svg) => {
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', '90'); c.setAttribute('cy', '80'); c.setAttribute('r', '55'); c.setAttribute('class', 'poly'); svg.appendChild(c);
    } },
    { id: 'star', label: '五角星（有交叉）', type: 'non-polygon', draw: (svg) => {
      const p = document.createElementNS(svgNS, 'polygon');
      p.setAttribute('points', '90,20 110,70 165,70 120,100 135,150 90,120 45,150 60,100 15,70 70,70');
      p.setAttribute('class', 'poly'); svg.appendChild(p);
    } },
    { id: 'arc', label: '含曲线的图形', type: 'non-polygon', draw: (svg) => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M20,120 L90,20 A60,60 0 0 1 160,120 Z');
      path.setAttribute('class', 'poly'); svg.appendChild(path);
    } },
  ];

  function createCard(item) {
    const div = document.createElement('div'); div.className = 'card-item'; div.draggable = true; div.id = `card-${item.id}`;
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 180 160'); item.draw(svg);
    const span = document.createElement('span'); span.textContent = item.label;
    div.appendChild(svg); div.appendChild(span);

    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging'); e.dataTransfer.setData('text/plain', item.id);
    });
    div.addEventListener('dragend', () => div.classList.remove('dragging'));
    return div;
  }

  items.forEach((it) => cardsWrap.appendChild(createCard(it)));

  zones.forEach((zone) => {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const card = document.getElementById(`card-${id}`);
      if (card) zone.appendChild(card);
    });
  });

  checkBtn && checkBtn.addEventListener('click', () => {
    const correct = new Set(items.filter(i => i.type === 'polygon').map(i => `card-${i.id}`));
    const polyZone = document.querySelector('.dropzone[data-type="polygon"]');
    const nonZone = document.querySelector('.dropzone[data-type="non-polygon"]');
    let ok = true;

    function checkZone(zone, shouldBePolygon) {
      const children = Array.from(zone.children).filter(el => el.classList?.contains('card-item'));
      for (const el of children) {
        const isPolygon = correct.has(el.id);
        if (isPolygon !== shouldBePolygon) return false;
      }
      return true;
    }

    ok = checkZone(polyZone, true) && checkZone(nonZone, false);
    if (feedback) {
      feedback.textContent = ok ? '✅ 全部正确！做得很好！' : '❌ 还有放错的，请再想一想~';
    }
  });
})();

// Quiz
(function initQuiz() {
  const box = document.getElementById('quiz-box');
  const qEl = document.getElementById('quiz-question');
  const optsEl = document.getElementById('quiz-options');
  const nextBtn = document.getElementById('quiz-next');
  const progressEl = document.getElementById('quiz-progress');
  if (!box) return;

  const questions = [
    {
      q: '下列哪一个一定是多边形？',
      options: ['圆', '三角形', '五角星（线条相交）', '有一条曲线的封闭图形'],
      ans: 1,
      explain: '多边形由直线段围成；三角形满足。'
    },
    {
      q: '正六边形有多少条边？',
      options: ['4', '5', '6', '8'],
      ans: 2
    },
    {
      q: '多边形的内角和公式（选学）是？',
      options: ['n × 180°', '(n − 2) × 180°', '(n + 2) × 90°', '180° ÷ n'],
      ans: 1
    },
  ];

  let index = 0; let selected = null; let score = 0;

  function render() {
    const cur = questions[index];
    qEl.textContent = cur.q;
    optsEl.innerHTML = '';
    selected = null;
    nextBtn.disabled = true;
    cur.options.forEach((txt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.textContent = txt;
      btn.addEventListener('click', () => {
        if (selected !== null) return;
        selected = i;
        if (i === cur.ans) {
          btn.classList.add('correct'); score += 1;
        } else {
          btn.classList.add('wrong');
          const correctBtn = optsEl.children[cur.ans];
          correctBtn.classList.add('correct');
        }
        if (cur.explain) {
          const exp = document.createElement('div');
          exp.className = 'muted';
          exp.textContent = '解析：' + cur.explain;
          optsEl.appendChild(exp);
        }
        nextBtn.disabled = false;
      });
      optsEl.appendChild(btn);
    });
    progressEl.textContent = `第 ${index + 1} / ${questions.length} 题`;
  }

  nextBtn.addEventListener('click', () => {
    if (index < questions.length - 1) {
      index += 1; render();
    } else {
      qEl.textContent = `完成！得分：${score} / ${questions.length}`;
      optsEl.innerHTML = '';
      nextBtn.disabled = true;
      progressEl.textContent = '';
    }
  });

  render();
})();