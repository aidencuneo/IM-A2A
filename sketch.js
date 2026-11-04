// TODO
/*

- 

*/

let gameSize = 192;

// Events
let updateFns = [];
let drawFns = [];
let drawEntFns = [];
let drawPartFns = [];
let drawUIFns = [];
let drawCollFns = [];
let mousePressedFns = [];
let mouseReleasedFns = [];
let keyPressedFns = [];
let keyReleasedFns = [];

// Colours (for collision)
let collColours = {};
let nextCollColour = 1;

// State
let backspaceHeld = 0;
let scene = 'main';
let delta = -1;
let mx = 0;
let my = 0;
let rmx = 0;
let rmy = 0;
let cmdText = '';
let toasts = [];
let objects = [];
let lastSpawn = 0;
let selectionPressures = {};

// Lerp state
let cameraShakeOn = true;
let camShake = 0;
let redScreenTint = 0;

// Scenes
let scenes = {
  'main': () => {
    bg = color('#5170ff');
    // for (let i = 0; i < 100; ++i)
    //   spawn(Creature);
    let p = spawn(Creature, gameSize / 2, gameSize / 2, [
      1, 1, 1, 1, 1,

      9 / 20,
      2 / 20, 30 / 100,
      13 / 20,
      15 / 20,
      5 / 20,
      10 / 20,
      12 / 20,
      16 / 20,
      0, 0, 0, 0,

      7 / 20,
      12 / 20,
      1 / 20, 1,
      10 / 20,
      18 / 20,
      16 / 20,
      9 / 20,
      2 / 20, 30 / 100,
      3 / 20,
      13 / 20,
      15 / 20,

      9 / 20,
      2 / 20, 30 / 100,
      13 / 20,
      15 / 20,
      5 / 20,
      10 / 20,
      12 / 20,
      16 / 20,
      0, 0, 0, 0,

      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0,
    ], 10, 10);

    p.debug = true;
    // player = spawn(Player, gameSize / 2, gameSize / 2);
  },
};

// Static classes
let cmd = new Cmd();

async function setup() {
  // Lerp state
  bg = color('#5170ff');
  curBg = bg;

  // p5 modes
  angleMode(DEGREES);
  rectMode(CENTER);

  // Canvas
  size = min(windowWidth, windowHeight);
  canvas = createCanvas(size, size, WEBGL);

  // Fonts
  pixelFont = await loadFont('Silkscreen-Regular.ttf');
  textSize(4);
  textFont(pixelFont);

  // Frame buffers
  setAttributes('antialias', false);

  gameBuf = createFramebuffer({
    width: gameSize,
    height: gameSize,
    antialias: false,
    textureFiltering: NEAREST,
  });

  entBuf = createFramebuffer({
    width: gameSize,
    height: gameSize,
    antialias: false,
    textureFiltering: NEAREST,
  });

  uiBuf = createFramebuffer({
    width: gameSize,
    height: gameSize,
    antialias: false,
    textureFiltering: NEAREST,
  });

  collBuf = createFramebuffer({
    width: gameSize,
    height: gameSize,
    antialias: false,
    textureFiltering: NEAREST,
  });

  gameBuf.pixelDensity(1);
  entBuf.pixelDensity(1);
  uiBuf.pixelDensity(2);
  collBuf.pixelDensity(1);

  // Events
  document.body.onresize = () => {
    size = min(windowWidth, windowHeight);
    resizeCanvas(size, size);
  }

  document.body.oncontextmenu = e => e.preventDefault();

  // Scene setup
  loadScene('main');

  // Intro toast
  sendToast('Use / to enter commands');
}

function draw() {
  mx = mouseX / width * gameSize;
  my = mouseY / height * gameSize;
  rmx = constrain(round(mx), 0, gameSize - 1);
  rmy = constrain(round(my), 0, gameSize - 1);

  // Backspace key repeat
  if (keyIsDown(BACKSPACE)) {
    if (++backspaceHeld > 15 && backspaceHeld % 2 == 0)
      keyPressed({ key: 'Backspace' });
  } else backspaceHeld = 0;

  curBg = lerpColor(curBg, bg, 0.1);
  background(curBg);

  // Frame variables
  delta = deltaTime / 1000;

  // Reset colliders
  nextCollColour = 1;
  colliders = {};

  // Draw colliders
  collBuf.begin();
  translate(-gameSize / 2, -gameSize / 2);
  clear();
  for (let fn of drawCollFns) fn[1]();
  collBuf.end();

  collBuf.loadPixels(); // Enable collision by default
  // console.log(colliders);

  // Update
  update(); // Main game update
  for (let fn of updateFns) fn[1]();

  // Game
  gameBuf.begin();
  translate(-gameSize / 2, -gameSize / 2);
  clear();
  for (let fn of drawFns) fn[1]();
  gameBuf.end();

  // Entities
  entBuf.begin();
  translate(-gameSize / 2, -gameSize / 2);
  clear();
  for (let fn of drawEntFns) fn[1]();
  entBuf.end();

  // UI
  uiBuf.begin();
  translate(-gameSize / 2, -gameSize / 2);
  clear();
  for (let fn of drawUIFns) fn[1]();
  drawUI(); // Draw game UI on top
  uiEffects(); // Visual effects (affects UI and some layers below)
  uiBuf.end();

  // // LateUpdate
  // for (let fn of lateUpdateFns) fn();

  // Draw buffers
  noStroke();
  reactiveCam(); // Cam effects
  texture(gameBuf);
  plane(width, height);
  texture(entBuf);
  plane(width, height);
  camera(0, 0, 800, 0, 0, 0); // Reset cam
  texture(uiBuf);
  plane(width, height);
  // texture(collBuf);
  // plane(width, height);
}

