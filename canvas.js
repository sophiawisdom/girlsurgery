function rgbToLab(rgb) {
    let r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047,
        y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750),
        z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

    // Convert to Lab
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    let l = (116 * y) - 16,
        a = 500 * (x - y),
        bLab = 200 * (y - z);  // Renamed variable here to avoid conflict with 'b' from RGB

    return [l, a, bLab];
}

function labToRgb(lab) {
    let y = (lab[0] + 16) / 116,
        x = lab[1] / 500 + y,
        z = y - lab[2] / 200;

    // Convert to XYZ
    x = x > 0.206897 ? Math.pow(x, 3) : (x - 16/116) / 7.787;
    y = y > 0.206897 ? Math.pow(y, 3) : (y - 16/116) / 7.787;
    z = z > 0.206897 ? Math.pow(z, 3) : (z - 16/116) / 7.787;

    // Adjust reference white points and convert to RGB
    x *= 0.95047;
    y *= 1.00000;
    z *= 1.08883;

    let r =  3.2406 * x - 1.5372 * y - 0.4986 * z,
        g = -0.9689 * x + 1.8758 * y + 0.0415 * z,
        b =  0.0557 * x - 0.2040 * y + 1.0570 * z;

    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

    return [Math.max(0, Math.min(255, r * 255)),
            Math.max(0, Math.min(255, g * 255)),
            Math.max(0, Math.min(255, b * 255))].map(Math.round);
}

const randomrgb = () => {
    return [
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
    ];
}

function interpolateColors(colors, fraction) {
    let labs = colors.map(rgb => rgbToLab(rgb));
    let resultLab = [
        labs[0][0] * (1-fraction) + labs[1][0] * fraction,
        labs[0][1] * (1-fraction) + labs[1][1] * fraction,
        labs[0][2] * (1-fraction) + labs[1][2] * fraction
];

    return labToRgb(resultLab);
}

const colors = [
    [0, 128, 77],
    [255, 0, 0],
    [66, 19, 59],
    [0, 255, 0],
    [115, 68, 108],
    [0, 0, 255],
]

const love = document.getElementById("love");
const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = love.getBoundingClientRect();
    // it goes a little bit off without the -10s and makes a scrollbar at the bottom
    let w = window.innerWidth-10;
    love.width = w * dpr;
    love.height = 40 * dpr;
    love.style.width = `${w}px`;
    love.style.height = `${40}px`;
    ctx = love.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.font = "30px sans-serif";
}
window.addEventListener('resize', resize);
var ctx = love.getContext("2d");

console.log("ctx.width", ctx.width);
console.log("ctx.height", ctx.height);


ctx.font = "30px sans-serif";
function weightedRandom(message_weights) {
    const choices = message_weights.map(([a, b]) => a);
    const weights = message_weights.map(([a, b]) => b);
    let totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    let random = Math.random() * totalWeight;
    let sum = 0;

    for (let i = 0; i < choices.length; i++) {
        sum += weights[i];
        if (random < sum) {
            return choices[i];
        }
    }
}
const message_weights = [
    ["i love you; ", 0.1],
    ["contact me at sophia.wisdom1999@gmail.com ", 0.01],
    ["welcome to sophia's blog! ", 0.2],
    ["you're so beautiful ", 0.01],
    ["no one has to know ", 0.01],
    ["please ", 0.001],
    ["show me ", 0.001],
    ["how are you doing? ", 0.01],
    ["let me see you ", 0.04],
    ["let me touch you ", 0.01],
    ["let me grab you ", 0.01],
    ['let me taste you ', 0.01],
    ["let me cut you", 0.01],
    ["let me open you up ", 0.01],
    ["send me a poem ", 0.01],
    ["eatme ", 0.02],
    ["touch me ", 0.01],
    ["kiss me ", 0.01],
    ["love me ", 0.01],
    ["looking in the source code, are you? ", 0]
]

let pixel_idx = 0;
let idx = 0;

let prev_color = [0, 0, 0];
let next_color = [0, 128, 77];
let colors_for_interpolation = 6;
setInterval(() => {
    const message = weightedRandom(message_weights);
    const text_width = ctx.measureText(message).width;
    if ((pixel_idx + text_width) > love.width) {
        ctx.clearRect(pixel_idx, 0, 1000, 1000);
        pixel_idx = 0;
    }

    let interpolation_point = (idx % (colors_for_interpolation));
    if (interpolation_point == 0) {
        prev_color = next_color;
        next_color = randomrgb();
    }
    let cur_color = interpolateColors([prev_color, next_color], interpolation_point/colors_for_interpolation);

    // console.log("interpolating between", [...prev_color], [...next_color], "got", [...cur_color], "for fraction", interpolation_point/colors_for_interpolation);

    const [r, g, b] = cur_color;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

    ctx.clearRect(pixel_idx, 0, text_width, 100);
    ctx.fillText(message, pixel_idx, 30);
    pixel_idx += text_width;
    idx += 1;
}, 100);

resize();
