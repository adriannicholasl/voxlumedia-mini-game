// =========================================================
// KODE JAVASCRIPT UTUH & FINAL (TERMASUK PERBAIKAN MUSIK AGRESif)
// =========================================================

// --- 1. DEFINISI FUNGSI GLOBAL YANG DIPERLUKAN HTML ---

let gameReady = false;
let bgmElement; // Pastikan ini dideklarasikan di scope global/atas

window.startGame = function() {
    if (!gameReady) {
        setTimeout(window.startGame, 50);
        return;
    }

    // Panggilan .play() diletakkan di SINI, karena ini adalah fungsi yang 
    // secara LANGSUNG dipicu oleh klik tombol 'Mulai Game' oleh pengguna.
    if (bgmElement && bgmElement.paused) {
        bgmElement.volume = 0.3;
        bgmElement.loop = true;
        bgmElement.play().then(() => {
            console.log("BGM berhasil diputar setelah interaksi user.");
        }).catch(e => {
            // Browser masih memblokir. Lanjut ke inisialisasi game.
            console.warn("Play BGM diblokir browser, lanjut ke inisialisasi game.", e);
        });
    }
    // ********************************************************

    // 1. Panggil logika game inti (yang akan mengatur tema dan memuat sumber musik)
    // window.gameLogic.initGame() memanggil updateTheme(0) -> startBackgroundMusic("arabic_calm")
    if (typeof window.gameLogic.initGame === 'function') {
        window.gameLogic.initGame();
    }
};

window.nextStage = function() {
    if (gameReady && typeof window.gameLogic.nextStageLogic === 'function') {
        window.gameLogic.nextStageLogic();
    }
};

window.restartGame = function() {
    if (gameReady && typeof window.gameLogic.restartGameLogic === 'function') {
        window.gameLogic.restartGameLogic();
    }
};

window.autoScore = function() {
    if (gameReady && typeof window.gameLogic.autoScoreLogic === 'function') {
        window.gameLogic.autoScoreLogic();
    }
};

// =========================================================
// --- 2. LOGIKA GAME INTI (DIBUNGKUS DOMContentLoaded) ---
// =========================================================

