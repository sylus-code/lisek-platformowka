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
  scene: {
    preload: preload,
    create: create,
    update: update
  }
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
let jumpAllowed = true;

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
  this.add.image(400, 300, 'background');

  ground = this.add.tileSprite(400, 600 - groundHeight / 2, 800, groundHeight, 'ground');
  this.physics.add.existing(ground, true);

  player = this.physics.add.sprite(100, 600 - groundHeight - 32, 'fox');
  player.setBounce(0);
  player.setCollideWorldBounds(true);
  player.setScale(2);
  player.setFlipX(true); // patrzy w prawo

  this.anims.create({
    key: 'run',
    frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: -1
  });

  player.anims.play('run', true);

  cursors = this.input.keyboard.createCursorKeys();

  this.physics.add.collider(player, ground);

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
}

function update() {
  if (gameOver) return;

  if (cursors.up.isDown && player.body.touching.down && jumpAllowed) {
    player.setVelocityY(-500);
    jumpAllowed = false;
  }

  if (player.body.touching.down) {
    jumpAllowed = true;
  }

  obstacles.getChildren().forEach(function (obstacle) {
    obstacle.setVelocityX(obstacleSpeed);

    // Usuwanie przeszkód poza ekranem
    if (obstacle.x + obstacle.width < 0) {
      obstacles.remove(obstacle, true, true);
    }

    // Przyznaj punkt za przeskoczoną przeszkodę
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
  obstacle.setScale(0.4); // 🔧 zmniejszamy przeszkodę
  obstacle.passed = false;
}

function hitObstacle(player, obstacle) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.stop();
  gameOver = true;
  scoreText.setText('Game Over! Score: ' + score);
}
