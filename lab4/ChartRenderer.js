class ChartRenderer {
  static drawLineChart(canvas, { xLabels, series }, xTitle, yTitle) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 36, right: 20, bottom: 44, left: 58 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const maxVal = Math.max(
      1,
      ...series.flatMap((s) => s.values)
    ) * 1.12;

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
    ctx.fillStyle = '#475569';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = (maxVal / yTicks) * i;
      const y = pad.top + plotH - (plotH * i) / yTicks;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), pad.left - 8, y + 4);
    }

    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(w - pad.right, pad.top + plotH);
    ctx.stroke();

    ctx.textAlign = 'center';
    const stepX = plotW / Math.max(1, xLabels.length - 1);
    xLabels.forEach((lbl, i) => {
      const x = pad.left + i * stepX;
      ctx.fillText(lbl, x, pad.top + plotH + 18);
    });

    ctx.fillStyle = '#0f172a';
    ctx.font = '12px system-ui';
    ctx.fillText(xTitle, pad.left + plotW / 2, h - 8);
    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yTitle, 0, 0);
    ctx.restore();

    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      s.values.forEach((v, i) => {
        const x = pad.left + i * stepX;
        const y = pad.top + plotH - (v / maxVal) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      s.values.forEach((v, i) => {
        const x = pad.left + i * stepX;
        const y = pad.top + plotH - (v / maxVal) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    let lx = pad.left;
    let ly = 12;
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    series.forEach((s) => {
      const itemW = ctx.measureText(s.name).width + 26;
      if (lx + itemW > w - pad.right) {
        lx = pad.left;
        ly += 16;
      }
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly, 10, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(s.name, lx + 14, ly + 9);
      lx += itemW;
    });
  }
}