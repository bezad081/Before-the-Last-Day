(()=> {
'use strict';

const WORLD_WIDTH = 3000;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 48;
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
const controls = {left:false,right:false,jump:false};
let sceneRef = null;
let gameStarted = false;

function showToast(message) {
  toast.textContent = message;
  toast.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.style.opacity = '0'; }, 2400);
}
function showDialogue(index) {
  if (index < 0 || index >= story.length) {
    dialogue.style.display = 'none';
    return;
  }
  dialogue.dataset.index = String(index);
  document.getElementById('speaker').textContent = story[index][0];
  document.getElementById('line').textContent = story[index][1];
  dialogue.style.display = 'block';
}
function advanceDialogue() {
  if (dialogue.style.display !== 'block') return;
  const current = Number(dialogue.dataset.index || 0);
  if (current >= story.length - 1) {
    dialogue.style.display = 'none';
    showToast('The street is no longer ordinary. Keep going.');
  } else {
    showDialogue(current + 1);
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
    this.floor = this.add.rectangle(this.worldWidth / 2, groundY + (this.scale.height - groundY) / 2, this.worldWidth, this.scale.height - groundY, 0x596579).setOrigin(0.5, 0);
    this.physics.add.existing(this.floor, true);
    this.floor.setVisible(false);
    this.player = this.add.rectangle(90, groundY - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 0x000000, 0);
    this.physics.add.existing(this.player);
    this.player.body.setSize(22, 44);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(260, 1000);
    this.physics.add.collider(this.player, this.floor);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(this.scale.width * 0.28, this.scale.height * 0.18);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE,ENTER,E');
    this.input.keyboard.on('keydown-ENTER', () => { if (gameStarted) advanceDialogue(); });
    this.input.keyboard.on('keydown-E', () => { if (gameStarted) advanceDialogue(); });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (gameStarted && dialogue.style.display === 'block') advanceDialogue();
    });
    this.scale.on('resize', this.handleResize, this);
    this.drawWorld();
    this.bindTouchControls();
  }
  getGroundY() { return Math.floor(this.scale.height * 0.79); }
  startStory() { this.storyRunning = true; }
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
        if (key === 'talk') advanceDialogue();
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
  drawWorld() {
    const width = this.scale.width, height = this.scale.height, gy = this.getGroundY();
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
    const p = this.player;
    const x = p.x - PLAYER_WIDTH / 2, y = p.y - PLAYER_HEIGHT / 2;
    const moving = Math.abs(p.body.velocity.x) > 12;
    const stride = moving && p.body.blocked.down ? Math.sin(this.walkPhase) * 4 : 0;
    const g = this.playerArt;
    g.clear();
    g.fillStyle(0x152339, 0.22).fillEllipse(p.x, this.getGroundY() + 2, 34, 10);
    g.fillStyle(0x25374c, 1);
    g.fillRoundedRect(x + 4, y + 31, 8, 15 + stride, 3);
    g.fillRoundedRect(x + 16, y + 31, 8, 15 - stride, 3);
    g.fillStyle(0xf8d8b0, 1);
    g.fillRoundedRect(x + 1 + stride, y + 44, 12, 4, 2);
    g.fillRoundedRect(x + 16 - stride, y + 44, 12, 4, 2);
    g.fillStyle(0xe9a45f, 1).fillRoundedRect(x + 4, y + 15, 21, 23, 6);
    g.fillStyle(0xf1b76f, 1).fillRoundedRect(x + 5, y + 18, 19, 17, 5);
    g.fillStyle(0x6bb6a6, 1).fillRoundedRect(x, y + 20, 7, 15, 3);
    g.fillStyle(0xd99172, 1).fillRect(x + 12, y + 11, 7, 7);
    g.fillStyle(0xe9b08e, 1).fillCircle(x + 15, y + 8, 10);
    g.fillStyle(0x392f42, 1).fillEllipse(x + 14, y + 4, 20, 10);
    g.fillStyle(0x25374c, 1).fillRect(x + 18, y + 8, 2, 2);
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
      body.setVelocityX(dir * 190);
      if ((this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || controls.jump) && body.blocked.down) {
        body.setVelocityY(-430);
      }
      if (dir) this.walkPhase += 0.22;
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