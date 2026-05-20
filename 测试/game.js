const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");
const shareButton = document.querySelector("#shareButton");
const shareStatusEl = document.querySelector("#shareStatus");
const touchButtons = document.querySelectorAll("[data-direction]");

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const tickRate = 110;
const storageKey = "neon-snake-best-score";
const normalFoodScore = 10;
const lengthFruitScore = 25;
const normalFoodRadius = gridSize * 0.35;
const lengthFruitRadius = normalFoodRadius * 2;

const directionMap = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const touchDirectionMap = {
  up: directionMap.ArrowUp,
  down: directionMap.ArrowDown,
  left: directionMap.ArrowLeft,
  right: directionMap.ArrowRight,
};

let snake;
let food;
let lengthFruit;
let direction;
let nextDirection;
let score;
let bestScore = readBestScore();
let loopId;
let gameState = "ready";

bestScoreEl.textContent = bestScore;
resetGame();
draw();

function resetGame() {
  const middle = Math.floor(tileCount / 2);
  snake = [
    { x: middle, y: middle },
    { x: middle - 1, y: middle },
    { x: middle - 2, y: middle },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;
  food = createFood();
  lengthFruit = createFood([food], { avoidEdges: true });
  setMessage("准备开始", "点击开始，或者按 Enter", false);
}

function startGame() {
  if (gameState === "playing") {
    return;
  }

  if (gameState === "ended") {
    resetGame();
  }

  gameState = "playing";
  setMessage("", "", true);
  clearInterval(loopId);
  loopId = setInterval(tick, tickRate);
}

function pauseGame() {
  if (gameState === "playing") {
    gameState = "paused";
    clearInterval(loopId);
    setMessage("暂停中", "按空格或点击继续", false);
    pauseButton.textContent = "继续";
    return;
  }

  if (gameState === "paused") {
    pauseButton.textContent = "暂停";
    startGame();
  }
}

function restartGame() {
  clearInterval(loopId);
  gameState = "ready";
  pauseButton.textContent = "暂停";
  resetGame();
  draw();
}

function tick() {
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const lengthBeforeMove = snake.length;
  const willEatFood = isSameCell(head, food);
  const willEatLengthFruit = isSameCell(head, lengthFruit);
  const willGrow = willEatFood || willEatLengthFruit;

  if (hasHitWall(head) || hasHitSelf(head, willGrow)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (willEatLengthFruit) {
    growSnakeTo(lengthBeforeMove * 2);
    addScore(lengthFruitScore);
    lengthFruit = createFood([food], { avoidEdges: true });
  } else if (willEatFood) {
    addScore(normalFoodScore);
    food = createFood([lengthFruit]);
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  gameState = "ended";
  clearInterval(loopId);
  setMessage("游戏结束", `最终得分：${score}，点击重新开始再来一局`, false);
}

function draw() {
  drawBoard();
  drawFood();
  drawLengthFruit();
  drawSnake();
}

function drawBoard() {
  ctx.fillStyle = "#071017";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(84, 244, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= tileCount; i += 1) {
    const position = i * gridSize;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;
    const isHead = index === 0;

    ctx.fillStyle = isHead ? "#8cff9d" : "#54f4ff";
    ctx.shadowColor = isHead ? "rgba(140, 255, 157, 0.75)" : "rgba(84, 244, 255, 0.45)";
    ctx.shadowBlur = isHead ? 18 : 12;
    roundRect(x + 2, y + 2, gridSize - 4, gridSize - 4, isHead ? 8 : 6);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawFood() {
  if (!food) {
    return;
  }

  const centerX = food.x * gridSize + gridSize / 2;
  const centerY = food.y * gridSize + gridSize / 2;

  ctx.fillStyle = "#ffb84d";
  ctx.shadowColor = "rgba(255, 184, 77, 0.8)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(centerX, centerY, normalFoodRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawLengthFruit() {
  if (!lengthFruit) {
    return;
  }

  const centerX = lengthFruit.x * gridSize + gridSize / 2;
  const centerY = lengthFruit.y * gridSize + gridSize / 2;

  ctx.fillStyle = "#ff5f7e";
  ctx.shadowColor = "rgba(255, 95, 126, 0.9)";
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(centerX, centerY, lengthFruitRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, lengthFruitRadius - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#091018";
  ctx.font = "700 12px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("×2", centerX, centerY + 1);
}

function createFood(excludedCells = [], options = {}) {
  const blockedCells = new Set(
    snake
      .concat(excludedCells.filter(Boolean))
      .map((cell) => getCellKey(cell)),
  );
  const freeCells = [];
  const margin = options.avoidEdges ? 1 : 0;

  for (let y = margin; y < tileCount - margin; y += 1) {
    for (let x = margin; x < tileCount - margin; x += 1) {
      const candidate = { x, y };

      if (!blockedCells.has(getCellKey(candidate))) {
        freeCells.push(candidate);
      }
    }
  }

  if (freeCells.length === 0 && options.avoidEdges) {
    return createFood(excludedCells);
  }

  if (freeCells.length === 0) {
    return null;
  }

  return freeCells[Math.floor(Math.random() * freeCells.length)];
}

function growSnakeTo(targetLength) {
  const tail = snake[snake.length - 1];

  while (snake.length < targetLength) {
    snake.push({ ...tail });
  }
}

function addScore(points) {
  score += points;
  scoreEl.textContent = score;
  updateBestScore();
}

function updateBestScore() {
  if (score <= bestScore) {
    return;
  }

  bestScore = score;
  saveBestScore(bestScore);
  bestScoreEl.textContent = bestScore;
}

function hasHitWall(head) {
  return head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
}

function hasHitSelf(head, willEat) {
  const body = willEat ? snake : snake.slice(0, -1);
  return body.some((segment) => segment.x === head.x && segment.y === head.y);
}

function isSameCell(firstCell, secondCell) {
  return Boolean(
    firstCell &&
      secondCell &&
      firstCell.x === secondCell.x &&
      firstCell.y === secondCell.y,
  );
}

function getCellKey(cell) {
  return `${cell.x},${cell.y}`;
}

function readBestScore() {
  try {
    return Number(window.localStorage.getItem(storageKey)) || 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem(storageKey, String(value));
  } catch (error) {
    // file:// pages or strict privacy modes may block storage; gameplay should still work.
  }
}

function setDirection(newDirection) {
  const isOpposite =
    newDirection.x + direction.x === 0 && newDirection.y + direction.y === 0;

  if (!isOpposite) {
    nextDirection = newDirection;
  }
}

function setMessage(title, detail, isHidden) {
  messageEl.classList.toggle("is-hidden", isHidden);
  messageEl.innerHTML = title ? `<strong>${title}</strong><span>${detail}</span>` : "";
}

async function shareGame() {
  const shareData = {
    title: "霓虹贪吃蛇",
    text: "来挑战这款霓虹风贪吃蛇小游戏，看看你能拿多少分。",
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      setShareStatus("分享面板已打开。");
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      setShareStatus("链接已复制，直接发给好友就行。");
      return;
    }

    setShareStatus("当前浏览器不支持自动复制，可以手动复制地址栏链接。");
  } catch (error) {
    setShareStatus("复制失败，可以手动复制浏览器地址栏里的链接。");
  }
}

function setShareStatus(message) {
  shareStatusEl.textContent = message;
  clearTimeout(setShareStatus.timerId);
  setShareStatus.timerId = setTimeout(() => {
    shareStatusEl.textContent = "";
  }, 2600);
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Enter" && gameState !== "playing") {
    startGame();
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    pauseGame();
    return;
  }

  const newDirection = directionMap[event.code];

  if (newDirection) {
    event.preventDefault();
    setDirection(newDirection);
  }
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", restartGame);
shareButton.addEventListener("click", shareGame);

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(touchDirectionMap[button.dataset.direction]);
    if (gameState === "ready") {
      startGame();
    }
  });
});
