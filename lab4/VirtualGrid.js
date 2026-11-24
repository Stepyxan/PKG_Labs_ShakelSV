class VirtualGrid {
  constructor(width, height) {
    this.width = width | 0;
    this.height = height | 0;
    this.halfW = (this.width >> 1);
    this.halfH = (this.height >> 1);
    this.buffer = new Float32Array(this.width * this.height);
    this.filledCount = 0;
  }

  setPixel(x, y, intensity = 1.0) {
    const gx = (x | 0) + this.halfW;
    const gy = (y | 0) + this.halfH;
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return;

    const idx = gy * this.width + gx;
    const clamped = intensity < 0 ? 0 : (intensity > 1 ? 1 : intensity);
    if (this.buffer[idx] === 0 && clamped > 0) {
      this.filledCount++;
    }
    if (clamped > this.buffer[idx]) {
      this.buffer[idx] = clamped;
    }
  }

  getPixel(x, y) {
    const gx = (x | 0) + this.halfW;
    const gy = (y | 0) + this.halfH;
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return 0;
    return this.buffer[gy * this.width + gx];
  }

  clear() {
    this.buffer.fill(0);
    this.filledCount = 0;
  }
}