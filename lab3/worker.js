importScripts('shared.js');

class IntegralImage {
    constructor(buffer, edgeMode, progressCallback) {
        this.width = buffer.width;
        this.height = buffer.height;
        this.edgeMode = edgeMode;
        this.sat = new Float64Array(this.width * this.height);
        this.sqSat = new Float64Array(this.width * this.height);
        this._compute(buffer, progressCallback);
    }
    _compute(buffer, progressCallback) {
        const data = buffer.data;
        for (let y = 0; y < this.height; y++) {
            let sum = 0, sqSum = 0;
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                const intensity = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                sum += intensity; 
                sqSum += intensity * intensity;
                const index = y * this.width + x;
                const topIndex = (y - 1) * this.width + x;
                if (y === 0) {
                    this.sat[index] = sum; 
                    this.sqSat[index] = sqSum;
                } else {
                    this.sat[index] = this.sat[topIndex] + sum;
                    this.sqSat[index] = this.sqSat[topIndex] + sqSum;
                }
            }
            if (y % 50 === 0 && progressCallback) progressCallback((y / this.height) * 20);
        }
    }
    _getAreaSum(array, x1, y1, x2, y2) {
        const ax1 = ImageBuffer.adjustCoord(x1, this.width, this.edgeMode);
        const ay1 = ImageBuffer.adjustCoord(y1, this.height, this.edgeMode);
        const ax2 = ImageBuffer.adjustCoord(x2, this.width, this.edgeMode);
        const ay2 = ImageBuffer.adjustCoord(y2, this.height, this.edgeMode);
        
        const minX = Math.min(ax1, ax2);
        const maxX = Math.max(ax1, ax2);
        const minY = Math.min(ay1, ay2);
        const maxY = Math.max(ay1, ay2);

        const A = (minX > 0 && minY > 0) ? array[(minY - 1) * this.width + (minX - 1)] : 0;
        const B = (minY > 0) ? array[(minY - 1) * this.width + maxX] : 0;
        const C = (minX > 0) ? array[maxY * this.width + (minX - 1)] : 0;
        const D = array[maxY * this.width + maxX];
        return D - B - C + A;
    }
    getStats(x, y, radius) {
        const x1 = x - radius, y1 = y - radius;
        const x2 = x + radius, y2 = y + radius;
        
        const count = (2 * radius + 1) * (2 * radius + 1);
        
        const sum = this._getAreaSum(this.sat, x1, y1, x2, y2);
        const sqSum = this._getAreaSum(this.sqSat, x1, y1, x2, y2);
        
        const mean = sum / count;
        const variance = (sqSum / count) - (mean * mean);
        const sigma = Math.sqrt(Math.max(0, variance));
        return { mean, sigma };
    }
}

class Filters {
    static _report(progressCallback, percent) {
        if (progressCallback) progressCallback(percent);
    }

    static linearContrast(buffer, params, progress) {
        const src = buffer.data;
        let min = 255, max = 0;
        for (let i = 0; i < src.length; i += 4) {
            const lum = 0.299 * src[i] + 0.587 * src[i+1] + 0.114 * src[i+2];
            if (lum < min) min = lum;
            if (lum > max) max = lum;
        }
        if (min >= max) return buffer.clone();

        const out = new ImageBuffer(buffer.width, buffer.height, new Uint8ClampedArray(src.length));
        const dst = out.data;
        const factor = 255 / (max - min);

        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                dst[i]   = (src[i]   - min) * factor;
                dst[i+1] = (src[i+1] - min) * factor;
                dst[i+2] = (src[i+2] - min) * factor;
                dst[i+3] = src[i+3];
            }
            if (y % 20 === 0) this._report(progress, (y / buffer.height) * 100);
        }
        return out;
    }

    static brightness(buffer, params, progress) {
        const src = buffer.data;
        const out = new ImageBuffer(buffer.width, buffer.height, new Uint8ClampedArray(src.length));
        const dst = out.data;
        const offset = params.offset;

        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                dst[i]   = src[i]   + offset;
                dst[i+1] = src[i+1] + offset;
                dst[i+2] = src[i+2] + offset;
                dst[i+3] = src[i+3];
            }
            if (y % 20 === 0) this._report(progress, (y / buffer.height) * 100);
        }
        return out;
    }

    static invert(buffer, params, progress) {
        const src = buffer.data;
        const out = new ImageBuffer(buffer.width, buffer.height, new Uint8ClampedArray(src.length));
        const dst = out.data;

        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                dst[i]   = 255 - src[i];
                dst[i+1] = 255 - src[i+1];
                dst[i+2] = 255 - src[i+2];
                dst[i+3] = src[i+3];
            }
            if (y % 20 === 0) this._report(progress, (y / buffer.height) * 100);
        }
        return out;
    }

    static gamma(buffer, params, progress) {
        const src = buffer.data;
        const out = new ImageBuffer(buffer.width, buffer.height, new Uint8ClampedArray(src.length));
        const dst = out.data;
        const invGamma = 1.0 / params.gamma;

        const lut = new Uint8ClampedArray(256);
        for (let v = 0; v < 256; v++) {
            lut[v] = 255 * Math.pow(v / 255, invGamma);
        }

        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                dst[i]   = lut[src[i]];
                dst[i+1] = lut[src[i+1]];
                dst[i+2] = lut[src[i+2]];
                dst[i+3] = src[i+3];
            }
            if (y % 20 === 0) this._report(progress, (y / buffer.height) * 100);
        }
        return out;
    }

    static _applySATThreshold(buffer, params, progress, thresholdCalc) {
        const src = buffer.data;
        const out = new ImageBuffer(buffer.width, buffer.height, new Uint8ClampedArray(src.length));
        const dst = out.data;
        const integral = new IntegralImage(buffer, params.edgeMode, progress);
        const r = Math.floor(params.windowSize / 2);

        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                const intensity = 0.299 * src[i] + 0.587 * src[i+1] + 0.114 * src[i+2];
                const stats = integral.getStats(x, y, r);
                const T = thresholdCalc(stats, params);
                const val = intensity >= T ? 255 : 0;
                dst[i]   = val;
                dst[i+1] = val;
                dst[i+2] = val;
                dst[i+3] = src[i+3];
            }
            if (y % 20 === 0) this._report(progress, 20 + (y / buffer.height) * 80);
        }
        return out;
    }

    static bradley(buffer, p, prog) { 
        return this._applySATThreshold(buffer, p, prog, s => s.mean * (1 - p.k / 100)); 
    }
    static niblack(buffer, p, prog) { 
        return this._applySATThreshold(buffer, p, prog, s => s.mean + p.k * s.sigma); 
    }
    static sauvola(buffer, p, prog) { 
        return this._applySATThreshold(buffer, p, prog, s => s.mean * (1 + p.k * (s.sigma / 128 - 1))); 
    }
}

onmessage = function(e) {
    const { id, algo, bufferObj, params } = e.data;
    const buffer = new ImageBuffer(bufferObj.width, bufferObj.height, bufferObj.data);
    const progressCallback = (val) => postMessage({ type: 'progress', value: Math.min(val, 100) });
    let result = buffer;
    if (Filters[algo]) result = Filters[algo](buffer, params, progressCallback);
    postMessage({
        type: 'done', id: id, result: { width: result.width, height: result.height, data: result.data.buffer }
    }, [result.data.buffer]);
};
