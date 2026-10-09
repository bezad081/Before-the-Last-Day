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
    this.bindTouchControls();
  }
  getGroundY() { return Math.floor(this.scale.height * 0.79); }
  startStory() { this.storyRunning = true; }
  interactWithStreet() {
    if (!this.player || dialogue.style.display === 'block' || this.completed) return;
    const spots = [
      {x:945, radius:95, title:'A CRUMPLED NOTE', text:'The damp note reads: “If the trains stop, do not follow the crowd underground.” No signature. No date.'},
      {x:1510, radius:105, title:'A PUBLIC PHONE', text:'The receiver is off the hook. A faint voice repeats a station announcement, then dissolves into static.'},
      {x:2135, radius:110, title:'ABANDONED SUITCASE', text:'A suitcase sits beside the crossing. A phone is ringing inside a side pocket. Nobody comes back for it.'}
    ];
    const spot = spots.find(item => Math.abs(this.player.x - item.x) <= item.radius);
    if (spot) showDialogue(0, [[spot.title, spot.text], ['NARRATOR', 'You look around again. The city seems to be changing faster than anyone can explain.']]);
    else showToast('Nothing close enough to inspect. Look around as you walk.');
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
    const stride = moving ? Math.sin(this.walkPhase) * Math.min(6, speed / 35) : 0;
    const swing = moving ? Math.sin(this.walkPhase + Math.PI) * 4 : 0;
    const bob = moving ? Math.abs(Math.sin(this.walkPhase * 2)) * 1.5 : Math.sin(this.breathPhase) * 0.7;
    const dir = this.facing, g = this.playerArt;
    g.clear();
    g.fillStyle(0x152339, airborne ? 0.12 : 0.26).fillEllipse(x + 3, this.getGroundY() + 2, airborne ? 23 : 34, airborne ? 6 : 10);
    const hipY = y + 11 + bob, shoulderY = y - 7 + bob;
    const legA = airborne ? -4 : stride, legB = airborne ? 5 : -stride;
    g.lineStyle(7, 0x263548, 1).lineBetween(x - 3 + legB * 0.4, hipY, x - 5 + legB, y + 21);
    g.lineStyle(5, 0xe2b99a, 1).lineBetween(x - 5 + legB, y + 21, x - 9 + legB, y + 22);
    g.lineStyle(7, 0x34475a, 1).lineBetween(x + 3 + legA * 0.35, hipY, x + 4 + legA, y + 21);
    g.lineStyle(5, 0xe8c6a4, 1).lineBetween(x + 4 + legA, y + 21, x + 8 + legA, y + 22);
    g.fillStyle(0x6c796b, 1).fillRoundedRect(x - dir * 12 - 5, y - 10 + bob, 10, 18, 3);
    g.fillStyle(0x263b4a, 1).fillRoundedRect(x - 10, y - 13 + bob, 20, 26, 6);
    g.fillStyle(0x3e6f70, 1).fillRoundedRect(x - 8, y - 12 + bob, 16, 23, 5);
    g.fillStyle(0xd6b68b, 1).fillRect(x - 1, y - 10 + bob, 2, 18);
    g.lineStyle(6, 0xe4b18c, 1).lineBetween(x - 8, shoulderY + 2, x - 10 - swing * 0.45, y + 5 + swing);
    g.lineStyle(6, 0xe4b18c, 1).lineBetween(x + 8, shoulderY + 2, x + 10 + swing * 0.45, y + 5 - swing);
    g.fillStyle(0x3e6f70, 1).fillRoundedRect(x - 11, shoulderY - 1, 6, 13, 3);
    g.fillStyle(0x3e6f70, 1).fillRoundedRect(x + 5, shoulderY - 1, 6, 13, 3);
    g.fillStyle(0xd7a17e, 1).fillRoundedRect(x - 3, y - 18 + bob, 6, 7, 2);
    g.fillStyle(0xe8b58e, 1).fillEllipse(x, y - 24 + bob, 17, 19);
    g.fillStyle(0x302b35, 1).fillEllipse(x - dir, y - 31 + bob, 19, 11);
    g.fillStyle(0x302b35, 1).fillRoundedRect(x - 8, y - 30 + bob, 5, 10, 2);
    g.fillStyle(0x302b35, 1).fillTriangle(x - 6, y - 27 + bob, x + 4, y - 28 + bob, x + 1, y - 22 + bob);
    g.fillStyle(0xd49a78, 1).fillCircle(x + dir * 7, y - 23 + bob, 2.1);
    g.fillStyle(0x272b34, 1).fillCircle(x + dir * 3.7, y - 25 + bob, 1.1);
    g.fillStyle(0xd49a78, 1).fillTriangle(x + dir * 7, y - 23 + bob, x + dir * 11, y - 22 + bob, x + dir * 7, y - 21 + bob);
    g.fillStyle(0xd5b28a, 1).fillRect(x - 8, y + 1 + bob, 3, 2);
    g.lineStyle(1, 0x9bb4a8, 0.9).lineBetween(x - dir * 10, y - 5 + bob, x - dir * 10, y + 3 + bob);
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