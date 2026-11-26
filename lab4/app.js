document.addEventListener('DOMContentLoaded', () => {
  const ALGO_DESCRIPTIONS = {
    step: 'Вычисляет y = kx + b (или x = (y−b)/k) на каждом шаге с округлением. Много операций с плавающей точкой.',
    dda: 'Инкрементно накапливает Δx/L и Δy/L. Быстрее пошагового, но требует float-сложения и Math.round().',
    bresenham: 'Чистая целочисленная арифметика и битовый сдвиг. Работает во всех 8 октантах без погрешностей.',
    wu: 'Честное сглаживание: на каждом шаге закрашиваются 2 соседних пикселя с прозрачностью fpart и 1−fpart.',
    castleLine: 'Целочисленный алгоритм Кастла–Питвея (1985): строит точную строку ходов s/d по алгоритму Евклида.',
    circle: 'Целочисленный алгоритм Брезенхема для окружности с 8-кратной симметрией.',
    ellipse: 'Целочисленный алгоритм Питвея для конического сечения (эллипс, 2 области наклона, 4-кратная симметрия).'
  };

  const grid = new VirtualGrid(120, 120);
  const canvas = document.getElementById('raster-canvas');
  const painter = new GridPainter(canvas, grid);

  const algoSelect = document.getElementById('algo-select');
  const algoDesc = document.getElementById('algo-desc');
  const lineInputs = document.getElementById('line-inputs');
  const circleInputs = document.getElementById('circle-inputs');
  const ellipseInputs = document.getElementById('ellipse-inputs');
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomVal = document.getElementById('zoom-val');
  const chkIdeal = document.getElementById('chk-ideal');
  const chkAccumulate = document.getElementById('chk-accumulate');
  const statPixels = document.getElementById('stat-pixels');
  const statTime = document.getElementById('stat-time');
  const statCursor = document.getElementById('stat-cursor');
  const traceBody = document.querySelector('#trace-table tbody');
  const traceSummary = document.getElementById('trace-summary');

  const num = (id) => Number(document.getElementById(id).value) || 0;

  function updateInputVisibility() {
    const algo = algoSelect.value;
    algoDesc.textContent = ALGO_DESCRIPTIONS[algo];
    lineInputs.classList.toggle('hidden', algo === 'circle' || algo === 'ellipse');
    circleInputs.classList.toggle('hidden', algo !== 'circle');
    ellipseInputs.classList.toggle('hidden', algo !== 'ellipse');
  }

  function renderTraceTable(trace) {
    traceSummary.textContent = `${trace.length} шагов`;
    const limit = 250;
    const rows = trace.slice(0, limit).map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>(${t.x}, ${t.y})</td>
        <td>${t.a}</td>
        <td><code>${t.info}</code></td>
      </tr>
    `);
    if (trace.length > limit) {
      rows.push(`<tr><td colspan="4" class="muted">… показаны первые ${limit} из ${trace.length} записей</td></tr>`);
    }
    traceBody.innerHTML = rows.join('');
  }

  const measureGrid = new VirtualGrid(120, 120);

  function rasterizeCurrent() {
    if (!chkAccumulate.checked) grid.clear();
    const algo = algoSelect.value;
    const trace = [];
    const lineMap = {
      step: RasterEngine.stepByStepLine,
      dda: RasterEngine.ddaLine,
      bresenham: RasterEngine.bresenhamLine,
      wu: RasterEngine.wuLine,
      castleLine: RasterEngine.castlePittewayLine
    };

    let runPrimitive;
    if (algo === 'circle') {
      const cx = num('cx'), cy = num('cy'), r = num('radius');
      runPrimitive = (target, tr) => RasterEngine.bresenhamCircle(cx, cy, r, target, tr);
      painter.idealOverlay = { type: 'circle', p: { cx, cy, r } };
    } else if (algo === 'ellipse') {
      const cx = num('ex'), cy = num('ey'), rx = num('rx'), ry = num('ry');
      runPrimitive = (target, tr) => RasterEngine.pittewayEllipse(cx, cy, rx, ry, target, tr);
      painter.idealOverlay = { type: 'ellipse', p: { cx, cy, rx, ry } };
    } else {
      const x0 = num('x0'), y0 = num('y0'), x1 = num('x1'), y1 = num('y1');
      const fn = lineMap[algo];
      runPrimitive = (target, tr) => fn(x0, y0, x1, y1, target, tr);
      painter.idealOverlay = { type: 'line', p: { x0, y0, x1, y1 } };
    }

    runPrimitive(grid, null);

    const iterations = 5000;
    measureGrid.clear();
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      runPrimitive(measureGrid, null);
    }
    const avgUs = ((performance.now() - t0) * 1000) / iterations;

    const dummyTarget = { setPixel() {} };
    runPrimitive(dummyTarget, trace);

    statPixels.textContent = grid.filledCount;
    statTime.textContent = `${avgUs.toFixed(2)} мкс`;
    renderTraceTable(trace);
    painter.render();
  }

  document.getElementById('btn-octants').addEventListener('click', () => {
    grid.clear();
    painter.idealOverlay = null;
    const algo = algoSelect.value;
    const lineMap = {
      step: RasterEngine.stepByStepLine,
      dda: RasterEngine.ddaLine,
      bresenham: RasterEngine.bresenhamLine,
      wu: RasterEngine.wuLine,
      castleLine: RasterEngine.castlePittewayLine
    };

    const t0 = performance.now();
    if (algo === 'circle') {
      [4, 8, 13, 18].forEach((r) => RasterEngine.bresenhamCircle(0, 0, r, grid));
    } else if (algo === 'ellipse') {
      [[16, 7], [7, 16], [12, 12]].forEach(([rx, ry]) => RasterEngine.pittewayEllipse(0, 0, rx, ry, grid));
    } else {
      const fn = lineMap[algo];
      for (let deg = 0; deg < 360; deg += 22.5) {
        const rad = (deg * Math.PI) / 180;
        fn(0, 0, Math.round(Math.cos(rad) * 16), Math.round(Math.sin(rad) * 16), grid);
      }
    }
    const elapsed = performance.now() - t0;
    statPixels.textContent = grid.filledCount;
    statTime.textContent = `${elapsed.toFixed(4)} мс`;
    traceSummary.textContent = 'Тест 8 октантов';
    traceBody.innerHTML = '<tr><td colspan="4" class="muted">Построена серия примитивов во всех 8 октантах.</td></tr>';
    painter.render();
  });

  let pendingFirstPoint = null;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const { x, y } = painter.screenToLogical(e.clientX - rect.left, e.clientY - rect.top);
    statCursor.textContent = `(${x}, ${y})`;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const pt = painter.screenToLogical(e.clientX - rect.left, e.clientY - rect.top);
    const algo = algoSelect.value;

    if (!pendingFirstPoint) {
      pendingFirstPoint = pt;
      if (algo === 'circle') {
        document.getElementById('cx').value = pt.x;
        document.getElementById('cy').value = pt.y;
      } else if (algo === 'ellipse') {
        document.getElementById('ex').value = pt.x;
        document.getElementById('ey').value = pt.y;
      } else {
        document.getElementById('x0').value = pt.x;
        document.getElementById('y0').value = pt.y;
      }
    } else {
      if (algo === 'circle') {
        const r = Math.round(Math.hypot(pt.x - pendingFirstPoint.x, pt.y - pendingFirstPoint.y));
        document.getElementById('radius').value = r;
      } else if (algo === 'ellipse') {
        document.getElementById('rx').value = Math.abs(pt.x - pendingFirstPoint.x);
        document.getElementById('ry').value = Math.abs(pt.y - pendingFirstPoint.y);
      } else {
        document.getElementById('x1').value = pt.x;
        document.getElementById('y1').value = pt.y;
      }
      pendingFirstPoint = null;
      rasterizeCurrent();
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const next = Math.min(48, Math.max(8, painter.cellSize + (e.deltaY < 0 ? 2 : -2)));
    painter.cellSize = next;
    zoomSlider.value = next;
    zoomVal.textContent = next;
    painter.render();
  }, { passive: false });

  zoomSlider.addEventListener('input', () => {
    painter.cellSize = Number(zoomSlider.value);
    zoomVal.textContent = zoomSlider.value;
    painter.render();
  });

  chkIdeal.addEventListener('change', () => {
    painter.showIdeal = chkIdeal.checked;
    painter.render();
  });

  algoSelect.addEventListener('change', () => {
    pendingFirstPoint = null;
    updateInputVisibility();
    rasterizeCurrent();
  });

  document.getElementById('btn-draw').addEventListener('click', rasterizeCurrent);
  document.getElementById('btn-clear').addEventListener('click', () => {
    pendingFirstPoint = null;
    grid.clear();
    painter.idealOverlay = null;
    statPixels.textContent = '0';
    traceBody.innerHTML = '';
    traceSummary.textContent = '0 шагов';
    painter.render();
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'visualizer') {
        painter.resize();
        painter.render();
      }
    });
  });

  const btnBench = document.getElementById('btn-run-bench');
  const benchProgress = document.getElementById('bench-progress');
  const benchStatus = document.getElementById('bench-status');
  const benchTableBody = document.querySelector('#bench-table tbody');

  btnBench.addEventListener('click', async () => {
    btnBench.disabled = true;
    const lineCount = Math.max(10000, num('bench-lines'));
    const circleCount = Math.max(5000, num('bench-circles'));

    const results = await BenchmarkRunner.runFull(lineCount, circleCount, (pct, msg) => {
      benchProgress.style.width = `${pct}%`;
      benchStatus.textContent = msg;
    });

    const bresMs = results.summary.find((r) => r.id === 'bresenham').ms;
    benchTableBody.innerHTML = results.summary.map((r) => {
      const ratio = r.id === 'circle' ? '—' : `${(r.ms / bresMs).toFixed(2)}×`;
      return `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.count.toLocaleString()}</td>
          <td>${r.ms.toFixed(2)} мс</td>
          <td>${ratio}</td>
        </tr>
      `;
    }).join('');

    ChartRenderer.drawLineChart(
      document.getElementById('chart-count'),
      results.byCount,
      'Количество отрезков (N)',
      'Время (мс)'
    );
    ChartRenderer.drawLineChart(
      document.getElementById('chart-length'),
      results.byLength,
      'Длина отрезка (L, px)',
      'Время (мс)'
    );

    btnBench.disabled = false;
  });

  window.addEventListener('resize', () => { painter.resize(); painter.render(); });
  updateInputVisibility();
  painter.resize();
  rasterizeCurrent();
});