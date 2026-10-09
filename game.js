(()=> {
'use strict';

const WORLD_WIDTH = 3000;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 48;
const WALK_SPEED = 175;
const RUN_SPEED = 245;
const STATION_X = 2500;
const intro = document.getElementById('intro');
const help = document.getElementById('help');
const hud = document.getElementById('hud');
const dialogue = document.getElementById('dialogue');
const chapter = document.getElementById('chapter');
const objective = document.getElementById('objective');
const toast = document.getElementById('toast');
let toastTimer = 0;

const story = [
  ['NARRATOR', '8:07 AM. The city smells like rain, warm bread, and exhaust. Nothing about today feels historic.'],
  ['MIRA', 'You said you would be early. The train leaves in six minutes!'],
  ['YOU', 'I am early. The clock is just being dramatic.'],
  ['NARRATOR', 'A siren winds through the distant streets. Nobody stops walking. Not yet.'],
  ['PHONE NOTIFICATION', 'CITY ALERT: Reports of a disturbance near Central Station. Please remain calm and follow official guidance.'],
  ['MIRA', '...Did you hear that? Why are all the emergency vehicles going the same way?'],
  ['NARRATOR', 'For a moment, the whole street seems to hold its breath. Then a shopkeeper pulls down the shutters.'],
  ['YOU', 'We should get to the station. Come on.']
];
const landmarks = [
  {x:370,w:170,h:.36,c:0x49657b,label:'BAKERY'},
  {x:790,w:205,h:.49,c:0x38516b,label:'BOOKSHOP'},
  {x:1320,w:185,h:.41,c:0x536b7b,label:'FLOWERS'},
  {x:1830,w:230,h:.54,c:0x354b63,label:'CITY CLINIC'},
  {x:STATION_X,w:260,h:.47,c:0x3b536b,label:'CENTRAL STATION'}
];
const checkpoints = [
  {id:'bakery', x:610, lines:[
    ['MIRA', 'That bakery is usually packed by now. Look at it. Nobody is even waiting outside.'],
    ['NARRATOR', 'The door is locked. A handwritten sign says CLOSED, though the lights are still on inside.'],
    ['YOU', 'Maybe they heard something before the rest of us.']
  ]},
  {id:'alert', x:1190, lines:[
    ['PHONE NOTIFICATION', 'CITY ALERT: Transit delays reported. Avoid Central Station until further notice.'],
    ['MIRA', 'That makes no sense. The station is where everyone is going.'],
    ['NARRATOR', 'Across the street, a cyclist abandons his bike and runs. Nobody tries to stop him.']
  ]},
  {id:'clinic', x:1780, lines:[
    ['NARRATOR', 'An ambulance sits outside the clinic with its rear doors open. No one is inside.'],
    ['MIRA', 'We should turn around. We should really turn around.'],
    ['YOU', 'And go where? We need to understand what is happening.']
  ]}
];
const controls = {left:false,right:false,jump:false};
let sceneRef = null;
let gameStarted = false;
let activeDialogueLines = null;

function showToast(message) {
  toast.textContent = message;
  toast.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.style.opacity = '0'; }, 2400);
}
function showDialogue(index, lines = story) {
  activeDialogueLines = lines;
  if (index < 0 || index >= lines.length) {
    dialogue.style.display = 'none';
    return;
  }
  dialogue.dataset.index = String(index);
  document.getElementById('speaker').textContent = lines[index][0];
  document.getElementById('line').textContent = lines[index][1];
  dialogue.style.display = 'block';
}
function advanceDialogue() {
  if (dialogue.style.display !== 'block') return;
  const lines = activeDialogueLines || story;
  const current = Number(dialogue.dataset.index || 0);
  if (current >= lines.length - 1) {
    dialogue.style.display = 'none';
    activeDialogueLines = null;
    showToast(lines === story ? 'The street is no longer ordinary. Keep going.' : 'You notice something unsettling. Keep moving.');
  } else {
    showDialogue(current + 1, lines);
  }
}
function beginGame() {
  intro.hidden = true;
  help.hidden = true;
  hud.hidden = false;
  gameStarted = true;
  if (sceneRef) sceneRef.startStory();
  showDialogue(0);
  showToast('Move with A / D or the arrow keys.');
}
document.getElementById('start').addEventListener('click', beginGame);
document.getElementById('how').addEventListener('click', () => {
  intro.hidden = true;
  help.hidden = false;
});
document.getElementById('back').addEventListener('click', beginGame);

