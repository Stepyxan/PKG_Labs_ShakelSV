class ColorView {
    static inputMap = {
        X: ['x-num', 'x-slide'], Y: ['y-num', 'y-slide'], Z: ['z-num', 'z-slide'],
        L: ['l-num', 'l-slide'], A: ['a-num', 'a-slide'], B: ['b-num', 'b-slide'],
        H: ['h-num', 'h-slide'], hL: ['hlsl-num', 'hlsl-slide'], S: ['s-num', 's-slide']
    };

    static getSelectedSettings() {
        return {
            illuminant: document.getElementById('illuminant-select').value,
            strategy: document.getElementById('gamut-select').value
        };
    }

    static getValues(keys, isSlider) {
        return keys.map(k => {
            const id = this.inputMap[k][isSlider ? 1 : 0];
            return parseFloat(document.getElementById(id).value) / (isSlider ? 1000 : 1) || 0;
        });
    }

    static updateInterface(xyz, lab, hls, rgb, outOfBounds) {
        document.getElementById('warning').style.display = outOfBounds ? 'block' : 'none';

        let [r, g, b] = rgb.map(x => Math.round(x));
        document.getElementById('preview').style.backgroundColor = `rgb(${r},${g},${b})`;
        const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        document.getElementById('color-picker').value = hex;

        const set = (keys, data) => keys.forEach((k, i) => {
            document.getElementById(this.inputMap[k][0]).value = data[i].toFixed(3);
            document.getElementById(this.inputMap[k][1]).value = Math.round(data[i] * 1000);
        });

        set(['X', 'Y', 'Z'], xyz);
        set(['L', 'A', 'B'], lab);
        set(['H', 'hL', 'S'], hls);

        this.renderDynamicGradients(rgb, hls);
    }

    static renderDynamicGradients(rgb, hls) {
        const [h, l, s] = hls;
        document.getElementById('h-slide').style.background = 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)';
        document.getElementById('s-slide').style.background = `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`;
        document.getElementById('hlsl-slide').style.background = `linear-gradient(to right, black, hsl(${h}, ${s}%, 50%), white)`;
    }
}

class ColorController {
    constructor() {
        this.isUpdating = false;
        this.bindEvents();
        this.syncFromXyz([95.047, 100, 108.883], true);
    }

    syncFromXyz(xyz, forceUpdate = false, keepH = false) {
        if (this.isUpdating && !forceUpdate) return;
        this.isUpdating = true;

        const { illuminant, strategy } = ColorView.getSelectedSettings();

        const [r, g, b, warn] = ColorModel.xyzToRgb(...xyz, illuminant, strategy);
        const lab = ColorModel.xyzToLab(...xyz, illuminant);

        const oldH = parseFloat(document.getElementById('h-num').value) || 0;
        const hls = ColorModel.rgbToHls(r, g, b, keepH ? oldH : 0);

        ColorView.updateInterface(xyz, lab, hls, [r, g, b], warn);

        this.isUpdating = false;
    }

    bindEvents() {
        ['illuminant-select', 'gamut-select'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const xyz = ColorView.getValues(['X', 'Y', 'Z'], false);
                this.syncFromXyz(xyz, true);
            });
        });

        document.body.addEventListener('input', (e) => {
            if (this.isUpdating || e.target.id === 'color-picker') return;
            const id = e.target.id;
            const isSlider = id.includes('slide');
            const { illuminant } = ColorView.getSelectedSettings();

            if (id.startsWith('x') || id.startsWith('y') || id.startsWith('z')) {
                this.syncFromXyz(ColorView.getValues(['X', 'Y', 'Z'], isSlider));
            } else if (id.startsWith('l-') || id.startsWith('a-') || id.startsWith('b-')) {
                const lab = ColorView.getValues(['L', 'A', 'B'], isSlider);
                this.syncFromXyz(ColorModel.labToXyz(...lab, illuminant));
            } else if (id.startsWith('h') || id.startsWith('s')) {
                const hls = ColorView.getValues(['H', 'hL', 'S'], isSlider);
                const rgb = ColorModel.hlsToRgb(...hls);
                this.syncFromXyz(ColorModel.rgbToXyz(...rgb, illuminant));
            }
        });

        document.getElementById('color-picker').addEventListener('input', (e) => {
            const hex = e.target.value;
            const [r, g, b] = [1, 3, 5].map(p => parseInt(hex.slice(p, p + 2), 16));
            const { illuminant } = ColorView.getSelectedSettings();
            this.syncFromXyz(ColorModel.rgbToXyz(r, g, b, illuminant));
        });
    }
}

const colorApplication = new ColorController();
