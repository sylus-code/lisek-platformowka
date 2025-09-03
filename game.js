const config = {
  type: Phaser.AUTO,
  width: 450,
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

// --- ekran startowy i high score ---
let gameStarted = false;
let startText;
let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
let highScoreText;

function preload() {
  this.load.image('title', 'assets/title-lisek.png');
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
  gameStarted = false; // ważne po scene.restart()
  gameOver = false;


  this.add.image(400, 300, 'background');

  ground = this.add.tileSprite(400, 600 - groundHeight / 2, 800, groundHeight, 'ground');
  this.physics.add.existing(ground, true); // static

  player = this.physics.add.sprite(100, 600 - groundHeight - 32, 'fox');
  player.setBounce(0);
  player.setCollideWorldBounds(true);
  player.setScale(2);
  player.setFlipX(true); // „w prawo”

  // --- lisek „stopami” do ziemi ---
  // rozmiar klatki to 32x32, skala 2x; collider ustawiamy „na buty”
  player.body.setSize(32, 28, true); // trochę niższy (28) = łatwiej o czyste lądowanie
  player.body.setOffset(0, 0);       // 4 px „podeszwy” (w jednostkach klatki, nie skali)

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

  highScoreText = this.add.text(450 - 16, 16, 'Best: ' + highScore, {
    fontSize: '24px', fill: '#000', fontFamily: 'monospace'
  }).setOrigin(1, 0);

//  EKRAN STARTOWY + pauza
  startImage = this.add.image(230, 300, 'title').setOrigin(0.5).setDepth(999);
  startImage.setScale(0.6); // dopasuj do okna gry
  startText = this.add.text(200, 300,
      'Lisek Jump\n\nTapnij ekran\nlub naciśnij SPACJĘ\naby rozpocząć',
      { fontSize: '28px', fill: '#555', fontFamily: 'monospace', align: 'center' }
  ).setOrigin(0.5).setDepth(999);

  this.physics.pause(); // gra stoi do startu

// nasłuch startu
  this.input.once('pointerdown', () => startGame.call(this));
  this.input.keyboard?.once('keydown-SPACE', () => startGame.call(this));
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

  // pokaż sterowanie, jeśli urządzenie ma ekran dotykowy (fallback na wypadek, gdy media-query nie zadziała)
  const controlsEl = document.querySelector('.mobile-controls');
  if (controlsEl) {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
        || ('ontouchstart' in window)
        || (navigator.maxTouchPoints > 0);
    if (isTouch) controlsEl.style.display = 'flex';
  }
}
function startGame() {
  if (gameStarted || gameOver) return;
  gameStarted = true;

  startText?.destroy();
  startImage?.destroy();
  this.physics.resume();

  // startuj przeszkody dopiero teraz
  this.time.addEvent({
    delay: 2000,
    callback: addObstacle,
    callbackScope: this,
    loop: true
  });
}

function update() {
  if (gameOver) return;
  if (!gameStarted) return; // dopóki nie klikniesz START, nic nie robi

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

  // high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', String(highScore));
  }
  highScoreText.setText('Best: ' + highScore);

  scoreText.setText('Game Over!\n Score: ' + score + '\nTapnij lub naciśnij R,\n aby zagrać ponownie');

  this.input.once('pointerdown', () => this.scene.restart());
  this.input.keyboard?.once('keydown-R', () => this.scene.restart());
}
