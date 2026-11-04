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
        for (let y = 0; y < this.height; y++) {
            let sum = 0, sqSum = 0;
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                const intensity = 0.299 * buffer.data[i] + 0.587 * buffer.data[i+1] + 0.114 * buffer.data[i+2];
                sum += intensity; sqSum += intensity * intensity;
                const index = y * this.width + x, topIndex = (y - 1) * this.width + x;
                if (y === 0) {
                    this.sat[index] = sum; this.sqSat[index] = sqSum;
                } else {
                    this.sat[index] = this.sat[topIndex] + sum;
                    this.sqSat[index] = this.sqSat[topIndex] + sqSum;
                }
            }
            if (y % 50 === 0 && progressCallback) progressCallback((y / this.height) * 20);
        }
    }
    
    _getAdjustedCoord(val, max, mode) {
        if (mode === 'clamp') {
            return Math.max(0, Math.min(val, max - 1));
        } else if (mode === 'reflect') {
            if (val < 0) return -val;
            if (val >= max) return 2 * max - val - 1;
            return val;
        }
        return val;
    }

    _getAreaSum(array, x1, y1, x2, y2) {
        const ax1 = this._getAdjustedCoord(x1, this.width, this.edgeMode);
        const ay1 = this._getAdjustedCoord(y1, this.height, this.edgeMode);
        const ax2 = this._getAdjustedCoord(x2, this.width, this.edgeMode);
        const ay2 = this._getAdjustedCoord(y2, this.height, this.edgeMode);
        
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
        if(progressCallback) progressCallback(percent);
    }
    static linearContrast(buffer, params, progress) {
        let min = 255, max = 0;
        for (let i = 0; i < buffer.data.length; i += 4) {
            let int = 0.299*buffer.data[i] + 0.587*buffer.data[i+1] + 0.114*buffer.data[i+2];
            if (int < min) min = int; if (int > max) max = int;
        }
        if (min >= max) return buffer;
        const out = buffer.clone();
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const [r, g, b, a] = buffer.getPixel(x, y);
                const scale = (v) => ((v - min) / (max - min)) * 255;
                out.setPixel(x, y, scale(r), scale(g), scale(b), a);
            }
            if (y % 20 === 0) this._report(progress, (y/buffer.height)*100);
        }
        return out;
    }
    static _applySATThreshold(buffer, params, progress, thresholdCalc) {
        const out = buffer.clone();
        const integral = new IntegralImage(buffer, params.edgeMode, progress);
        const r = Math.floor(params.windowSize / 2);
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const i = (y * buffer.width + x) * 4;
                const int = 0.299*buffer.data[i] + 0.587*buffer.data[i+1] + 0.114*buffer.data[i+2];
                const stats = integral.getStats(x, y, r);
                const T = thresholdCalc(stats, params);
                const val = int >= T ? 255 : 0;
                out.setPixel(x, y, val, val, val, buffer.data[i+3]);
            }
            if (y % 20 === 0) this._report(progress, 20 + (y/buffer.height)*80);
        }
        return out;
    }
    static bradley(buffer, p, prog) { return this._applySATThreshold(buffer, p, prog, s => s.mean - p.k); }
    static niblack(buffer, p, prog) { return this._applySATThreshold(buffer, p, prog, s => s.mean + p.k * s.sigma); }
    static sauvola(buffer, p, prog) { return this._applySATThreshold(buffer, p, prog, s => s.mean * (1 + p.k * (s.sigma/128 - 1))); }
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