function drawUI() {
  rectMode(CORNER);
  textSize(4);
  textFont(pixelFont);

  // Commands
  if (cmdText.length) {
    fill('#00000080');
    rect(0, gameSize - 8, gameSize, 4);
    fill('white');
    text(cmdText, 0, gameSize - 5);

    // Suggestions
    let sug = cmd.getSuggestions(cmdText);
    for (let i = 0; i < sug.length; ++i) {
      let s = '/' + sug[sug.length - 1 - i];
      let w = textWidth(s);

      // fill('#00000040');
      // rect(0, gameSize - 13 - i * 4, w, 4);
      fill('white');
      text(s, 0, gameSize - 10 - i * 4);
    }
  }

  // Toast messages
  let ts = getToasts(9);
  for (let i = 0; i < ts.length; ++i) {
    let t = ts[i];
    fill(t.colour);
    placeText(t.msg, 'top', 0, round(gameSize / 3 - i * 5));
  }

  textSize(4);
  fill(invertColour(bg));
  placeText(round(frameRate()), 'topright', -1, 2);

  // Get info on a creature
  fill('white');
  let obj = collidingWith(mx, my);
  if (obj) {
    textAlign(CENTER, CENTER);
    roundedText('health: ' + round(obj.health, 2), mx, my - 16);
    roundedText('size: ' + round(obj.size, 2), mx, my - 10);
    roundedText('energy: ' + round(obj.energy, 2), mx, my - 4);
    textAlign(LEFT, BASELINE);
  }
}

function update() {
  // if (millis() - lastSpawn > 1000) {
  //   spawn(Creature);
  //   lastSpawn = millis();
  // }

  let totalHealth = 0;
  let totalEnergy = 0;
  let creatureCount = 0;
  let foodCount = 0;
  for (let o of objects) {
    if (o.tag == 'creature') {
      totalHealth += o.health;
      totalEnergy += o.energy;
      ++creatureCount;
    } else if (o.tag == 'food')
      ++foodCount;
  }

  if (millis() - lastSpawn > 250 && foodCount < 20) {
    spawn(Food);
    lastSpawn = millis();
  }

  if (mouseButton.left) {
    let obj = collidingWith(mx, my);
    if (obj) destroy(obj);
  }

  if (mouseButton.right) {
    spawn(Creature);
  }
  
  if (frameCount % 10 == 0)
    console.log(creatureCount, round(totalHealth, 1), round(totalEnergy, 1));
}

function reactiveCam() {
  if (!cameraShakeOn)
    camShake = 0;

  camShake *= 0.95;

  let jitter = [(random() * 2 - 1) * camShake, (random() * 2 - 1) * camShake];
  camera(...jitter, 800, ...jitter, 0);
}

function uiEffects() {
  redScreenTint *= 0.95;
  noStroke();
  fill(changeAlpha('#ff0000', redScreenTint * 255));
  square(0, 0, gameSize);
}

// Toast functions
function sendToast(msg, duration, colour) {
  duration ||= 5;
  colour ||= 'gold';
  toasts.push({ msg, duration, colour });
}

function getToasts(count) {
  count ||= -1;

  let ts = toasts;
  if (count != -1)
    ts = toasts.slice(0, count);

  // Start new toasts
  for (let i = 0; i < ts.length; ++i) {
    let t = ts[i];
    if (t.start === undefined)
      t.start = millis();
  
    // If expired, remove and try again
    if (millis() - t.start >= t.duration * 1000) {
      toasts.splice(i, 1);
      return getToasts(count);
    }
  }

  return ts;
}

// Buffer functions
function posToIndex(x, y) {
  x = round(x);
  y = round(y);
  return constrain(4 * y * gameSize + 4 * x, 0, gameSize * gameSize * 4 - 1);
}

function getBufPixel(buf, x, y) {
  let i = posToIndex(x, y);
  return color(...buf.pixels.slice(i, i + 4));
}

// Collision functions
function collidingWith(x, y) {
  let c = getBufPixel(collBuf, x, y);
  return colliders[c.toString('rgba')];
}

function getNextCollColour(obj) {
  let c = numToColour(nextCollColour++);
  colliders[c.toString('rgba')] = obj;
  return c;
}

// Scene functions
function loadScene(name) {
  destroyAll();
  scenes[scene = name]();
}

