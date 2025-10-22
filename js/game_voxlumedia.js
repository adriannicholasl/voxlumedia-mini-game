const totalPairs = 10;
const maxTime = 90;
const gameBoard = document.getElementById("gameBoard");
const timerDisplay = document.getElementById("timer");
const matchedDisplay = document.getElementById("matched");
const winScreen = document.getElementById("winScreen");
const winTitle = document.getElementById("winTitle");
const starImage = document.getElementById("starImage");
const nextButton = document.getElementById("nextLevelBtn");
const finalTime = document.getElementById("finalTime");
const howToPlayModal = document.getElementById("howToPlayModal");
const playButton = document.getElementById("play-button");

let firstCard = null;
let secondCard = null;
let matched = 0;
let timerInterval;
let lockBoard = false;

const matchSound = document.getElementById("soundMatch");
const winSound = document.getElementById("soundWin");
const loseSound = document.getElementById("soundLose");

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function adjustCardSize() {
  const gameBoard = document.querySelector(".game-board");
  const cards = document.querySelectorAll(".card");

  const rows = window.innerWidth <= 768 ? 5 : 4;
  const cols = window.innerWidth <= 768 ? 4 : 5;
  const gap = 10;

  const boardHeight = gameBoard.clientHeight;
  const boardWidth = gameBoard.clientWidth;

  const maxCardHeight = (boardHeight - gap * (rows - 1)) / rows;
  const maxCardWidth = (boardWidth - gap * (cols - 1)) / cols;
  const cardSize = Math.min(maxCardHeight, maxCardWidth);

  cards.forEach((card) => {
    card.style.width = `${cardSize}px`;
    card.style.height = `${cardSize}px`;
  });
}

function generateCards() {
  const uniqueCards = shuffleArray([...Array(totalPairs).keys()].map((i) => i + 1));
  const cardsArr = shuffleArray([...uniqueCards, ...uniqueCards]);

  gameBoard.innerHTML = "";

  cardsArr.forEach((id) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = id;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-back" style="background-image: url('assets/images/card/back/back.png');"></div>
        <div class="card-front" style="background-image: url('assets/images/card/front/front-${id}.png');"></div>
      </div>
    `;

    card.addEventListener("click", () => handleFlip(card));
    gameBoard.appendChild(card);
  });

  adjustCardSize();
}

window.addEventListener("resize", adjustCardSize);

function handleFlip(card) {
  if (lockBoard || card.classList.contains("matched") || card === firstCard) return;

  card.classList.add("flipped");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;
  checkForMatch();
}

function checkForMatch() {
  if (!firstCard || !secondCard) return;

  const isMatch = firstCard.dataset.id === secondCard.dataset.id;

  if (isMatch) {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    matched++;
    matchedDisplay.textContent = `${matched} / ${totalPairs}`;
    try {
      matchSound.currentTime = 0;
      matchSound.play();
    } catch (e) {}

    resetFlip();

    if (matched === totalPairs) {
      setTimeout(() => endGame(false), 600);
    }
  } else {
    setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      resetFlip();
    }, 800);
  }
}

function resetFlip() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function startTimer() {
  const endTime = Date.now() + maxTime * 1000;
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      endGame(true);
    }
  }, 500);
}

// Unlock audio for mobile autoplay
function unlockAudio() {
  [matchSound, winSound, loseSound].forEach((sound) => {
    sound
      .play()
      .then(() => sound.pause())
      .catch(() => {});
  });
}

window.addEventListener("load", () => {
  howToPlayModal.style.display = "flex";
});

playButton.addEventListener("click", () => {
  howToPlayModal.style.display = "none";

  // Reset game state
  firstCard = null;
  secondCard = null;
  matched = 0;
  lockBoard = false;
  matchedDisplay.textContent = `0 / ${totalPairs}`;

  generateCards();
  startTimer();
  unlockAudio();
});

function endGame(isTimeOut) {
  clearInterval(timerInterval);
  finalTime.textContent = timerDisplay.textContent;

  if (isTimeOut) {
    winTitle.textContent = "Time's Up!";
    starImage.src = "assets/ui/star-0.png";
    try {
      loseSound.currentTime = 0;
      loseSound.play();
    } catch (e) {}
  } else {
    winTitle.textContent = "You Win!";
    starImage.src = "assets/ui/star-3.png";
    try {
      winSound.currentTime = 0;
      winSound.play();
    } catch (e) {}
  }

  winScreen.style.display = "flex";
  nextButton.onclick = resetGame;
}

function resetGame() {
  winScreen.style.display = "none";
  firstCard = null;
  secondCard = null;
  matched = 0;
  lockBoard = false;
  matchedDisplay.textContent = `0 / ${totalPairs}`;

  generateCards();
  startTimer();
}
