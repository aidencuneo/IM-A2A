/*

Misc functions

*/

function sameList(a, b) {
  for (let i = 0; i < a.length; ++i)
    if (a[i] != b[i])
      return false;
  return true;
}

function fixNum(n, def) {
  def ??= 0;
  if (!isFinite(n))
    return def;
  return n;
}

function toLines(s) {
  return s.split(/\r\n|\r|\n/);
}

function countLines(s) {
  return s.split(/\r\n|\r|\n/).length;
}

/*

p5 functions

*/

function pixel(x, y) {
  square(x, y, 1);
}

function placeText(msg, where, offsetX, offsetY) {
  // Options:
  //   topleft, topmid, topright
  //   left, mid, right
  //   botleft, botmid, botright

  // Defaults and conversions
  msg = '' + msg;
  where ||= 'mid';
  offsetX ||= 0;
  offsetY ||= 0;

  // Default is mid
  let [x, y] = [
    gameSize / 2 - round(textWidth(msg)) / 2 + 1,
    gameSize / 2 + textSize() / 2 - 1,
  ];

  if (where.endsWith('left'))
    x = 0;
  else if (where.endsWith('right'))
    x = gameSize - textWidth(msg);

  if (where.startsWith('top'))
    y = textSize() - 2;
  else if (where.startsWith('bot'))
    y = gameSize - 1;

  text(msg, x + offsetX, y + offsetY);
}

function roundedText(msg, x, y) {
  text(msg, round(x * 2) / 2, round(y * 2) / 2);
}

/*

Easing functions

*/

easeOutQuint = x => 1 - Math.pow(1 - x, 5);
easeOutCubic = x => 1 - Math.pow(1 - x, 3);

/*

Colour util

*/

// Excerpt from https://stackoverflow.com/questions/13586999/color-difference-similarity-between-two-values-with-js
function deltaE(rgbA, rgbB) {
  let labA = rgb2lab(rgbA);
  let labB = rgb2lab(rgbB);
  let deltaL = labA[0] - labB[0];
  let deltaA = labA[1] - labB[1];
  let deltaB = labA[2] - labB[2];
  let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  let deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  let sc = 1.0 + 0.045 * c1;
  let sh = 1.0 + 0.015 * c1;
  let deltaLKlsl = deltaL / (1.0);
  let deltaCkcsc = deltaC / (sc);
  let deltaHkhsh = deltaH / (sh);
  let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}
  
function rgb2lab(rgb) {
  let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}
// End excerpt

const toRGB = c => [
  red(c),
  green(c),
  blue(c),
];

const toRGBA = c => [
  red(c),
  green(c),
  blue(c),
  alpha(c),
];

const changeAlpha = (c, a) => color(
  red(c),
  green(c),
  blue(c),
  a,
);

const colourDistance = (a, b) => deltaE(toRGB(a), toRGB(b)); // deltaE but for external use
const getLightness = c => deltaE(toRGB(c), [0, 0, 0]);
const isDark = c => deltaE(toRGB(c), [0, 0, 0]) < 50;
const getBlackOrWhite = c => isDark(c) ? '#fff' : '#000';
const getLightOrDark = (c, light, dark) => isDark(c) ? (light || '#fff') : (dark || '#000');

const invertColour = c => color(
  255 - red(c),
  255 - green(c),
  255 - blue(c),
  alpha(c),
);

const randColour = c => color(
  floor(255 * random()),
  floor(255 * random()),
  floor(255 * random()),
);

const sameColour = (a, b) => sameList(toRGBA(a), toRGBA(b));

const numToColour = n => {
  let r = n % 256;
  n = floor(n / 256);
  let g = n % 256;
  n = floor(n / 256);
  let b = n % 256;
  return color(r, g, b);
}