document.addEventListener('DOMContentLoaded', (event) => {
    gameReady = true;

    // --- VARIABEL GLOBAL GAME STATE ---
    let gameState = {
        score: 0,
        stage: 1,
        targetScore: 2,
        isDragging: false,
        ballStartPos: { x: 150, y: 0 },
        trajectoryDots: [],
        windForce: 0,
        basketDirection: 1,
        basketSpeed: 0,
        currentTheme: 0,
        // *** BATAS POSISI Y BOLA: 80% tinggi area (digunakan sebagai batas bawah) ***
        initialYRatio: 0.80,
        ballShift: 0 // Pergeseran posisi Y setiap tembakan
    };

    let basketAnimationId;
    let ballAnimationId;
    let isGameOver = false;
    window.gameLogic = {};
    window.resetTimeout = null;

    // --- DEFINISI TEMA LEVEL (PERUBAHAN ADA DI SINI) ---
    const levelThemes = [
        // TEMA PERTAMA (Stage 1) - Gurun Arab agar musik menyala dari awal
        { name: "Desert", bg: "linear-gradient(135deg, #ffd32a 0%, #e17055 100%)", ball: "🐪", music: "arabic_calm", instruments: { scoreType: 'sine', shootType: 'sine', bounceType: 'sine', levelUpType: 'sine' } },

        // Tema lainnya mengikuti (Klasik kini di Stage 2, Pantai di Stage 3, dst.)
        { name: "classic", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", ball: "🏀", music: "arabic_calm", instruments: { scoreType: 'sine', shootType: 'triangle', bounceType: 'sine', levelUpType: 'sine' } },
        { name: "Beach", bg: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)", ball: "🏐", music: "arabic_calm", instruments: { scoreType: 'triangle', shootType: 'sawtooth', bounceType: 'sine', levelUpType: 'triangle' } },
        { name: "Forest", bg: "linear-gradient(135deg, #00b894 0%, #00a085 100%)", ball: "🥎", music: "arabic_calm", instruments: { scoreType: 'square', shootType: 'sine', bounceType: 'triangle', levelUpType: 'square' } },
        { name: "Arctic", bg: "linear-gradient(135deg, #74b9ff 0%, #a29bfe 100%)", ball: "🧊", music: "arabic_calm", instruments: { scoreType: 'square', shootType: 'triangle', bounceType: 'sawtooth', levelUpType: 'triangle' } },
        { name: "Lava", bg: "linear-gradient(135deg, #fd79a8 0%, #e84393 100%)", ball: "🔥", music: "arabic_calm", instruments: { scoreType: 'sawtooth', shootType: 'square', bounceType: 'square', levelUpType: 'sawtooth' } },
        { name: "Galaxy", bg: "linear-gradient(135deg, #6c5ce7 0%, #2d3436 100%)", ball: "🌟", music: "arabic_calm", instruments: { scoreType: 'sine', shootType: 'sine', bounceType: 'triangle', levelUpType: 'sine' } },
        { name: "Neon", bg: "linear-gradient(135deg, #00cec9 0%, #55a3ff 100%)", ball: "💎", music: "arabic_calm", instruments: { scoreType: 'triangle', shootType: 'square', bounceType: 'sine', levelUpType: 'square' } },
        { name: "Gold", bg: "linear-gradient(135deg, #fdcb6e 0%, #f39c12 100%)", ball: "🪙", music: "arabic_calm", instruments: { scoreType: 'sine', shootType: 'triangle', bounceType: 'sine', levelUpType: 'triangle' } },
        { name: "Rainbow", bg: "linear-gradient(135deg, #fd79a8 0%, #fdcb6e 50%, #00b894 100%)", ball: "🌈", music: "arabic_calm", instruments: { scoreType: 'sine', shootType: 'triangle', bounceType: 'sine', levelUpType: 'sine' } }
    ];

    // --- REFERENSI ELEMEN UI ---
    let audioContext;
    let isMuted = false;
    let bgElement;

    const ball = document.getElementById('ball');
    const gameArea = document.querySelector('.game-area');
    // Ambil elemen BGM saat DOMContentLoaded:
    bgmElement = document.getElementById('bgMusic'); 

    const scoreElement = document.getElementById('score');
    const stageElement = document.getElementById('stage');
    const targetElement = document.getElementById('target');
    const powerBar = document.getElementById('powerBar');
    const stageComplete = document.getElementById('stageComplete');
    const gameComplete = document.getElementById('gameComplete');
    const basket = document.querySelector('.basket');
    const windIndicator = document.getElementById('windIndicator');
    const windArrow = document.getElementById('windArrow');
    const windStrength = document.getElementById('windStrength');
    const themeName = document.getElementById('themeName');
    const themeEmoji = document.getElementById('themeEmoji');
    const muteBtn = document.getElementById('muteBtn');
    const livesIndicator = document.getElementById('livesIndicator');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startScreen = document.getElementById('startScreen');
    const sandFloor = document.querySelector('.sand-floor');

    // ...

    if (ball && gameArea) {
        // Inisialisasi posisi Y awal (80%)
        gameState.ballStartPos.y = gameArea.clientHeight * gameState.initialYRatio;
        ball.style.left = gameState.ballStartPos.x + 'px';
        ball.style.top = gameState.ballStartPos.y + 'px';
        // Menggunakan tema pertama (Gurun Arab) untuk tampilan awal bola
        ball.textContent = levelThemes[0].ball;
    }

    // =========================================================
    // FUNGSI UTILITY (AUDIO, UI, WIND)
    // =========================================================

    function initAudio() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            // *** PENAMBAHAN PENTING: Coba resume AudioContext di sini ***
            // Ini akan memastikan sound effects bisa berbunyi.
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(e => console.error("Gagal melanjutkan AudioContext:", e));
            }
        } catch (e) {
            console.log('Audio tidak didukung');
        }
    }

    // *** FUNGSI UNTUK MEMASTIKAN MUSIK DIMUAT ULANG DAN DIMAIN***
    function startBackgroundMusic(musicName) {
        if (!bgmElement) return;

        const newSrc = `musik/${musicName}.mp3`;

        // Gunakan properti 'src' untuk mengecek sumber saat ini.
        if (!bgmElement.src.endsWith(newSrc)) {

            // 1. Hentikan pemutaran yang sedang berjalan
            bgmElement.pause();

            // 2. Ganti sumber (URL baru)
            bgmElement.src = newSrc;

            // 3. PENTING: Muat ulang elemen audio dengan sumber baru
            bgmElement.load();
        }

        // KARENA bgmElement.play() SUDAH DIPANGGIL DI window.startGame (saat tombol diklik),
        // di sini kita hanya perlu memastikan properti volume/loop diatur, dan mencoba 
        // memutar ulang HANYA jika ada perubahan stage yang mengganti src.
        bgmElement.volume = 0.3;
        bgmElement.loop = true;

        if (!isMuted && bgmElement.src.endsWith(newSrc)) { // Pastikan src sudah benar sebelum play
            // Coba mainkan. PlayPromise akan menangani jika browser memerlukan interaksi user.
            const playPromise = bgmElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Ini terjadi jika interaksi user belum ada, atau browser sedang sibuk
                    console.warn("Play background music failed (autostart diblokir):", error);
                    // Catatan: Pemanggilan .play() di window.startGame di atas diharapkan mengatasi ini.
                });
            }
        }
    }
    // *** AKHIR FUNGSI MUSIK ***

    function getThemeInstruments() {
        // ... (sisa fungsi lainnya tidak diubah)
        return levelThemes[gameState.currentTheme % levelThemes.length].instruments;
    }

    function playSound(frequency, duration, type = 'sine', volume = 0.3) {
        // PENTING: Cek status audioContext sebelum memutar suara Web Audio API
        if (isMuted || !audioContext || audioContext.state === 'suspended') return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    function playScoreSound() {
        const instruments = getThemeInstruments();
        playSound(900, 0.2, instruments.scoreType, 0.5);
        playSound(1200, 0.2, instruments.scoreType, 0.5);
    }

    function playShootSound() {
        const instruments = getThemeInstruments();
        playSound(500, 0.1, instruments.shootType, 0.3);
    }

    function playLevelUpSound() {
        const instruments = getThemeInstruments();
        playSound(1000, 0.3, instruments.levelUpType, 0.6);
        playSound(1500, 0.3, instruments.levelUpType, 0.6);
    }

    function playBounceSound() {
        const instruments = getThemeInstruments();
        playSound(300, 0.05, instruments.bounceType, 0.25);
    }

    function playUISound(type) {
        if (type === 'button') { playSound(800, 0.1, 'sine', 0.2); }
        else if (type === 'drag') { playSound(400, 0.05, 'triangle', 0.15); }
        else if (type === 'release') { playSound(600, 0.08, 'sine', 0.2); }
    }

    function updateLivesDisplay() {
        // Logika lives/nyawa dihapus/dikosongkan
    }

    function updateTheme(themeIndex) {
        gameState.currentTheme = themeIndex;
        const theme = levelThemes[themeIndex % levelThemes.length];

        if (themeName) themeName.textContent = theme.name;
        if (themeEmoji) themeEmoji.textContent = theme.ball;
        if (document.body) document.body.style.background = theme.bg;
        if (ball) ball.textContent = theme.ball;

        // Mulai atau ganti musik latar belakang
        // Ini akan memanggil load() dan mencoba play() jika sumber berubah
        startBackgroundMusic(theme.music); 

        // Reset pergeseran bola saat ganti stage
        gameState.ballShift = 0;

        // Perbarui posisi Y awal jika ukuran gameArea berubah
        if (gameArea) {
            gameState.ballStartPos.y = gameArea.clientHeight * gameState.initialYRatio;
        }

        resetBallPosition();
        updateScoreTarget();
    }

    function updateScoreTarget() {
        if (targetElement) targetElement.textContent = gameState.targetScore;
        if (scoreElement) scoreElement.textContent = gameState.score;
        if (stageElement) stageElement.textContent = gameState.stage;
    }

    function setWindForce(min, max) {
        const force = (Math.random() * (max - min) + min) * (Math.random() < 0.5 ? -1 : 1);
        gameState.windForce = parseFloat(force.toFixed(1));
        updateWindIndicator();
    }

    function updateWindIndicator() {
        const wind = gameState.windForce;
        if (!windIndicator || !windArrow || !windStrength) return;
	
	// --- LOGIKA PASIR BERTIUP (PERUBAHAN INTI) ---
    	if (sandFloor) {
            // Hapus kelas CSS yang ada terlebih dahulu
            sandFloor.classList.remove('sand-blow-right', 'sand-blow-left'); 
        
            if (wind > 0) {
                // Jika angin ke KANAN (wind > 0), terapkan kelas untuk ilusi geser ke kiri
                sandFloor.classList.add('sand-blow-right');
            } else if (wind < 0) {
                // Jika angin ke KIRI (wind < 0), terapkan kelas untuk ilusi geser ke kanan
                sandFloor.classList.add('sand-blow-left');
        }
    }
	// --- AKHIR LOGIKA PASIR BERTIUP ---
	
        if (wind === 0) {
            windArrow.textContent = '—';
            windStrength.textContent = 'Tidak Ada';
            windIndicator.style.opacity = 0.5;
            windIndicator.style.color = '#fff';
            windArrow.style.transform = 'rotate(0deg)';
        } else {
            windArrow.textContent = '→';
            const direction = wind > 0 ? 0 : 180;
            windArrow.style.transform = `rotate(${direction}deg)`;

            windStrength.textContent = `${Math.abs(wind).toFixed(1)} kN`;
            windIndicator.style.opacity = 1;
            windIndicator.style.color = wind > 0 ? 'yellowgreen' : 'red';
        }
    }

    // =========================================================
    // FUNGSI INTI GAME (Start, Next Stage, Restart)
    // =========================================================

    window.gameLogic.initGame = function() {
        playUISound('button');
        if (startScreen) startScreen.style.display = 'none';

        isGameOver = false;
        
        // *** PERBAIKAN MUSIK: Inisialisasi dan lanjutkan AudioContext (untuk SFX) ***
        initAudio(); 

        // Memanggil updateTheme(0) yang akan memuat tema Gurun Arab dan memutar 'arabic_calm.mp3'
        // CATATAN: Panggilan .play() sudah dipindahkan ke window.startGame di atas.
        updateTheme(0); 
        updateLivesDisplay();
        startBasketMovement();
    }

    function levelComplete() {
        playLevelUpSound();
        if (stageComplete) stageComplete.style.display = 'flex';
    }

    window.gameLogic.nextStageLogic = function() {
        if (stageComplete) stageComplete.style.display = 'none';
        gameState.stage += 1;
        gameState.score = 0;

        if (gameState.stage > levelThemes.length) {
            gameCompleteGame();
            return;
        }

        // Mekanika Kesulitan
        gameState.targetScore = 2 + Math.floor(gameState.stage / 2);

        if (gameState.stage >= 5) {
            gameState.basketSpeed = 2.5;
        } else if (gameState.stage >= 3) {
            gameState.basketSpeed = 1.5;
        } else {
            gameState.basketSpeed = 0;
        }

        // Mekanika Angin
        if (gameState.stage === 3 || gameState.stage === 8) {
            setWindForce(0.5, 1.5);
        } else if (gameState.stage === 5 || gameState.stage === 9) {
            setWindForce(1.0, 2.0);
        } else if (gameState.stage === 7) {
            setWindForce(1.5, 3.0);
        } else {
            setWindForce(0, 0);
        }

        startBasketMovement();
        // Memanggil updateTheme akan memicu startBackgroundMusic dengan musik baru
        updateTheme((gameState.stage - 1) % levelThemes.length); 
        updateLivesDisplay();
    }

    function gameCompleteGame() {
        if (basketAnimationId) {
            cancelAnimationFrame(basketAnimationId);
        }

        if (gameComplete) gameComplete.style.display = 'flex';
        const finalScore = document.getElementById('finalScore');
        if (finalScore) finalScore.textContent = gameState.stage - 1;
        isGameOver = true;
        
        // Hentikan musik saat game selesai
        if(bgmElement) bgmElement.pause();
    }

    function gameOver() {
        if (basketAnimationId) {
            cancelAnimationFrame(basketAnimationId);
        }

        if (gameOverScreen) gameOverScreen.style.display = 'block';
        isGameOver = true;
        
        // Hentikan musik saat game over
        if(bgmElement) bgmElement.pause();
    }

    window.gameLogic.restartGameLogic = function() {
        if (gameComplete) gameComplete.style.display = 'none';
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        isGameOver = false;

        gameState.stage = 1;
        gameState.score = 0;
        gameState.targetScore = 2;
        gameState.basketSpeed = 0;
        gameState.windForce = 0;
        gameState.ballShift = 0;

        // Memanggil updateTheme(0) lagi untuk kembali ke tema Gurun Arab dan memutar musik
        updateTheme(0);
        updateLivesDisplay();
        updateWindIndicator();
        startBasketMovement();
    }


    // =========================================================
    // MEKANIKA KERANJANG & FISIKA BOLA
    // =========================================================

    function startBasketMovement() {
        if (basketAnimationId) {
            cancelAnimationFrame(basketAnimationId);
        }

        if (!basket || !gameArea || isGameOver) {
            return;
        }

        const gameAreaWidth = gameArea.clientWidth;
        const basketWidth = basket.clientWidth;

        if (gameState.basketSpeed === 0) {
            // Posisi Keranjang di Level 1 & 2 di tengah
            basket.style.right = 'auto';
            basket.style.left = '50%';
            basket.style.transform = 'translateX(-50%)';
            return;
        }

        // Jika bergerak (Level 3+), gunakan properti 'right' dan 'transform: none'
        basket.style.left = 'auto';
        basket.style.transform = 'none';

        const padding = 10;

        function getCurrentRight() {
            return parseFloat(basket.style.right) || 100;
        }

        function moveBasket() {
            let rightValue = getCurrentRight();

            rightValue -= gameState.basketDirection * gameState.basketSpeed;

            const minRight = padding;
            const maxRight = gameAreaWidth - basketWidth - padding;

            if (rightValue > maxRight) {
                rightValue = maxRight;
                gameState.basketDirection *= -1;
            } else if (rightValue < minRight) {
                rightValue = minRight;
                gameState.basketDirection *= -1;
            }

            basket.style.right = rightValue + 'px';
            basketAnimationId = requestAnimationFrame(moveBasket);
        }

        moveBasket();
    }

    // *** FUNGSI UNTUK MENYESUAIKAN POSISI Y AWAL BOLA ***
    function getNextBallYPosition() {
        const basePos = gameArea.clientHeight * gameState.initialYRatio;
        const newY = basePos - gameState.ballShift;

        // Batas bawah adalah posisi awal, dan batas atas adalah sekitar 60% dari area game.
        const maxShift = basePos - (gameArea.clientHeight * 0.60);

        // Pastikan tidak naik terlalu tinggi
        if (gameState.ballShift >= maxShift) {
            gameState.ballShift = maxShift;
        }

        return basePos - gameState.ballShift;
    }

    function shootBall(velocityX, velocityY) {
        if (isGameOver || !ball || !gameArea) return;

        if (ballAnimationId) {
            cancelAnimationFrame(ballAnimationId);
            ballAnimationId = null;
        }

        // *** LOGIKA DINAMIS POSISI BOLA (MENAIKKAN) ***
        // Naikkan posisi awal bola untuk tembakan berikutnya
        gameState.ballShift += 20; // Naik 20px setiap tembakan
        // Batasi pergeseran ke atas
        getNextBallYPosition();

        const gravity = 0.8;
        const ballRadius = 20;

        let x = parseFloat(ball.style.left);
        let y = parseFloat(ball.style.top);
        let vx = velocityX;
        let vy = velocityY;

        let isScored = false;

        function animate() {
            if (isScored) return;

            x += vx + gameState.windForce * 0.1;
            y += vy;
            vy += gravity;

            // Cek Pantulan Dinding
            if (x < 0) {
                x = 0;
                vx *= -0.7;
                playBounceSound();
            }

            if (x + 2 * ballRadius > gameArea.clientWidth) {
                x = gameArea.clientWidth - 2 * ballRadius;
                vx *= -0.7;
                playBounceSound();
            }

            // Cek Lantai
            if (y + 2 * ballRadius > gameArea.clientHeight) {
                if (ballAnimationId) {
                    cancelAnimationFrame(ballAnimationId);
                    ballAnimationId = null;
                }

                startFloorBounce(x, y, vx, vy);
                return;
            }

            ball.style.left = x + 'px';
            ball.style.top = y + 'px';

            // Cek Skor
            if (checkScore(x, y)) {
                isScored = true;
                if (ballAnimationId) {
                    cancelAnimationFrame(ballAnimationId);
                    ballAnimationId = null;
                }

                playScoreSound();
                gameState.score += 1;
                updateScoreTarget();

                // Reset posisi shift bola setelah mencetak skor
                gameState.ballShift = 0;

                if (gameState.score >= gameState.targetScore) {
                    levelComplete();
                } else {
                    setTimeout(resetBallPosition, 500);
                }
                return;
            }

            ballAnimationId = requestAnimationFrame(animate);
        }

        animate();
    }

    function startFloorBounce(startX, startY, startVx, startVy) {
        if (!ball || !gameArea) return;

        const floorY = gameArea.clientHeight - 2 * 20; // 2 * radius bola (40px)
        let x = startX;
        let y = floorY;

        let vx = startVx * 0.7;
        let vy = -Math.abs(startVy) * 0.7;

        const gravity = 0.8;
        let bounceCount = 0;
        const maxBounces = 3;

        if (vy < -1.5) {
            playBounceSound();
        } else {
            vy = 0;
        }

        function bounceAnimate() {
            if (bounceCount >= maxBounces && Math.abs(vx) < 0.3) {
                startResetTimer();
                return;
            }

            x += vx;
            y += vy;
            vy += gravity;

            vx *= 0.96;

            if (y >= floorY) {
                y = floorY;
                if (Math.abs(vy) > 1.5) {
                    vy *= -0.55;
                    playBounceSound();
                    bounceCount++;
                } else {
                    vy = 0;
                    bounceCount = maxBounces;
                }
            }

            // Cek Batasan Horizontal
            if (x < 0) {
                x = 0;
                vx *= -0.6;
            }
            if (x > gameArea.clientWidth - 40) {
                x = gameArea.clientWidth - 40;
                vx *= -0.6;
            }

            ball.style.left = x + 'px';
            ball.style.top = y + 'px';

            ballAnimationId = requestAnimationFrame(bounceAnimate);
        }

        bounceAnimate();
    }

    function startResetTimer() {
        clearTimeout(window.resetTimeout);

        window.resetTimeout = setTimeout(() => {
            resetBallPosition();

        }, 500); // Waktu reset cepat
    }

    function resetBallPosition() {
        if (ballAnimationId) {
            cancelAnimationFrame(ballAnimationId);
            ballAnimationId = null;
        }
        if (ball) {
            // Gunakan posisi X statis, dan posisi Y dinamis
            ball.style.left = gameState.ballStartPos.x + 'px';
            ball.style.top = getNextBallYPosition() + 'px';
        }

        clearTimeout(window.resetTimeout);
    }

    function checkScore(ballX, ballY) {
        if (!basket || !gameArea || !ball) return false;

        const basketRim = basket.querySelector('.basket-rim');
        if (!basketRim) return false;

        const basketRect = basketRim.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();

        const relativeBallX = ballX + ball.clientWidth / 2;
        const relativeBallY = ballY + ball.clientHeight / 2;

        // Posisi rim relatif terhadap gameArea
        const basketAreaLeft = basketRect.left - gameRect.left;
        const basketAreaTop = basketRect.top - gameRect.top;
        const rimWidth = basketRim.clientWidth;
        const rimHeight = basketRim.clientHeight;


        // Cek apakah bola di atas/masuk rim
        return (
            relativeBallX > basketAreaLeft &&
            relativeBallX < basketAreaLeft + rimWidth &&
            relativeBallY > basketAreaTop &&
            relativeBallY < basketAreaTop + rimHeight * 1.5
        );
    }

    // =========================================================
    // MEKANIKA DRAG, TRAJECTORY & CHEAT
    // =========================================================

    function drag(e) {
        if (!gameState.isDragging || !ball || !gameArea || isGameOver || ballAnimationId) return;

        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        const rect = gameArea.getBoundingClientRect();
        const x = clientX - rect.left - 20;
        const y = clientY - rect.top - 20;

        const maxDragDistance = 100;

        // Gunakan posisi Y saat ini sebagai 'start Y' untuk perhitungan drag
        const startX = gameState.ballStartPos.x;
        const startY = getNextBallYPosition();

        let currentX = x;
        let currentY = y;

        // Batasi jarak tarikan
        const deltaX_unclamped = startX - currentX;
        const deltaY_unclamped = startY - currentY;
        const distance = Math.sqrt(deltaX_unclamped * deltaX_unclamped + deltaY_unclamped * deltaY_unclamped);

        if (distance > maxDragDistance) {
            currentX = startX - (deltaX_unclamped / distance) * maxDragDistance;
            currentY = startY - (deltaY_unclamped / distance) * maxDragDistance;
        }

        ball.style.left = currentX + 'px';
        ball.style.top = currentY + 'px';

        const deltaX = startX - currentX;
        const deltaY = startY - currentY;
        const finalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const power = Math.min(finalDistance / maxDragDistance * 100, 100);

        if (powerBar) powerBar.style.width = power + '%';
        showTrajectory(currentX, currentY, deltaX * 0.4, deltaY * 0.4); // Koefisien kekuatan sedikit dinaikkan
    }

    function showTrajectory(startX, startY, velocityX, velocityY) {
        clearTrajectory();

        const gravity = 0.8;
        let x = startX;
        let y = startY;
        let vx = velocityX;
        let vy = velocityY;

        for (let i = 0; i < 20; i++) {
            // Hindari dot pertama tumpang tindih dengan bola yang ditarik
            if (i === 0) {
                x += vx + gameState.windForce * 0.1;
                y += vy;
                vy += gravity;
                continue;
            }

            const dot = document.createElement('div');
            dot.className = 'trajectory-dot';
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            dot.style.animationDelay = (i * 0.05) + 's';
            if (gameArea) gameArea.appendChild(dot);
            gameState.trajectoryDots.push(dot);

            x += vx + gameState.windForce * 0.1;
            y += vy;
            vy += gravity;

            if (y > (gameArea ? gameArea.clientHeight * 0.9 : 600)) break; // Batas prediksi
        }
    }

    function endDrag(e) {
        if (!gameState.isDragging) return;

        gameState.isDragging = false;
        if (ball) ball.style.cursor = 'grab';

        const ballRect = ball.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        const currentX = ballRect.left - gameRect.left;
        const currentY = ballRect.top - gameRect.top;

        const startY = getNextBallYPosition();

        const deltaX = gameState.ballStartPos.x - currentX;
        const deltaY = startY - currentY; // Menggunakan startY dinamis untuk deltaY

        clearTrajectory();
        if (powerBar) powerBar.style.width = '0%';

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            playUISound('release');
            setTimeout(() => playShootSound(), 100);
            shootBall(deltaX * 0.4, deltaY * 0.4);
        } else {
            // Jika tidak ada drag yang signifikan, kembalikan posisi bola
            gameState.ballShift -= 20; // Batalkan kenaikan shift yang terjadi di `shootBall`
            if (gameState.ballShift < 0) gameState.ballShift = 0;
            resetBallPosition();
        }
    }

    function clearTrajectory() {
        gameState.trajectoryDots.forEach(dot => dot.remove());
        gameState.trajectoryDots = [];
    }

    // CHEAT PALING AGRESIF: Score Injection
    window.gameLogic.autoScoreLogic = function() {
        if (isGameOver) return;

        if (ballAnimationId) {
            cancelAnimationFrame(ballAnimationId);
            ballAnimationId = null;
        }

        gameState.ballShift = 0; // Reset shift bola saat cheat digunakan
        resetBallPosition();

        clearTrajectory();
        if (powerBar) powerBar.style.width = '0%';

        gameState.score += 1;
        updateScoreTarget();
        playScoreSound();
        console.log(`[CHEAT AKTIF]: Skor bertambah! Skor saat ini: ${gameState.score} / ${gameState.targetScore}`);

        if (gameState.score >= gameState.targetScore) {
            levelComplete();
        }
    }

    // =========================================================
    // EVENT LISTENERS (Dipastikan bekerja untuk Drag & Drop & Audio)
    // =========================================================

    function startDrag(e) {
        if (isGameOver || ballAnimationId) return;
        e.preventDefault();

        gameState.isDragging = true;
        if (ball) ball.style.cursor = 'grabbing';
        playUISound('drag');
        clearTimeout(window.resetTimeout);
    }

    if (ball) {
        ball.addEventListener('mousedown', startDrag);
        ball.addEventListener('touchstart', startDrag);
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    // Listener Cheat **Ctrl + F**
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            window.autoScore();
        }
    });

    // Listener Mute Button
    if (muteBtn) {
        // Hapus listener lama jika ada (untuk mencegah duplikasi jika kode di-refresh)
        muteBtn.removeEventListener('click', handleMuteClick); 
        
        function handleMuteClick() {
            isMuted = !isMuted;
            muteBtn.textContent = isMuted ? '🔇' : '🔊';

            // Kontrol BGM
            if (bgmElement) {
                if (isMuted) {
                    bgmElement.pause();
                } else {
                    // PENTING: Coba putar ulang musik saat di-unmute
                    bgmElement.play().catch(e => console.log("Gagal memutar BGM setelah unmute.", e));
                }
            }
            playUISound('button');
        }
        muteBtn.addEventListener('click', handleMuteClick);
    }

    // Event listeners untuk Web Audio API Resume (untuk playSound/efek)
    // Ini memastikan Web Audio API (untuk sound effects) dapat diaktifkan 
    // pada klik pertama di mana pun di dokumen.
    const audioResumeHandler = () => {
        if (!audioContext) initAudio();
        // Coba resume context untuk Web Audio API (sound effects)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("Audio Context berhasil dilanjutkan.");
                // Setelah resume berhasil, kita bisa menghapus listener ini.
                document.removeEventListener('click', audioResumeHandler);
                document.removeEventListener('touchstart', audioResumeHandler);
            }).catch(e => console.error("Gagal resume Web Audio API:", e));
        } else if (audioContext) {
             // Jika sudah aktif, hapus listener
            document.removeEventListener('click', audioResumeHandler);
            document.removeEventListener('touchstart', audioResumeHandler);
        }
    };

    document.addEventListener('click', audioResumeHandler);
    document.addEventListener('touchstart', audioResumeHandler);
});