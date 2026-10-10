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
  {x:370,w:170,h:.36,c:0x3f9b98,label:'BAKERY'},
  {x:790,w:205,h:.49,c:0xe5a06e,label:'BOOKSHOP'},
  {x:1320,w:185,h:.41,c:0x79b6a1,label:'FLOWERS'},
  {x:1830,w:230,h:.54,c:0x648aa5,label:'CITY CLINIC'},
  {x:STATION_X,w:260,h:.47,c:0x4e7b88,label:'CENTRAL STATION'}
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
    this.atmosphereArt = this.add.graphics().setDepth(4);
    this.playerArt = this.add.graphics().setDepth(10);
    this.floorArt = this.add.graphics().setDepth(-1);
    const groundY = this.getGroundY();
    // Keep the ground as a simple, full-width static platform. Centering the
    // platform avoids origin/resize drift that can make the player appear to fall.
    this.floorHeight = Math.max(120, this.scale.height - groundY + 80);
    this.floor = this.add.rectangle(
      this.worldWidth / 2, groundY + this.floorHeight / 2,
      this.worldWidth, this.floorHeight, 0x596579
    ).setOrigin(0.5, 0.5);
    this.physics.add.existing(this.floor, true);
    this.floor.setVisible(false);
    this.floor.body.setSize(this.worldWidth, this.floorHeight);
    this.floor.body.updateFromGameObject();

    this.player = this.add.rectangle(90, groundY - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 0x000000, 0);
    this.physics.add.existing(this.player);
    // A slightly narrower collider keeps the drawn boots safely above the floor.
    this.player.body.setSize(18, 42);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(RUN_SPEED, 720);
    this.player.body.setDamping(false);
    this.player.body.setDragX(1900, 0);
    this.player.body.setAcceleration(0, 0);
    this.player.body.setBounce(0, 0);
    this.jumpWasDown = false;
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
    this.floorHeight = Math.max(120, size.height - groundY + 80);
    this.floor.setPosition(this.worldWidth / 2, groundY + this.floorHeight / 2);
    this.floor.setSize(this.worldWidth, this.floorHeight);
    this.floor.body.setSize(this.worldWidth, this.floorHeight);
    this.floor.body.updateFromGameObject();
    // Preserve a jump if the player is genuinely airborne; otherwise snap to
    // the new ground line so a mobile orientation change cannot strand them.
    const grounded = this.player.body.blocked.down || this.player.body.touching.down || this.player.body.onFloor();
    if (grounded || this.player.y + PLAYER_HEIGHT / 2 >= groundY) {
      this.player.setY(groundY - PLAYER_HEIGHT / 2);
      this.player.body.setVelocityY(0);
      this.player.body.reset(this.player.x, this.player.y);
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
    const scroll = this.cameras.main.scrollX;
    this.background.clear();
    // Bright, high-contrast morning palette: vivid skies against a city that feels
    // strangely empty. This is an original homage to Zom 100's color energy,
    // not a recreation of its characters or exact shots.
    this.background.fillGradientStyle(0x35c8f0, 0x35c8f0, 0xffd28a, 0xffd28a, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0xfff4b0, 0.16);
    this.background.fillCircle(width * 0.78, height * 0.25, Math.min(width, height) * 0.19);
    this.background.fillStyle(0xffef9b, 1);
    this.background.fillCircle(width * 0.78, height * 0.25, Math.min(width, height) * 0.064);
    // Graphic clouds add a clean, illustrative anime-sky silhouette.
    for (let i = 0; i < 5; i++) {
      const x = ((i * 265 - scroll * 0.06) % (width + 340) + width + 340) % (width + 340) - 150;
      const y = height * (0.13 + (i % 3) * 0.075);
      this.background.fillStyle(0xffffff, 0.62);
      this.background.fillEllipse(x, y, 76, 20);
      this.background.fillEllipse(x + 18, y - 8, 43, 22);
      this.background.fillEllipse(x + 40, y, 50, 16);
      this.background.fillStyle(0x39b7dc, 0.18);
      this.background.fillEllipse(x + 20, y + 6, 65, 7);
    }
    for (let i = 0; i < 7; i++) {
      const x = ((i * 220 - scroll * 0.12) % (width + 300) + width + 300) % (width + 300) - 100;
      this.background.fillStyle(i % 2 ? 0x57c2b0 : 0x40aeb3, 1);
      this.background.fillTriangle(x, height * 0.68, x + 95, height * (0.39 + (i % 3) * 0.05), x + 220, height * 0.68);
    }
    const skyline = [0x527c94,0x47778a,0x6b8e9b,0x4d7188,0x658b91];
    for (let i = 0; i < 17; i++) {
      const x = ((i * 145 - scroll * 0.23) % (width + 200) + width + 200) % (width + 200) - 80;
      const bh = height * (0.15 + (i * 37 % 17) / 100);
      this.background.fillStyle(skyline[i % skyline.length], 1);
      this.background.fillRect(x, height * 0.68 - bh, 95, bh);
      this.background.fillStyle(i % 3 === 0 ? 0xffd17d : 0xbdeaf0, 0.8);
      for (let wy = height * 0.68 - bh + 15; wy < height * 0.66; wy += 17) {
        for (let wx = x + 12; wx < x + 84; wx += 19) this.background.fillRect(wx, wy, 7, 9);
      }
      this.background.fillStyle(0xffffff, 0.22).fillRect(x + 5, height * 0.68 - bh, 4, bh);
    }
    // A few vivid graphic flecks in the distant skyline hint at painted signs.
    for (let i = 0; i < 9; i++) {
      const x = ((i * 173 - scroll * 0.2) % (width + 180) + width + 180) % (width + 180) - 60;
      this.background.fillStyle([0xff6684,0xffd166,0x55e0c0][i % 3], 0.78);
      this.background.fillRect(x, height * (0.55 + (i % 3) * 0.025), 13 + (i % 4) * 5, 3);
    }
  }
  drawWorld() {
    const width = this.scale.width, height = this.scale.height, gy = this.getGroundY();
    // Rebuild scene labels on resize without leaving duplicate Phaser text objects behind.
    if (this.landmarkLabels) this.landmarkLabels.forEach(label => label.destroy());
    this.landmarkLabels = [];
    this.drawBackground();
    this.worldArt.clear();
    this.worldArt.fillStyle(0xf2a77b, 1).fillRect(0, gy, this.worldWidth, 12);
    this.worldArt.fillStyle(0x667783, 1).fillRect(0, gy + 12, this.worldWidth, height - gy - 12);
    this.worldArt.fillStyle(0xf5d8a3, 1).fillRect(0, gy, this.worldWidth, 12);
    this.worldArt.fillStyle(0x8d9693, 0.48).fillRect(0, gy + 12, this.worldWidth, 2);
    for (let x = 0; x < this.worldWidth; x += 100) {
      this.worldArt.fillStyle(0xffe4a0, 1).fillRect(x, gy + height * 0.12, 42, 4);
    }
    // Saturated paint splashes on the road create a lively graphic contrast
    // with the unsettling quiet. Every splash is drawn from simple original shapes.
    const splashes = [
      {x:260,y:gy+height*.17,c:0xff6482,r:19},
      {x:680,y:gy+height*.23,c:0x35d7c0,r:24},
      {x:1135,y:gy+height*.18,c:0xffd166,r:18},
      {x:1585,y:gy+height*.22,c:0xf36fa3,r:21},
      {x:1985,y:gy+height*.16,c:0x52d6ed,r:25},
      {x:2460,y:gy+height*.2,c:0xff8b58,r:20}
    ];
    for (const s of splashes) {
      this.worldArt.fillStyle(s.c, 0.85).fillEllipse(s.x, s.y, s.r*2.1, s.r*.72);
      this.worldArt.fillStyle(s.c, 0.92).fillCircle(s.x-s.r*.7, s.y-s.r*.45, s.r*.24);
      this.worldArt.fillStyle(s.c, 0.9).fillCircle(s.x+s.r*.82, s.y+s.r*.2, s.r*.17);
      this.worldArt.fillStyle(s.c, 0.86).fillCircle(s.x-s.r*.15, s.y+s.r*.38, s.r*.13);
      this.worldArt.fillStyle(s.c, 0.72).fillTriangle(s.x-s.r*.7,s.y-s.r*.2,s.x-s.r*1.35,s.y-s.r*.75,s.x-s.r*.48,s.y-s.r*.62);
    }
    for (const b of landmarks) {
      const bh = height * b.h, by = gy - bh;
      this.worldArt.fillStyle(b.c, 1).fillRect(b.x, by, b.w, bh);
      this.worldArt.fillStyle(0xffd28a, 1).fillRect(b.x - 5, by, b.w + 10, 8);
      this.worldArt.fillStyle(0x253d50, 1).fillRect(b.x + 12, by + 18, b.w - 24, 26);
      this.worldArt.fillStyle([0xff6684,0xffd166,0x52d6c0,0x71d4ee,0xf39a65][landmarks.indexOf(b)], 1)
        .fillRect(b.x + 15, by + 21, Math.max(20, b.w - 30), 3);
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
      detail.fillStyle([0xff6684,0xffd166,0x43c7b7,0x6bc9e4,0xff985d][landmarks.indexOf(b)], 1).fillRect(b.x - 3, awningY, b.w + 6, 12);
      for (let ax = b.x; ax < b.x + b.w; ax += 22) detail.fillStyle(0xfff0ce, 0.95).fillRect(ax, awningY, 10, 12);
      detail.fillStyle(0x20394b, 1).fillRoundedRect(b.x + 12, gy - 22, b.w - 24, 16, 3);
      detail.fillStyle(0xffe4a0, 1).fillRect(b.x + 18, gy - 17, b.w - 36, 2);
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
    // Layered architectural details: masonry seams, drainpipes, balconies and shop signs.
    for (const b of landmarks) {
      const bh = height * b.h, by = gy - bh;
      detail.lineStyle(1, 0x182c42, 0.38);
      for (let row = by + 48; row < gy - 20; row += 58) {
        detail.lineBetween(b.x + 4, row, b.x + b.w - 4, row);
      }
      detail.lineStyle(2, 0x1b2e43, 0.72);
      detail.lineBetween(b.x + 9, by + 10, b.x + 9, gy - 5);
      detail.lineBetween(b.x + b.w - 9, by + 10, b.x + b.w - 9, gy - 5);
      // Window frames and shallow sills make the facades read as buildings.
      for (let wy = by + 61; wy < gy - 48; wy += 42) {
        for (let wx = b.x + 14; wx < b.x + b.w - 22; wx += 36) {
          detail.lineStyle(2, 0x1c3147, 0.9).strokeRect(wx - 2, wy - 2, 22, 26);
          detail.fillStyle(0xf9dba6, 0.16).fillRect(wx + 2, wy + 2, 5, 7);
          detail.lineStyle(1, 0x263b51, 0.9).lineBetween(wx + 9, wy, wx + 9, wy + 21);
          detail.lineStyle(1, 0x263b51, 0.9).lineBetween(wx, wy + 10, wx + 18, wy + 10);
          detail.lineStyle(2, 0x26394d, 0.95).lineBetween(wx - 3, wy + 25, wx + 23, wy + 25);
        }
      }
      // Downpipes and a few small wall-mounted utility boxes.
      detail.fillStyle(0x26394d, 0.9).fillRoundedRect(b.x + b.w - 13, by + 8, 4, bh - 10, 2);
      detail.fillStyle(0x6b8290, 0.7).fillRoundedRect(b.x + 8, gy - 116, 13, 28, 2);
      detail.fillStyle(0x26394d, 1).fillRect(b.x + 11, gy - 110, 7, 2);
      detail.fillStyle(0x26394d, 1).fillRect(b.x + 11, gy - 103, 7, 2);
      // A projecting shop sign gives each location a readable street-level identity.
      detail.fillStyle(0x172a3e, 1).fillRoundedRect(b.x + b.w / 2 - 35, by + 18, 70, 19, 4);
      detail.lineStyle(1, 0xe6c89e, 0.85).strokeRoundedRect(b.x + b.w / 2 - 35, by + 18, 70, 19, 4);
      detail.fillStyle(0xf4d8ae, 0.9).fillRect(b.x + b.w / 2 - 23, by + 25, 46, 2);
      detail.fillStyle(0xf4d8ae, 0.65).fillCircle(b.x + b.w / 2 - 27, by + 27, 2);
      detail.fillStyle(0xf4d8ae, 0.65).fillCircle(b.x + b.w / 2 + 27, by + 27, 2);
    }

    // Give each landmark a distinct silhouette and readable identity instead of
    // repeating the same window grid: bakery warmth, book spines, flowers, clinic
    // signage, and a transit clock make the walk feel like a real neighborhood.
    const storefrontStyle = {
      'BAKERY': {sign:0xb85f47, text:'SUNRISE BAKERY'},
      'BOOKSHOP': {sign:0x595b94, text:'PAPER MOON BOOKS'},
      'FLOWERS': {sign:0x377f72, text:'PETAL & STEM'},
      'CITY CLINIC': {sign:0x326a7b, text:'CITY CLINIC'},
      'CENTRAL STATION': {sign:0x273e58, text:'CENTRAL STATION'}
    };
    for (const b of landmarks) {
      const cx = b.x + b.w / 2;
      const style = storefrontStyle[b.label];
      const boardWidth = b.w - 24;
      const boardX = b.x + 12;
      const boardY = gy - height * b.h + 18;
      // Replace the generic projecting plaque with a wide, location-specific sign.
      detail.fillStyle(style.sign, 1).fillRoundedRect(boardX, boardY, boardWidth, 23, 4);
      detail.lineStyle(1, 0xffe4b8, 0.82).strokeRoundedRect(boardX, boardY, boardWidth, 23, 4);
      detail.fillStyle(0xffffff, 0.1).fillRect(boardX + 4, boardY + 3, boardWidth - 8, 2);
      const label = this.add.text(cx, boardY + 12, style.text, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: b.label === 'CENTRAL STATION' ? 12 : 10,
        fontStyle: 'bold',
        color: '#fff4dc',
        stroke: '#1c3044',
        strokeThickness: 2,
        align: 'center',
        fixedWidth: boardWidth - 12
      }).setOrigin(0.5, 0.5).setDepth(-4);
      this.landmarkLabels.push(label);

      if (b.label === 'BAKERY') {
        // Warm window light, bread on the shelf, and a small hanging bread emblem.
        detail.fillStyle(0x3c4c54, 1).fillRoundedRect(b.x + 14, gy - 84, 42, 43, 3);
        detail.fillStyle(0xffd39a, 0.92).fillRect(b.x + 18, gy - 80, 34, 35);
        detail.fillStyle(0xf5a95f, 1).fillEllipse(b.x + 28, gy - 61, 12, 8);
        detail.fillStyle(0xe88b4b, 1).fillEllipse(b.x + 42, gy - 59, 13, 9);
        detail.lineStyle(1, 0xffe8bd, 0.9).lineBetween(b.x + 20, gy - 50, b.x + 49, gy - 50);
        detail.fillStyle(0x6c443a, 1).fillRoundedRect(b.x + b.w - 58, gy - 79, 39, 36, 3);
        detail.fillStyle(0xffcc8a, 1).fillEllipse(b.x + b.w - 39, gy - 61, 17, 11);
        detail.lineStyle(2, 0xffe7bc, 0.8).lineBetween(b.x + b.w - 44, gy - 63, b.x + b.w - 41, gy - 59);
        detail.fillStyle(0x497d65, 1).fillRoundedRect(b.x + 7, gy - 27, 12, 13, 2);
        detail.fillStyle(0xff7581, 1).fillCircle(b.x + 10, gy - 29, 4);
        detail.fillStyle(0xffd166, 1).fillCircle(b.x + 17, gy - 30, 4);
      } else if (b.label === 'BOOKSHOP') {
        // Individually colored book spines show through the display window.
        detail.fillStyle(0x27394c, 1).fillRoundedRect(b.x + 13, gy - 88, 58, 47, 3);
        detail.fillStyle(0xa8d9dc, 0.55).fillRect(b.x + 17, gy - 84, 50, 39);
        const bookColors = [0xff7187,0xffd166,0x58c9b6,0x9da8f4,0xef9b62,0x7cb6df];
        for (let i = 0; i < bookColors.length; i++) {
          const bx = b.x + 19 + i * 7;
          const bh = 19 + (i % 3) * 5;
          detail.fillStyle(bookColors[i], 1).fillRoundedRect(bx, gy - 47 - bh, 6, bh, 1);
          detail.fillStyle(0xfff0ca, 0.8).fillRect(bx + 1, gy - 47 - bh + 4, 4, 1);
        }
        detail.fillStyle(0x344b62, 1).fillRoundedRect(b.x + b.w - 72, gy - 86, 53, 43, 3);
        detail.fillStyle(0xf1d9ad, 0.9).fillRect(b.x + b.w - 67, gy - 80, 43, 2);
        detail.fillStyle(0x7a89b8, 1).fillRect(b.x + b.w - 67, gy - 75, 13, 25);
        detail.fillStyle(0xd77883, 1).fillRect(b.x + b.w - 51, gy - 71, 10, 21);
        detail.fillStyle(0x55bba9, 1).fillRect(b.x + b.w - 38, gy - 78, 9, 28);
      } else if (b.label === 'FLOWERS') {
        // Tall display windows and little flower buckets make this shop instantly distinct.
        detail.fillStyle(0x38565a, 1).fillRoundedRect(b.x + 12, gy - 88, 48, 45, 3);
        detail.fillStyle(0xc1e8d8, 0.72).fillRect(b.x + 16, gy - 84, 40, 37);
        detail.fillStyle(0x8d6450, 1).fillRoundedRect(b.x + 17, gy - 55, 14, 10, 2);
        detail.fillStyle(0x8d6450, 1).fillRoundedRect(b.x + 37, gy - 55, 14, 10, 2);
        for (const flower of [{x:b.x+22,y:gy-64,c:0xff6684},{x:b.x+30,y:gy-70,c:0xffd166},{x:b.x+42,y:gy-65,c:0x9ba5ff},{x:b.x+49,y:gy-73,c:0xffffff}]) {
          detail.fillStyle(0x3d956d, 1).lineStyle(2,0x3d956d,1).lineBetween(flower.x,flower.y+3,flower.x,gy-55);
          detail.fillStyle(flower.c, 1).fillCircle(flower.x, flower.y, 4);
          detail.fillStyle(0xffe2a0, 1).fillCircle(flower.x, flower.y, 1.4);
        }
        detail.fillStyle(0x476f5b, 1).fillRoundedRect(b.x + b.w - 57, gy - 84, 42, 41, 3);
        detail.fillStyle(0xc5e4c9, 0.7).fillRect(b.x + b.w - 53, gy - 80, 34, 33);
        for (let i = 0; i < 4; i++) {
          const fx = b.x + b.w - 47 + i * 8;
          detail.lineStyle(2,0x2d8b63,1).lineBetween(fx,gy-52,fx,gy-72-(i%2)*5);
          detail.fillStyle([0xf27691,0xffcb64,0x83a9ff,0xf5f0dd][i],1).fillCircle(fx,gy-73-(i%2)*5,3.5);
        }
      } else if (b.label === 'CITY CLINIC') {
        // A high-contrast medical cross, glass entrance and a simple reception window.
        detail.fillStyle(0xf6f1db, 1).fillRoundedRect(b.x + b.w - 46, gy - height * b.h + 59, 27, 27, 4);
        detail.fillStyle(0xd95059, 1).fillRect(b.x + b.w - 35, gy - height * b.h + 63, 6, 19);
        detail.fillStyle(0xd95059, 1).fillRect(b.x + b.w - 41, gy - height * b.h + 69, 18, 6);
        detail.fillStyle(0x214b61, 1).fillRoundedRect(b.x + 18, gy - 88, 45, 44, 3);
        detail.fillStyle(0x8bd2d0, 0.83).fillRect(b.x + 22, gy - 84, 37, 36);
        detail.fillStyle(0xf4f2dd, 0.95).fillRoundedRect(b.x + b.w - 82, gy - 82, 49, 38, 3);
        detail.fillStyle(0x4e9da2, 1).fillRect(b.x + b.w - 75, gy - 75, 35, 3);
        detail.fillStyle(0x4e9da2, 0.75).fillRect(b.x + b.w - 75, gy - 67, 24, 2);
        detail.fillStyle(0xe7f2df, 0.85).fillRoundedRect(b.x + b.w / 2 - 23, gy - 67, 46, 67, 3);
        detail.fillStyle(0x355c69, 1).fillRoundedRect(b.x + b.w / 2 - 18, gy - 62, 36, 62, 3);
        detail.lineStyle(1, 0xb9dce0, 0.8).lineBetween(cx, gy - 62, cx, gy - 4);
      } else if (b.label === 'CENTRAL STATION') {
        // A station clock and platform boards replace the ordinary shop windows.
        detail.fillStyle(0x21364e, 1).fillCircle(cx, gy - height * b.h + 68, 24);
        detail.fillStyle(0xffe9bb, 1).fillCircle(cx, gy - height * b.h + 68, 19);
        detail.lineStyle(2, 0x2a4a63, 1).lineBetween(cx, gy - height * b.h + 68, cx, gy - height * b.h + 55);
        detail.lineStyle(2, 0x2a4a63, 1).lineBetween(cx, gy - height * b.h + 68, cx + 10, gy - height * b.h + 72);
        detail.fillStyle(0x1c334a, 1).fillRoundedRect(b.x + 18, gy - 92, b.w - 36, 22, 3);
        detail.fillStyle(0x77ddd0, 1).fillRect(b.x + 28, gy - 84, b.w - 56, 3);
        for (let i = 0; i < 3; i++) {
          const px = b.x + 38 + i * 78;
          detail.fillStyle(i === 1 ? 0xffd166 : 0xfff0cf, 0.9).fillTriangle(px,gy-77,px+7,gy-83,px+14,gy-77);
        }
        detail.fillStyle(0x273e56, 1).fillRoundedRect(b.x + 17, gy - 58, 36, 49, 3);
        detail.fillStyle(0x8dd6d1, 0.85).fillRect(b.x + 21, gy - 54, 28, 39);
        detail.fillStyle(0x273e56, 1).fillRoundedRect(b.x + b.w - 53, gy - 58, 36, 49, 3);
        detail.fillStyle(0x8dd6d1, 0.85).fillRect(b.x + b.w - 49, gy - 54, 28, 39);
      }
    }

    // The cyclist's abandoned bicycle lies across the crossing: the story's
    // warning becomes a tangible object before the player reaches the station.
    const bikeX = 1210, wheelY = gy - 10;
    detail.lineStyle(2.7, 0x263b4f, 0.98);
    detail.strokeCircle(bikeX, wheelY, 11);
    detail.strokeCircle(bikeX + 47, wheelY, 11);
    detail.lineStyle(1, 0x9eb0b5, 0.72);
    detail.lineBetween(bikeX - 7, wheelY, bikeX + 7, wheelY);
    detail.lineBetween(bikeX + 40, wheelY, bikeX + 54, wheelY);
    detail.fillStyle(0x263b4f, 1).fillCircle(bikeX, wheelY, 2.2);
    detail.fillStyle(0x263b4f, 1).fillCircle(bikeX + 47, wheelY, 2.2);
    detail.lineStyle(3, 0x43b9ae, 1);
    detail.lineBetween(bikeX, wheelY, bikeX + 21, wheelY);
    detail.lineBetween(bikeX + 21, wheelY, bikeX + 15, wheelY - 20);
    detail.lineBetween(bikeX + 15, wheelY - 20, bikeX, wheelY);
    detail.lineBetween(bikeX + 15, wheelY - 20, bikeX + 34, wheelY - 21);
    detail.lineBetween(bikeX + 34, wheelY - 21, bikeX + 21, wheelY);
    detail.lineBetween(bikeX + 34, wheelY - 21, bikeX + 47, wheelY);
    detail.lineStyle(3, 0x263b4f, 1);
    detail.lineBetween(bikeX + 11, wheelY - 23, bikeX + 20, wheelY - 23);
    detail.lineBetween(bikeX + 31, wheelY - 24, bikeX + 39, wheelY - 30);
    detail.lineBetween(bikeX + 36, wheelY - 30, bikeX + 44, wheelY - 30);
    detail.lineStyle(2, 0xffd166, 0.95).lineBetween(bikeX + 43, wheelY - 6, bikeX + 49, wheelY - 6);
    detail.fillStyle(0xffd166, 1).fillCircle(bikeX + 21, wheelY, 3.2);
    detail.fillStyle(0x263b4f, 0.9).fillEllipse(bikeX + 24, wheelY + 16, 16, 3);
    // Pavement seams, cracks and rain-darkened patches break up the flat ground.
    for (let x = 36; x < this.worldWidth; x += 84) {
      detail.lineStyle(1, 0x293b50, 0.55).lineBetween(x, gy + 17, x + 31, gy + 17);
      detail.lineStyle(1, 0x293b50, 0.35).lineBetween(x + 37, gy + 19, x + 55, gy + 19);
    }
    const cracks = [
      [190, gy + 36, 204, gy + 42, 199, gy + 49],
      [720, gy + 28, 735, gy + 34, 729, gy + 41],
      [1270, gy + 41, 1284, gy + 36, 1292, gy + 44],
      [1710, gy + 29, 1724, gy + 36, 1718, gy + 45],
      [2400, gy + 34, 2414, gy + 29, 2422, gy + 37]
    ];
    detail.lineStyle(1.5, 0x29384a, 0.75);
    for (const c of cracks) {
      detail.lineBetween(c[0], c[1], c[2], c[3]);
      detail.lineBetween(c[2], c[3], c[4], c[5]);
    }
    // Drain grates and shallow puddles reflect the warm morning sky.
    for (const x of [315, 875, 1245, 1655, 2020, 2330, 2670]) {
      detail.fillStyle(0x1c2b3b, 0.9).fillRoundedRect(x, gy + 30, 34, 8, 2);
      detail.lineStyle(1, 0x87949b, 0.7);
      for (let k = 0; k < 5; k++) detail.lineBetween(x + 5 + k * 6, gy + 32, x + 5 + k * 6, gy + 36);
      detail.fillStyle(0x8ca6b0, 0.24).fillEllipse(x + 52, gy + 46, 29, 5);
      detail.lineStyle(1, 0xf5d6a1, 0.35).lineBetween(x + 42, gy + 45, x + 60, gy + 45);
    }
    // A crossing, traffic lights and bollards add a sense of street layout and scale.
    for (let i = 0; i < 7; i++) {
      detail.fillStyle(0xe5d9bf, 0.78).fillRoundedRect(1125 + i * 25, gy + 19, 15, 31, 2);
    }
    detail.fillStyle(0x29384a, 1).fillRoundedRect(1168, gy - 126, 8, 126, 3);
    detail.fillStyle(0x1a2b3d, 1).fillRoundedRect(1157, gy - 143, 30, 54, 5);
    detail.fillStyle(0xe16f68, 0.95).fillCircle(1172, gy - 132, 5);
    detail.fillStyle(0xe6bd68, 0.35).fillCircle(1172, gy - 116, 5);
    detail.fillStyle(0x83c6a3, 0.28).fillCircle(1172, gy - 100, 5);
    detail.fillStyle(0x27384a, 1).fillRoundedRect(1094, gy - 18, 8, 18, 3);
    detail.fillStyle(0x27384a, 1).fillRoundedRect(1212, gy - 18, 8, 18, 3);

    // A news stand and loose paper suggest the city is still in its normal morning routine.
    detail.fillStyle(0x293d50, 1).fillRoundedRect(690, gy - 64, 49, 62, 4);
    detail.fillStyle(0xd9d0b7, 1).fillRoundedRect(696, gy - 58, 37, 25, 2);
    detail.fillStyle(0xb86e61, 1).fillRect(696, gy - 58, 37, 6);
    detail.fillStyle(0x435d70, 1).fillRect(701, gy - 47, 26, 2);
    detail.fillStyle(0x435d70, 1).fillRect(701, gy - 41, 21, 2);
    detail.fillStyle(0x435d70, 1).fillRect(701, gy - 35, 29, 2);
    detail.fillStyle(0xd9d0b7, 0.95).fillTriangle(760, gy + 31, 777, gy + 29, 772, gy + 37);
    detail.lineStyle(1, 0x7b8790, 0.65).lineBetween(764, gy + 32, 772, gy + 32);

    // Overhead cables connect the older storefronts to the street lights.
    detail.lineStyle(2, 0x1b2c40, 0.65);
    detail.lineBetween(440, gy - height * 0.36 + 8, 555, gy - height * 0.36 + 26);
    detail.lineBetween(555, gy - height * 0.36 + 26, 670, gy - height * 0.36 + 11);
    detail.lineStyle(1, 0x8d9ca2, 0.4);
    detail.lineBetween(440, gy - height * 0.36 + 11, 555, gy - height * 0.36 + 29);
    detail.lineBetween(555, gy - height * 0.36 + 29, 670, gy - height * 0.36 + 14);

    // A few low bollards and litter bins give the curb a more lived-in silhouette.
    for (const x of [470, 1010, 1450, 1945, 2250, 2580]) {
      detail.fillStyle(0x26394c, 1).fillRoundedRect(x, gy - 16, 10, 16, 3);
      detail.fillStyle(0x8ca3a7, 0.7).fillRoundedRect(x + 2, gy - 13, 6, 3, 1);
    }
    for (const x of [560, 1600, 2460]) {
      detail.fillStyle(0x293e50, 1).fillRoundedRect(x, gy - 31, 25, 31, 4);
      detail.fillStyle(0x1c2b3b, 1).fillRoundedRect(x - 2, gy - 34, 29, 5, 2);
      detail.fillStyle(0x8c9b9e, 0.55).fillRect(x + 5, gy - 25, 15, 2);
      detail.fillStyle(0x8c9b9e, 0.4).fillRect(x + 5, gy - 20, 15, 2);
    }

    this.floorArt.clear();
    this.floorArt.fillStyle(0xf4d5a0, 1);
    for (let x = 0; x < this.worldWidth; x += 100) this.floorArt.fillRect(x, gy + height * 0.12, 42, 4);
  }
  drawPeople() {
    const gy = this.getGroundY();
    this.peopleArt.clear();
    for (let i = 0; i < 18; i++) {
      const panicked = i === 7 && Number.isFinite(this.panicStartTime);
      const escapeDistance = panicked ? Math.min(220, Math.max(0, this.time.now - this.panicStartTime) * 0.04) : 0;
      const x = panicked ? 1260 + escapeDistance : i * 170 + 70;
      const sway = Math.sin(this.time.now / (panicked ? 190 : 460) + i * 1.7) * (panicked ? 2.4 : 1.5);
      const step = Math.sin(this.time.now / (panicked ? 68 : 210) + i * 2.1) * (panicked ? 7.5 : 2.2);
      const colors = [0x344b64, 0x784f5e, 0x526a68, 0x9a765b, 0x596c85];
      this.peopleArt.fillStyle(0x142238, 0.18).fillEllipse(x, gy - 1, 19, 5);
      this.peopleArt.fillStyle(panicked ? 0xc85d62 : colors[i % colors.length], 1)
        .fillRoundedRect(x - 6 + sway + (panicked ? 2 : 0), gy - 30, 12, 24, 4);
      this.peopleArt.fillStyle(0xdeb08c, 1).fillCircle(x + sway, gy - 36, 6.5);
      this.peopleArt.fillStyle(i % 3 === 0 ? 0x302b35 : 0x4a3b36, 1)
        .fillEllipse(x + sway, gy - 40, 13, 7);
      this.peopleArt.lineStyle(3.2, 0x26384b, 1)
        .lineBetween(x - 3 + sway, gy - 10, x - 4 + step, gy - 2);
      this.peopleArt.lineStyle(3.2, 0x26384b, 1)
        .lineBetween(x + 3 + sway, gy - 10, x + 4 - step, gy - 2);
      this.peopleArt.lineStyle(3, 0xd9a783, 1)
        .lineBetween(x - 7 + sway, gy - 25, x - 8 - step * (panicked ? 0.72 : 1), gy - 17 - (panicked ? Math.abs(step) * 0.28 : 0));
      this.peopleArt.lineStyle(3, 0xd9a783, 1)
        .lineBetween(x + 7 + sway, gy - 25, x + 8 + step * (panicked ? 0.72 : 1), gy - 17 - (panicked ? Math.abs(step) * 0.28 : 0));
      if (panicked) {
        // Lean forward and add two short speed marks to distinguish panic from
        // the other commuters' small idle steps.
        this.peopleArt.fillStyle(0xc85d62, 1).fillTriangle(x - 3, gy - 30, x + 7, gy - 28, x + 3, gy - 24);
        this.peopleArt.lineStyle(1.5, 0xfff0cf, 0.8).lineBetween(x - 17, gy - 26, x - 12, gy - 23);
        this.peopleArt.lineStyle(1.5, 0xfff0cf, 0.65).lineBetween(x - 20, gy - 20, x - 15, gy - 17);
      }
    }
    // More varied clothing silhouettes keep the street from reading as repeated icons.
    const extras = [
      {x:360,c:0xffbf69,bag:0x2f6572},
      {x:1015,c:0x6bd3c1,bag:0x2c4d5c},
      {x:1880,c:0xe77985,bag:0x4e6674},
      {x:2325,c:0x7bbbe4,bag:0x38556a}
    ];
    for (const person of extras) {
      const px = person.x + Math.sin(this.time.now / 500 + person.x) * 2;
      const py = gy - 1;
      this.peopleArt.fillStyle(0x142238, 0.2).fillEllipse(px, py, 21, 5);
      this.peopleArt.fillStyle(person.bag, 1).fillRoundedRect(px - 9, gy - 29, 5, 14, 2);
      this.peopleArt.fillStyle(person.c, 1).fillRoundedRect(px - 6, gy - 31, 12, 24, 4);
      this.peopleArt.fillStyle(0xe7b58f, 1).fillCircle(px, gy - 37, 6.5);
      this.peopleArt.fillStyle(0x302b35, 1).fillEllipse(px, gy - 41, 13, 7);
      this.peopleArt.lineStyle(3, 0x26384b, 1).lineBetween(px - 3, gy - 10, px - 5, gy - 2);
      this.peopleArt.lineStyle(3, 0x26384b, 1).lineBetween(px + 3, gy - 10, px + 5, gy - 2);
    }
    // One pedestrian stands still, staring at the station rather than following the crowd.
    const strangerX = 1615;
    this.peopleArt.fillStyle(0x152237, 0.22).fillEllipse(strangerX, gy - 1, 22, 5);
    this.peopleArt.fillStyle(0x9a5c58, 1).fillRoundedRect(strangerX - 7, gy - 32, 14, 26, 4);
    this.peopleArt.fillStyle(0xd8a782, 1).fillCircle(strangerX, gy - 39, 6.5);
    this.peopleArt.fillStyle(0x302b35, 1).fillEllipse(strangerX, gy - 43, 13, 7);
    this.peopleArt.fillStyle(0x2b4054, 1).fillRoundedRect(strangerX - 8, gy - 15, 16, 6, 2);
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
    g.fillStyle(0x183e50, 1).fillRoundedRect(torsoX - dir * 10 - 4, y - 13 + bounce, 11, 19, 4);
    g.fillStyle(0x36a8b5, 1).fillRoundedRect(torsoX - dir * 10 - 3, y - 12 + bounce, 8, 16, 3);
    g.fillStyle(0x197d8a, 1).fillRoundedRect(torsoX - dir * 10 - 2, y - 7 + bounce, 6, 5, 2);
    g.fillStyle(0xffd65c, 1).fillRoundedRect(torsoX - dir * 10 - 2, y - 3 + bounce, 3, 3, 1);
    // Backpack straps read separately from the torso in both facing directions.
    g.lineStyle(2, 0x164d55, 0.95).lineBetween(torsoX - dir * 5, y - 12 + bounce, torsoX + dir * 5, y + 7 + bounce);
    g.lineStyle(1, 0x8ce0d4, 0.8).lineBetween(torsoX - dir * 5, y - 10 + bounce, torsoX + dir * 4, y + 5 + bounce);

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
      g.fillStyle(0xd8ff70, 1).fillRoundedRect(ankleX - (dir > 0 ? 1 : 6), ankleY - 1, 10, 5, 2);
      g.fillStyle(0xffffff, 0.92).fillRect(ankleX - (dir > 0 ? 0 : 5), ankleY + 3, 9, 1);
    };
    drawLeg(-4, rearLeg, 0x263546, 0x273644);
    drawLeg(4, frontLeg, 0x354657, 0x293847);

    // Jacket silhouette, hem, seams and folds.
    g.fillStyle(0x145844, 1).fillRoundedRect(torsoX - 11, y - 15 + bounce, 22, 28, 6);
    g.fillStyle(0x31a76e, 1).fillRoundedRect(torsoX - 9, y - 15 + bounce, 18, 25, 5);
    g.fillStyle(0x218b60, 1).fillRoundedRect(torsoX - 9, y + 5 + bounce, 18, 7, 2);
    g.fillStyle(0xffd65c, 1).fillRoundedRect(torsoX - 8, y + 10 + bounce, 16, 3, 1);
    g.lineStyle(1.2, 0xb8f0c9, 0.95).lineBetween(torsoX, y - 12 + bounce, torsoX + dir * 1.5, y + 8 + bounce);
    g.lineStyle(1, 0x176b50, 0.9).lineBetween(torsoX - 6, y - 2 + bounce, torsoX - 2, y + 2 + bounce);
    g.lineStyle(1, 0x176b50, 0.9).lineBetween(torsoX + 4, y + 2 + bounce, torsoX + 7, y + 5 + bounce);
    // A small asymmetric chest patch and seam make the jacket feel designed, not generic.
    g.fillStyle(0xffda59, 1).fillRoundedRect(torsoX + dir * 3, y - 5 + bounce, 4, 5, 1);
    g.fillStyle(0x145844, 1).fillRect(torsoX + dir * 4, y - 4 + bounce, 2, 1);
    g.lineStyle(1, 0x6bd79e, 0.9).lineBetween(torsoX - dir * 7, y + 3 + bounce, torsoX - dir * 4, y + 6 + bounce);
    g.fillStyle(0xffd65c, 1).fillRoundedRect(torsoX - 3, y - 12 + bounce, 6, 5, 2);

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
    drawArm(-1, rearArm, 0x23895f);
    drawArm(1, frontArm, 0x31a76e);

    // Neck and head. The head turns slightly toward the direction of travel.
    g.fillStyle(0xd09b79, 1).fillRoundedRect(x - 3, y - 19 + bounce, 6, 8, 2);
    g.fillStyle(0x20232c, 1).fillEllipse(x - dir * 1.2, headY - 7, 20, 11);
    g.fillStyle(0x302b35, 1).fillRoundedRect(x - 9, headY - 7, 5, 11, 2);
    g.fillStyle(0xe6b18b, 1).fillEllipse(x + dir * 0.5, headY, 16.5, 18.5);
    // Layered fringe and a few sharp, uneven tufts create an original anime-like silhouette.
    g.fillStyle(0x20232c, 1).fillTriangle(x - 10, headY - 7, x - 7, headY - 15, x - 2, headY - 7);
    g.fillStyle(0x302b35, 1).fillTriangle(x - 7, headY - 8, x - 3, headY - 14, x + 1, headY - 7);
    g.fillStyle(0x20232c, 1).fillTriangle(x - 3, headY - 8, x + 3, headY - 15, x + 5, headY - 5);
    g.fillStyle(0x302b35, 1).fillTriangle(x + 2, headY - 7, x + 8, headY - 12, x + 7, headY - 2);
    g.fillStyle(0x4a4650, 0.9).fillTriangle(x - 5, headY - 10, x - 2, headY - 13, x - 1, headY - 8);
    // Ear, nose, eye and brow are placed on the leading side of the face.
    g.fillStyle(0xd49a78, 1).fillCircle(x + dir * 7, headY + 1, 2.1);
    g.fillStyle(0xe2a782, 1).fillTriangle(
      x + dir * 6, headY + 1,
      x + dir * 11, headY + 2,
      x + dir * 6, headY + 4
    );
    g.fillStyle(0xfff5db, 1).fillEllipse(x + dir * 3.8, headY - 2, 3.3, 4.1);
    g.fillStyle(0x272b34, 1).fillCircle(x + dir * 4.2, headY - 2, 1.2);
    g.fillStyle(0x302b35, 1).fillTriangle(x + dir * 1, headY - 5, x + dir * 6, headY - 5, x + dir * 5, headY - 4);
    g.lineStyle(1, 0x8b5c4c, 0.75).lineBetween(x + dir * 3, headY + 6, x + dir * 6, headY + 6.5);
    g.fillStyle(0x24454b, 1).fillTriangle(torsoX - dir * 4, y - 14 + bounce, torsoX, y - 7 + bounce, torsoX + dir * 3, y - 14 + bounce);
    g.lineStyle(1, 0x8eb0a2, 0.8).lineBetween(torsoX - dir * 9, y - 8 + bounce, torsoX - dir * 9, y + 1 + bounce);
  }
  drawAtmosphere() {
    if (!this.atmosphereArt) return;
    const art = this.atmosphereArt;
    const gy = this.getGroundY();
    const t = this.time.now;
    art.clear();
    // A breeze carries loose paper through the sunlit street. Keep the effect
    // sparse so it adds motion without obscuring clues or the player's feet.
    for (let i = 0; i < 7; i++) {
      const baseX = 170 + i * 365;
      const drift = (t * (0.018 + (i % 3) * 0.006)) % 280;
      const px = baseX + drift;
      const py = gy - 65 - ((t * (0.012 + (i % 2) * 0.005) + i * 57) % 185);
      const flutter = Math.sin(t / 180 + i * 1.4) * 5;
      art.fillStyle(i % 3 === 0 ? 0xfff1cf : 0xe7f5e9, 0.82);
      art.fillTriangle(px - 5, py, px + 8 + flutter, py - 2, px + 5, py + 7);
      art.lineStyle(1, 0xffffff, 0.58).lineBetween(px - 1, py + 1, px + 4, py + 2);
    }
    // Tiny sunlit motes appear in the open air, most visible against buildings.
    for (let i = 0; i < 16; i++) {
      const px = (i * 193 + t * (0.008 + (i % 4) * 0.002)) % this.worldWidth;
      const py = 90 + (i * 47 % Math.max(100, gy - 120)) + Math.sin(t / 600 + i) * 7;
      art.fillStyle(i % 2 ? 0xffffff : 0xfff0a6, 0.22 + (Math.sin(t / 420 + i) + 1) * 0.12);
      art.fillCircle(px, py, i % 5 === 0 ? 2 : 1.2);
    }
  }
  update() {
    if (!this.player || !this.player.body) return;
    const keyboardLeft = this.cursors.left.isDown || this.keys.A.isDown;
    const keyboardRight = this.cursors.right.isDown || this.keys.D.isDown;
    const left = keyboardLeft || controls.left;
    const right = keyboardRight || controls.right;
    const body = this.player.body;
    const jumpHeld = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || controls.jump;
    const jumpPressed = jumpHeld && !this.jumpWasDown;
    this.jumpWasDown = jumpHeld;
    if (this.storyRunning && dialogue.style.display !== 'block' && !this.completed) {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir) this.facing = dir;
      const targetSpeed = this.keys.SHIFT.isDown ? RUN_SPEED : WALK_SPEED;
      body.setAccelerationX(dir * (dir ? 1500 : 0));
      body.setMaxVelocity(targetSpeed, 720);
      // Stop promptly when no direction is held, without the sticky glide caused
      // by mixing damping and drag. Reverse input also feels immediate.
      if (!dir && Math.abs(body.velocity.x) < 12) body.setVelocityX(0);
      if (dir && Math.sign(body.velocity.x) !== dir && Math.abs(body.velocity.x) > 20) {
        body.setAccelerationX(dir * 1900);
      }
      const grounded = body.blocked.down || body.touching.down || body.onFloor();
      if (jumpPressed && grounded) {
        body.setVelocityY(-410);
      }
      if (dir) this.walkPhase += Math.max(0.12, Math.abs(body.velocity.x) / 800);
      this.breathPhase += 0.06;
      for (const checkpoint of checkpoints) {
        if (!this.checkpointsTriggered.has(checkpoint.id) && this.player.x >= checkpoint.x) {
          this.checkpointsTriggered.add(checkpoint.id);
          if (checkpoint.id === 'alert') this.panicStartTime = this.time.now;
          body.setVelocityX(0);
          body.setAccelerationX(0);
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
      this.jumpWasDown = jumpHeld;
    }
    this.drawPlayer();
    this.drawAtmosphere();
    this.updateClueInterface();
    if (this.game.loop.frame % 3 === 0) {
      // Redraw the screen-fixed skyline with the current camera offset so its
      // layered buildings genuinely drift at different parallax speeds.
      this.drawBackground();
      this.drawPeople();
    }
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