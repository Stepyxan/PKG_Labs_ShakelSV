class ImageMetaParser {
    
    static parse(buffer, rasshirenie, tailBytes) {
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        const ext = rasshirenie.toLowerCase();

        if (bytes.length < 12) {
            return { format: "Неизвестно", error: "Файл слишком мал" };
        }

        let realFormat = "UNKNOWN";

        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            realFormat = "PNG";
        } else if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
            realFormat = "BMP";
        } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
            realFormat = "JPEG";
        } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            realFormat = "GIF";
        } else if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A) || 
            (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x2A)) {
            realFormat = "TIFF";
        } else if (bytes[0] === 0x0A && bytes[1] <= 5 && bytes[2] <= 1) {
            realFormat = "PCX";
        }

        let expectedFormat = "";
        if (ext === "png") expectedFormat = "PNG";
        else if (ext === "bmp") expectedFormat = "BMP";
        else if (ext === "jpg" || ext === "jpeg") expectedFormat = "JPEG";
        else if (ext === "gif") expectedFormat = "GIF";
        else if (ext === "tif" || ext === "tiff") expectedFormat = "TIFF";
        else if (ext === "pcx") expectedFormat = "PCX";

        if (expectedFormat !== "" && expectedFormat !== realFormat) {
            return { format: realFormat + " / " + ext.toUpperCase(), error: "Подмена расширения" };
        }

        if (realFormat === "PNG") return this.parsePNG(view, bytes, tailBytes);
        if (realFormat === "BMP") return this.parseBMP(view, bytes);
        if (realFormat === "JPEG") return this.parseJPEG(view, bytes, tailBytes);
        if (realFormat === "GIF") return this.parseGIF(view, bytes);
        if (realFormat === "TIFF") return this.parseTIFF(view, bytes);
        if (realFormat === "PCX") return this.parsePCX(view, bytes);

        return { format: "Неизв. / " + ext.toUpperCase(), error: "Формат не поддерживается" };
    }

    static parsePNG(view, bytes, tailBytes) {
        if (view.getUint32(12) !== 0x49484452) {
            return { format: "PNG", error: "Файл поврежден (нет IHDR)" };
        }

        const shirina = view.getUint32(16);
        const vysota = view.getUint32(20);
        const bitDepth = view.getUint8(24);
        const colorType = view.getUint8(25);
        const filtr = view.getUint8(26);

        let glubina = bitDepth;
        if (colorType === 2) glubina = bitDepth * 3;
        if (colorType === 4) glubina = bitDepth * 2;
        if (colorType === 6) glubina = bitDepth * 4;
        let hasIEND = false;
        if (tailBytes) {
            const tailView = new DataView(tailBytes.buffer);
            for (let i = 0; i < 9; i++) {
                if (tailView.getUint32(i) === 0x49454E44) { hasIEND = true; break; }
            }
        } else {
            const len = bytes.length;
            for (let i = len - 12; i < len - 3; i++) {
                if (i >= 0 && view.getUint32(i) === 0x49454E44) { hasIEND = true; break; }
            }
        }

        if (!hasIEND) {
            return { format: "PNG", error: "Файл поврежден (нет IEND)" };
        }

        return {
            format: "PNG",
            razmer: shirina + "x" + vysota,
            dpi: "72",
            glubina: glubina,
            szhatie: "Deflate",
            dop: "Фильтрация: " + filtr
        };
    }

    static parseJPEG(view, bytes, tailBytes) {
        if (tailBytes) {
            if (tailBytes[10] !== 0xFF || tailBytes[11] !== 0xD9) {
                return { format: "JPEG", error: "Файл поврежден (нет EOI)" };
            }
        } else {
            const len = bytes.length;
            if (bytes[len - 2] !== 0xFF || bytes[len - 1] !== 0xD9) {
                return { format: "JPEG", error: "Файл поврежден (нет EOI)" };
            }
        }
        let offset = 2;
        const len = bytes.length;
        let shirina = 0;
        let vysota = 0;
        let glubina = 0;

        while (offset < len) {
            if (bytes[offset] !== 0xFF) {
                return { format: "JPEG", error: "Ошибка структуры" };
            }
            
            const marker = bytes[offset + 1];
            
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
                const precision = view.getUint8(offset + 4);
                const components = view.getUint8(offset + 9);
                glubina = precision * components;
                vysota = view.getUint16(offset + 5);
                shirina = view.getUint16(offset + 7);
                break;
            }
            offset += 2 + view.getUint16(offset + 2);
        }

        if (shirina === 0) {
            return { format: "JPEG", error: "Файл поврежден (нет SOF)" };
        }

        return {
            format: "JPEG",
            razmer: shirina + "x" + vysota,
            dpi: "72",
            glubina: glubina,
            szhatie: "JPEG",
            dop: "Матрица квантования"
        };
    }


    static parseBMP(view, bytes) {
        try {
            const shirina = view.getInt32(18, true);
            const vysota = Math.abs(view.getInt32(22, true));
            const glubina = view.getUint16(28, true);
            const compId = view.getUint32(30, true);
            const colorsUsed = view.getUint32(46, true);

            let szhatie = "BI_RGB";
            if (compId === 1) szhatie = "BI_RLE8";
            else if (compId === 2) szhatie = "BI_RLE4";
            else if (compId === 3) szhatie = "BI_BITFIELDS";

            const hResMeter = view.getInt32(38, true);
            let dpi = "72";
            if (hResMeter > 0) {
                dpi = Math.round(hResMeter * 0.0254).toString();
            }

            let dop = "Без палитры";
            if (glubina <= 8) {
                let colors = colorsUsed;
                if (colors === 0) {
                    colors = Math.pow(2, glubina);
                }
                dop = "Палитра: " + colors + " цв.";
            }

            return {
                format: "BMP",
                razmer: shirina + "x" + vysota,
                dpi: dpi,
                glubina: glubina,
                szhatie: szhatie,
                dop: dop
            };
        } catch (e) {
            return { format: "BMP", error: "Файл поврежден" };
        }
    }

    static parseGIF(view, bytes) {
        if (bytes[bytes.length - 1] !== 0x3B) {
            return { format: "GIF", error: "Файл поврежден (нет терминатора)" };
        }

        const shirina = view.getUint16(6, true);
        const vysota = view.getUint16(8, true);
        const packed = view.getUint8(10);
        
        const hasPalette = (packed & 0x80) !== 0;
        const glubina = ((packed >> 4) & 0x07) + 1;
        
        let dop = "Нет глобальной палитры";
        if (hasPalette) {
            const palSize = Math.pow(2, (packed & 0x07) + 1);
            dop = "Гл. палитра: " + palSize + " цв.";
        }

        return {
            format: "GIF",
            razmer: shirina + "x" + vysota,
            dpi: "72",
            glubina: glubina,
            szhatie: "LZW",
            dop: dop
        };
    }

    static parseTIFF(view, bytes) {
        const isLE = (bytes[0] === 0x49);
        
        try {
            let ifdOffset = view.getUint32(4, isLE);
            const entriesCount = view.getUint16(ifdOffset, isLE);
            let entryOffset = ifdOffset + 2;

            let shirina = 0;
            let vysota = 0;
            let glubina = 8;
            let compId = 1;

            for (let i = 0; i < entriesCount; i++) {
                const tag = view.getUint16(entryOffset, isLE);
                
                if (tag === 0x0100) shirina = this.readTiffTag(view, entryOffset, isLE);
                else if (tag === 0x0101) vysota = this.readTiffTag(view, entryOffset, isLE);
                else if (tag === 0x0102) glubina = this.readTiffTag(view, entryOffset, isLE);
                else if (tag === 0x0103) compId = this.readTiffTag(view, entryOffset, isLE);
                
                entryOffset += 12;
            }

            let szhatie = "None";
            if (compId === 2) szhatie = "CCITT RLE";
            else if (compId === 3) szhatie = "Group 3 Fax";
            else if (compId === 4) szhatie = "Group 4 Fax";
            else if (compId === 5) szhatie = "LZW";
            else if (compId === 6) szhatie = "JPEG";
            else if (compId === 32773) szhatie = "PackBits";

            return {
                format: "TIFF",
                razmer: shirina + "x" + vysota,
                dpi: "300",
                glubina: glubina,
                szhatie: szhatie,
                dop: "Тегов в IFD: " + entriesCount
            };
        } catch (e) {
            return { format: "TIFF", error: "Ошибка структуры IFD" };
        }
    }

    static readTiffTag(view, offset, isLE) {
        const type = view.getUint16(offset + 2, isLE);
        if (type === 3) return view.getUint16(offset + 8, isLE);
        if (type === 4) return view.getUint32(offset + 8, isLE);
        return 0;
    }

    static parsePCX(view, bytes) {
        try {
            const compCode = view.getUint8(2);
            const bpp = view.getUint8(3);
            const xMin = view.getUint16(4, true);
            const yMin = view.getUint16(6, true);
            const xMax = view.getUint16(8, true);
            const yMax = view.getUint16(10, true);

            const shirina = xMax - xMin + 1;
            const vysota = yMax - yMin + 1;
            const planes = view.getUint8(65);

            let szhatie = "None";
            if (compCode === 1) {
                szhatie = "RLE";
            }

            return {
                format: "PCX",
                razmer: shirina + "x" + vysota,
                dpi: "300",
                glubina: bpp * planes,
                szhatie: szhatie,
                dop: "Планов цвета: " + planes
            };
        } catch(e) {
            return { format: "PCX", error: "Ошибка заголовка" };
        }
    }
}
