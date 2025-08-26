
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

let player;
let cursors;
let platforms;
let obstacles;
let score = 0;
let scoreText;
let gameOver = false;

const game = new Phaser.Game(config);

function preload () {
  this.load.image('background', 'assets/sky4.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('obstacle', 'assets/spike.png');
  this.load.spritesheet('fox', 'assets/fox_sprite.png', { frameWidth: 32, frameHeight: 32 });
}

function create () {
  this.add.image(400, 300, 'background');
  platforms = this.physics.add.staticGroup();
  platforms.create(400, 584, 'ground').setScale(2).refreshBody();

  player = this.physics.add.sprite(100, 450, 'fox');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'run',
    frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: -1
  });

  player.anims.play('run', true);

  cursors = this.input.keyboard.createCursorKeys();
  this.physics.add.collider(player, platforms);

  obstacles = this.physics.add.group();
  this.physics.add.collider(obstacles, platforms);
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#000' });

  this.time.addEvent({
    delay: 2000,
    callback: () => spawnObstacle(this),
    loop: true
  });
}

function update () {
  if (gameOver) return;

  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-350);
  }

  obstacles.children.iterate(function (child) {
    if (child) {
      child.setVelocityX(-200);
      if (child.x < -50) {
        score += 10;
        scoreText.setText('Score: ' + score);
        child.destroy();
      }
    }
  });
}

function spawnObstacle(scene) {
  const obstacle = obstacles.create(850, 540, 'obstacle');
  obstacle.setCollideWorldBounds(false);
  obstacle.setImmovable();
}

function hitObstacle(player, obstacle) {
  this.physics.pause();
  player.setTint(0xff0000);
  gameOver = true;
  scoreText.setText('Game Over! Score: ' + score);
}
