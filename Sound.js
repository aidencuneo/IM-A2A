let osc = null;

function startSounds() {
    if (osc) return;

    userStartAudio();
    osc = new p5.Oscillator(263.61, 'sine');
    osc.amp(0);
    osc.start();
}
