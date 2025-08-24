// Simple confetti effect using canvas
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener("resize", resize); resize();

  const confetti = Array.from({length: 200}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 6 + 2,
    d: Math.random() * 10,
    color: `hsl(${Math.random() * 360},100%,50%)`,
    tilt: Math.random() * 10 - 10
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    confetti.forEach(c => {
      ctx.beginPath();
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.r, c.r);
    });
    update();
    requestAnimationFrame(draw);
  }

  function update() {
    confetti.forEach(c => {
      c.y += Math.cos(c.d) + 1 + c.r/2;
      c.x += Math.sin(c.d);
      if (c.y > H) {
        c.x = Math.random() * W;
        c.y = -10;
      }
    });
  }
  draw();
});
