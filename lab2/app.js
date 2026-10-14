const fileInput = document.getElementById('fileInput');
const resultsBody = document.getElementById('resultsBody');
const tableContainer = document.getElementById('tableContainer');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    resultsBody.innerHTML = '';
    tableContainer.style.display = 'block';
    progressContainer.style.display = 'block';
    
    const totalFiles = files.length;
    let processedCount = 0;

    const worker = new Worker('worker.js');

    worker.onmessage = function(event) {
        const data = event.data;
        const row = document.createElement('tr');

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
                <td title="${data.fileName}">${data.fileName}</td>
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
                <td title="${data.fileName}">${data.fileName}</td>
                <td>${m.format}</td>
                <td>${m.razmer}</td>
                <td>${m.dpi}</td>
                <td>${m.glubina}</td>
                <td title="${m.szhatie}">${m.szhatie}</td>
                <td title="${m.dop}">${m.dop}</td>
                <td class="status-ok">Успешно</td>
            `;
        }

        resultsBody.appendChild(row);
        processedCount++;

        const percent = (processedCount / totalFiles) * 100;
        progressFill.style.width = percent + "%";
        progressStatus.textContent = processedCount + " / " + totalFiles + " файлов обработано";

        if (processedCount === totalFiles) {
            worker.terminate();
        }
    };

    files.forEach((file, index) => {
        worker.postMessage({ file: file, index: index });
    });
});
