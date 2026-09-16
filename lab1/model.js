class ColorModel {
    static ILLUMINANTS = {
        D65: [95.047, 100.000, 108.883],
        D50: [96.422, 100.000, 82.521],
        E:   [100.000, 100.000, 100.000]
    };

    static sRGB_PRIMARIES = {
        r: [0.64, 0.33], g: [0.30, 0.60], b: [0.15, 0.06]
    };

    static getMatrices(illuminantKey) {
        const [xw, yw, zw] = this.ILLUMINANTS[illuminantKey];
        const Xw = xw / yw, Yw = 1.0, Zw = zw / yw;
        const r = this.sRGB_PRIMARIES.r, g = this.sRGB_PRIMARIES.g, b = this.sRGB_PRIMARIES.b;

        const M_xyz = [
            [r[0]/r[1], g[0]/g[1], b[0]/b[1]],
            [1.0, 1.0, 1.0],
            [(1-r[0]-r[1])/r[1], (1-g[0]-g[1])/g[1], (1-b[0]-b[1])/b[1]]
        ];

        const det = M_xyz[0][0]*(M_xyz[1][1]*M_xyz[2][2] - M_xyz[1][2]*M_xyz[2][1]) -
                    M_xyz[0][1]*(M_xyz[1][0]*M_xyz[2][2] - M_xyz[1][2]*M_xyz[2][0]) +
                    M_xyz[0][2]*(M_xyz[1][0]*M_xyz[2][1] - M_xyz[1][1]*M_xyz[2][0]);
        const invDet = 1.0 / det;

        const M_inv = [
            [(M_xyz[1][1]*M_xyz[2][2] - M_xyz[1][2]*M_xyz[2][1])*invDet, (M_xyz[0][2]*M_xyz[2][1] - M_xyz[0][1]*M_xyz[2][2])*invDet, (M_xyz[0][1]*M_xyz[1][2] - M_xyz[0][2]*M_xyz[1][1])*invDet],
            [(M_xyz[1][2]*M_xyz[2][0] - M_xyz[1][0]*M_xyz[2][2])*invDet, (M_xyz[0][0]*M_xyz[2][2] - M_xyz[0][2]*M_xyz[2][0])*invDet, (M_xyz[0][2]*M_xyz[1][0] - M_xyz[0][0]*M_xyz[1][2])*invDet],
            [(M_xyz[1][0]*M_xyz[2][1] - M_xyz[1][1]*M_xyz[2][0])*invDet, (M_xyz[0][1]*M_xyz[2][0] - M_xyz[0][0]*M_xyz[2][1])*invDet, (M_xyz[0][0]*M_xyz[1][1] - M_xyz[0][1]*M_xyz[1][0])*invDet]
        ];

        const Sr = M_inv[0][0]*Xw + M_inv[0][1]*Yw + M_inv[0][2]*Zw;
        const Sg = M_inv[1][0]*Xw + M_inv[1][1]*Yw + M_inv[1][2]*Zw;
        const Sb = M_inv[2][0]*Xw + M_inv[2][1]*Yw + M_inv[2][2]*Zw;

        const toXyz = [
            [M_xyz[0][0]*Sr, M_xyz[0][1]*Sg, M_xyz[0][2]*Sb],
            [M_xyz[1][0]*Sr, M_xyz[1][1]*Sg, M_xyz[1][2]*Sb],
            [M_xyz[2][0]*Sr, M_xyz[2][1]*Sg, M_xyz[2][2]*Sb]
        ];

        const detT = toXyz[0][0]*(toXyz[1][1]*toXyz[2][2] - toXyz[1][2]*toXyz[2][1]) -
                    toXyz[0][1]*(toXyz[1][0]*toXyz[2][2] - toXyz[1][2]*toXyz[2][0]) +
                    toXyz[0][2]*(toXyz[1][0]*toXyz[2][1] - toXyz[1][1]*toXyz[2][0]);
        const invDetT = 1.0 / detT;

        const toRgb = [
            [(toXyz[1][1]*toXyz[2][2] - toXyz[1][2]*toXyz[2][1])*invDetT, (toXyz[0][2]*toXyz[2][1] - toXyz[0][1]*toXyz[2][2])*invDetT, (toXyz[0][1]*toXyz[1][2] - toXyz[0][2]*toXyz[1][1])*invDetT],
            [(toXyz[1][2]*toXyz[2][0] - toXyz[1][0]*toXyz[2][2])*invDetT, (toXyz[0][0]*toXyz[2][2] - toXyz[0][2]*toXyz[2][0])*invDetT, (toXyz[0][2]*toXyz[1][0] - toXyz[0][0]*toXyz[1][2])*invDetT],
            [(toXyz[1][0]*toXyz[2][1] - toXyz[1][1]*toXyz[2][0])*invDetT, (toXyz[0][1]*toXyz[2][0] - toXyz[0][0]*toXyz[2][1])*invDetT, (toXyz[0][0]*toXyz[1][1] - toXyz[0][1]*toXyz[1][0])*invDetT]
        ];

        return { toXyz, toRgb };
    }

    static f = x => (x >= 0.008856) ? Math.pow(x, 1/3) : 7.787 * x + 16 / 116;
    static fInv = x => (x >= 0.008856) ? Math.pow(x, 3) : (x - 16 / 116) / 7.787;

    static labToXyz(l, a, b, illKey) {
        const [Xw, Yw, Zw] = this.ILLUMINANTS[illKey];
        const fy = (l + 16) / 116;
        return [this.fInv(a / 500 + fy) * Xw, this.fInv(fy) * Yw, this.fInv(fy - b / 200) * Zw];
    }

    static xyzToLab(x, y, z, illKey) {
        const [Xw, Yw, Zw] = this.ILLUMINANTS[illKey];
        const [fx, fy, fz] = [this.f(x / Xw), this.f(y / Yw), this.f(z / Zw)];
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    }

    static xyzToRgb(x, y, z, illKey, strategy) {
        const matrices = this.getMatrices(illKey);
        const X = x / 100, Y = y / 100, Z = z / 100;

        let r_l = matrices.toRgb[0][0]*X + matrices.toRgb[0][1]*Y + matrices.toRgb[0][2]*Z;
        let g_l = matrices.toRgb[1][0]*X + matrices.toRgb[1][1]*Y + matrices.toRgb[1][2]*Z;
        let b_l = matrices.toRgb[2][0]*X + matrices.toRgb[2][1]*Y + matrices.toRgb[2][2]*Z;

        const gamma = v => (v >= 0.0031308) ? (1.055 * Math.pow(v, 1/2.4) - 0.055) : (12.92 * v);
        let r = gamma(r_l), g = gamma(g_l), b = gamma(b_l);

        const eps = 0.03;
        const outOfBounds = (r < -eps || r > 1 + eps || g < -eps || g > 1 + eps || b < -eps || b > 1 + eps);

        if (strategy === 'scaling' && outOfBounds) {
            const minVal = Math.min(r, g, b, 0);
            const maxVal = Math.max(r, g, b, 1);
            const range = maxVal - minVal;
            r = (r - minVal) / range;
            g = (g - minVal) / range;
            b = (b - minVal) / range;
        } else {
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
        }

        return [r * 255, g * 255, b * 255, outOfBounds];
    }

    static rgbToXyz(r, g, b, illKey) {
        const matrices = this.getMatrices(illKey);
        const degamma = c => (c >= 0.04045) ? Math.pow((c + 0.055) / 1.055, 2.4) : (c / 12.92);
        const R = degamma(r / 255), G = degamma(g / 255), B = degamma(b / 255);
        return [
            (matrices.toXyz[0][0]*R + matrices.toXyz[0][1]*G + matrices.toXyz[0][2]*B) * 100,
            (matrices.toXyz[1][0]*R + matrices.toXyz[1][1]*G + matrices.toXyz[1][2]*B) * 100,
            (matrices.toXyz[2][0]*R + matrices.toXyz[2][1]*G + matrices.toXyz[2][2]*B) * 100
        ];
    }

    static rgbToHls(r, g, b, currentH = 0) {
        let R = r / 255, G = g / 255, B = b / 255;
        let max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
        let l = (max + min) / 2;
        let s = d === 0 ? 0 : (l <= 0.5 ? d / (max + min) : d / (2 - max - min));

        if (d < 1e-4) {
            return [currentH, l * 100, s * 100];
        }

        let h = 0;
        if (max === R) h = 60 * (((G - B) / d) % 6);
        else if (max === G) h = 60 * (((B - R) / d) + 2);
        else if (max === B) h = 60 * (((R - G) / d) + 4);

        if (h < 0) h += 360;
        return [h, l * 100, s * 100];
    }

    static hlsToRgb(h, l, s) {
        let [H, L, S] = [h / 360, l / 100, s / 100];
        if (S === 0) return [L*255, L*255, L*255];
        let q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q;

        const qh = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        return [qh(p, q, H + 1/3)*255, qh(p, q, H)*255, qh(p, q, H - 1/3)*255];
    }
}
