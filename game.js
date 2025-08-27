const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let ground;
let obstacles;
let score = 0;
let scoreText;
let gameOver = false;
let obstacleSpeed = -200;
let groundHeight = 50;

// --- nowości dla skoku ---
let jumpCount = 0;          // 0, 1, 2 (drugi skok = „double jump”)
let wantJump = false;       // impuls z przycisku mobilnego
let jumpCooldown = false;   // krótki cooldown, by nie zjadało wielu skoków naraz

function preload() {
  this.load.image('background', 'assets/sky4.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('obstacle', 'assets/spike.png');
  this.load.spritesheet('fox', 'assets/fox_sprite.png', {
    frameWidth: 32,
    frameHeight: 32
  });
}

function create() {
  score = 0;
  gameOver = false;

  this.add.image(400, 300, 'background');

  ground = this.add.tileSprite(400, 600 - groundHeight / 2, 800, groundHeight, 'ground');
  this.physics.add.existing(ground, true); // static

  player = this.physics.add.sprite(100, 600 - groundHeight - 32, 'fox');
  player.setBounce(0);
  player.setCollideWorldBounds(true);
  player.setScale(2);
  player.setFlipX(true); // „w prawo”

  // --- lisek „stopami” do ziemi (wizualnie) ---
  player.setOrigin(0.5, 1);
  const FOOT_ADJUST = 4; // drobna kosmetyka, jeśli sprite ma przezroczyste piksele u dołu
  player.y = 600 - groundHeight + FOOT_ADJUST;

  this.anims.create({
    key: 'run',
    frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: -1
  });
  player.anims.play('run', true);

  cursors = this.input.keyboard.createCursorKeys();

  this.physics.add.collider(player, ground, () => {
    // reset double jump przy lądowaniu
    jumpCount = 0;
  });

  obstacles = this.physics.add.group();
  this.physics.add.collider(obstacles, ground);
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#000',
    fontFamily: 'monospace'
  });

  this.time.addEvent({
    delay: 2000,
    callback: addObstacle,
    callbackScope: this,
    loop: true
  });

  // --- mobilny przycisk „Skok” ---
  const btnUp = document.getElementById('btn-up');
  if (btnUp) {
    const down = e => { e.preventDefault(); wantJump = true; };
    const up   = e => { e.preventDefault(); /* impuls jednorazowy */ };
    btnUp.addEventListener('touchstart', down, { passive: false });
    btnUp.addEventListener('touchend',   up,   { passive: false });
    btnUp.addEventListener('mousedown',  down);
    btnUp.addEventListener('mouseup',    up);
  }
}

function update() {
  if (gameOver) return;

  // tylko skok (bez lewo/prawo)
  const pressedUp = (cursors.up && cursors.up.isDown) || wantJump;

  // DOUBLE JUMP: pierwszy normalny, drugi nieco wyższy
  if (pressedUp && !jumpCooldown && jumpCount < 2) {
    const v = (jumpCount === 0) ? -500 : -650; // ← drugi skok wyższy
    player.setVelocityY(v);
    jumpCount += 1;
    wantJump = false;

    // krótki cooldown, aby dotyk/klawisz nie trafił kilka razy z rzędu
    jumpCooldown = true;
    this.time.delayedCall(140, () => jumpCooldown = false);

    // delikatny efekt na double jump
    if (jumpCount === 2) {
      player.setTintFill(0x88ccff);
      this.tweens.add({
        targets: player,
        scale: player.scale * 1.08,
        duration: 120,
        yoyo: true,
        onComplete: () => player.clearTint()
      });
    }
  }

  // przeszkody poruszają się po ziemi
  obstacles.getChildren().forEach(function (obstacle) {
    obstacle.setVelocityX(obstacleSpeed);

    if (obstacle.x + obstacle.width < 0) {
      obstacles.remove(obstacle, true, true);
    }

    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
      score++;
      scoreText.setText('Score: ' + score);
    }
  });
}

function addObstacle() {
  const obstacle = obstacles.create(800, 600 - groundHeight - 32, 'obstacle');
  obstacle.setCollideWorldBounds(false);
  obstacle.body.allowGravity = false;
  obstacle.setVelocityX(obstacleSpeed);
  obstacle.setImmovable(true);
  obstacle.setScale(0.4);
  obstacle.passed = false;

  // korekta po skali – „posadź” na ziemi dokładnie
  obstacle.setY(600 - groundHeight - obstacle.displayHeight / 2 + 2);
}

function hitObstacle(player, obstacle) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.stop();
  gameOver = true;
  scoreText.setText('Game Over! Score: ' + score + '\nTapnij lub naciśnij R, aby zagrać ponownie');

  this.input.once('pointerdown', () => this.scene.restart());
  this.input.keyboard?.once('keydown-R', () => this.scene.restart());
}
