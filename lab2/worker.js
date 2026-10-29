self.importScripts('parser.js');

self.onmessage = async function(e) {
    const file = e.data.file;
    const index = e.data.index;
    const userWidthCm = e.data.userWidthCm;
    try {
        const dotIndex = file.name.lastIndexOf('.');
        let ext = "";
        if (dotIndex !== -1) {
            ext = file.name.slice(dotIndex + 1);
        }

        let headBuffer = null;

        if (ext.toLowerCase() === 'tif' || ext.toLowerCase() === 'tiff') {
            headBuffer = await file.arrayBuffer();
        } else {
            const headSlice = file.slice(0, 65536); 
            headBuffer = await headSlice.arrayBuffer();
        }
        
        let tailBytes = null;
        if (file.size > 65536) {
            const tailSlice = file.slice(file.size - 12, file.size);
            const tailBuffer = await tailSlice.arrayBuffer();
            tailBytes = new Uint8Array(tailBuffer);
        }
        
        const meta = ImageMetaParser.parse(headBuffer, ext, tailBytes, userWidthCm);
        
        self.postMessage({
            success: true,
            index: index,
            fileName: file.name,
            meta: meta
        });
    } catch (err) {
        self.postMessage({
            success: false,
            index: index,
            fileName: file.name,
            error: "Ошибка чтения диска"
        });
    }
};
