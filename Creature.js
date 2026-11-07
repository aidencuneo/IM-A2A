class Creature {
  constructor(x, y, dna, health, energy) {
    this.tag = 'creature';

    // Get DNA
    // if (dna && dna.length != 0 && dna.length != 24)
    //   console.error(dna.length);
    this.dna = (dna || []).length > 0 ? [...dna] : this.generateDNA(5 + 6 * 6 + 8 * 6 + 46 + 7);
    this.origDNA = [...this.dna];
    // print(this.dna);

    // State
    this.target = [random(gameSize), random(gameSize)];
    this.x = x ?? random(gameSize);
    this.y = y ?? random(gameSize);
    this.direction = random(360);
    this.age = 0;
    this.senses = [];
    this.r0 = 0;
    this.r1 = 0;

    // Cooldowns
    this.lastBred = millis();
    this.lastKill = millis();
    this.lastEat = millis();
    this.lastConvert = millis();

    // Stats
    // health and damage prop to size
    // use more energy when moving with more size
    // bacteria can "sense" other bacteria and can move towards them
    // all actions have effort that can be put into them
    //   effort is the amount of energy to use

    // Read more stuff from DNA
    this.size = map(this.readDNA(1)[0], 0, 1, 3, 15);
    this.geneDominance = this.readDNA(1)[0];
    this.energy = energy ?? 1;
    this.health = health ?? 1;

    this.colour = color(...this.readDNA(3, 255));
    colorMode(HSL);
    this.darkerColour = color(hue(this.colour), saturation(this.colour), lightness(this.colour) - 20);
    colorMode(RGB);
    // this.startCode = this.readDNA(10);

    this.mode = 0;
    this.modes = [
      this.readDNA(6),
      this.readDNA(6),
      this.readDNA(6),
      this.readDNA(6),
      this.readDNA(6),
      this.readDNA(6),
    ]

    this.soundModes = [
      this.readDNA(8),
      this.readDNA(8),
      this.readDNA(8),
      this.readDNA(8),
      this.readDNA(8),
      this.readDNA(8),
    ];

    this.sound = {
      index: -1, // gets incremented straight away
      ticks: 0,
      volume: 1,
      pitch: 0,
      duration: 0.1,
      transpose: 0,
      wave: 'sine',
    };

    // this.dtDepth = this.readDNA(1, 16)[0];
    this.dtDepth = 4;
    this.dtDNA = this.readDNA(46);

    // Random body (3-6 vertices)
    this.bodyVertexCount = 3 + floor(this.readDNA(1)[0] * 4);
    this.makeBody(this.readDNA(6));

    this.recalculateSenses();
    this.senseKeys = Object.keys(this.senses);
  }

  generateDNA(length) {
    return Array.from({ length }, random);
  }

  readDNA(count, values) {
    return this.dna.splice(0, count).map(x => values ? floor(values * x) : x);
  }

  makeBody(dna) {
    this.body = [];
    for (let i = 0; i < this.bodyVertexCount; ++i) {
      let angle = i * 360 / this.bodyVertexCount;
      let radius = this.size * map(dna[i], 0, 1, 0.5, 1.5);
      let px = cos(angle) * radius;
      let py = sin(angle) * radius;
      this.body.push([px, py]);
    }

    // Stroke needs to be here for some reason
    stroke(this.darkerColour);
    strokeWeight(1);
    this.bodyGeom = buildGeometry(() => {
      beginShape();
      for (let p of this.body) {
        vertex(...p);
      }
      endShape(CLOSE);
    });

    // // stroke('black');
    // // strokeWeight(3);
    // this.outlineGeom = buildGeometry(() => {
    //   beginShape();
    //   for (let p of this.body) {
    //     vertex(...p);
    //   }
    //   endShape(CLOSE);
    // });
  }

  update() {
    // Drifting
    if (abs(randomMovement) > 0) {
      if (abs(this.x - this.target[0]) > 2 || abs(this.y - this.target[1]) > 2) {
        let angle = atan2(this.target[1] - this.y, this.target[0] - this.x);
        this.x += cos(angle) * randomMovement;
        this.y += sin(angle) * randomMovement;
      } else {
        this.target = [random(gameSize), random(gameSize)];
      }
    }

    if (frameCount % 5 == 0) {
      this.recalculateSenses();
      this.mode = this.decideMode();
    }

    this.run(this.modes[this.mode]);
    this.runSound(this.soundModes[this.mode]);

    for (let p in selectionPressures)
      if (selectionPressures[p](this)) destroy(this);

    // Slowly die
    // this.age += delta;
    // this.health -= pow(1.5, floor(this.age / 30)) * 0.001;
    if (this.health <= 0 || this.energy <= -1)
      return destroy(this);

    // Constrain pos
    this.x = constrain(this.x, this.size / 2, gameSize - this.size / 2);
    this.y = constrain(this.y, this.size / 2, gameSize - this.size / 2);
  }

  drawEnt() {
    rectMode(CENTER);
    stroke(this.darkerColour);
    strokeWeight(1);
    fill(this.colour);

    push();
    translate(this.x, this.y);
    rotate(this.direction);
    // circle(0, 0, this.size);

    if (selectedObj == this) {
      stroke('black');
      strokeWeight(3);
    }
    model(this.bodyGeom);

    stroke(this.darkerColour);
    strokeWeight(1);
    line(0, 0, 0, this.size / 2 + 1);
    pop();
  }

  recalculateSenses() {
    let {
      closestOther,
      closestDist,
      closestFood,
      closestFoodDist,
    } = findClosest(this);

    let closestAngle = random();
    if (closestOther) {
      closestAngle = atan2(closestOther.y - this.y, closestOther.x - this.x);
      closestAngle = (closestAngle + 360) / 360 % 1;
    }

    let closestFoodAngle = random();
    if (closestFood) {
      closestFoodAngle = atan2(closestFood.y - this.y, closestFood.x - this.x);
      closestFoodAngle = (closestFoodAngle + 360) / 360 % 1;
    }

    closestAngle = fixNum(closestAngle);
    closestFoodAngle = fixNum(closestFoodAngle);
    closestDist = fixNum(closestDist);
    closestFoodDist = fixNum(closestFoodDist);

    let closestOtherHealth = closestOther ? constrain(closestOther.obj.health / 10, 0, 1) : 0;
    let closestOtherEnergy = closestOther ? constrain(closestOther.obj.energy / 10, 0, 1) : 0;

    this.senses = {
      x: this.x / gameSize,
      y: this.y / gameSize,
      health: constrain(this.health / 10, 0, 1),
      energy: constrain(this.energy / 10, 0, 1),
      size: constrain((this.size - 3) / 12, 0, 1),
      direction: this.direction / 360,
      overpopulation: constrain(objects.length / 150, 0, 1),
      closestOtherAngle: closestAngle,
      closestOtherDist: closestOther ? constrain(sqrt(closestDist) / (gameSize * Math.SQRT2), 0, 1) : 1,
      closestOtherHealth,
      closestOtherEnergy,
      closestFoodAngle,
      closestFoodDist: closestFood ? constrain(sqrt(closestFoodDist) / (gameSize * Math.SQRT2), 0, 1) : 1,
    };
  }

  decideMode() {
    let branches = 2 ** this.dtDepth - 1;
    let node = 0;

    for (let i = 0; i < this.dtDepth; ++i) {
      let feature = floor(constrain(this.dtDNA[node * 2], 0, 1 - 1e-6) * this.senseKeys.length);
      let threshold = constrain(this.dtDNA[node * 2 + 1], 0, 1);

      if (this.senses[this.senseKeys[feature]] < threshold)
        node = node * 2 + 1;
      else
        node = node * 2 + 2;
    }

    let leaf = node - branches;
    let mode = constrain(this.dtDNA[branches * 2 + leaf], 0, 1 - 1e-6);
    return floor(mode * this.modes.length);
  }

  run(nums) {
    /*

list of all bact sorted by distance

16
take value
- set reg to effort
- take random
- health
- size
- angle of closest bact
- health of closest bact
- size of closest bact
- check dna similarity between closest bact
- push towards reg
- look at reg
- threshold reg
- skip next instruction if r0 < r1
- breed
- kill

point towards

    */

    let r0 = this.r0;
    let r1 = this.r1;

    // if (sameColour(this.colour, 'white')) {
    //   console.log('same!!!!!!!!!');
    //   console.log(nums);
    //   for (let i = 0; i < nums.length; i += 2) {
    //     console.log(floor(11 * nums[i]));
    //   }
    // }

    // console.log(closestAngle, closestDist, closestFoodAngle, closestFoodDist);

    if (!nums) return;

    for (let i = 0, loops = 0; i < nums.length && loops < 50; ++i, ++loops) {
      let value = 27 * nums[i];
      let inst = floor(value);
      value -= inst;

      if (inst == 0)
        continue;
      else if (--inst == 0) // take value from this instruction into r0
        r0 = value;
      else if (--inst == 0) // take value from this instruction into r1
        r1 = value;
      else if (--inst == 0) // r0 = 1 - r0
        r0 = 1 - r0;
      else if (--inst == 0) // take random
        r0 = random();
      else if (inst == 20) // take health
        r0 = this.health / 10;
      else if (inst == 21) // take energy
        r0 = this.energy / 10;
      else if (--inst == 0) // take angle of closest creature
        r0 = this.senses.closestOtherAngle;
      else if (--inst == 0) // take distance to closest creature
        r0 = this.senses.closestOtherDist;
      else if (--inst == 0) // take angle of closest food
        r0 = this.senses.closestFoodAngle;
      else if (--inst == 0) // take distance to closest food
        r0 = this.senses.closestFoodDist;
      else if (--inst == 0) // take health of closest creature
        r0 = this.senses.closestOtherHealth;
      else if (--inst == 0) // take energy of closest creature
        r0 = this.senses.closestOtherEnergy;
      else if (--inst == 0) // r0 += r1 (mod 1)
        r0 = (r0 + r1) % 1;
      else if (--inst == 0) // r0 = abs(r0 - r1)
        r0 = abs(r0 - r1);
      else if (--inst == 0) // swap r0 and r1
        [r0, r1] = [r1, r0];
      else if (--inst == 0) // threshold r0
        r0 = r0 > r1 ? 1 : 0;

      else if (--inst == 0 && this.energy > 0) { // push towards current direction
        this.energy -= 0.000005 * this.size * r0;
        this.x += r0 * cos(this.direction);
        this.y += r0 * sin(this.direction);
      }
      else if (--inst == 0 && this.energy > 0) { // push away from current direction
        this.energy -= 0.000005 * this.size * r0;
        this.x -= r0 * cos(this.direction);
        this.y -= r0 * sin(this.direction);
      }
      else if (--inst == 0) { // turn relative
        this.energy -= 0.0000005 * this.size * abs(r0 - 0.5);
        this.direction = (this.direction + (r0 - 0.5) * 45 + 360) % 360;
      }
      else if (--inst == 0) { // look at r0
        this.energy -= 0.0000005 * this.size;
        this.direction = 360 * r0;
      }

      else if (--inst == 0 && r0 < r1) // skip next instruction if r0 < r1
        ++i;
      // else if (--inst == 0) { // switch modes to r0
      //   this.mode = constrain(floor(r0 * this.modes.length), 0, this.modes.length - 1);
      //   return;
      //   // let idx = r1 * (nums.length - 1);
      //   // idx -= idx % 2;
      //   // i = idx - 1;
      // }
      // else if (--inst == 0 && r0 > 0.5) { // cycle modes if r0 > 0.5
      //   this.mode = (this.mode + 1) % this.modes.length;
      //   return;
      // }
      else if (--inst == 0 && millis() - this.lastBred > 250) { // breed
        let energyToGive = constrain(r0, 0.1, 1);
        let hit = this.touch();
        if (hit && hit.tag == 'creature' && this.energy > energyToGive + 0.5) {
          this.energy -= energyToGive;
          this.breed(hit, energyToGive);
          this.lastBred = millis();
        }
      }
      else if (--inst == 0 && millis() - this.lastKill > 500) { // kill
        let hit = this.touch();
        if (hit && hit.tag == 'creature') {
          this.health += min(1, hit.health);
          this.energy += min(1, hit.energy);
          --hit.health;
          --hit.energy;
          // if (hit.health <= 0)
          //   destroy(hit);
          this.lastKill = millis();
        }
      }
      else if (--inst == 0 && millis() - this.lastEat > 100) { // eat
        let hit = this.touch();
        if (hit && hit.tag == 'food') {
          this.health += min(1, hit.health);
          this.energy += hit.energy;
          --hit.health;
          hit.energy = 0;
          // if (hit.health <= 0)
          //   destroy(hit);
          this.lastEat = millis();
        }
      }
      else if (--inst == 0 && this.energy > 0.25 && millis() - this.lastBred > 500) { // mitosis
        this.mitosis();
        this.lastBred = millis();
      }

      // else if (--inst == 0 && this.health > 1 && millis() - this.lastConvert > 200) { // convert health to energy
      //   this.health -= r0;
      //   this.energy += r0;
      //   this.lastConvert = millis();
      // }
      // else if (--inst == 0 && this.energy > 1 && millis() - this.lastConvert > 200) { // convert energy to health
      //   this.energy -= r0;
      //   this.health += r0;
      //   this.lastConvert = millis();
      // }

      r0 = constrain(abs(r0), 0, 1);
      r1 = constrain(abs(r1), 0, 1);
    }

    // Save for other frames
    this.r0 = r0;
    this.r1 = r1;
  }

  runSound(code) {
    let s = this.sound;

    // Continue playing sounds
    if ((s.ticks -= delta) > 0) return;

    s.index = (s.index + 1) % code.length;
    let value = 6 * code[s.index];
    let inst = floor(value);
    value -= inst;
    s.ticks = 0;

    if (inst == 0) { // play note [C1, C7]
      // Alg for getting note from value (24 = C1, 96 = C7)
      let note = floor(map(value, 0, 1, 24, 97)) + s.transpose;
      s.pitch = 440 * 2 ** ((note - 69) / 12);
      s.ticks = s.duration;
    }
    else if (--inst == 0) { // sleep [0s-1s]
      s.pitch = 0;
      s.ticks = value;
    }
    else if (--inst == 0) // use wave [sine, sawtooth, square, triangle]
      s.wave = ['sine', 'sawtooth', 'square', 'triangle'][floor(4 * value)];
    else if (--inst == 0) // bpm [32, 240]
      s.duration = 60 / floor(map(value, 0, 1, 30, 241));
    else if (--inst == 0) // tranpose [-12, 12]
      s.transpose = (s.transpose + floor(map(value, 0, 1, -12, 13))) % 12;
    else if (--inst == 0) // volume [0.25, 1]
      s.volume = map(value, 0, 1, 0.25, 1);
  }

  touch() {
    let dx = (this.size / 2 - 1) * cos(this.direction);
    let dy = (this.size / 2 - 1) * sin(this.direction);
    let hit1 = collidingWith(this.x + dx, this.y + dy, this);
    let hit2 = collidingWith(this.x, this.y, this);
    hit1 = hit1 == this ? null : hit1;
    hit2 = hit2 == this ? null : hit2;
    let hit = hit1 || hit2;
    if (hit != this)
      return hit;
    return null;
  }

  spliceDNA(ca, cb) {
    let a = ca.origDNA;
    let b = cb.origDNA;
    let dna = [];
    let totalDominance = ca.geneDominance + cb.geneDominance;
    let bDominance = totalDominance ? cb.geneDominance / totalDominance : 0.5;

    let modeLen = ca.modes[0].length;
    let codeStart = 5;
    let codeEnd = codeStart + ca.modes.length * modeLen;
    let takeB = false;

    for (let i = 0; i < a.length; ++i) {
      if (i < codeStart || i >= codeEnd || (i - codeStart) % modeLen == 0)
        takeB = random() < bDominance;

      let take = takeB ? b[i] : a[i];
      if (random() < 0.01)
        take = random();
      take = fixNum(take);
      if (random() < 0.05)
        take += random(-0.05, 0.05);
      dna.push(constrain(take, 0, 1 - 1e-6));
    }

    return dna;
  }

  breed(other, energy) {
    if (!other || other == this) return;

    // destroy(this);
    let dna = this.spliceDNA(this, other);
    spawn(Creature, this.x, this.y, dna, energy, energy);
    // console.log(creature.energy);
    // console.log('bred!', creature.energy);
  }

  mitosis() {
    let dx = (this.size / 2 - 1) * cos(this.direction);
    let dy = (this.size / 2 - 1) * sin(this.direction);
    this.health *= 0.5;
    this.energy *= 0.5;
    let dna = this.spliceDNA(this, this);
    spawn(Creature, this.x + dx, this.y + dy, dna, this.health, this.energy);
  }
}
