let osc = null;

function startSounds() {
  if (osc) return;

  userStartAudio();
  osc = new p5.Oscillator(263.61, 'sine');
  osc.amp(0);
  osc.start();
}

function updateSounds() {
  if (!osc) return;

  // Closest is the selected creature OR the one nearest to the mouse
  let closest = selectedObj;
  let closestDist = 0;
  if (!closest) {
    closestDist = 50 * 50;
    for (let c of objects) {
      if (c.tag != 'creature')
        continue;

      let dx = c.x - mx;
      let dy = c.y - my;
      let d = dx * dx + dy * dy;
      if (d < closestDist) {
        closestDist = d;
        closest = c;
      }
    }
  }

  let volume = 0;
  let s = closest?.sound;

  if (s && !closest.dead && s.pitch > 0 && s.ticks > 0) {
    volume = (1 - sqrt(closestDist) / 50) ** 2 * 0.08 * s.volume;
    osc.freq(s.pitch, 0.02);

    if (osc.type != s.wave)
      osc.setType(s.wave);
  }

  osc.amp(volume, 0.04);
}
