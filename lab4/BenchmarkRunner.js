class BenchmarkRunner {
  static ALGORITHMS = [
    { id: 'step',       name: 'Пошаговый',        color: '#f97316', fn: RasterEngine.stepByStepLine },
    { id: 'dda',        name: 'ЦДА (DDA)',        color: '#eab308', fn: RasterEngine.ddaLine },
    { id: 'bresenham',  name: 'Брезенхем (лин.)', color: '#22c55e', fn: RasterEngine.bresenhamLine },
    { id: 'wu',         name: 'Ву (Anti-Alias)',  color: '#38bdf8', fn: RasterEngine.wuLine },
    { id: 'castleLine', name: 'Кастл–Питвей',     color: '#a855f7', fn: RasterEngine.castlePittewayLine }
  ];

  static generateLines(count, maxRadius = 120, fixedLength = null) {
    const data = new Int32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = fixedLength !== null ? fixedLength : (10 + Math.random() * maxRadius);
      const x0 = Math.round((Math.random() - 0.5) * 40);
      const y0 = Math.round((Math.random() - 0.5) * 40);
      data[i * 4]     = x0;
      data[i * 4 + 1] = y0;
      data[i * 4 + 2] = Math.round(x0 + Math.cos(angle) * len);
      data[i * 4 + 3] = Math.round(y0 + Math.sin(angle) * len);
    }
    return data;
  }

  static generateCircles(count, maxR = 110) {
    const data = new Int32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 3]     = Math.round((Math.random() - 0.5) * 60);
      data[i * 3 + 1] = Math.round((Math.random() - 0.5) * 60);
      data[i * 3 + 2] = Math.floor(5 + Math.random() * maxR);
    }
    return data;
  }

  static _measureLines(fn, coords, count, grid) {
    grid.clear();
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      const o = i << 2;
      fn(coords[o], coords[o + 1], coords[o + 2], coords[o + 3], grid, null);
    }
    return performance.now() - t0;
  }

  static _measureCircles(coords, count, grid) {
    grid.clear();
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      RasterEngine.bresenhamCircle(coords[o], coords[o + 1], coords[o + 2], grid, null);
    }
    return performance.now() - t0;
  }

  static async runFull(lineCount, circleCount, onProgress) {
    const grid = new VirtualGrid(512, 512);
    const yieldUI = () => new Promise((r) => setTimeout(r, 15));

    onProgress(5, 'Генерация набора данных (отрезки и окружности)...');
    await yieldUI();

    const lines = this.generateLines(lineCount, 120);
    const circles = this.generateCircles(circleCount, 110);

    const summary = [];
    for (let idx = 0; idx < this.ALGORITHMS.length; idx++) {
      const alg = this.ALGORITHMS[idx];
      onProgress(10 + idx * 8, `Стресс-тест: ${alg.name} (${lineCount.toLocaleString()} отрезков)...`);
      await yieldUI();
      const ms = this._measureLines(alg.fn, lines, lineCount, grid);
      summary.push({ name: alg.name, count: lineCount, ms, id: alg.id });
    }

    onProgress(52, `Стресс-тест: Брезенхем окружность (${circleCount.toLocaleString()} шт.)...`);
    await yieldUI();
    const circleMs = this._measureCircles(circles, circleCount, grid);
    summary.push({ name: 'Брезенхем (окр.)', count: circleCount, ms: circleMs, id: 'circle' });

    const countSteps = [0.2, 0.4, 0.6, 0.8, 1.0].map((k) => Math.round(lineCount * k));
    const byCount = {
      xLabels: countSteps.map((n) => `${Math.round(n / 1000)}k`),
      series: this.ALGORITHMS.map((a) => ({ name: a.name, color: a.color, values: [] }))
    };

    for (let s = 0; s < countSteps.length; s++) {
      const n = countSteps[s];
      onProgress(58 + s * 4, `График от N: ${n.toLocaleString()} отрезков...`);
      await yieldUI();
      this.ALGORITHMS.forEach((alg, ai) => {
        byCount.series[ai].values.push(this._measureLines(alg.fn, lines, n, grid));
      });
    }

    const lengths = [10, 30, 60, 100, 150, 200];
    const sampleN = Math.min(20000, lineCount);
    const byLength = {
      xLabels: lengths.map((l) => `${l}px`),
      series: this.ALGORITHMS.map((a) => ({ name: a.name, color: a.color, values: [] }))
    };

    for (let li = 0; li < lengths.length; li++) {
      const L = lengths[li];
      onProgress(78 + li * 3, `График от длины L = ${L} px...`);
      await yieldUI();
      const fixedLines = this.generateLines(sampleN, L, L);
      this.ALGORITHMS.forEach((alg, ai) => {
        byLength.series[ai].values.push(this._measureLines(alg.fn, fixedLines, sampleN, grid));
      });
    }

    onProgress(100, 'Бенчмарк завершён.');
    return { summary, byCount, byLength };
  }
}