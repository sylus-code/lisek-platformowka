/**
 * @this {Phaser.Scene}
 */
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
let score = 0;
let scoreText;
let obstacles;

const game = new Phaser.Game(config);

function preload () {
  this.load.image('background', 'assets/sky4.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('obstacle', 'assets/spike.png');
  this.load.spritesheet('fox', 'assets/fox_all.png', { frameWidth: 32, frameHeight: 32 });
}

function create () {
  this.add.image(400, 300, 'background');
  const platforms = this.physics.add.staticGroup();
  platforms.create(400, 584, 'ground').setScale(2).refreshBody();

  player = this.physics.add.sprite(100, 450, 'fox');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 1 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'turn',
    frames: [ { key: 'fox', frame: 0 } ],
    frameRate: 20
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('fox', { start: 1, end: 2 }),
    frameRate: 10,
    repeat: -1
  });

  this.physics.add.collider(player, platforms);
  cursors = this.input.keyboard.createCursorKeys();

  obstacles = this.physics.add.group();
  this.time.addEvent({
    delay: 2000,
    callback: addObstacle,
    callbackScope: this,
    loop: true
  });

  this.physics.add.collider(obstacles, platforms);
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
}

function update () {
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('left', true);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('right', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('turn');
  }

  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

function addObstacle() {
  const obstacle = obstacles.create(800, 550, 'obstacle');
  obstacle.setVelocityX(-200);
  obstacle.setCollideWorldBounds(false);
  obstacle.setImmovable(true);
  score += 10;
  scoreText.setText('Score: ' + score);
}

function hitObstacle(player, obstacle) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.play('turn');
  scoreText.setText('Game Over! Score: ' + score);
}
