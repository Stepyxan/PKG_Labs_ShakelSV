function tests() {
    console.log("Запуск тестов...");

    // Тест 1
    const hls = ColorModel.rgbToHls(255, 0, 0);
    console.assert(hls[0] === 0 && Math.abs(hls[1] - 50) < 0.1 && Math.abs(hls[2] - 100) < 0.1, 
        "Ошибка в rgbToHls для красного", hls);

    // Тест 2
    const hlsGreen = ColorModel.rgbToHls(0, 255, 0);
    console.assert(Math.abs(hlsGreen[0] - 120) < 0.1 && Math.abs(hlsGreen[1] - 50) < 0.1 && Math.abs(hlsGreen[2] - 100) < 0.1, 
        "Ошибка в rgbToHls для зелёного", hlsGreen);

    // Тест 3
    const hlsBlue = ColorModel.rgbToHls(0, 0, 255);
    console.assert(Math.abs(hlsBlue[0] - 240) < 0.1 && Math.abs(hlsBlue[1] - 50) < 0.1 && Math.abs(hlsBlue[2] - 100) < 0.1, 
        "Ошибка в rgbToHls для синего", hlsBlue);

    // Тест 4
    const rgb = ColorModel.hlsToRgb(0, 50, 100);
    console.assert(Math.abs(rgb[0] - 255) < 1 && Math.abs(rgb[1]) < 1 && Math.abs(rgb[2]) < 1, 
        "Ошибка в hlsToRgb", rgb);

    // Тест 5
    const xyz = ColorModel.rgbToXyz(255, 0, 0, 'D65');
    console.assert(Math.abs(xyz[0] - 41.24) < 0.1, "Ошибка в X для RGB(255, 0, 0)", xyz);
    console.assert(Math.abs(xyz[1] - 21.26) < 0.1, "Ошибка в Y для RGB(255, 0, 0)", xyz);

    // Тест 6
    const lab = ColorModel.xyzToLab(95.047, 100, 108.883, 'D65');
    console.assert(Math.abs(lab[0] - 100) < 0.1 && Math.abs(lab[1]) < 0.1 && Math.abs(lab[2]) < 0.1, 
        "Ошибка в xyzToLab для белого D65", lab);

    // Тест 7
    const xyzBack = ColorModel.labToXyz(100, 0, 0, 'D65');
    console.assert(Math.abs(xyzBack[0] - 95.047) < 0.1 && Math.abs(xyzBack[1] - 100) < 0.1 && Math.abs(xyzBack[2] - 108.883) < 0.1, 
        "Ошибка в labToXyz для белого", xyzBack);

    // Тест 8
    const xyzRound = ColorModel.rgbToXyz(128, 64, 200, 'D65');
    const rgbRound = ColorModel.xyzToRgb(...xyzRound, 'D65', 'clipping');
    console.assert(Math.abs(rgbRound[0] - 128) < 1 && Math.abs(rgbRound[1] - 64) < 1 && Math.abs(rgbRound[2] - 200) < 1, 
        "Ошибка в round-trip RGB→XYZ→RGB", rgbRound);

    // Тест 9
    const matD65 = ColorModel.getMatrices('D65').toXyz;
    const matD50 = ColorModel.getMatrices('D50').toXyz;
    console.assert(Math.abs(matD65[0][0] - matD50[0][0]) > 0.01, 
        "Матрицы D65 и D50 одинаковы — пересчёт не работает", matD50);

    console.log("Тесты пройдены");
}

tests();
