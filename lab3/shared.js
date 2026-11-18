class ImageBuffer {
    constructor(width, height, data) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(data);
    }
    static fromImageData(imgData) {
        return new ImageBuffer(imgData.width, imgData.height, imgData.data);
    }
    static adjustCoord(val, max, mode) {
        if (max <= 1) return 0;
        if (mode === 'clamp') {
            return Math.max(0, Math.min(val, max - 1));
        } else if (mode === 'reflect') {
            while (val < 0 || val >= max) {
                if (val < 0) val = -val;
                if (val >= max) val = 2 * max - val - 1;
            }
            return val;
        }
        return val;
    }
    _getIndex(x, y) {
        return (y * this.width + x) * 4;
    }
    getPixel(x, y, edgeMode = 'clamp') {
        x = ImageBuffer.adjustCoord(x, this.width, edgeMode);
        y = ImageBuffer.adjustCoord(y, this.height, edgeMode);
        const i = this._getIndex(x, y);
        return [this.data[i], this.data[i+1], this.data[i+2], this.data[i+3]];
    }
    setPixel(x, y, r, g, b, a = 255) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const i = this._getIndex(x, y);
            this.data[i] = r; this.data[i+1] = g; this.data[i+2] = b; this.data[i+3] = a;
        }
    }
    clone() {
        return new ImageBuffer(this.width, this.height, new Uint8ClampedArray(this.data));
    }
}
