class Food {
  constructor(x, y, health, energy, size) {
    this.tag = 'food';
    this.x = x ?? random(gameSize);
    this.y = y ?? random(gameSize);
    this.health = health ?? 5;
    this.energy = energy ?? random(1, 20);
    this.size = size ?? map(this.energy, 0, 20, 5, 10);

    this.colour = 'green';
    colorMode(HSL);
    this.darkerColour = color(hue(this.colour), saturation(this.colour), lightness(this.colour) - 10);
    colorMode(RGB);
  }

  drawEnt() {
    rectMode(CENTER);
    let c = lerpColor(color('white'), color('green'), this.energy / 20);
    // print(c);
    fill(c);
    stroke(this.darkerColour);
    square(this.x, this.y, this.size);
  }

  update() {
    this.health -= delta / 10;
    if (this.health <= 0)
      destroy(this);
  }
}
