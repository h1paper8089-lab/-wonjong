const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

const COLORS = {
  I: "#33d1ff",
  J: "#4f78ff",
  L: "#ff9f40",
  O: "#ffe15a",
  S: "#63ff83",
  T: "#cf7bff",
  Z: "#ff5e6b",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

let board = [];
let piece;
let gameLoopId = null;
let dropCounter = 0;
let lastTime = 0;
let isRunning = false;
let isPaused = false;
let score = 0;
let lines = 0;
let level = 1;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

function rotate(matrix) {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]).reverse());
}

function collide(target = piece) {
  return target.shape.some((row, y) => {
    return row.some((value, x) => {
      if (!value) {
        return false;
      }
      const nx = target.x + x;
      const ny = target.y + y;
      return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
    });
  });
}

function merge() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.y + y >= 0) {
        board[piece.y + y][piece.x + x] = piece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    updateStats();
  }
}

function updateStats() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(x, y, COLORS[value]);
      }
    });
  });

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(piece.x + x, piece.y + y, COLORS[piece.type]);
      }
    });
  });
}

function speedByLevel() {
  return Math.max(100, 700 - (level - 1) * 60);
}

function spawnPiece() {
  piece = randomPiece();
  if (collide(piece)) {
    statusEl.textContent = "게임 오버! 시작 / 재시작 버튼으로 다시 시작하세요.";
    stopGame();
  }
}

function hardDrop() {
  while (!collide({ ...piece, y: piece.y + 1 })) {
    piece.y += 1;
  }
  tick();
}

function move(dx) {
  const next = { ...piece, x: piece.x + dx };
  if (!collide(next)) {
    piece = next;
  }
}

function softDrop() {
  const next = { ...piece, y: piece.y + 1 };
  if (!collide(next)) {
    piece = next;
  } else {
    tick();
  }
}

function spin() {
  const rotated = rotate(piece.shape);
  const next = { ...piece, shape: rotated };
  if (!collide(next)) {
    piece = next;
    return;
  }

  const kickLeft = { ...next, x: next.x - 1 };
  const kickRight = { ...next, x: next.x + 1 };
  if (!collide(kickLeft)) {
    piece = kickLeft;
  } else if (!collide(kickRight)) {
    piece = kickRight;
  }
}

function tick() {
  merge();
  clearLines();
  spawnPiece();
}

function update(time = 0) {
  if (!isRunning || isPaused) {
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > speedByLevel()) {
    softDrop();
    dropCounter = 0;
  }

  draw();
  gameLoopId = requestAnimationFrame(update);
}

function stopGame() {
  isRunning = false;
  isPaused = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
}

function startGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  updateStats();
  dropCounter = 0;
  lastTime = 0;
  isRunning = true;
  isPaused = false;
  statusEl.textContent = "게임 진행 중";
  spawnPiece();
  draw();
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }
  gameLoopId = requestAnimationFrame(update);
}

function togglePause() {
  if (!isRunning) {
    return;
  }
  isPaused = !isPaused;
  if (isPaused) {
    statusEl.textContent = "일시정지됨 (P로 재개)";
  } else {
    statusEl.textContent = "게임 진행 중";
    lastTime = performance.now();
    gameLoopId = requestAnimationFrame(update);
  }
}

startBtn.addEventListener("click", startGame);

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (!isRunning || isPaused) {
    return;
  }

  if (event.key === "ArrowLeft") {
    move(-1);
  } else if (event.key === "ArrowRight") {
    move(1);
  } else if (event.key === "ArrowDown") {
    softDrop();
  } else if (event.key === "ArrowUp") {
    spin();
  } else if (event.code === "Space") {
    hardDrop();
  }
  draw();
});

document.querySelectorAll(".mobile-controls button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!isRunning || isPaused) {
      return;
    }
    const { action } = button.dataset;
    if (action === "left") {
      move(-1);
    } else if (action === "right") {
      move(1);
    } else if (action === "down") {
      softDrop();
    } else if (action === "rotate") {
      spin();
    }
    draw();
  });
});

board = createBoard();
piece = randomPiece();
draw();
