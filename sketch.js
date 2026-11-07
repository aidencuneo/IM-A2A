// TODO
/*

- 

*/

let gameSize = 256;
let randomMovement = 0.05; // Creatures drift around at this many pixels per frame
let startingCreatures = 200;

// Events
let updateFns = [];
let drawFns = [];
let drawEntFns = [];
let drawPartFns = [];
let drawUIFns = [];
let mousePressedFns = [];
let mouseReleasedFns = [];
let keyPressedFns = [];
let keyReleasedFns = [];

// Collision grid
let collCellSize = 16;
let collCols = Math.ceil(gameSize / collCellSize);
let collGrid = Array.from({ length: collCols ** 2 }, () => []);
let collFoodCount = 0;

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
    for (let i = 0; i < startingCreatures; ++i) {
      let c = spawn(Creature);
      c.debug = true;
    }
    // let p = spawn(Creature, gameSize / 2, gameSize / 2, [
    //   1, 1, 1, 1, 1,

    //   9 / 20,
    //   2 / 20, 30 / 100,
    //   13 / 20,
    //   15 / 20,
    //   5 / 20,
    //   10 / 20,
    //   12 / 20,
    //   16 / 20,
    //   0, 0, 0, 0,

    //   7 / 20,
    //   12 / 20,
    //   1 / 20, 1,
    //   10 / 20,
    //   18 / 20,
    //   16 / 20,
    //   9 / 20,
    //   2 / 20, 30 / 100,
    //   3 / 20,
    //   13 / 20,
    //   15 / 20,

    //   9 / 20,
    //   2 / 20, 30 / 100,
    //   13 / 20,
    //   15 / 20,
    //   5 / 20,
    //   10 / 20,
    //   12 / 20,
    //   16 / 20,
    //   0, 0, 0, 0,

    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 0,
    // ], 10, 10);

    // p.debug = true;
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

  gameBuf.pixelDensity(1);
  entBuf.pixelDensity(1);
  uiBuf.pixelDensity(2);

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

  // Update collisions before moving objects
  updateCollisions();

  // Update
  update(); // Main game update
  for (let i = 0; i < updateFns.length;) {
    let fn = updateFns[i];
    fn[1]();
    if (updateFns[i] == fn) ++i;
  }

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

  // Respawn creatures if they all die
  if (creatureCount == 0)
    for (let i = 0; i < startingCreatures; ++i)
      spawn(Creature);

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

// Collision functions
function updateCollisions() {
  for (let cell of collGrid)
    cell.length = 0;
  collFoodCount = 0;

  for (let i = 0; i < objects.length; ++i) {
    let obj = objects[i];
    if (obj.tag != 'creature' && obj.tag != 'food')
      continue;

    collFoodCount += obj.tag == 'food';

    let cx = constrain(floor(obj.x / collCellSize), 0, collCols - 1);
    let cy = constrain(floor(obj.y / collCellSize), 0, collCols - 1);

    let hit = {
      obj,
      x: obj.x,
      y: obj.y,
      r: obj.size / 2 + 0.5,
      cell: cy * collCols + cx,
      order: i,
    };

    let left = max(0, floor((hit.x - hit.r) / collCellSize));
    let right = min(collCols - 1, floor((hit.x + hit.r) / collCellSize));
    let top = max(0, floor((hit.y - hit.r) / collCellSize));
    let bottom = min(collCols - 1, floor((hit.y + hit.r) / collCellSize));

    for (let y = top; y <= bottom; ++y)
      for (let x = left; x <= right; ++x)
        collGrid[y * collCols + x].push(hit);
  }
}

function collidingWith(x, y, self) {
  if (!isFinite(x) || !isFinite(y))
    return null;

  x = constrain(round(x), 0, gameSize - 1);
  y = constrain(round(y), 0, gameSize - 1);
  let cx = floor(x / collCellSize);
  let cy = floor(y / collCellSize);
  let cell = collGrid[cy * collCols + cx];

  if (!cell)
    return null;

  for (let i = cell.length - 1; i >= 0; --i) {
    let hit = cell[i];
    if (hit.obj == self) continue;

    let dx = x - hit.x;
    let dy = y - hit.y;

    if (hit.obj.tag == 'creature' && dx * dx + dy * dy <= hit.r * hit.r)
      return hit.obj;
    if (hit.obj.tag != 'creature' && abs(dx) <= hit.r && abs(dy) <= hit.r)
      return hit.obj;
  }
  return null;
}

function findClosest(obj) {
  let r = {
    creature: { hit: null, dist: Infinity },
    food: { hit: null, dist: Infinity },
  };

  function check(hit) {
    let other = hit.obj;
    let nearest = r[other.tag];
    if (other == obj || !nearest) return;

    let dx = hit.x - obj.x;
    let dy = hit.y - obj.y;
    let dist = dx * dx + dy * dy;

    if (dist < nearest.dist || (dist == nearest.dist && objects.indexOf(other) < objects.indexOf(nearest.hit.obj))) {
      nearest.hit = hit;
      nearest.dist = dist;
    }
  }

  searchNearby(obj, check);

  return {
    closestOther: r.creature.hit,
    closestDist: r.creature.dist,
    closestFood: r.food.hit,
    closestFoodDist: r.food.dist,
  };
}

function searchNearby(obj, check) {
  let x = constrain(floor(obj.x / collCellSize), 0, collCols - 1);
  let y = constrain(floor(obj.y / collCellSize), 0, collCols - 1);
  let checked = new Set(); // hopefully this will speed things up a little

  for (let cy = max(0, y - 4); cy <= min(collCols - 1, y + 4); ++cy)
    for (let cx = max(0, x - 4); cx <= min(collCols - 1, x + 4); ++cx)
      for (let hit of collGrid[cy * collCols + cx]) {
        if (checked.has(hit.obj)) continue;
        checked.add(hit.obj);
        check(hit);
      }
}


// Scene functions
function loadScene(name) {
  destroyAll();
  scenes[scene = name]();
}

// Object functions
function spawn(objClass, ...args) {
  if (objects.length >= 600)
    return;

  let obj = new objClass(...args);
  objects.push(obj);
  registerAll(obj);
  return obj;
}

function destroy(obj) {
  let idx = objects.indexOf(obj);
  if (idx == -1) return;
  obj.destroy && obj.destroy();
  unregisterAll(obj);
  objects.splice(idx, 1);
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
    } else if (k == 'v') {
      if ('middle' in selectionPressures)
        delete selectionPressures['middle'];
      else
        selectionPressures['middle'] = o => {
          if (dist(o.x, o.y, gameSize / 2, gameSize / 2) > gameSize / 3)
            o.health -= 0.005;
        };
    } else if (k == 'c') {
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
