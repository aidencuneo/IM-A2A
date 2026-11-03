class Creature {
  constructor(x, y, dna, health, energy) {
    this.tag = 'creature';

    // Get DNA
    // if (dna && dna.length != 0 && dna.length != 24)
    //   console.error(dna.length);
    this.dna = (dna || []).length > 0 ? dna : this.generateDNA(24);
    // print(this.dna);

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
    this.size = map(this.readDNA(1)[0], 0, 1, 5, 10);
    this.energy = energy ?? 1;
    this.health = health ?? 1;

    this.colour = color(...this.readDNA(3, 255));
    colorMode(HSL);
    this.darkerColour = color(hue(this.colour), saturation(this.colour), lightness(this.colour) - 20);
    colorMode(RGB);
    // this.startCode = this.readDNA(10);
    this.loopCode = this.readDNA(24 - 4);

    // TODO: Change to procedural body instead
    // this.run(this.startCode);
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
      this.x += cos(angle) * 0.05;
      this.y += sin(angle) * 0.05;
    } else {
      this.target = [random(gameSize), random(gameSize)];
    }

    // Constrain pos
    this.x = constrain(this.x, this.size / 2, gameSize - this.size / 2);
    this.y = constrain(this.y, this.size / 2, gameSize - this.size / 2);

    // Slowly die
    this.health -= 0.002;
    if (this.health <= 0)
      destroy(this);

    if (this.energy < 0)
      this.energy = 0;

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
    let closestFood = null;
    let closestFoodDist = Infinity;
    for (let i = 0; i < objects.length; ++i) {
      let other = objects[i];
      let distSqr = createVector(other.x - this.x, other.y - this.y).magSq();

      if (other.tag == 'creature') {
        if (distSqr < closestDist && this != other) {
          closestOther = other;
          closestDist = distSqr;
        }
      } else if (other.tag == 'food') {
        if (distSqr < closestFoodDist && this != other) {
          closestFood = other;
          closestFoodDist = distSqr;
        }
      }
    }

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

    // if (sameColour(this.colour, 'white')) {
    //   console.log('same!!!!!!!!!');
    //   console.log(nums);
    //   for (let i = 0; i < nums.length; i += 2) {
    //     console.log(floor(11 * nums[i]));
    //   }
    // }

    // console.log(closestAngle, closestDist, closestFoodAngle, closestFoodDist);

    for (let i = 0, loops = 0; i < nums.length && loops < 100; i += 2, ++loops) {
      let inst = floor(20 * nums[i]);
      let effort = i + 1 < nums.length ? nums[i + 1] : 0;

      if (inst == 0) // take effort
        reg = effort;
      else if (inst == 1) // take random
        reg = random();
      else if (inst == 2) // take angle of closest creature
        reg = closestAngle;
      else if (inst == 3 && closestOther) // take distance to closest creature
        reg = closestDist;
      else if (inst == 4) // take angle of closest food
        reg = closestFoodAngle;
      else if (inst == 5) // take distance to closest food
        reg = closestFoodDist;
      else if (inst == 6 && this.energy > 0) { // push towards reg
        this.energy -= 0.00001 * this.size * effort;
        this.x += effort * cos(reg * 360);
        this.y += effort * sin(reg * 360);
      }
      else if (inst == 7 && this.energy > 0) { // push away from reg
        this.energy -= 0.00001 * this.size * effort;
        this.x -= effort * cos(reg * 360);
        this.y -= effort * sin(reg * 360);
      }
      else if (inst == 8) // look at reg
        this.direction = 360 * reg;
      else if (inst == 9) // threshold reg
        reg = reg > effort ? 1 : 0;
      else if (inst == 10 && reg > 0.5) { // jump to effort if reg > 0.5
        let idx = effort * (nums.length - 1);
        idx -= idx % 2;
        i = idx - 1;
      }
      else if (inst == 11 && this.energy > reg && millis() - this.lastBred > 1000) { // breed
        // console.log(this.energy, reg);
        let dx = (this.size / 2) * cos(this.direction);
        let dy = (this.size / 2) * sin(this.direction);
        // console.log(this.x, this.y);
        let hit1 = collidingWith(this.x + dx, this.y + dy);
        let hit2 = collidingWith(this.x, this.y);
        hit1 = hit1 == this ? null : hit1;
        hit2 = hit2 == this ? null : hit2;
        let hit = hit1 || hit2;
        if (hit && hit != this) {
          this.energy -= reg;
          this.breed(hit, reg);
          this.lastBred = millis();
        }
      } else if (inst == 12 && millis() - this.lastKill > 500) { // kill
        let dx = (this.size / 2) * cos(this.direction);
        let dy = (this.size / 2) * sin(this.direction);
        let hit1 = collidingWith(this.x + dx, this.y + dy);
        let hit2 = collidingWith(this.x, this.y);
        hit1 = hit1 == this ? null : hit1;
        hit2 = hit2 == this ? null : hit2;
        let hit = hit1 || hit2;
        if (hit && hit != this) {
          this.health += min(1, hit.health);
          this.energy += min(1, hit.energy);
          --hit.health;
          --hit.energy;
          // if (hit.health <= 0)
          //   destroy(hit);
          this.lastKill = millis();
        }
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

    // destroy(this);
    let dna = this.spliceDNA(this.dna, other.dna);
    let creature = spawn(Creature, this.x, this.y, dna, 1, energy);
    // console.log(creature.energy);
    // console.log('bred!', creature.energy);
  }
}
