let score = 0;
let misses = 0;
let level = 1;
let gameRunning = true;
let waterHeight = 0;
let trashTypes = [
    { emoji: '🥤', type: 'plastic', name: 'Botol Plastik', isTrash: true },
    { emoji: '📄', type: 'paper', name: 'Kertas', isTrash: true },
    { emoji: '🍌', type: 'organic', name: 'Kulit Pisang', isTrash: true },
    { emoji: '🥫', type: 'metal', name: 'Kaleng', isTrash: true },
    { emoji: '🍎', type: 'organic', name: 'Sisa Buah', isTrash: true },
    { emoji: '📰', type: 'paper', name: 'Koran', isTrash: true },
    { emoji: '🧴', type: 'plastic', name: 'Botol Shampo', isTrash: true },
    { emoji: '⚙️', type: 'metal', name: 'Logam', isTrash: true },
    { emoji: '💩', type: 'fertilizer', name: 'Pupuk', isTrash: false }
];

let binPosition = 50; // percentage from left
let binBaseY = 0;
const catchSound = document.getElementById('catchSound');

function createFallingItem() {
    if (!gameRunning) return;

    const gameArea = document.getElementById('gameArea');
    const itemData = trashTypes[Math.floor(Math.random() * trashTypes.length)];

    const item = document.createElement('div');
    item.className = `trash-item ${itemData.type}`;
    item.innerHTML = itemData.emoji;
    item.title = itemData.name;
    item.dataset.isTrash = itemData.isTrash;

    // Random horizontal position
    const randomX = Math.random() * (window.innerWidth - 80) + 40;
    item.style.left = randomX + 'px';
    item.style.top = '-50px';

    // Fall speed based on level
    const fallDuration = 3;
    item.style.animationDuration = fallDuration + 's';

    gameArea.appendChild(item);

    // Check for collision during fall
    const checkCollision = setInterval(() => {
        if (!item.parentNode) {
            clearInterval(checkCollision);
            return;
        }

        const itemRect = item.getBoundingClientRect();
        const binRect = document.getElementById('trashBin').getBoundingClientRect();

        // Check if item hits the bin
        if (itemRect.bottom >= binRect.top && 
            itemRect.left < binRect.right && 
            itemRect.right > binRect.left &&
            itemRect.top < binRect.bottom) {

            if (itemData.isTrash) {
                scoreTrash();
                createStarEffect(itemRect.left + itemRect.width/2, itemRect.top + itemRect.height/2);
                // play sound
                if (catchSound) {
                    catchSound.currentTime = 0;
                    catchSound.play().catch(()=>{});
                }
            }

            item.remove();
            clearInterval(checkCollision);
            return;
        }

        // Check if item reached bottom
        if (itemRect.top > window.innerHeight) {
            if (itemData.isTrash) {
                missTrash();
            }
            item.remove();
            clearInterval(checkCollision);
        }
    }, 50);
}

function moveBin(e) {
    if (!gameRunning) return;

    const gameArea = document.getElementById('gameArea');
    const bin = document.getElementById('trashBin');
    const rect = gameArea.getBoundingClientRect();

    let mouseX = e.clientX - rect.left;

    // Keep bin within bounds
    const binWidth = 100;
    mouseX = Math.max(binWidth/2, Math.min(mouseX, rect.width - binWidth/2));

    binPosition = (mouseX / rect.width) * 100;
    bin.style.left = binPosition + '%';
}

// Add mouse movement listener
document.addEventListener('mousemove', moveBin);
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveBin(touch);
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

function scoreTrash() {
    score += 10 * level;
    updateDisplay();

    // Level up every 100 points
    if (score > 0 && score % 50 === 0) {
    level++;
    updateDisplay();
}
}

function missTrash() {
    misses++;
    waterHeight += 15;

    const waterLevel = document.getElementById('waterLevel');
    waterLevel.style.height = waterHeight + 'px';

    if (waterRiseSound) {
        waterRiseSound.currentTime = 0;
        waterRiseSound.play().catch(() => {});

const waterLevel = document.getElementById('waterLevel');
waterLevel.style.height = waterHeight + 'px';

// 🌊 Keranjang ikut naik seiring ketinggian air
const trashBin = document.getElementById('trashBin');
const maxWaterHeight = 360; // tinggi maksimum air sebelum game over
const gameHeight = window.innerHeight;

// Hitung posisi vertikal baru keranjang
const floatOffset = (waterHeight / maxWaterHeight) * 360; // naik proporsional
trashBin.style.bottom = floatOffset + 'px';
    }

    updateDisplay();

    // Game over if water reaches 300px
    if (waterHeight >= 360) {
        gameOver();
    }
}

function createStarEffect(x, y) {
    const stars = ['⭐', '✨', '🌟', '💫'];

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.className = 'star';
            star.innerHTML = stars[Math.floor(Math.random() * stars.length)];

            const angle = (i * 72) * Math.PI / 180;
            const distance = 50;

            star.style.left = (x + Math.cos(angle) * distance) + 'px';
            star.style.top = (y + Math.sin(angle) * distance) + 'px';

            document.getElementById('gameArea').appendChild(star);

            setTimeout(() => star.remove(), 1000);
        }, i * 100);
    }
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('misses').textContent = misses;
    document.getElementById('level').textContent = level;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';

     if (gameOverSound) {
        gameOverSound.currentTime = 0;
        gameOverSound.play().catch(() => {});
    }

    // Remove all remaining trash
    document.querySelectorAll('.trash-item').forEach(trash => trash.remove());
}

function restartGame() {
    gameRunning = true;
    score = 0;
    misses = 0;
    level = 1;
    waterHeight = 0;

    document.getElementById('waterLevel').style.height = '0px';
    document.getElementById('trashBin').style.bottom = '0px';
    document.getElementById('gameOver').style.display = 'none';
    document.querySelectorAll('.trash-item').forEach(trash => trash.remove());
    document.querySelectorAll('.star').forEach(star => star.remove());

    updateDisplay();
    startGame();
}

function startGame() {
    // Create falling items periodically
    const spawnInterval = setInterval(() => {
    if (!gameRunning) {
        clearInterval(spawnInterval);
        return;
    }

    createFallingItem();
}, 1200);
}

// Initialize game
updateDisplay();
startGame();
