import {rowHeight} from '../app/constants';
import {Matrix} from '../app/modules/SwatchMatrix';

const prefix = 'NK';
const rootName = 'Palette' as String;
const swatchWidth = 188;
const swatchHeight = 188;
const rowGutter = 40;
const colGutter = 268;
const localPaintStyles = figma.getLocalPaintStyles();
const styleNames = localPaintStyles.map((style) => style.name);

let offsetX = 0;
let offsetY = 0;

export const hasChildren = (node: BaseNode): node is BaseNode & ChildrenMixin => Boolean(node['children']);
const zeroPad = (num, places) => String(num).padStart(places, '0');

const loadFonts = async () => {
    await figma.loadFontAsync({family: 'Inter', style: 'Regular'});
    await figma.loadFontAsync({family: 'Inter', style: 'Bold'});
    await figma.loadFontAsync({family: 'Poppins', style: 'Regular'});
    await figma.loadFontAsync({family: 'Poppins', style: 'Medium'});
};

figma.showUI(__html__);

figma.ui.onmessage = async (msg) => {
    loadFonts().then(() => {
        if (msg.type === 'import-gcs') {
            let grid = msg.data as Matrix.Grid;

            if (!paintStyleExists(grid)) {
                DJPopulateFigmaColorStyles(grid);
                createPaintStyleEffects();
                createPaintStylesBW();
            } else {
                updateFigmaColorStyles(grid);
                updateFigmaSwatchLabels(grid);
            }
        }

        figma.closePlugin();
    });
};

function DJPopulateFigmaColorStyles(grid: Matrix.Grid) {
    const nodes = [];
    grid.columns.forEach(function (column, colIdx, colArray) {
        column.rows.forEach(function (swatch, rowIdx) {
            nodes.push(createSwatchFrame(swatch, createPaintStyle(swatch), offsetX, offsetY));
            nodes.push(createSwatchLabelDescription(swatch, offsetX, offsetY + 212));
            nodes.push(createSwatchLabelHex(swatch, offsetX, offsetY + 259));
            offsetX = offsetX + swatchHeight + rowGutter;
        });

        offsetX = 0;
        offsetY = offsetY + swatchWidth + colGutter;
    });

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
}

function updateSwatchLabel(swatch: Matrix.Swatch) {
    let name = createFrameName(swatch);
    let frameNode = figma.currentPage.findOne((n) => n.name === name) as FrameNode;
    console.log('MY FRAME NODE CHILDREN IS ', frameNode.children);
    let jjj = frameNode.children[0] as TextNode;
    jjj.characters = 'HELLO';

    if (frameNode.children !== undefined) {
        let q = frameNode.children[0] as unknown;
        let r = q as TextNode;

        let label = swatch.hex.toUpperCase();
        if (swatch.isUserDefined) label = '⭐️ ' + label;
        if (swatch.isPinned) label = '📍 ' + label;
        r.characters = label;

        r.name = r.characters + ' (L*' + swatch.lightness + ')';
        r.fills =
            swatch.WCAG2_W_45 || swatch.WCAG2_W_30
                ? [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}]
                : [{type: 'SOLID', color: {r: 0, g: 0, b: 0}}];
        r.fontName =
            swatch.WCAG2_W_30 && !swatch.WCAG2_W_45
                ? {family: 'Inter', style: 'Bold'}
                : {family: 'Inter', style: 'Regular'};
        return r;
    } else {
        console.log('something undefined!', name);
    }
}

function updateFigmaColorStyles(grid: Matrix.Grid) {
    grid.columns.forEach(function (column) {
        column.rows.forEach(function (swatch) {
            let name = createPaintStyleName(swatch);
            let paintStyles = getPaintStyleByName(name);
            let paintStyle = paintStyles[0];

            updatePaintStyle(swatch, paintStyle);
        });
    });
}

function updateFigmaSwatchLabels(grid: Matrix.Grid) {
    grid.columns.forEach(function (column) {
        column.rows.forEach(function (swatch) {
            // updateSwatchLabel(swatch);
            // let name = createFrameName(swatch);
            let name = createSwatchLabelHexName(swatch);
            let textNode = figma.currentPage.findOne((n) => n.name === name) as TextNode;
            if (textNode !== undefined) textNode.characters = createSwatchLabelHexContent(swatch);

            // console.log('MY FRAME NODE CHILDREN IS ', frameNode);
        });
    });
}

