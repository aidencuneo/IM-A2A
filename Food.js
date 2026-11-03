class Food {
  constructor(x, y, health, energy, size) {
    this.tag = 'food';
    this.x = x ?? random(gameSize);
    this.y = y ?? random(gameSize);
    this.health = health ?? 1;
    this.energy = energy ?? random(1, 5);
    this.size = size ?? map(this.energy, 0, 5, 5, 10);
  }

  drawEnt() {
    rectMode(CENTER);
    let c = lerpColor(color('white'), color('green'), this.energy / 5);
    // print(c);
    fill(c);
    stroke('black');
    square(this.x, this.y, this.size);
  }

  drawColl() {
    rectMode(CENTER);
    let c = getNextCollColour(this);
    fill(c);
    stroke(c);
    square(this.x, this.y, this.size);
  }

  update() {
    if (this.health <= 0)
      destroy(this);
  }
}
