const totalPairs = 10;
const maxTime = 5;
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
let startTime, timerInterval;
let lockBoard = false;
let pausedTime = 0;

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function adjustCardSize() {
  const gameBoard = document.querySelector(".game-board");
  const cards = document.querySelectorAll(".card");

  const rows = 4;
  const cols = 5;
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
  const isMatch = firstCard.dataset.id === secondCard.dataset.id;

  if (isMatch) {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    matched++;
    matchedDisplay.textContent = `${matched} / ${totalPairs}`;

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
  let endTime = Date.now() + maxTime * 1000; // waktu selesai = sekarang + maxTime detik
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      endGame(true); // waktu habis
    }
  }, 500);
}

window.addEventListener("load", () => {
  howToPlayModal.style.display = "flex";
});

playButton.addEventListener("click", () => {
  howToPlayModal.style.display = "none";
  generateCards();
  startTimer();
});

function endGame(isTimeOut) {
  clearInterval(timerInterval);
  finalTime.textContent = timerDisplay.textContent;

  winTitle.textContent = isTimeOut ? "Time's Up!" : "You Win!";
  const starsEarned = isTimeOut ? 0 : 3;
  starImage.src = `assets/ui/star-${starsEarned}.png`;
  winScreen.style.display = "flex";

  starImage.classList.remove("animate");
  starImage.onload = () => starImage.classList.add("animate");

  nextButton.onclick = resetGame;
}

function resetGame() {
  winScreen.style.display = "none";
  matched = 0;
  matchedDisplay.textContent = `0 / ${totalPairs}`;
  pausedTime = 0;
  generateCards();
  startTimer();
}

// window.addEventListener("load", () => {
//   generateCards();
//   startTimer();
// });
