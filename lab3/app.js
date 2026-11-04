const ui = {
    canvasBef: document.getElementById('canvasBefore'),
    canvasAft: document.getElementById('canvasAfter'),
    histBef: document.getElementById('histBefore'),
    histAft: document.getElementById('histAfter'),
    phBef: document.getElementById('placeholderBefore'),
    phAft: document.getElementById('placeholderAfter'),
    algoSelect: document.getElementById('algorithm'),
    edgeModeSelect: document.getElementById('edgeMode'),
    edgeModeGroup: document.getElementById('edgeModeGroup'),
    paramsContainer: document.getElementById('params-container'),
    processBtn: document.getElementById('processBtn'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressLabel: document.getElementById('progressLabel'),
    progressPercent: document.getElementById('progressPercent'),
    spinner: document.getElementById('spinner'),
    upload: document.getElementById('upload')
};

let originalBuffer = null;
let currentWorker = null;

const algoConfigs = {
    linearContrast: [],
    bradley: [
        { id: 'windowSize', label: 'Размер окна', min: 3, max: 101, step: 2, default: 15 },
        { id: 'k', label: 'Смещение (T)', min: 0, max: 50, step: 1, default: 15 }
    ],
    niblack: [
        { id: 'windowSize', label: 'Размер окна', min: 3, max: 101, step: 2, default: 15 },
        { id: 'k', label: 'Коэффициент k', min: -1.0, max: 1.0, step: 0.1, default: -0.2 }
    ],
    sauvola: [
        { id: 'windowSize', label: 'Размер окна', min: 3, max: 101, step: 2, default: 15 },
        { id: 'k', label: 'Коэффициент k', min: 0, max: 1.0, step: 0.1, default: 0.5 }
    ]
};

function updateParamsUI() {
    ui.paramsContainer.innerHTML = '';
    const config = algoConfigs[ui.algoSelect.value] || [];
    
    if (ui.algoSelect.value === 'linearContrast') {
        ui.edgeModeGroup.style.display = 'none';
    } else {
        ui.edgeModeGroup.style.display = 'flex';
    }

    config.forEach(param => {
        const group = document.createElement('div');
        group.className = 'param-group';
        
        const header = document.createElement('div');
        header.className = 'param-header';
        
        const label = document.createElement('span');
        label.textContent = param.label;
        
        const valDisplay = document.createElement('span');
        valDisplay.className = 'param-val';
        valDisplay.textContent = param.default;
        valDisplay.id = `val_${param.id}`;
        
        header.appendChild(label);
        header.appendChild(valDisplay);
        
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `param_${param.id}`;
        Object.assign(input, { min: param.min, max: param.max, step: param.step, value: param.default });
        
        input.oninput = () => {
            document.getElementById(`val_${param.id}`).textContent = input.value;
        };
        
        group.appendChild(header);
        group.appendChild(input);
        ui.paramsContainer.appendChild(group);
    });
}

ui.algoSelect.addEventListener('change', updateParamsUI);
updateParamsUI();

function drawHistogram(imageData, canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const hist = new Uint32Array(256);
    let max = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        const lum = Math.round(0.299*imageData.data[i] + 0.587*imageData.data[i+1] + 0.114*imageData.data[i+2]);
        hist[lum]++;
        if (hist[lum] > max) max = hist[lum];
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#93c5fd');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, h);
    
    for (let i = 0; i < 256; i++) {
        const pct = hist[i] / max;
        const x = i * (w / 256);
        const y = h - (pct * h);
        ctx.lineTo(x, y);
        ctx.lineTo(x + (w/256), y);
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
}

function displayImage(buffer, canvas, histCanvas, placeholder) {
    canvas.width = buffer.width; 
    canvas.height = buffer.height;
    const ctx = canvas.getContext('2d');
    const imgData = new ImageData(buffer.data, buffer.width, buffer.height);
    ctx.putImageData(imgData, 0, 0);
    
    canvas.style.display = 'block';
    placeholder.style.display = 'none';
    
    drawHistogram(imgData, histCanvas);
}

ui.upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    ui.progressLabel.textContent = "Загрузка изображения...";
    ui.processBtn.disabled = true;
    
    const img = new Image();
    img.onload = () => {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = img.width; tmpCanvas.height = img.height;
        const ctx = tmpCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        originalBuffer = ImageBuffer.fromImageData(ctx.getImageData(0, 0, img.width, img.height));
        
        displayImage(originalBuffer, ui.canvasBef, ui.histBef, ui.phBef);
        
        ui.canvasAft.style.display = 'none';
        ui.phAft.style.display = 'block';
        ui.phAft.textContent = "Готово к обработке";
        ui.histAft.getContext('2d').clearRect(0, 0, ui.histAft.width, ui.histAft.height);
        
        ui.processBtn.disabled = false;
        ui.progressLabel.textContent = "Изображение загружено. Выберите алгоритм.";
    };
    img.src = URL.createObjectURL(file);
});

ui.processBtn.addEventListener('click', () => {
    if (!originalBuffer) return;
    if (currentWorker) currentWorker.terminate();
    
    ui.processBtn.disabled = true;
    ui.processBtn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Обработка...';
    
    ui.progressBarFill.style.width = '0%';
    ui.progressBarFill.classList.remove('success');
    ui.progressPercent.textContent = '0%';
    ui.progressLabel.textContent = 'Обработка изображения...';
    ui.spinner.style.display = 'inline-block';
    
    ui.canvasAft.style.display = 'none';
    ui.phAft.style.display = 'block';
    ui.phAft.textContent = "Идет вычисление...";

    currentWorker = new Worker('worker.js');
    
    const params = {
        edgeMode: ui.edgeModeSelect.value
    };
    
    const config = algoConfigs[ui.algoSelect.value] || [];
    config.forEach(p => params[p.id] = Number(document.getElementById(`param_${p.id}`).value));
    
    currentWorker.onmessage = (e) => {
        if (e.data.type === 'progress') {
            const val = Math.round(e.data.value);
            ui.progressBarFill.style.width = `${val}%`;
            ui.progressPercent.textContent = `${val}%`;
        } else if (e.data.type === 'done') {
            const resBuffer = new ImageBuffer(e.data.result.width, e.data.result.height, new Uint8ClampedArray(e.data.result.data));
            displayImage(resBuffer, ui.canvasAft, ui.histAft, ui.phAft);
            
            ui.progressBarFill.style.width = '100%';
            ui.progressBarFill.classList.add('success');
            ui.progressPercent.textContent = '100%';
            ui.progressLabel.textContent = 'Обработка завершена';
            ui.spinner.style.display = 'none';
            
            ui.processBtn.disabled = false;
            ui.processBtn.innerHTML = '<i class="fa-solid fa-play"></i> Обработать';
        }
    };
    
    const clonedData = new Uint8ClampedArray(originalBuffer.data);
    currentWorker.postMessage({
        id: Date.now(),
        algo: ui.algoSelect.value,
        bufferObj: { width: originalBuffer.width, height: originalBuffer.height, data: clonedData },
        params: params
    });
});