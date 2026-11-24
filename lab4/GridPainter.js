class GridPainter {
  constructor(canvas, grid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = grid;
    this.cellSize = 24;
    this.showIdeal = true;
    this.idealOverlay = null;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = rect.width;
    this.viewH = rect.height;
  }

  logicalToScreen(lx, ly) {
    const originX = Math.floor(this.viewW / 2);
    const originY = Math.floor(this.viewH / 2);
    return {
      sx: originX + lx * this.cellSize,
      sy: originY - ly * this.cellSize
    };
  }

  screenToLogical(sx, sy) {
    const originX = Math.floor(this.viewW / 2);
    const originY = Math.floor(this.viewH / 2);
    return {
      x: Math.floor((sx - originX) / this.cellSize),
      y: Math.floor((originY - sy) / this.cellSize)
    };
  }

  render() {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const cs = this.cellSize;
    const ox = Math.floor(w / 2);
    const oy = Math.floor(h / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const minX = Math.max(-this.grid.halfW, Math.floor(-ox / cs) - 1);
    const maxX = Math.min(this.grid.halfW - 1, Math.ceil((w - ox) / cs) + 1);
    const minY = Math.max(-this.grid.halfH, Math.floor((oy - h) / cs) - 1);
    const maxY = Math.min(this.grid.halfH - 1, Math.ceil(oy / cs) + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const intensity = this.grid.getPixel(x, y);
        if (intensity > 0) {
          const sx = ox + x * cs;
          const sy = oy - (y + 1) * cs;
          ctx.fillStyle = `rgba(2, 132, 199, ${intensity.toFixed(3)})`;
          ctx.fillRect(sx, sy, cs, cs);
        }
      }
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = minX; x <= maxX + 1; x++) {
      const sx = ox + x * cs + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = minY; y <= maxY + 1; y++) {
      const sy = oy - y * cs + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, oy + 0.5);
    ctx.lineTo(w, oy + 0.5);
    ctx.moveTo(ox + 0.5, 0);
    ctx.lineTo(ox + 0.5, h);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('X', w - 16, oy - 6);
    ctx.fillText('Y', ox + 8, 14);

    const labelStep = cs >= 22 ? 1 : (cs >= 12 ? 2 : 5);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let x = minX; x <= maxX; x++) {
      if (x === 0 || x % labelStep !== 0) continue;
      ctx.fillText(String(x), ox + (x + 0.5) * cs, oy + 13);
    }
    ctx.textAlign = 'right';
    for (let y = minY; y <= maxY; y++) {
      if (y === 0 || y % labelStep !== 0) continue;
      ctx.fillText(String(y), ox - 5, oy - (y + 0.5) * cs + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillText('0', ox + 4, oy + 13);

    if (this.showIdeal && this.idealOverlay) {
      this._drawIdealOverlay(ctx, ox, oy, cs);
    }
  }

  _drawIdealOverlay(ctx, ox, oy, cs) {
    const { type, p } = this.idealOverlay;
    ctx.save();
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();

    if (type === 'line') {
      ctx.moveTo(ox + (p.x0 + 0.5) * cs, oy - (p.y0 + 0.5) * cs);
      ctx.lineTo(ox + (p.x1 + 0.5) * cs, oy - (p.y1 + 0.5) * cs);
    } else if (type === 'circle') {
      ctx.arc(ox + (p.cx + 0.5) * cs, oy - (p.cy + 0.5) * cs, p.r * cs, 0, Math.PI * 2);
    } else if (type === 'ellipse') {
      ctx.ellipse(ox + (p.cx + 0.5) * cs, oy - (p.cy + 0.5) * cs, p.rx * cs, p.ry * cs, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }
}