class Creature {
  constructor(x, y, dna, health, energy) {
    this.tag = 'creature';

    // Get DNA
    this.dna = (dna || []).length > 0 ? dna : this.generateDNA(64);

    // State
    this.target = [random(gameSize), random(gameSize)];
    this.x = x ?? random(gameSize);
    this.y = y ?? random(gameSize);
    this.direction = random(360)

    // Cooldowns
    this.lastKill = millis();
    this.lastBred = millis();

    // Stats
    // health and damage prop to size
    // use more energy when moving with more size
    // bacteria can "sense" other bacteria and can move towards them
    // all actions have effort that can be put into them
    //   effort is the amount of energy to use

    // Read more stuff from DNA
    this.size = 5 * this.readDNA(1) + 5;
    this.energy = energy ?? 1;
    this.health = health ?? 1;

    this.colour = color(...this.readDNA(3, 255));
    colorMode(HSL);
    this.darkerColour = color(hue(this.colour), saturation(this.colour), lightness(this.colour) - 20);
    colorMode(RGB);
    // this.startCode = this.readDNA(10);
    this.loopCode = this.readDNA(64 - 4);

    // TODO: Change to procedural body instead
    // this.run(this.startCode);

    // if (millis() - this.lastCrack > 5000) {
    //   this.crack();
    //   this.lastCrack = millis();
    // }
  }

  generateDNA(length) {
    return Array.from({ length }, random);
  }

  readDNA(count, values) {
    return this.dna.splice(0, count).map(x => values ? floor(values * x) : x);
  }

  update() {
    // Move around randomly
    if (abs(this.x - this.target[0]) > 2 || abs(this.y - this.target[1]) > 2) {
      let angle = atan2(this.target[1] - this.y, this.target[0] - this.x);
      this.x += cos(angle) * 0.02;
      this.y += sin(angle) * 0.02;
    } else {
      this.target = [random(gameSize), random(gameSize)];
    }

    // Constrain pos
    this.x = constrain(this.x, this.size / 2, gameSize - this.size / 2);
    this.y = constrain(this.y, this.size / 2, gameSize - this.size / 2);

    // Slowly die
    this.health -= 0.0002;
    if (this.health <= 0)
      destroy(this);

    this.run(this.loopCode);

    // if (this.x > gameSize / 2)
    //   destroy(this);
  }

  drawEnt() {
    rectMode(CENTER);
    stroke(this.darkerColour);
    fill(this.colour);
    circle(this.x, this.y, this.size);
    let dx = cos(this.direction) * (this.size / 2 + 1);
    let dy = sin(this.direction) * (this.size / 2 + 1);
    stroke(this.colour);
    strokeWeight(1);
    stroke(this.darkerColour);
    line(this.x, this.y, this.x + dx, this.y + dy);
  }

  drawColl() {
    let c = getNextCollColour(this);
    fill(c);
    stroke(c);
    circle(this.x, this.y, this.size);
  }

  crack() {
    let newDNA = this.dna.map(x => random() < 0.01 ? random() : x);
    spawn(new Creature(newDNA));
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
- jump if reg
- breed
- kill

point towards

    */

    let reg = 0;

    // Get closest creature to this one
    let closestOther = null;
    let closestDist = Infinity;
    for (let i = 0; i < objects.length; ++i) {
      let other = objects[i];
      let distSqr = createVector(other.x - this.x, other.y - this.y).magSq();
      if (distSqr < closestDist && this != other) {
        closestOther = other;
        closestDist = distSqr;
      }
    }

    let closestAngle = 0;
    if (closestOther) {
      closestAngle = atan2(closestOther.y - this.y, closestOther.x - this.x);
      closestAngle = (closestAngle + 360) / 360 % 1;
      // this.direction = closestAngle * 360;
      // console.log(closestAngle);
    }

    for (let i = 0, loops = 0; i < nums.length && loops < 100; i += 2, ++loops) {
      let inst = floor(13 * nums[i]);
      let effort = i + 1 < nums.length ? nums[i + 1] : 0;

      if (inst == 0) // take effort
        reg = effort;
      else if (inst == 1) // take random
        reg = random();
      else if (inst == 2) // take health
        reg = this.health;
      else if (inst == 3) // take size
        reg = this.size / 10;
      else if (inst == 4) // take angle of closest creature
        reg = closestAngle;
      else if (inst == 5 && closestOther) // take health of closest creature
        reg = closestOther.health;
      else if (inst == 6 && closestOther) // take size of closest creature
        reg = closestOther.size / 10;
      else if (inst == 7 && this.energy > 0.05) { // push towards reg
        // this.energy -= 0.01 * this.size * effort;
        this.x += effort * cos(reg * 360);
        this.y += effort * sin(reg * 360);
      } else if (inst == 8) // look at reg
        this.direction = 360 * reg;
      else if (inst == 9) // threshold reg
        reg = reg > effort ? 1 : 0;
      else if (inst == 10) { // jump to effort if reg
        let idx = effort * (nums.length - 1);
        idx -= idx % 2;
        i = idx - 1;
      }
      else if (inst == 11 && this.energy > reg + 0.5 && millis() - this.lastBred > 1000) { // breed
        // console.log(this.energy, reg);
        this.energy -= reg + 0.5;
        let dx = (this.size / 2 + 2) * cos(this.direction);
        let dy = (this.size / 2 + 2) * sin(this.direction);
        let hit1 = collidingWith(this.x + dx, this.y + dy);
        let hit2 = collidingWith(this.x, this.y);
        hit1 = hit1 == this ? null : hit1;
        hit2 = hit2 == this ? null : hit2;
        let hit = hit1 || hit2;
        this.breed(hit, reg);
        this.lastBred = millis();
      } else if (inst == 12 && this.lastKill > 1000) { // kill
        let dx = (this.size / 2 + 2) * cos(this.direction);
        let dy = (this.size / 2 + 2) * sin(this.direction);
        let hit1 = collidingWith(this.x + dx, this.y + dy);
        let hit2 = collidingWith(this.x, this.y);
        hit1 = hit1 == this ? null : hit1;
        hit2 = hit2 == this ? null : hit2;
        let hit = hit1 || hit2;
        if (hit && hit != this) {
          this.health += hit.health;
          this.energy += hit.energy;
          destroy(hit);
        }
        this.lastKill = millis();
      }

      reg = constrain(abs(reg), 0, 1);
    }
  }

  spliceDNA(a, b) {
    let dna = [];
    for (let i = 0; i < a.length; ++i) {
      if (random() < 0.02) {
        dna.push(random());
        continue;
      }
      let avg = (a[i] + b[i]) / 2;
      avg += random(-0.02, 0.02);
      dna.push(avg);
    }
    return dna;
  }

  breed(other, energy) {
    if (!other || other == this) return;

    destroy(this);
    let dna = this.spliceDNA(this.dna, other.dna);
    let creature = spawn(Creature, this.x, this.y, dna, 1, energy);
    // console.log(creature.energy);
    console.log('bred!', creature.energy);
  }
}