function populateFigmaColorStyles(grid: Matrix.Grid) {
    const nodes = [];

    let offsetX = swatchWidth / 2;
    let offsetY = 0;

    grid.columns.forEach(function (column, colIdx, colArray) {
        console.log(colIdx);
        nodes.push(createSemanticLabel(column, offsetX));

        column.rows.forEach(function (swatch, rowIdx) {
            if (colIdx === 0) {
                nodes.push(createWeightLabel(swatch, offsetY));
            }
            nodes.push(createSwatchFrame(swatch, createPaintStyle(swatch), offsetX, offsetY));
            if (colIdx + 1 === colArray.length) {
                nodes.push(createTargetLabel(grid.columns[0].rows[rowIdx], offsetX, offsetY));
            }

            offsetY = offsetY + swatchHeight;
        });

        offsetX = offsetX + swatchWidth;
        offsetY = 0;
    });

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
}

function getPaintStyleByName(name: string) {
    var r = localPaintStyles.filter((obj) => {
        return obj.name === name;
    });
    return r;
}

function paintStyleExists(grid: Matrix.Grid) {
    let swatch = grid.columns[0].rows[0];
    let painStyleName = createPaintStyleName(swatch);
    return styleNames.includes(painStyleName) ? true : false;
}

function updatePaintStyle(swatch: Matrix.Swatch, style: PaintStyle) {
    const r = style;
    r.description = createPaintStyleDescription(swatch);
    r.paints = [{type: 'SOLID', color: hexToRgb(swatch.hex)}];
    return r;
}

function createPaintStyle(swatch: Matrix.Swatch) {
    const r = figma.createPaintStyle();
    r.name = createPaintStyleName(swatch);
    r.description = createPaintStyleDescription(swatch);
    r.paints = [{type: 'SOLID', color: hexToRgb(swatch.hex)}];
    return r;
}

function createPaintStylesBW() {
    offsetX = 0;
    offsetY = offsetY + swatchWidth + colGutter;

    const k = figma.createPaintStyle();
    k.name = createBaseName() + '/' + 'neutral' + '/' + 'b&w' + '/' + 'black';
    k.paints = [{type: 'SOLID', color: hexToRgb('#000000')}];

    const r = figma.createFrame();
    r.name = 'black';
    r.fillStyleId = k.id;
    r.cornerRadius = 1000;
    r.resize(swatchWidth, swatchHeight);

    let swatch = new Matrix.Swatch();
    swatch.semantic = r.name;
    swatch.id = 'K' + '100';
    swatch.weight = '';
    swatch.name = r.name + '100' + 'a';
    swatch.isUserDefined = false;
    swatch.isPinned = false;
    swatch.hex = '#000000';

    createSwatchLabelDescription(swatch, offsetX, offsetY + 212);
    createSwatchLabelHex(swatch, offsetX, offsetY + 259);

    r.x = offsetX;
    r.y = offsetY;
    offsetX = offsetX + swatchHeight + rowGutter;

    const w = figma.createPaintStyle();
    w.name = createBaseName() + '/' + 'neutral' + '/' + 'b&w' + '/' + 'white';
    w.paints = [{type: 'SOLID', color: hexToRgb('#FFFFFF')}];
    const rw = figma.createFrame();
    rw.name = 'white';
    rw.fillStyleId = w.id;
    rw.cornerRadius = 1000;
    rw.resize(swatchWidth, swatchHeight);

    swatch = new Matrix.Swatch();
    swatch.semantic = rw.name;
    swatch.id = 'W' + '100';
    swatch.weight = '';
    swatch.name = rw.name + '100' + 'a';
    swatch.isUserDefined = false;
    swatch.isPinned = false;
    swatch.hex = '#FFFFFF';

    createSwatchLabelDescription(swatch, offsetX, offsetY + 212);
    createSwatchLabelHex(swatch, offsetX, offsetY + 259);

    rw.x = offsetX;
    rw.y = offsetY;
    offsetX = offsetX + swatchHeight + rowGutter;
}

function createBaseName() {
    if (prefix.length) {
        return prefix + '-' + rootName;
    }
    return rootName;
}

