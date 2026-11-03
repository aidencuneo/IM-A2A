class Creature {
  constructor(x, y, dna, health, energy) {
    this.tag = 'creature';

    // Get DNA
    // if (dna && dna.length != 0 && dna.length != 24)
    //   console.error(dna.length);
    this.dna = (dna || []).length > 0 ? dna : this.generateDNA(13 * 3 + 5);
    this.origDNA = [...this.dna];
    // print(this.dna);

    // State
    this.target = [random(gameSize), random(gameSize)];
    this.x = x ?? random(gameSize);
    this.y = y ?? random(gameSize);
    this.direction = random(360);
    this.age = 0;

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
    this.size = map(this.readDNA(1)[0], 0, 1, 5, 10);
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
      this.readDNA(13),
      this.readDNA(13),
      this.readDNA(13),
    ]

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

    // Slowly die
    this.age += delta;
    this.health -= pow(1.5, floor(this.age / 30)) * 0.001;
    if (this.health <= 0)
      destroy(this);

    if (this.energy < 0)
      this.energy = 0;

    // if (this.mode > 0)
    //   console.log(this.mode, this.modes[this.mode]);
    this.run(this.modes[this.mode]);

    // if (this.x > gameSize / 2)
    //   destroy(this);

    // Constrain pos
    this.x = constrain(this.x, this.size / 2, gameSize - this.size / 2);
    this.y = constrain(this.y, this.size / 2, gameSize - this.size / 2);
  }

  drawEnt() {
    rectMode(CENTER);
    stroke(this.darkerColour);
    if (this.debug) {
      stroke('black');
      strokeWeight(3);
    }
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

    let r0 = 0;
    let r1 = 0;

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

    for (let i = 0, loops = 0; i < nums.length && loops < 50; ++i, ++loops) {
      let inst = floor(20 * nums[i]);
      // let next = i + 1 < nums.length ? nums[i + 1] : 0;
      // 6 10 1 1 8 14 12
      // 0 1 6 8 13 15

      if (inst == 0)
        continue;
      else if (--inst == 0 && i + 1 < nums.length) // take next num into r0
        r0 = nums[++i];
      else if (--inst == 0 && i + 1 < nums.length) // take next num into r1
        r1 = nums[++i];
      else if (--inst == 0) // r0 = 1 - r0
        r0 = 1 - r0;
      else if (--inst == 0) // take random
        r0 = random();
      else if (--inst == 0) // take angle of closest creature
        r0 = closestAngle;
      else if (--inst == 0 && closestOther) // take distance to closest creature
        r0 = closestDist;
      else if (--inst == 0) // take angle of closest food
        r0 = closestFoodAngle;
      else if (--inst == 0) // take distance to closest food
        r0 = closestFoodDist;
      else if (--inst == 0) // take overpopulation ratio
        r0 = objects.length / 100;
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
      else if (--inst == 0) // look at r0
        this.direction = 360 * r0;
      else if (--inst == 0) // threshold r0
        r0 = r0 > r1 ? 1 : 0;
      else if (--inst == 0) { // switch modes to r0
        this.mode = constrain(floor(r0 * this.modes.length), 0, this.modes.length - 1);
        return;
        // let idx = r1 * (nums.length - 1);
        // idx -= idx % 2;
        // i = idx - 1;
      }
      else if (--inst == 0 && r0 > 0.5) { // cycle modes if r0 > 0.5
        this.mode = (this.mode + 1) % this.modes.length;
        return;
      }
      else if (--inst == 0 && millis() - this.lastBred > 250) { // breed
        let energyToGive = constrain(r0, 0.1, 1);
        let hit = this.touch();
        if (hit && hit.tag == 'creature' && this.energy > energyToGive + 0.5) {
          this.energy -= energyToGive;
          this.breed(hit, r0);
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
      else if (--inst == 0 && this.health > 1 && millis() - this.lastConvert > 200) { // convert health to energy
        this.health -= r0;
        this.energy += r0;
        this.lastConvert = millis();
      }
      else if (--inst == 0 && this.energy > 1 && millis() - this.lastConvert > 200) { // convert energy to health
        this.energy -= r0;
        this.health += r0;
        this.lastConvert = millis();
      }

      r0 = constrain(abs(r0), 0, 1);
      r1 = constrain(abs(r1), 0, 1);
    }
  }

  touch() {
    let dx = (this.size / 2 - 1) * cos(this.direction);
    let dy = (this.size / 2 - 1) * sin(this.direction);
    let hit1 = collidingWith(this.x + dx, this.y + dy);
    let hit2 = collidingWith(this.x, this.y);
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
    let bDominance = cb.geneDominance / (ca.geneDominance + cb.geneDominance);

    for (let i = 0; i < ceil((a.length + b.length) / 2); ++i) {
      let take = a[i];
      if (random() < 0.01)
        take = random();
      else if (random() < bDominance)
        take = b[i];
      take = fixNum(take)
      take += random(-0.01, 0.01);
      dna.push(take);
    }

    return dna;
  }

  breed(other, energy) {
    if (!other || other == this) return;

    // destroy(this);
    let dna = this.spliceDNA(this, other);
    spawn(Creature, this.x, this.y, dna, 1, energy);
    // console.log(creature.energy);
    // console.log('bred!', creature.energy);
  }

  mitosis() {
    let dx = (this.size / 2 - 1) * cos(this.direction);
    let dy = (this.size / 2 - 1) * sin(this.direction);
    this.energy *= 0.5;
    spawn(Creature, this.x + dx, this.y + dy, this.origDNA, 1, this.energy);
  }
}
