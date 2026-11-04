class ImageBuffer {
    constructor(width, height, data) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(data);
    }
    static fromImageData(imgData) {
        return new ImageBuffer(imgData.width, imgData.height, imgData.data);
    }
    _getIndex(x, y) {
        return (y * this.width + x) * 4;
    }
    getPixel(x, y, edgeMode = 'clamp') {
        if (edgeMode === 'clamp') {
            x = Math.max(0, Math.min(x, this.width - 1));
            y = Math.max(0, Math.min(y, this.height - 1));
        } else if (edgeMode === 'reflect') {
            if (x < 0) x = -x; else if (x >= this.width) x = 2 * this.width - x - 1;
            if (y < 0) y = -y; else if (y >= this.height) y = 2 * this.height - y - 1;
        }
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