function createPaintStyleEffects() {
    let alphas = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95];

    alphas.forEach((alpha) => {
        const colorName = 'black';
        const style = figma.createPaintStyle();
        style.name = createBaseName() + '/' + 'alpha' + '/' + colorName + '/' + colorName + zeroPad(alpha, 2) + 'a';
        style.paints = [{type: 'SOLID', opacity: alpha / 100, color: hexToRgb('#000000')}];
        style.description = 'black (' + alpha + '% opacity)';

        const r = figma.createFrame();
        r.name = colorName + zeroPad(alpha, 2) + 'a';
        r.fillStyleId = style.id;
        r.cornerRadius = 1000;
        r.resize(swatchWidth, swatchHeight);

        let swatch = new Matrix.Swatch();
        swatch.semantic = colorName;
        swatch.id = 'K' + alpha;
        swatch.alpha = alpha;
        swatch.weight = zeroPad(alpha, 2) + 'a';
        swatch.name = colorName + zeroPad(alpha, 2) + 'a';
        swatch.isUserDefined = false;
        swatch.isPinned = false;
        swatch.hex = '#000000';

        createSwatchLabelDescription(swatch, offsetX, offsetY + 212);
        createSwatchLabelHex(swatch, offsetX, offsetY + 259);

        r.x = offsetX;
        r.y = offsetY;

        offsetX = offsetX + swatchHeight + rowGutter;
    });

    offsetX = 0;
    offsetY = offsetY + 364 - 96 + colGutter;

    const r = figma.createFrame();
    r.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}}];
    r.x = offsetX - 100;
    r.y = offsetY - 100;
    r.resize(2668, 488);
    r.cornerRadius = 120;

    alphas.forEach((alpha) => {
        const colorName = 'white';

        const style = figma.createPaintStyle();
        style.name = createBaseName() + '/' + 'alpha' + '/' + colorName + '/' + colorName + zeroPad(alpha, 2) + 'a';
        style.paints = [{type: 'SOLID', opacity: alpha / 100, color: hexToRgb('#FFFFFF')}];
        style.description = 'white (' + alpha + '% opacity)';

        const r = figma.createFrame();
        r.name = colorName + zeroPad(alpha, 2) + 'a';
        r.fillStyleId = style.id;
        r.cornerRadius = 1000;
        r.resize(swatchWidth, swatchHeight);

        let swatch = new Matrix.Swatch();
        swatch.semantic = colorName;
        swatch.id = 'W' + alpha;
        swatch.alpha = alpha;
        swatch.weight = zeroPad(alpha, 2) + 'a';
        swatch.isUserDefined = false;
        swatch.isPinned = false;
        swatch.hex = '#FFFFFF';

        swatch.name = colorName + zeroPad(alpha, 2) + 'a';

        let z = createSwatchLabelDescription(swatch, offsetX, offsetY + 212);
        z.fills = [{type: 'SOLID', color: hexToRgb('#FFFFFF')}]; //

        let y = createSwatchLabelHex(swatch, offsetX, offsetY + 259);
        y.fills = [{type: 'SOLID', color: hexToRgb('#FFFFFF')}]; //

        r.x = offsetX;
        r.y = offsetY;

        offsetX = offsetX + swatchHeight + rowGutter;
    });
}

function createWeightLabel(swatch: Matrix.Swatch, offsetY: number) {
    const r = figma.createText();
    r.name = 'weight' + '-' + swatch.weight.toString();
    r.characters = swatch.weight.toString();
    r.textAlignHorizontal = 'CENTER';
    r.textAlignVertical = 'CENTER';
    r.fontName = {family: 'Inter', style: 'Bold'};
    r.fontSize = 16;
    r.resize(swatchWidth / 2, swatchHeight);
    r.x = -16;
    r.y = offsetY;

    figma.currentPage.appendChild(r);
    return r;
}

function createTargetLabel(swatch: Matrix.Swatch, offsetX: number, offsetY: number) {
    const r = figma.createText();
    r.name = 'target-' + swatch.l_target.toString();
    r.characters = 'L*' + swatch.l_target.toString();
    r.textAlignHorizontal = 'LEFT';
    r.textAlignVertical = 'CENTER';
    r.fontSize = 14;
    r.resize(swatchWidth / 2, swatchHeight);
    r.x = offsetX + swatchWidth + 24;
    r.y = offsetY;
    return r;
}

function createSwatchFrame(swatch: Matrix.Swatch, style: PaintStyle, x: number, y: number) {
    const r = figma.createFrame();
    r.name = createSwatchLabelSwatchName(swatch);
    r.fillStyleId = style.id;
    r.layoutMode = 'HORIZONTAL';
    r.primaryAxisAlignItems = 'CENTER';
    r.counterAxisAlignItems = 'CENTER';
    r.resize(swatchWidth, swatchHeight);
    r.cornerRadius = 1000;
    // r.appendChild(createSwatchLabel(swatch));
    r.x = x;
    r.y = y;
    return r;
}

function createSwatchLabelDescription(swatch: Matrix.Swatch, offsetX: number, offsetY: number) {
    const r = figma.createText();

    let label =
        swatch.alpha === undefined
            ? swatch.semantic + swatch.weight.toString()
            : swatch.semantic + zeroPad(swatch.alpha, 2) + 'a';
    r.characters = label;

    r.name = createSwatchLabelSemanticName(swatch);
    r.fontName = {family: 'Poppins', style: 'Medium'};
    r.resize(swatchWidth, 36);
    r.x = offsetX;
    r.y = offsetY;
    r.fills = [{type: 'SOLID', color: hexToRgb('#2E2E2E')}]; //
    r.fontSize = 20;
    r.textAlignHorizontal = 'CENTER';
    r.textAlignVertical = 'CENTER';
    return r;
}

