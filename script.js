/* Pixel Sword Battle - 4 Player (local)
   - Movement keys same seperti sebelumnya
   - Attack keys: P1=F, P2=M, P3=O, P4=0 (nol)
   - Pixel-style rendering with simple "sprite" blocks
   - Sword swing is a short-lived rectangle in front of player
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Make pixel look
ctx.imageSmoothingEnabled = false;

let gameOver = false;
let timer = 60;
const timerEl = document.getElementById('timer');
const announcementEl = document.getElementById('announcement');
const hpRow = document.getElementById('hpRow');

let ticker = setInterval(() => {
  if (!gameOver) {
    timer--;
    timerEl.textContent = 'Time: ' + timer;
    if (timer <= 0) endGame();
  }
}, 1000);

// Simple pixel-drawing helper: draw a sprite matrix (array of strings) scaled
function drawSprite(x, y, sprite, scale = 2) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === ' ') continue;
      // determine color by char
      let color = ch;
      // allow passing actual color chars (we'll use real colors)
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

// Player definitions
const players = [
  { name: 'P1', x: 50,  y: 50,  color: 'red',    hp: 100, keys: { up: 'w', down: 's', left: 'a', right: 'd', attack: 'f' }, alive: true },
  { name: 'P2', x: 560, y: 50,  color: 'blue',   hp: 100, keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', attack: 'm' }, alive: true },
  { name: 'P3', x: 50,  y: 380, color: 'lime',   hp: 100, keys: { up: 'i', down: 'k', left: 'j', right: 'l', attack: 'o' }, alive: true },
  { name: 'P4', x: 560, y: 380, color: 'yellow', hp: 100, keys: { up: '8', down: '5', left: '4', right: '6', attack: '0' }, alive: true }
];

const pixelScale = 3; // each "pixel" is 3x3 canvas px
const spriteW = 6; // width in "pixels"
const spriteH = 8; // height in "pixels"
const speed = 3;

const keysPressed = {};
document.addEventListener('keydown', e => { keysPressed[e.key] = true; });
document.addEventListener('keyup', e => { keysPressed[e.key] = false; });

// sword mechanics
const swingDuration = 200; // ms
const swingRange = 20; // pixels beyond sprite
const swingDamage = 30;
const swingCooldown = 500; // ms between swings

// per-player swing state
players.forEach(p => {
  p.swinging = false;
  p.lastSwing = 0;
  p.lastHitTime = 0;
  p.facing = 'right'; // default facing
});

// simple pixel "body" matrix (uses player's color string to draw filled pixels)
function genSprite(color){
  // Use string rows where non-space draws colored pixel
  // simple tiny humanoid: 6x8
  return [
    '  ' + color + color + '  ',
    '  ' + color + color + '  ',
    ' ' + color + color + color + color + ' ',
    ' ' + color + color + color + color + ' ',
    '  ' + color + color + '  ',
    ' ' + color + '  ' + color + ' ',
    color + '      ' + color, // arms down look
    ' ' + color + color + color + color + ' '
  ].map(row => row.replace(/ /g,' ')); // keep spaces
}

// draw HP HUD
function updateHUD(){
  hpRow.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'hp-box';
    const aliveText = p.alive ? '' : ' (DEAD)';
    div.innerHTML = `<strong>${p.name}${aliveText}</strong> — HP: ${Math.max(0,p.hp)}`;
    hpRow.appendChild(div);
  });
}

// collision helpers
function rectsOverlap(r1, r2){
  return !(r1.x + r1.w < r2.x || r2.x + r2.w < r1.x || r1.y + r1.h < r2.y || r2.y + r2.h < r1.y);
}

function playerRect(p){
  return { x: p.x, y: p.y, w: spriteW*pixelScale, h: spriteH*pixelScale };
}

function swingRectFor(p){
  const w = spriteW*pixelScale;
  const h = spriteH*pixelScale;
  if (p.facing === 'right') {
    return { x: p.x + w, y: p.y + (h/4), w: swingRange, h: h/2 };
  } else {
    return { x: p.x - swingRange, y: p.y + (h/4), w: swingRange, h: h/2 };
  }
}

// update loop
function update(delta){
  if (gameOver) return;

  players.forEach(p => {
    if (!p.alive) return;
    // Movement
    if (keysPressed[p.keys.up]) { p.y -= speed; p.facing = 'up'; }
    if (keysPressed[p.keys.down]) { p.y += speed; p.facing = 'down'; }
    if (keysPressed[p.keys.left]) { p.x -= speed; p.facing = 'left'; }
    if (keysPressed[p.keys.right]) { p.x += speed; p.facing = 'right'; }

    // Boundaries
    p.x = Math.max(0, Math.min(canvas.width - spriteW*pixelScale, p.x));
    p.y = Math.max(0, Math.min(canvas.height - spriteH*pixelScale, p.y));

    // Attack input
    if (keysPressed[p.keys.attack]) {
      const now = performance.now();
      if (now - p.lastSwing >= swingCooldown) {
        p.swinging = true;
        p.lastSwing = now;
        // schedule to stop swinging
        setTimeout(()=>{ p.swinging = false; }, swingDuration);
      }
    }
  });

  // handle swing collisions
  for (let i=0;i<players.length;i++){
    const a = players[i];
    if (!a.alive || !a.swinging) continue;
    const swingRect = swingRectFor(a);
    for (let j=0;j<players.length;j++){
      if (i===j) continue;
      const b = players[j];
      if (!b.alive) continue;
      // simple cooldown per hit so one swing doesn't hit repeatedly fast
      const now = performance.now();
      if (now - a.lastHitTime < 80) continue;
      if (rectsOverlap(swingRect, playerRect(b))){
        b.hp -= swingDamage;
        a.lastHitTime = now;
        // push target a bit (knockback)
        const push = (a.facing === 'left') ? -10 : (a.facing === 'right') ? 10 : (a.facing === 'up' ? -6 : 6);
        b.x += push;
        // death check
        if (b.hp <= 0) {
          b.alive = false;
        }
      }
    }
  }

  // check alive count
  const alive = players.filter(p=>p.alive);
  if (alive.length === 1) {
    announceWinner(alive[0].name);
  } else if (alive.length === 0) {
    announceWinner('No one (Draw)');
  }

  updateHUD();
}

// draw loop
function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // simple arena grid for pixel vibe (optional)
  // draw players sprites
  players.forEach(p=>{
    if (!p.alive) return;
    const sprite = genSprite(p.color);
    drawSprite(Math.round(p.x), Math.round(p.y), sprite, pixelScale);

    // HP bar above
    const barW = spriteW*pixelScale;
    ctx.fillStyle = '#222';
    ctx.fillRect(p.x, p.y - 8, barW, 6);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(p.x, p.y - 8, (Math.max(0,p.hp)/100) * barW, 6);

    // draw sword swing if swinging
    if (p.swinging) {
      const sr = swingRectFor(p);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
      // draw a "blade" pixel near player for style
      const bladeX = p.facing === 'left' ? p.x - 6 : p.x + spriteW*pixelScale + 2;
      const bladeY = p.y + (spriteH*pixelScale/2) - 4;
      ctx.fillStyle = '#ddd';
      ctx.fillRect(bladeX, bladeY, 6, 6);
    }
  });
}

// announce winner
function announceWinner(name){
  gameOver = true;
  announcementEl.textContent = '🏆 Winner: ' + name + ' 🏆';
  // stop timer
  clearInterval(ticker);
}

// main loop using requestAnimationFrame
let last = performance.now();
function loop(now){
  const delta = now - last;
  last = now;
  update(delta);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}
updateHUD();
requestAnimationFrame(loop);

// helper to end game when timer hits zero
function endGame(){
  const alive = players.filter(p=>p.alive);
  if (alive.length === 0) {
    announceWinner('No one (Draw)');
    return;
  }
  // find highest HP
  let winner = alive[0];
  for (let i=1;i<alive.length;i++){
    if (alive[i].hp > winner.hp) winner = alive[i];
  }
  announceWinner(winner.name);
           }
