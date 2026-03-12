let board, ctx;
const boardWidth = 360, boardHeight = 640;
const birdWidth = 34, birdHeight = 24;
let birdX = boardWidth / 8, birdY = boardHeight / 2;
let birdImg, bird = { x: birdX, y: birdY, width: birdWidth, height: birdHeight };

let pipes = [], pipeWidth = 64, pipeHeight = 512, pipeX = boardWidth;
let topPipeImg, bottomPipeImg;

let gravity = 0.4, velocityY = 0, velocityX = -2, isGameStarted = false, gameOver = false, score = 0;

const SOUND_IDS = ['flap', 'pass_pipe', 'gameover', 'swoosh'];
const SOUND_PATHS = {
  flap: './assets/sound/flap.mp3',
  pass_pipe: './assets/sound/pass_pipe.mp3',
  gameover: './assets/sound/gameover.mp3',
  swoosh: './assets/sound/swoosh.mp3',
};

let flapSound = new Audio(SOUND_PATHS.flap);
let passPipeSound = new Audio(SOUND_PATHS.pass_pipe);
let deathSound = new Audio(SOUND_PATHS.gameover);
let swooshSound = new Audio(SOUND_PATHS.swoosh);

const soundById = { flap: flapSound, pass_pipe: passPipeSound, gameover: deathSound, swoosh: swooshSound };
const customSoundUrls = {};

function setGameSound(id, url) {
  if (!SOUND_IDS.includes(id) || !soundById[id]) return;
  const prev = customSoundUrls[id];
  if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
  customSoundUrls[id] = url;
  soundById[id].src = url;
}
window.setGameSound = setGameSound;

let pipeInterval, animationId;
let messageImg;

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    ctx = board.getContext("2d");

    birdImg = new Image();
    birdImg.src = "./assets/images/flappybird.png";

    topPipeImg = new Image();
    topPipeImg.src = "./assets/images/toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./assets/images/bottompipe.png";

    messageImg = document.getElementById("message-image");

    window.birdImg = birdImg;
    window.topPipeImg = topPipeImg;
    window.bottomPipeImg = bottomPipeImg;

    document.getElementById('start-button').addEventListener('click', loadGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    
    // Added a mouse click event listener to the canvas for jumping
    board.addEventListener('click', jump);
    // Added a keydown event listener for the spacebar
    document.addEventListener("keydown", (e) => {
        if (e.code === 'Space') jump();
    });
}

function loadGame() {
    if (pipeInterval != null) {
        clearInterval(pipeInterval);
        pipeInterval = null;
    }
    gameOver = false;
    pipes = [];
    swooshSound.play();
    document.getElementById('main-menu').style.display = 'none';
    isGameStarted = false;
    velocityY = 0;
    score = 0;
    bird.y = birdY;

    messageImg.style.display = 'block';  // Show the message when the game is loaded

    ctx.clearRect(0, 0, board.width, board.height);
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    requestAnimationFrame(update);
}

function startGame() {
    if (!isGameStarted) {
        isGameStarted = true;
        velocityY = -6;
        flapSound.play();
        pipeInterval = setInterval(addPipes, 2500);

        messageImg.style.display = 'none';  // Hide the message after the game starts
    }
}

function update() {
    if (gameOver) return;
    ctx.clearRect(0, 0, board.width, board.height);

    if (isGameStarted) {
        velocityY += gravity;
        bird.y = Math.max(bird.y + velocityY, 0);
    }
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    
    if (bird.y > board.height) endGame();

    pipes.forEach((pipe) => {
        pipe.x += velocityX;
        ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5;
            pipe.passed = true;
            passPipeSound.play();
        }

        if (isCollision(bird, pipe)) endGame();
    });

    pipes = pipes.filter(pipe => pipe.x >= -pipeWidth);

    ctx.fillStyle = "white";
    ctx.font = "45px sans-serif";
    ctx.fillText(Math.floor(score), 5, 45);

    requestAnimationFrame(update);
}

function addPipes() {
    if (gameOver || !isGameStarted) return;
    let gap = boardHeight / 4;
    let randomY = -pipeHeight / 4 - Math.random() * (pipeHeight / 2);

    pipes.push({ img: topPipeImg, x: pipeX, y: randomY, width: pipeWidth, height: pipeHeight, passed: false });
    pipes.push({ img: bottomPipeImg, x: pipeX, y: randomY + pipeHeight + gap, width: pipeWidth, height: pipeHeight, passed: false });
}

function jump() {
    if (!isGameStarted) {
        startGame();
    } else if (!gameOver) {
        velocityY = -6;
        flapSound.play();
    } else {
        restartGame();
    }
}

function isCollision(bird, pipe) {
    return bird.x < pipe.x + pipe.width &&
           bird.x + bird.width > pipe.x &&
           bird.y < pipe.y + pipe.height &&
           bird.y + bird.height > pipe.y;
}

function endGame() {
    gameOver = true;
    clearInterval(pipeInterval);
    pipeInterval = null;
    deathSound.play();
    document.getElementById('gameover-menu').style.display = 'flex';
    document.getElementById('final-score').textContent = Math.floor(score);
}

function restartGame() {
    if (pipeInterval != null) {
        clearInterval(pipeInterval);
        pipeInterval = null;
    }
    gameOver = false;
    pipes = [];
    velocityY = 0;
    score = 0;
    bird.y = birdY;
    document.getElementById('gameover-menu').style.display = 'none';

    messageImg.style.display = 'block';  // Show the message when restarting the game

    loadGame();
}