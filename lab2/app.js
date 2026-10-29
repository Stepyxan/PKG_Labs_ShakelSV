const fileInput = document.getElementById('fileInput');
const resultsBody = document.getElementById('resultsBody');
const tableContainer = document.getElementById('tableContainer');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');


let currentWorker = null;

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const widthInput = document.getElementById('userWidthCm').value;
    const userWidthCm = widthInput ? parseFloat(widthInput) : null;

    if (currentWorker) {
        currentWorker.terminate();
    }

    resultsBody.innerHTML = '';
    tableContainer.style.display = 'block';
    progressContainer.style.display = 'block';
    
    const totalFiles = files.length;
    let processedCount = 0;
    
    let currentIndex = 0;
    const fragment = document.createDocumentFragment();

    currentWorker = new Worker('worker.js');

    currentWorker.onmessage = function(event) {
        const data = event.data;
        const row = document.createElement('tr');

        const tempDiv = document.createElement('div');
        tempDiv.textContent = data.fileName;
        const safeFileName = tempDiv.innerHTML;

        if (!data.success || data.meta.error) {
            let fmt = "Неизвестно";
            if (data.meta) {
                fmt = data.meta.format;
            }
            let errText = "Ошибка чтения";
            if (data.error) {
                errText = data.error;
            } else if (data.meta && data.meta.error) {
                errText = data.meta.error;
            }

            row.innerHTML = `
                <td title="${safeFileName}">${safeFileName}</td>
                <td>${fmt}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td class="status-damaged" title="${errText}">Ошибка</td>
            `;
        } else {
            const m = data.meta;
            row.innerHTML = `
                <td title="${safeFileName}">${safeFileName}</td>
                <td>${m.format}</td>
                <td>${m.razmer}</td>
                <td>${m.dpi}</td>
                <td>${m.glubina}</td>
                <td title="${m.szhatie}">${m.szhatie}</td>
                <td title="${m.dop}">${m.dop}</td>
                <td class="status-ok">Успешно</td>
            `;
        }

        fragment.appendChild(row);
        processedCount++;

        if (processedCount % 50 === 0 || processedCount === totalFiles) {
            resultsBody.appendChild(fragment);
            progressFill.style.width = (processedCount / totalFiles) * 100 + "%";
            progressStatus.textContent = processedCount + " / " + totalFiles + " файлов обработано";
        }

        if (processedCount === totalFiles) {
            currentWorker.terminate();
        } else {
            processNext();
        }
    };

function processNext() {
        if (currentIndex < totalFiles) {
            currentWorker.postMessage({ 
                file: files[currentIndex], 
                index: currentIndex,
                userWidthCm: userWidthCm
            });
            currentIndex++;
        }
    }

    processNext();
});