class MorningScene extends Phaser.Scene {
  constructor() {
    super('MorningScene');
    this.worldWidth = WORLD_WIDTH;
    this.completed = false;
    this.storyRunning = false;
    this.walkPhase = 0;
    this.facing = 1;
    this.breathPhase = 0;
    this.checkpointsTriggered = new Set();
    this.clues = [
      {id:'note', x:945, radius:105, title:'A CRUMPLED NOTE', text:'The damp note reads: “If the trains stop, do not follow the crowd underground.” No signature. No date.', discovered:false},
      {id:'phone', x:1510, radius:112, title:'A PUBLIC PHONE', text:'The receiver is off the hook. A faint voice repeats a station announcement, then dissolves into static. Beneath the static, you hear someone whisper: “Platform zero.”', discovered:false},
      {id:'case', x:2135, radius:120, title:'ABANDONED SUITCASE', text:'A phone rings inside the suitcase pocket. The lock is scratched from the inside. Someone has carved three short lines into the handle.', discovered:false}
    ];
  }
  create() {
    sceneRef = this;
    this.physics.world.gravity.y = 900;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.scale.height);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.scale.height);
    this.background = this.add.graphics().setDepth(-20).setScrollFactor(0);
    this.worldArt = this.add.graphics().setDepth(-5);
    this.peopleArt = this.add.graphics().setDepth(2);
    this.playerArt = this.add.graphics().setDepth(10);
    this.floorArt = this.add.graphics().setDepth(-1);
    const groundY = this.getGroundY();
    this.floor = this.add.rectangle(this.worldWidth / 2, groundY, this.worldWidth, Math.max(1, this.scale.height - groundY), 0x596579).setOrigin(0.5, 0);
    this.physics.add.existing(this.floor, true);
    this.floor.setVisible(false);
    this.player = this.add.rectangle(90, groundY - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 0x000000, 0);
    this.physics.add.existing(this.player);
    this.player.body.setSize(22, 44);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(RUN_SPEED, 1000);
    this.player.body.setDamping(true);
    this.player.body.setDragX(1500);
    this.player.body.setAccelerationX(0);
    this.physics.add.collider(this.player, this.floor);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(this.scale.width * 0.28, this.scale.height * 0.18);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE,ENTER,E,SHIFT');
    this.input.keyboard.on('keydown-ENTER', () => { if (gameStarted) advanceDialogue(); });
    this.input.keyboard.on('keydown-E', () => { if (!gameStarted) return; if (dialogue.style.display === 'block') advanceDialogue(); else this.interactWithStreet(); });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (gameStarted && dialogue.style.display === 'block') advanceDialogue();
    });
    this.scale.on('resize', this.handleResize, this);
    this.drawWorld();
    this.createClueInterface();
    this.bindTouchControls();
  }
  getGroundY() { return Math.floor(this.scale.height * 0.79); }
  startStory() { this.storyRunning = true; }
  createClueInterface() {
    const make = (id) => {
      const el = document.createElement('div');
      el.id = id;
      el.style.cssText = 'position:absolute;z-index:20;left:50%;transform:translateX(-50%);padding:8px 13px;border-radius:10px;background:rgba(10,20,34,.88);border:1px solid rgba(255,255,255,.25);color:#f7f3e9;font:700 12px system-ui;letter-spacing:.02em;pointer-events:none;white-space:nowrap;display:none;box-shadow:0 8px 24px #0004';
      document.getElementById('game').appendChild(el);
      return el;
    };
    this.clueHint = make('clue-hint');
    this.clueCounter = make('clue-counter');
    this.clueHint.style.bottom = window.matchMedia('(max-width:650px)').matches ? '164px' : '100px';
    this.clueCounter.style.left = 'auto';
    this.clueCounter.style.right = '18px';
    this.clueCounter.style.transform = 'none';
    this.clueCounter.style.top = '92px';
    this.clueCounter.style.bottom = 'auto';
    this.clueCounter.style.display = gameStarted ? 'block' : 'none';
    this.updateClueInterface();
  }
  updateClueInterface() {
    if (!this.clueCounter) return;
    const found = this.clues.filter(c => c.discovered).length;
    this.clueCounter.style.display = gameStarted ? 'block' : 'none';
    this.clueCounter.textContent = 'CLUES FOUND  ' + found + ' / ' + this.clues.length;
    const nearest = this.clues.filter(c => !c.discovered && Math.abs(this.player.x - c.x) <= c.radius)
      .sort((a,b) => Math.abs(this.player.x-a.x)-Math.abs(this.player.x-b.x))[0];
    if (nearest && this.storyRunning && dialogue.style.display !== 'block' && !this.completed) {
      this.clueHint.textContent = 'E  ·  INSPECT ' + nearest.title;
      this.clueHint.style.display = 'block';
    } else {
      this.clueHint.style.display = 'none';
    }
  }
  interactWithStreet() {
    if (!this.player || dialogue.style.display === 'block' || this.completed) return;
    const spot = this.clues.filter(item => Math.abs(this.player.x - item.x) <= item.radius)
      .sort((a,b) => Math.abs(this.player.x-a.x)-Math.abs(this.player.x-b.x))[0];
    if (!spot) {
      showToast('Move closer to a note, phone, or suitcase to inspect it.');
      return;
    }
    if (spot.discovered) {
      showToast('You have already examined this clue.');
      return;
    }
    spot.discovered = true;
    this.updateClueInterface();
    showDialogue(0, [[spot.title, spot.text], ['NARRATOR', 'You remember the detail. It may matter later.']]);
  }
  handleResize(size) {
    const groundY = Math.floor(size.height * 0.79);
    this.physics.world.setBounds(0, 0, this.worldWidth, size.height);
    this.cameras.main.setBounds(0, 0, this.worldWidth, size.height);
    this.cameras.main.setDeadzone(size.width * 0.28, size.height * 0.18);
    this.floor.setPosition(this.worldWidth / 2, groundY);
    this.floor.setSize(this.worldWidth, Math.max(1, size.height - groundY));
    this.floor.body.updateFromGameObject();
    if (this.player.body.blocked.down || this.player.y + PLAYER_HEIGHT / 2 > groundY) {
      this.player.setY(groundY - PLAYER_HEIGHT / 2);
      this.player.body.setVelocityY(0);
    }
    this.drawWorld();
  }
  bindTouchControls() {
    document.querySelectorAll('.touch').forEach(button => {
      const key = button.dataset.key;
      const down = event => {
        event.preventDefault();
        if (key === 'left') controls.left = true;
        if (key === 'right') controls.right = true;
        if (key === 'jump') {
          if (dialogue.style.display === 'block') advanceDialogue();
          else controls.jump = true;
        }
        if (key === 'talk') { if (dialogue.style.display === 'block') advanceDialogue(); else this.interactWithStreet(); }
      };
      const up = event => {
        event.preventDefault();
        if (key === 'left') controls.left = false;
        if (key === 'right') controls.right = false;
        if (key === 'jump') controls.jump = false;
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
    });
  }
  drawBackground() {
    const width = this.scale.width, height = this.scale.height;
    this.background.clear();
    this.background.fillGradientStyle(0x172b48, 0x172b48, 0xf5c18d, 0xf5c18d, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0xffe0a0, 1);
    this.background.fillCircle(width * 0.77, height * 0.27, Math.min(width, height) * 0.075);
    for (let i = 0; i < 7; i++) {
      const x = ((i * 220 - this.cameras.main.scrollX * 0.12) % (width + 300) + width + 300) % (width + 300) - 100;
      this.background.fillStyle(i % 2 ? 0x5b6279 : 0x475a72, 1);
      this.background.fillTriangle(x, height * 0.67, x + 95, height * (0.38 + (i % 3) * 0.05), x + 220, height * 0.67);
    }
    for (let i = 0; i < 17; i++) {
      const x = ((i * 145 - this.cameras.main.scrollX * 0.23) % (width + 200) + width + 200) % (width + 200) - 80;
      const bh = height * (0.15 + (i * 37 % 17) / 100);
      this.background.fillStyle(i % 2 ? 0x33465f : 0x3b4c65, 1);
      this.background.fillRect(x, height * 0.68 - bh, 95, bh);
      this.background.fillStyle(0xf6cf9a, 0.4);
      for (let wy = height * 0.68 - bh + 15; wy < height * 0.66; wy += 17) {
        for (let wx = x + 12; wx < x + 84; wx += 19) this.background.fillRect(wx, wy, 6, 8);
      }
    }
  }
  drawWorld() {
    const width = this.scale.width, height = this.scale.height, gy = this.getGroundY();
    this.drawBackground();
    this.worldArt.clear();
    this.worldArt.fillStyle(0xd9a47f, 1).fillRect(0, gy, this.worldWidth, 12);
    this.worldArt.fillStyle(0x596579, 1).fillRect(0, gy + 12, this.worldWidth, height - gy - 12);
    this.worldArt.fillStyle(0xead2ad, 1).fillRect(0, gy, this.worldWidth, 12);
    for (let x = 0; x < this.worldWidth; x += 100) {
      this.worldArt.fillStyle(0xf4d5a0, 1).fillRect(x, gy + height * 0.12, 42, 4);
    }
    for (const b of landmarks) {
      const bh = height * b.h, by = gy - bh;
      this.worldArt.fillStyle(b.c, 1).fillRect(b.x, by, b.w, bh);
      this.worldArt.fillStyle(0xe5c4a0, 1).fillRect(b.x - 5, by, b.w + 10, 8);
      this.worldArt.fillStyle(0x24364d, 1).fillRect(b.x + 12, by + 18, b.w - 24, 26);
      for (let wy = by + 60; wy < gy - 45; wy += 42) {
        for (let wx = b.x + 15; wx < b.x + b.w - 18; wx += 36) {
          this.worldArt.fillStyle(((wx + wy) % 3) ? 0xf7d69b : 0x9bb8c7, 1).fillRect(wx, wy, 18, 22);
        }
      }
      this.worldArt.fillStyle(0xf8e8ce, 1).fillRect(b.x + b.w * 0.35, gy - 68, b.w * 0.3, 68);
      this.worldArt.fillStyle(0x293b51, 1).fillRect(b.x + b.w * 0.35 + 5, gy - 62, b.w * 0.3 - 10, 57);
      this.worldArt.fillStyle(0xfff0cf, 1);
      this.worldArt.fillRect(b.x + b.w * 0.35, by + 28, b.w * 0.3, 1);
      this.worldArt.fillStyle(0xfff0cf, 1);
      this.worldArt.fillCircle(b.x + b.w / 2, by + 40, 1);
      this.worldArt.fillStyle(0x344b64, 1);
      this.worldArt.fillRect(b.x + b.w * 0.2, by + 20, b.w * 0.6, 12);
    }
    // Street furniture and small clues make the city feel inhabited.
    const detail = this.worldArt;
    for (let x = 150; x < this.worldWidth - 100; x += 290) {
      const poleX = x + (Math.floor(x / 290) % 2 ? 42 : 0);
      detail.fillStyle(0x253448, 1).fillRoundedRect(poleX, gy - 104, 5, 104, 2);
      detail.fillStyle(0xf3d5a0, 0.9).fillRoundedRect(poleX - 8, gy - 110, 21, 10, 4);
      detail.fillStyle(0x35495c, 1).fillRect(poleX - 4, gy - 7, 13, 7);
    }
    for (let x = 260; x < this.worldWidth - 150; x += 520) {
      const sx = x + 30;
      detail.fillStyle(0x684d42, 1).fillRoundedRect(sx, gy - 30, 68, 6, 2);
      detail.fillStyle(0x8a6550, 1).fillRoundedRect(sx, gy - 42, 68, 7, 2);
      detail.fillStyle(0x344353, 1).fillRect(sx + 8, gy - 24, 5, 24);
      detail.fillStyle(0x344353, 1).fillRect(sx + 54, gy - 24, 5, 24);
      detail.fillStyle(0x9a765b, 1).fillRoundedRect(sx + 91, gy - 22, 36, 22, 3);
      detail.fillStyle(0x567b67, 1).fillEllipse(sx + 108, gy - 29, 31, 20);
      detail.fillStyle(0x719579, 1).fillEllipse(sx + 100, gy - 32, 16, 16);
      detail.fillStyle(0x719579, 1).fillEllipse(sx + 116, gy - 35, 16, 18);
    }
    for (let x = 90; x < this.worldWidth; x += 235) {
      detail.fillStyle(0x354354, 0.85).fillRoundedRect(x, gy + 24, 28, 5, 2);
      for (let k = 0; k < 4; k++) detail.fillStyle(0x7b8790, 0.7).fillRect(x + 4 + k * 6, gy + 25, 2, 3);
      detail.fillStyle(0xe7d4b5, 0.7).fillEllipse(x + 62, gy + 39, 10, 3);
    }
    for (const b of landmarks) {
      const awningY = gy - Math.min(height * b.h, 210) + 53;
      detail.fillStyle(0xb86e61, 1).fillRect(b.x - 3, awningY, b.w + 6, 12);
      for (let ax = b.x; ax < b.x + b.w; ax += 22) detail.fillStyle(0xf1d5b0, 0.92).fillRect(ax, awningY, 10, 12);
      detail.fillStyle(0x172a3e, 1).fillRoundedRect(b.x + 12, gy - 22, b.w - 24, 16, 3);
      detail.fillStyle(0xf5dfb7, 1).fillRect(b.x + 18, gy - 17, b.w - 36, 2);
    }
    // Story clues are visible props in the world, not invisible interaction triggers.
    // Crumpled note beside the curb.
    detail.fillStyle(0x1c2a3a, 0.2).fillEllipse(945, gy + 2, 25, 5);
    detail.fillStyle(0xd9d0b7, 1).fillRoundedRect(934, gy - 10, 22, 14, 2);
    detail.fillStyle(0x9c988b, 1).fillTriangle(949, gy - 10, 956, gy - 10, 956, gy - 3);
    detail.lineStyle(1, 0x777c7c, 1).lineBetween(938, gy - 5, 949, gy - 5);
    detail.lineStyle(1, 0x777c7c, 1).lineBetween(938, gy - 1, 946, gy - 1);
    // Public telephone kiosk.
    detail.fillStyle(0x24364b, 1).fillRoundedRect(1496, gy - 98, 29, 98, 4);
    detail.fillStyle(0x8ab4b7, 1).fillRoundedRect(1501, gy - 91, 19, 29, 3);
    detail.fillStyle(0x17263a, 1).fillRect(1504, gy - 86, 13, 2);
    detail.fillStyle(0x6c9a9c, 1).fillRoundedRect(1504, gy - 54, 13, 4, 2);
    detail.lineStyle(2, 0xe4bd83, 1).lineBetween(1512, gy - 51, 1522, gy - 43);
    detail.fillStyle(0x2c4055, 1).fillRoundedRect(1517, gy - 47, 8, 15, 3);
    // Abandoned suitcase, with a handle and a tiny blinking phone.
    detail.fillStyle(0x1c2a3a, 0.22).fillEllipse(2135, gy + 2, 43, 7);
    detail.fillStyle(0x765344, 1).fillRoundedRect(2115, gy - 34, 39, 31, 5);
    detail.lineStyle(3, 0x4b3b35, 1).strokeRoundedRect(2125, gy - 41, 18, 10, 3);
    detail.fillStyle(0xc79b6e, 1).fillRect(2120, gy - 25, 3, 3);
    detail.fillStyle(0x263548, 1).fillRoundedRect(2148, gy - 30, 11, 18, 2);
    detail.fillStyle(0x83e7d0, 1).fillCircle(2153, gy - 25, 2);
    const vx = 1040, vy = gy - 34;
    detail.fillStyle(0x344b60, 1).fillRoundedRect(vx, vy, 112, 29, 6);
    detail.fillStyle(0x6f9eaa, 1).fillRoundedRect(vx + 12, vy + 4, 33, 12, 3);
    detail.fillStyle(0x9db9bc, 1).fillRoundedRect(vx + 51, vy + 4, 22, 12, 3);
    detail.fillStyle(0x253244, 1).fillCircle(vx + 23, gy - 3, 9);
    detail.fillStyle(0x253244, 1).fillCircle(vx + 88, gy - 3, 9);
    detail.fillStyle(0xa9b5b5, 1).fillCircle(vx + 23, gy - 3, 4);
    detail.fillStyle(0xa9b5b5, 1).fillCircle(vx + 88, gy - 3, 4);
    this.floorArt.clear();
    this.floorArt.fillStyle(0xf4d5a0, 1);
    for (let x = 0; x < this.worldWidth; x += 100) this.floorArt.fillRect(x, gy + height * 0.12, 42, 4);
  }
  drawPeople() {
    const gy = this.getGroundY();
    this.peopleArt.clear();
    for (let i = 0; i < 18; i++) {
      const x = i * 170 + 70;
      this.peopleArt.fillStyle([0x344b64, 0x784f5e, 0x526a68][i % 3], 1);
      this.peopleArt.fillCircle(x, gy - 37, 7);
      this.peopleArt.fillRoundedRect(x - 6, gy - 30, 12, 25, 4);
    }
  }
  drawPlayer() {
    const p = this.player, x = p.x, y = p.y;
    const grounded = p.body.blocked.down || p.body.touching.down;
    const speed = Math.abs(p.body.velocity.x);
    const moving = speed > 18 && grounded;
    const airborne = !grounded;
    const running = moving && this.keys.SHIFT.isDown;
    const dir = this.facing || 1;
    const g = this.playerArt;
    const gait = this.walkPhase;
    const stride = moving ? Math.sin(gait) * (running ? 8.5 : 5.5) : 0;
    const oppositeStride = moving ? Math.sin(gait + Math.PI) * (running ? 8.5 : 5.5) : 0;
    const armSwing = moving ? Math.sin(gait + Math.PI) * (running ? 7 : 4.5) : 0;
    const bounce = airborne ? 0 : moving ? Math.abs(Math.sin(gait * 2)) * (running ? 2.4 : 1.2) : Math.sin(this.breathPhase) * 0.55;
    const lean = moving ? (running ? 3.2 : 1.2) * dir : 0;
    const torsoX = x + lean;
    const shoulderY = y - 8 + bounce;
    const hipY = y + 10 + bounce;
    const headY = y - 24 + bounce + (airborne ? 1 : 0);
    const rearLeg = dir > 0 ? oppositeStride : stride;
    const frontLeg = dir > 0 ? stride : oppositeStride;
    const rearArm = dir > 0 ? -armSwing : armSwing;
    const frontArm = -rearArm;

    g.clear();

    // Soft contact shadow; it tightens when the character jumps.
    g.fillStyle(0x101b2a, airborne ? 0.10 : 0.25)
      .fillEllipse(x + 2, this.getGroundY() + 2, airborne ? 19 : 31 + speed * 0.015, airborne ? 5 : 8);

    // Backpack sits behind the shoulders and shifts with each step.
    g.fillStyle(0x283b46, 1).fillRoundedRect(torsoX - dir * 10 - 4, y - 13 + bounce, 11, 19, 4);
    g.fillStyle(0x71806f, 1).fillRoundedRect(torsoX - dir * 10 - 3, y - 12 + bounce, 8, 16, 3);
    g.fillStyle(0x3b4b50, 1).fillRoundedRect(torsoX - dir * 10 - 2, y - 7 + bounce, 6, 5, 2);

    // Legs are drawn in two articulated sections with visible knees and shoes.
    const drawLeg = (offset, amount, color, shoeColor) => {
      const hipX = torsoX + offset;
      const kneeX = hipX + amount * 0.42 + (airborne ? amount * 0.12 : 0);
      const kneeY = y + 16 + bounce + (airborne ? (offset > 0 ? -3 : 2) : Math.abs(amount) * 0.12);
      const ankleX = hipX + amount;
      const ankleY = y + 21 + bounce + (airborne ? (offset > 0 ? -5 : -1) : Math.max(0, Math.sin(gait + (offset > 0 ? 0 : Math.PI))) * 2.1);
      g.lineStyle(7, color, 1).lineBetween(hipX, hipY, kneeX, kneeY);
      g.fillStyle(color, 1).fillCircle(kneeX, kneeY, 3.2);
      g.lineStyle(5.5, color, 1).lineBetween(kneeX, kneeY, ankleX, ankleY);
      // A small ankle highlight helps separate the boot from the trousers.
      g.lineStyle(2, 0x9aa29b, 0.85).lineBetween(ankleX, ankleY - 1, ankleX, ankleY + 2);
      g.fillStyle(shoeColor, 1).fillRoundedRect(ankleX - (dir > 0 ? 1 : 6), ankleY - 1, 10, 5, 2);
      g.fillStyle(0xc7b79b, 0.75).fillRect(ankleX - (dir > 0 ? 0 : 5), ankleY + 3, 9, 1);
    };
    drawLeg(-4, rearLeg, 0x283747, 0x1e2936);
    drawLeg(4, frontLeg, 0x344657, 0x263241);

    // Jacket silhouette, hem, seams and folds.
    g.fillStyle(0x1c303d, 1).fillRoundedRect(torsoX - 11, y - 15 + bounce, 22, 28, 6);
    g.fillStyle(0x3e6f70, 1).fillRoundedRect(torsoX - 9, y - 15 + bounce, 18, 25, 5);
    g.fillStyle(0x2d555a, 1).fillRoundedRect(torsoX - 9, y + 5 + bounce, 18, 7, 2);
    g.fillStyle(0x9a9b7d, 1).fillRoundedRect(torsoX - 8, y + 10 + bounce, 16, 3, 1);
    g.lineStyle(1.2, 0xc1c5a5, 0.9).lineBetween(torsoX, y - 12 + bounce, torsoX + dir * 1.5, y + 8 + bounce);
    g.lineStyle(1, 0x24464c, 0.9).lineBetween(torsoX - 6, y - 2 + bounce, torsoX - 2, y + 2 + bounce);
    g.lineStyle(1, 0x24464c, 0.9).lineBetween(torsoX + 4, y + 2 + bounce, torsoX + 7, y + 5 + bounce);
    g.fillStyle(0xd6b68b, 1).fillRoundedRect(torsoX - 3, y - 12 + bounce, 6, 5, 2);

    // Arms swing from the shoulder and bend at the elbow instead of moving as one line.
    const drawArm = (side, swing, sleeveColor) => {
      const sx = torsoX + side * 8;
      const sy = shoulderY + 2;
      const elbowX = sx + side * 3 + swing * 0.48;
      const elbowY = y + 1 + bounce + (running ? Math.abs(swing) * 0.13 : 0);
      const handX = elbowX + side * 1.5 + swing * 0.55;
      const handY = y + 8 + bounce - swing * 0.18;
      g.lineStyle(7, sleeveColor, 1).lineBetween(sx, sy, elbowX, elbowY);
      g.fillStyle(0x263d45, 1).fillCircle(elbowX, elbowY, 3.1);
      g.lineStyle(5.3, 0xe0ad88, 1).lineBetween(elbowX, elbowY, handX, handY);
      g.fillStyle(0xe7b58f, 1).fillEllipse(handX, handY, 4.2, 5.2);
      g.fillStyle(0x6b8b83, 1).fillRoundedRect(sx - 3, sy - 1, 6, 7, 2);
    };
    drawArm(-1, rearArm, 0x31565b);
    drawArm(1, frontArm, 0x3e6f70);

    // Neck and head. The head turns slightly toward the direction of travel.
    g.fillStyle(0xd09b79, 1).fillRoundedRect(x - 3, y - 19 + bounce, 6, 8, 2);
    g.fillStyle(0x1d202a, 1).fillEllipse(x - dir * 1.2, headY - 7, 20, 11);
    g.fillStyle(0x302b35, 1).fillRoundedRect(x - 9, headY - 7, 5, 11, 2);
    g.fillStyle(0xe6b18b, 1).fillEllipse(x + dir * 0.5, headY, 16.5, 18.5);
    // Ear, nose and eye are placed on the leading side of the face.
    g.fillStyle(0xd49a78, 1).fillCircle(x + dir * 7, headY + 1, 2.1);
    g.fillStyle(0xe2a782, 1).fillTriangle(
      x + dir * 6, headY + 1,
      x + dir * 11, headY + 2,
      x + dir * 6, headY + 4
    );
    g.fillStyle(0x272b34, 1).fillCircle(x + dir * 3.8, headY - 2, 1.1);
    g.lineStyle(1, 0x8b5c4c, 0.75).lineBetween(x + dir * 3, headY + 6, x + dir * 6, headY + 6.5);
    g.fillStyle(0x302b35, 1).fillTriangle(x - 7, headY - 6, x + 5, headY - 8, x + 1, headY - 2);
    // Subtle hair tufts and jacket collar give the silhouette a less mannequin-like finish.
    g.fillStyle(0x302b35, 1).fillTriangle(x - 7, headY - 8, x - 1, headY - 12, x + 1, headY - 7);
    g.fillStyle(0x24454b, 1).fillTriangle(torsoX - dir * 4, y - 14 + bounce, torsoX, y - 7 + bounce, torsoX + dir * 3, y - 14 + bounce);
    g.lineStyle(1, 0x8eb0a2, 0.8).lineBetween(torsoX - dir * 9, y - 8 + bounce, torsoX - dir * 9, y + 1 + bounce);
  }
  update() {
    if (!this.player || !this.player.body) return;
    const keyboardLeft = this.cursors.left.isDown || this.keys.A.isDown;
    const keyboardRight = this.cursors.right.isDown || this.keys.D.isDown;
    const left = keyboardLeft || controls.left;
    const right = keyboardRight || controls.right;
    const body = this.player.body;
    if (this.storyRunning && dialogue.style.display !== 'block' && !this.completed) {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir) this.facing = dir;
      const targetSpeed = this.keys.SHIFT.isDown ? RUN_SPEED : WALK_SPEED;
      body.setAccelerationX(dir * 1150);
      if (!dir) body.setAccelerationX(0);
      body.setMaxVelocity(dir ? targetSpeed : RUN_SPEED, 1000);
      if ((this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || controls.jump) && (body.blocked.down || body.touching.down)) {
        body.setVelocityY(-430);
      }
      if (dir) this.walkPhase += Math.max(0.12, Math.abs(body.velocity.x) / 800);
      this.breathPhase += 0.06;
      for (const checkpoint of checkpoints) {
        if (!this.checkpointsTriggered.has(checkpoint.id) && this.player.x >= checkpoint.x) {
          this.checkpointsTriggered.add(checkpoint.id);
          body.setVelocityX(0);
          showDialogue(0, checkpoint.lines);
          break;
        }
      }
      const progress = Math.min(100, Math.round(this.player.x / (this.worldWidth - 100) * 100));
      objective.textContent = progress < 30 ? 'Reach the station' : progress < 58 ? 'Follow the main street' : progress < 84 ? 'Something feels wrong…' : 'Find the station entrance';
      if (this.player.x > this.worldWidth - 170) {
        this.completed = true;
        chapter.textContent = 'CHAPTER 01 · COMPLETE';
        dialogue.style.display = 'block';
        document.getElementById('speaker').textContent = 'END OF DEMO';
        document.getElementById('line').textContent = 'You reach the station just as the first screams rise behind you. The next chapter begins soon.';
        showToast('Chapter 01 complete — more story is coming.');
      }
    } else {
      body.setAccelerationX(0);
      body.setVelocityX(0);
    }
    this.drawPlayer();
    this.updateClueInterface();
    if (this.game.loop.frame % 3 === 0) this.drawPeople();
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#172b48',
  transparent: false,
  render: { antialias: true, pixelArt: false },
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { debug: false, gravity: { y: 900 } } },
  scene: [MorningScene]
};
if (window.Phaser) {
  new Phaser.Game(config);
} else {
  showToast('The game engine could not load. Please check your connection and refresh.');
}
})();