function createSwatchLabelHexName(swatch: Matrix.Swatch) {
    return createFrameName(swatch) + '_hex';
}

function createSwatchLabelSemanticName(swatch: Matrix.Swatch) {
    return createFrameName(swatch) + '_name';
}

function createSwatchLabelSwatchName(swatch: Matrix.Swatch) {
    return createFrameName(swatch) + '_swatch';
}

function createSwatchLabelHexContent(swatch: Matrix.Swatch) {
    let result = swatch.hex.toUpperCase();
    if (swatch.isUserDefined) result = '⭐️ ' + result;
    if (swatch.isPinned) result = '📍 ' + result;
    return result;
}

function createSwatchLabelHex(swatch: Matrix.Swatch, offsetX: number, offsetY: number) {
    const r = figma.createText();
    // let label = swatch.hex.toUpperCase();

    let label =
        swatch.alpha === undefined || swatch.alpha === 100
            ? swatch.hex.toUpperCase()
            : swatch.hex.toUpperCase() + ' (' + swatch.alpha + '%' + ')';
    r.characters = label;

    if (swatch.isUserDefined) label = '⭐️ ' + label;
    if (swatch.isPinned) label = '📍 ' + label;
    r.characters = label;
    r.name = createSwatchLabelHexName(swatch);
    r.fontName = {family: 'Poppins', style: 'Regular'};
    r.resize(swatchWidth, 36);
    r.x = offsetX;
    r.y = offsetY;
    r.fills = [{type: 'SOLID', color: hexToRgb('#535353')}];
    r.fontSize = 20;
    r.textAlignHorizontal = 'CENTER';
    r.textAlignVertical = 'CENTER';
    return r;
}

function createSwatchLabel(swatch: Matrix.Swatch) {
    const r = figma.createText();
    let label = swatch.hex.toUpperCase();
    if (swatch.isUserDefined) label = '⭐️ ' + label;
    if (swatch.isPinned) label = '📍 ' + label;
    r.characters = label;
    r.name = r.characters + ' (L*' + swatch.lightness + ')';
    r.fills =
        swatch.WCAG2_W_45 || swatch.WCAG2_W_30
            ? [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}]
            : [{type: 'SOLID', color: {r: 0, g: 0, b: 0}}];
    r.fontName =
        swatch.WCAG2_W_30 && !swatch.WCAG2_W_45
            ? {family: 'Poppins', style: 'Medium'}
            : {family: 'Poppins', style: 'Regular'};
    r.fontSize = 24;
    r.textAlignHorizontal = 'CENTER';
    r.textAlignVertical = 'CENTER';
    return r;
}

function createSemanticLabel(column: Matrix.Column, offsetX: number) {
    const r = figma.createText();
    r.name = ('semantic' + '-' + column.semantic) as string;
    r.characters = column.semantic as string;
    r.textAlignHorizontal = 'CENTER';
    r.textAlignVertical = 'CENTER';
    r.fontName = {family: 'Inter', style: 'Bold'};
    r.fontSize = 16;
    r.resize(swatchWidth, swatchHeight);
    r.x = offsetX;
    r.y = 0 - swatchHeight * 1.5;
    figma.currentPage.appendChild(r);
    return r;
}

function createFrameName(swatch: Matrix.Swatch) {
    return swatch.semantic + swatch.weight.toString();
}

function createPaintStyleDescription(swatch: Matrix.Swatch) {
    let r = [];
    // r.push('$' + rootName + '-' + swatch.semantic + '-' + swatch.weight + ' (' + swatch.id + ')' + '\n');

    r.push('// ');
    r.push(swatch.isUserDefined || swatch.isPinned ? ' ~defined' : '');
    r.push('\n');
    r.push('\n');
    r.push('hex: : ' + swatch.hex.toUpperCase() + '\n');
    r.push('L*: ' + swatch.lightness + ' (' + swatch.l_target + ')' + '\n');
    r.push('\n');
    r.push('#FFFFFF-4.5:1: ' + swatch.WCAG2_W_45 + '\n');
    r.push('#FFFFFF-3.0:1: ' + swatch.WCAG2_W_30 + '\n');
    r.push('#000000-4.5:1: ' + swatch.WCAG2_K_45 + '\n');
    r.push('#000000-3.0:1: ' + swatch.WCAG2_K_30 + '\n');
    return r.join('');
}

function createPaintStyleName(swatch: Matrix.Swatch) {
    let n = [createBaseName()];
    n.push(swatch.semantic);
    n.push(swatch.semantic + swatch.weight.toString());
    return n.join('/');
}

function hexToRgb(hex: string) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
          }
        : null;
}