// Object functions
function spawn(objClass, ...args) {
  if (objects.length >= 200)
    return;

  let obj = new objClass(...args);
  objects.push(obj);
  registerAll(obj);
  return obj;
}

function destroy(obj) {
  obj.destroy && obj.destroy();
  unregisterAll(obj);
  objects.splice(objects.indexOf(obj), 1);
}

function destroyAll(times) {
  // Destroy all objects
  while (objects.length)
    destroy(objects[0]);

  // Completely clear all function lists
  updateFns = [];
  drawFns = [];
  drawEntFns = [];
  drawPartFns = [];
  drawUIFns = [];
  drawCollFns = [];
  mousePressedFns = [];
  mouseReleasedFns = [];
  keyPressedFns = [];
  keyReleasedFns = [];

  // Reset global object counters
  littleguyCount = 0;
}

function registerAll(obj) {
  registerEvent(obj, 'update', updateFns);
  registerEvent(obj, 'draw', drawFns);
  registerEvent(obj, 'drawEnt', drawEntFns);
  registerEvent(obj, 'drawPart', drawPartFns);
  registerEvent(obj, 'drawUI', drawUIFns);
  registerEvent(obj, 'drawColl', drawCollFns);
  registerEvent(obj, 'mousePressed', mousePressedFns);
  registerEvent(obj, 'mouseReleased', mouseReleasedFns);
  registerEvent(obj, 'keyPressed', keyPressedFns);
  registerEvent(obj, 'keyReleased', keyReleasedFns);
}

function unregisterAll(obj) {
  unregisterEvent(obj, 'update', updateFns);
  unregisterEvent(obj, 'draw', drawFns);
  unregisterEvent(obj, 'drawEnt', drawEntFns);
  unregisterEvent(obj, 'drawPart', drawPartFns);
  unregisterEvent(obj, 'drawUI', drawUIFns);
  unregisterEvent(obj, 'drawColl', drawCollFns);
  unregisterEvent(obj, 'mousePressed', mousePressedFns);
  unregisterEvent(obj, 'mouseReleased', mouseReleasedFns);
  unregisterEvent(obj, 'keyPressed', keyPressedFns);
  unregisterEvent(obj, 'keyReleased', keyReleasedFns);
}

function registerEvent(obj, event, eventFns) {
  if (obj[event]) {
    eventFns.push([obj, obj[event].bind(obj)]);
    return true;
  }
  return false;
}

function unregisterEvent(obj, event, eventFns) {
  if (!obj[event]) return;
  for (let i = 0; i < eventFns.length; ++i)
    if (eventFns[i][0] == obj) {
      eventFns.splice(i, 1);
      return true;
    }
  return false;
}

// User input
function mousePressed(e) {
  for (let fn of mousePressedFns) fn[1](e.button);
}

function mouseReleased(e) {
  for (let fn of mouseReleasedFns) fn[1](e.button);
}

function keyPressed(e) {
  let k = e.key;
  let kl = k.toLowerCase();

  // Commands
  if (k == '/')
    cmdText += '/';

  if (cmdText.length) {
    if (kl == 'escape')
      cmdText = '';
    else if (kl == 'backspace')
      cmdText = cmdText.substring(0, cmdText.length - 1);
    else if (kl == 'enter') {
      cmd.run(cmdText);
      cmdText = '';
    } else if (kl == 'tab') {
      e.preventDefault();
      let sug = cmd.getSuggestions(cmdText);
      if (sug.length)
        cmdText = '/' + sug[0];
    } else if (k.length == 1 && k != '/')
      cmdText += k;
  }

  else {
    // Debugging
    if (k == 'e') {
      let obj = collidingWith(mx, my);
      if (obj) {
        console.log('DEBUG HIT');
        console.log(obj.modes[obj.mode].map(x => floor(x * 20)));
      }
    } else if (k == 'c') {
      if ('middle' in selectionPressures)
        delete selectionPressures['middle'];
      else
        selectionPressures['middle'] = o => {
          if (dist(o.x, o.y, gameSize / 2, gameSize / 2) > gameSize / 3)
            o.health -= 0.005;
        };
    } else if (k == 'v') {
      if ('camo' in selectionPressures)
        delete selectionPressures['camo'];
      else
        selectionPressures['camo'] = o => {
          // if ( > 50)
          o.health -= (colourDistance(o.colour, bg) + colourDistance(bg, o.colour)) / 2 / 50000;
        };
    } else if (k == 'b') {
      if ('deathcircle' in selectionPressures)
        delete selectionPressures['deathcircle'];
      else
        selectionPressures['deathcircle'] = o => {
          if (dist(o.x, o.y, gameSize / 2, gameSize / 2) < gameSize / 4)
            o.health -= 0.1;
        };
    }

    for (let fn of keyPressedFns) fn[1](kl);
  }
}

function keyReleased(e) {
  let k = e.key.toLowerCase();
  for (let fn of keyReleasedFns) fn[1](k);
}
