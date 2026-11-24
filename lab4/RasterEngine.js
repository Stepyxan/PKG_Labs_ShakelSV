class RasterEngine {
  static stepByStepLine(x0, y0, x1, y1, target, trace = null) {
    const dx = x1 - x0;
    const dy = y1 - y0;

    if (dx === 0 && dy === 0) {
      target.setPixel(Math.round(x0), Math.round(y0), 1.0);
      if (trace) trace.push({ x: Math.round(x0), y: Math.round(y0), a: 1, info: 'Вырожденный отрезок (1 точка)' });
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      const k = dy / dx;
      const b = y0 - k * x0;
      const step = dx > 0 ? 1 : -1;
      for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) {
        const yExact = k * x + b;
        const y = Math.round(yExact);
        target.setPixel(x, y, 1.0);
        if (trace) trace.push({ x, y, a: 1, info: `y = ${k.toFixed(3)}·${x} + ${b.toFixed(2)} = ${yExact.toFixed(3)} → ${y}` });
      }
    } else {
      const invK = dx / dy;
      const b = x0 - invK * y0;
      const step = dy > 0 ? 1 : -1;
      for (let y = y0; step > 0 ? y <= y1 : y >= y1; y += step) {
        const xExact = invK * y + b;
        const x = Math.round(xExact);
        target.setPixel(x, y, 1.0);
        if (trace) trace.push({ x, y, a: 1, info: `x = ${invK.toFixed(3)}·${y} + ${b.toFixed(2)} = ${xExact.toFixed(3)} → ${x}` });
      }
    }
  }

  static ddaLine(x0, y0, x1, y1, target, trace = null) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
      target.setPixel(Math.round(x0), Math.round(y0), 1.0);
      if (trace) trace.push({ x: Math.round(x0), y: Math.round(y0), a: 1, info: 'steps = 0' });
      return;
    }

    const xInc = dx / steps;
    const yInc = dy / steps;
    let x = x0;
    let y = y0;

    for (let i = 0; i <= steps; i++) {
      const rx = Math.round(x);
      const ry = Math.round(y);
      target.setPixel(rx, ry, 1.0);
      if (trace) {
        trace.push({
          x: rx,
          y: ry,
          a: 1,
          info: `x=${x.toFixed(2)}, y=${y.toFixed(2)} (Δx=${xInc.toFixed(3)}, Δy=${yInc.toFixed(3)})`
        });
      }
      x += xInc;
      y += yInc;
    }
  }

  static bresenhamLine(x0, y0, x1, y1, target, trace = null) {
    let cx = x0 | 0;
    let cy = y0 | 0;
    const ex = x1 | 0;
    const ey = y1 | 0;

    const dx = Math.abs(ex - cx);
    const dy = Math.abs(ey - cy);
    const sx = cx < ex ? 1 : -1;
    const sy = cy < ey ? 1 : -1;
    let err = dx - dy;

    while (true) {
      target.setPixel(cx, cy, 1.0);
      if (trace) trace.push({ x: cx, y: cy, a: 1, info: `err=${err}, 2·err=${err << 1}` });
      if (cx === ex && cy === ey) break;

      const e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  static wuLine(x0, y0, x1, y1, target, trace = null) {
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    let ax = x0, ay = y0, bx = x1, by = y1;

    if (steep) {
      let t = ax; ax = ay; ay = t;
      t = bx; bx = by; by = t;
    }
    if (ax > bx) {
      let t = ax; ax = bx; bx = t;
      t = ay; ay = by; by = t;
    }

    const dx = bx - ax;
    const dy = by - ay;
    const gradient = dx === 0 ? 1.0 : dy / dx;

    let xend = Math.floor(ax + 0.5);
    let yend = ay + gradient * (xend - ax);
    let xgap = 1 - ((ax + 0.5) - Math.floor(ax + 0.5));
    const xpxl1 = xend;
    const ypxl1 = Math.floor(yend);
    let fp = yend - ypxl1;
    let rfp = 1 - fp;

    if (steep) {
      target.setPixel(ypxl1, xpxl1, rfp * xgap);
      target.setPixel(ypxl1 + 1, xpxl1, fp * xgap);
    } else {
      target.setPixel(xpxl1, ypxl1, rfp * xgap);
      target.setPixel(xpxl1, ypxl1 + 1, fp * xgap);
    }
    if (trace) {
      trace.push({ x: steep ? ypxl1 : xpxl1, y: steep ? xpxl1 : ypxl1, a: Number((rfp * xgap).toFixed(3)), info: `Старт (нижн.), y=${yend.toFixed(2)}` });
      trace.push({ x: steep ? ypxl1 + 1 : xpxl1, y: steep ? xpxl1 : ypxl1 + 1, a: Number((fp * xgap).toFixed(3)), info: `Старт (верхн.), y=${yend.toFixed(2)}` });
    }

    let intery = yend + gradient;

    xend = Math.floor(bx + 0.5);
    yend = by + gradient * (xend - bx);
    xgap = (bx + 0.5) - Math.floor(bx + 0.5);
    const xpxl2 = xend;
    const ypxl2 = Math.floor(yend);
    fp = yend - ypxl2;
    rfp = 1 - fp;

    if (steep) {
      target.setPixel(ypxl2, xpxl2, rfp * xgap);
      target.setPixel(ypxl2 + 1, xpxl2, fp * xgap);
    } else {
      target.setPixel(xpxl2, ypxl2, rfp * xgap);
      target.setPixel(xpxl2, ypxl2 + 1, fp * xgap);
    }
    if (trace) {
      trace.push({ x: steep ? ypxl2 : xpxl2, y: steep ? xpxl2 : ypxl2, a: Number((rfp * xgap).toFixed(3)), info: `Конец (нижн.), y=${yend.toFixed(2)}` });
      trace.push({ x: steep ? ypxl2 + 1 : xpxl2, y: steep ? xpxl2 : ypxl2 + 1, a: Number((fp * xgap).toFixed(3)), info: `Конец (верхн.), y=${yend.toFixed(2)}` });
    }

    if (steep) {
      for (let x = xpxl1 + 1; x < xpxl2; x++) {
        const iy = Math.floor(intery);
        const f = intery - iy;
        const rf = 1 - f;
        target.setPixel(iy, x, rf);
        target.setPixel(iy + 1, x, f);
        if (trace) {
          trace.push({ x: iy, y: x, a: Number(rf.toFixed(3)), info: `intery=${intery.toFixed(3)}, rfpart=${rf.toFixed(3)}` });
          trace.push({ x: iy + 1, y: x, a: Number(f.toFixed(3)), info: `intery=${intery.toFixed(3)}, fpart=${f.toFixed(3)}` });
        }
        intery += gradient;
      }
    } else {
      for (let x = xpxl1 + 1; x < xpxl2; x++) {
        const iy = Math.floor(intery);
        const f = intery - iy;
        const rf = 1 - f;
        target.setPixel(x, iy, rf);
        target.setPixel(x, iy + 1, f);
        if (trace) {
          trace.push({ x, y: iy, a: Number(rf.toFixed(3)), info: `intery=${intery.toFixed(3)}, rfpart=${rf.toFixed(3)}` });
          trace.push({ x, y: iy + 1, a: Number(f.toFixed(3)), info: `intery=${intery.toFixed(3)}, fpart=${f.toFixed(3)}` });
        }
        intery += gradient;
      }
    }
  }

  static castlePittewayLine(x0, y0, x1, y1, target, trace = null) {
    let cx = x0 | 0;
    let cy = y0 | 0;
    const dx = Math.abs((x1 | 0) - cx);
    const dy = Math.abs((y1 | 0) - cy);
    const sx = cx < (x1 | 0) ? 1 : -1;
    const sy = cy < (y1 | 0) ? 1 : -1;
    const steep = dy > dx;

    const a = steep ? dy : dx;
    const b = steep ? dx : dy;

    target.setPixel(cx, cy, 1.0);
    if (trace) trace.push({ x: cx, y: cy, a: 1, info: `Старт (a=${a}, b=${b})` });
    if (a === 0) return;

    if (b === 0) {
      for (let i = 0; i < a; i++) {
        if (steep) cy += sy; else cx += sx;
        target.setPixel(cx, cy, 1.0);
        if (trace) trace.push({ x: cx, y: cy, a: 1, info: 'Шаг s (осевая линия)' });
      }
      return;
    }
    if (a === b) {
      for (let i = 0; i < a; i++) {
        cx += sx; cy += sy;
        target.setPixel(cx, cy, 1.0);
        if (trace) trace.push({ x: cx, y: cy, a: 1, info: 'Шаг d (диагональ 45°)' });
      }
      return;
    }

    let x = a - b;
    let y = b;
    let m1 = 's';
    let m2 = 'd';
    const rev = (str) => {
      let out = '';
      for (let i = str.length - 1; i >= 0; i--) out += str[i];
      return out;
    };

    while (x !== y) {
      if (x > y) {
        x -= y;
        m2 = m1 + rev(m2);
      } else {
        y -= x;
        m1 = m2 + rev(m1);
      }
    }

    const pattern = m1 + rev(m2);
    const repeats = x;

    for (let r = 0; r < repeats; r++) {
      for (let i = 0; i < pattern.length; i++) {
        const move = pattern[i];
        if (move === 'd') {
          cx += sx;
          cy += sy;
        } else {
          if (steep) cy += sy; else cx += sx;
        }
        target.setPixel(cx, cy, 1.0);
        if (trace) trace.push({ x: cx, y: cy, a: 1, info: `Шаг '${move}' (паттерн "${pattern}", повтор ${r + 1}/${repeats})` });
      }
    }
  }

  static bresenhamCircle(cx, cy, r, target, trace = null) {
    const icx = cx | 0;
    const icy = cy | 0;
    const ir = Math.max(0, r | 0);

    if (ir === 0) {
      target.setPixel(icx, icy, 1.0);
      if (trace) trace.push({ x: icx, y: icy, a: 1, info: 'R = 0 (центр)' });
      return;
    }

    let x = 0;
    let y = ir;
    let d = 3 - (ir << 1);

    const plot8 = (px, py, decision) => {
      target.setPixel(icx + px, icy + py, 1.0);
      target.setPixel(icx - px, icy + py, 1.0);
      target.setPixel(icx + px, icy - py, 1.0);
      target.setPixel(icx - px, icy - py, 1.0);
      target.setPixel(icx + py, icy + px, 1.0);
      target.setPixel(icx - py, icy + px, 1.0);
      target.setPixel(icx + py, icy - px, 1.0);
      target.setPixel(icx - py, icy - px, 1.0);
      if (trace) {
        trace.push({
          x: icx + px,
          y: icy + py,
          a: 1,
          info: `Октант 1: (+${px}, +${py}) + 7 симм. точек | d=${decision}`
        });
      }
    };

    while (x <= y) {
      plot8(x, y, d);
      if (d < 0) {
        d += (x << 2) + 6;
      } else {
        d += ((x - y) << 2) + 10;
        y--;
      }
      x++;
    }
  }

  static pittewayEllipse(cx, cy, rx, ry, target, trace = null) {
    const icx = cx | 0;
    const icy = cy | 0;
    const a = Math.max(0, rx | 0);
    const b = Math.max(0, ry | 0);

    if (a === 0 && b === 0) {
      target.setPixel(icx, icy, 1.0);
      return;
    }

    const a2 = a * a;
    const b2 = b * b;
    const twoA2 = 2 * a2;
    const twoB2 = 2 * b2;

    const plot4 = (px, py, region, dVal) => {
      target.setPixel(icx + px, icy + py, 1.0);
      target.setPixel(icx - px, icy + py, 1.0);
      target.setPixel(icx + px, icy - py, 1.0);
      target.setPixel(icx - px, icy - py, 1.0);
      if (trace) {
        trace.push({
          x: icx + px,
          y: icy + py,
          a: 1,
          info: `Область ${region}: (+${px}, +${py}) + 3 симм. | d=${dVal}`
        });
      }
    };

    let x = 0;
    let y = b;
    let dx = 0;
    let dy = twoA2 * y;
    let d1 = Math.round(b2 - a2 * b + 0.25 * a2);

    while (dx < dy) {
      plot4(x, y, 1, d1);
      x++;
      dx += twoB2;
      if (d1 < 0) {
        d1 += dx + b2;
      } else {
        y--;
        dy -= twoA2;
        d1 += dx - dy + b2;
      }
    }

    let d2 = Math.round(b2 * (x + 0.5) * (x + 0.5) + a2 * (y - 1) * (y - 1) - a2 * b2);
    while (y >= 0) {
      plot4(x, y, 2, d2);
      y--;
      dy -= twoA2;
      if (d2 > 0) {
        d2 += a2 - dy;
      } else {
        x++;
        dx += twoB2;
        d2 += dx - dy + a2;
      }
    }
  }
}