/**
 * Proyecto: Ciber-Defensa: Firewall Protocol
 * Autora: Diana Denise Campos Lozano - Ingeniería en TIC
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 600;

// =======================
// DETECCIÓN DE DISPOSITIVO
// =======================
// Si la pantalla mide menos de 900px, asumimos que es celular/tablet vertical
const isMobile = window.innerWidth < 900; 

// =======================
// CARGA DE IMÁGENES
// =======================
const baseImg = new Image(); baseImg.src = "img/base.png";
const virusImg = new Image(); virusImg.src = "img/virus.png";
const playerImg = new Image(); playerImg.src = "img/nave.png";
const sectorImg = new Image(); sectorImg.src = "img/sector.png";

// =======================
// CARGA DE AUDIO
// =======================
const shootSound = new Audio("music/disparos.mp3");
const spawnSound = new Audio("music/caidavirus.mp3"); 
const explosionSound = new Audio("music/explosion.mp3"); 

// =======================
// HUD ELEMENTOS Y PANTALLAS
// =======================
const enemyHealthBar = document.getElementById("enemyHealthBar"); 
const baseLifeText = document.getElementById("baseLife"); 
const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScoreText");
const shieldText = document.getElementById("shieldStatus");
const playerLivesText = document.getElementById("playerLivesText");
const levelText = document.getElementById("levelText"); 

const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreText = document.getElementById("finalScore"); 
const winScreen = document.getElementById("winScreen");
const nextLevelScreen = document.getElementById("nextLevelScreen");
const btnNextLevel = document.getElementById("btnNextLevel");

const startScreen = document.getElementById("startScreen");
const btnStartGame = document.getElementById("btnStartGame");

const pauseScreen = document.getElementById("pauseScreen");
const btnTogglePause = document.getElementById("btnTogglePause");
const btnResume = document.getElementById("btnResume");

// REFERENCIAS PARA CONTROLES MÓVILES
const mobileControlsContainer = document.getElementById("mobileControls"); 
const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnFire = document.getElementById("btnFire");

// =======================
// ESTADO DEL JUEGO Y NIVELES
// =======================
let gameState = "start"; 
let score = 0;

let highScore = localStorage.getItem("firewallHighScore") ? parseInt(localStorage.getItem("firewallHighScore")) : 0;

let currentLevel = 1;
const maxLevels = 10;

let shieldActive = false;
let multishotActive = false;
let speedBoostActive = false;
let lastHitTime = Date.now(); 

if(highScoreText) highScoreText.innerText = highScore;

// =======================
// JUGADOR (TAMAÑO ADAPTATIVO)
// =======================
const player = {
    x: canvas.width / 2, y: canvas.height / 2,
    // Si es móvil usa 90, si es PC usa 70
    width: isMobile ? 90 : 70, 
    height: isMobile ? 90 : 70,
    baseSpeed: 5, speed: 5,
    lives: 3,               
    isInvulnerable: false   
};

// =======================
// BASE ENEMIGA (TAMAÑO ADAPTATIVO)
// =======================
const enemyBase = {
    x: canvas.width / 2, y: isMobile ? 110 : 90, 
    // Si es móvil usa 180 (Gigante), si es PC usa 130
    width: isMobile ? 180 : 130, 
    height: isMobile ? 180 : 130,     
    maxLife: 50, life: 50, 
    speed: 2, direction: 1
};

// =======================
// SECTOR A PROTEGER (TAMAÑO ADAPTATIVO)
// =======================
const dataSector = { 
    x: canvas.width / 2, y: 520, 
    // Si es móvil usa 120, si es PC usa 90
    width: isMobile ? 120 : 90, 
    height: isMobile ? 120 : 90,     
    maxLife: 5, life: 5 
};

const keys = {}; const mouse = { x: 0, y: 0 };
const bullets = []; const enemies = []; const powerUps = [];

// =======================
// CONTROLADORES DE SPAWN
// =======================
let virusIntervalId;
let powerUpIntervalId;
let massiveWaveIntervalId;

function startSpawners() {
    clearInterval(virusIntervalId); clearInterval(powerUpIntervalId); clearInterval(massiveWaveIntervalId);

    let spawnRate = Math.max(600, 1500 - ((currentLevel - 1) * 100));

    virusIntervalId = setInterval(() => { if (gameState === "playing") spawnVirus(); }, spawnRate);

    powerUpIntervalId = setInterval(() => {
        if (gameState === "playing") {
            const types = ["shield", "multishot", "speed"];
            const selectedType = types[Math.floor(Math.random() * types.length)];
            powerUps.push({
                x: Math.random() * (canvas.width - 40) + 20, y: -20,
                radius: 14, speed: 2, type: selectedType
            });
        }
    }, 5000); 

    massiveWaveIntervalId = setInterval(() => {
        if (gameState === "playing") spawnMassiveWave();
    }, 12000);
}

function spawnVirus() {
    const angle = Math.atan2(dataSector.y - (enemyBase.y + enemyBase.height / 2), dataSector.x - enemyBase.x);
    let baseVirusSpeed = 1.5 + (currentLevel * 0.2);
    enemies.push(createEnemyObject(angle, baseVirusSpeed));
    
    const soundClone = spawnSound.cloneNode();
    soundClone.volume = 0.4;
    soundClone.play().catch(e => console.log("Audio play failed:", e));
}

function spawnMassiveWave() {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 7) * i; 
        let speed = 1.5 + (currentLevel * 0.2);
        
        let radioAparicion = isMobile ? 100 : 55;
        
        let startX = enemyBase.x + Math.cos(angle) * radioAparicion;
        let startY = (enemyBase.y + enemyBase.height / 2) + Math.sin(angle) * radioAparicion;
        enemies.push(createEnemyObject(angle, speed, startX, startY));
    }
    
    const soundClone = spawnSound.cloneNode();
    soundClone.volume = 0.6;
    soundClone.play().catch(e => console.log("Audio play failed:", e));
}

function createEnemyObject(angle, speed, startX = null, startY = null) {
    return {
        x: startX !== null ? startX : enemyBase.x, 
        y: startY !== null ? startY : enemyBase.y + enemyBase.height / 2,
        width: 50, height: 50,
        speed: speed + Math.random(), 
        dx: Math.cos(angle), dy: Math.sin(angle),
        zigzagOffset: Math.random() * 100, zigzagSpeed: 0.08 + Math.random() * 0.05,
        radius: 25
    };
}

// =======================
// LÓGICA DE PAUSA
// =======================
function togglePause() {
    if (gameState === "playing") {
        gameState = "paused";
        pauseScreen.classList.remove("d-none");
        btnTogglePause.innerText = "▶ REANUDAR (P)";
    } 
    else if (gameState === "paused") {
        gameState = "playing";
        pauseScreen.classList.add("d-none");
        btnTogglePause.innerText = "⏸ PAUSAR (P)";
        lastHitTime = Date.now(); 
    }
}

// =======================
// EVENTOS INPUT Y DISPARO
// =======================
if (btnStartGame) {
    btnStartGame.addEventListener("click", () => {
        if(startScreen) startScreen.classList.add("d-none"); 
        if(btnTogglePause) btnTogglePause.classList.remove("d-none"); 
        gameState = "playing"; 
        startSpawners(); 
        lastHitTime = Date.now();
    });
}

if (btnTogglePause) btnTogglePause.addEventListener("click", togglePause);
if (btnResume) btnResume.addEventListener("click", togglePause);

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if(["arrowup","arrowdown","arrowleft","arrowright"," "].indexOf(e.key.toLowerCase()) > -1) {
        e.preventDefault();
    }
    if(e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        togglePause();
    }
});

window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Ajuste del mouse/touch para que funcione el escalado en celular
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener("click", () => {
    if (gameState !== "playing") return;
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    const soundClone = shootSound.cloneNode();
    soundClone.volume = 0.3; 
    soundClone.play().catch(e => console.log("Audio play failed:", e));

    if (multishotActive) {
        [-0.2, 0, 0.2].forEach(offset => {
            bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle + offset) * 10, dy: Math.sin(angle + offset) * 10, radius: 6 });
        });
    } else {
        bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle) * 10, dy: Math.sin(angle) * 10, radius: 6 });
    }
});

if (btnNextLevel) {
    btnNextLevel.addEventListener("click", () => {
        nextLevelScreen.classList.add("d-none"); 
        levelUp(); 
        gameState = "playing"; 
        lastHitTime = Date.now();
    });
}

function moveEnemyBase() {
    enemyBase.x += enemyBase.speed * enemyBase.direction;
    if (enemyBase.x - enemyBase.width / 2 <= 0 || enemyBase.x + enemyBase.width / 2 >= canvas.width) enemyBase.direction *= -1;
}

function movePlayer() {
    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

function checkCollisionCircle(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius; }
function checkCollisionRectCircle(circle, rect) {
    let distX = Math.abs(circle.x - rect.x), distY = Math.abs(circle.y - rect.y);
    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;
    if (distX <= (rect.width / 2)) return true;
    if (distY <= (rect.height / 2)) return true;
    let dx = distX - rect.width / 2, dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function levelUp() {
    currentLevel++;
    if (currentLevel > maxLevels) {
        gameState = "win";
        if(btnTogglePause) btnTogglePause.classList.add("d-none"); 
        if(winScreen) winScreen.classList.remove("d-none");
        return;
    }
    
    enemyBase.maxLife = 50 + (currentLevel * 10);
    enemyBase.life = enemyBase.maxLife;
    enemyBase.speed = 2 + (currentLevel * 0.5);
    
    dataSector.maxLife = 5 + (currentLevel * 2);
    dataSector.life = dataSector.maxLife;

    if(player.lives < 3) player.lives++;

    enemies.length = 0; bullets.length = 0; powerUps.length = 0;
    startSpawners();
}

// =======================
// UPDATE
// =======================
function update() {
    movePlayer(); moveEnemyBase();

    if (currentLevel === 10 && gameState === "playing") {
        if (Date.now() - lastHitTime > 1500) {
            if (enemyBase.life < enemyBase.maxLife) {
                enemyBase.life += 0.08; 
            }
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx; b.y += b.dy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.zigzagOffset += enemy.zigzagSpeed;
        const oscillation = Math.sin(enemy.zigzagOffset) * 2.5; 
        const perpX = -enemy.dy, perpY = enemy.dx;

        enemy.x += (enemy.dx * enemy.speed) + (perpX * oscillation);
        enemy.y += (enemy.dy * enemy.speed) + (perpY * oscillation);

        for (let j = i + 1; j < enemies.length; j++) {
            if (checkCollisionCircle(enemy, enemies[j])) {
                let tempDx = enemy.dx, tempDy = enemy.dy;
                enemy.dx = enemies[j].dx; enemy.dy = enemies[j].dy;
                enemies[j].dx = tempDx; enemies[j].dy = tempDy;
                enemy.x += enemy.dx * 3; enemy.y += enemy.dy * 3;
            }
        }

        for (let k = bullets.length - 1; k >= 0; k--) {
            if (checkCollisionRectCircle(bullets[k], enemy)) {
                
                const explClone = explosionSound.cloneNode();
                explClone.volume = 0.4;
                explClone.play().catch(e => console.log("Audio play failed:", e));

                enemies.splice(i, 1); 
                bullets.splice(k, 1); 
                score += 10; 
                break; 
            }
        }
        if (enemies[i] !== enemy) continue; 

        if (checkCollisionRectCircle(enemy, dataSector)) {
            dataSector.life--; enemies.splice(i, 1);
            if (dataSector.life <= 0) {
                gameState = "gameover";
                if(finalScoreText) finalScoreText.innerText = score; 
                if(btnTogglePause) btnTogglePause.classList.add("d-none"); 
            }
        }
        if (enemies[i] !== enemy) continue;

        if (!shieldActive && !player.isInvulnerable && checkCollisionCircle({ x: enemy.x, y: enemy.y, radius: enemy.radius }, { x: player.x, y: player.y, radius: 30 })) {
            player.lives--; 
            enemies.splice(i, 1); 
            
            if (player.lives <= 0) {
                gameState = "gameover";
                if(finalScoreText) finalScoreText.innerText = score;
                if(btnTogglePause) btnTogglePause.classList.add("d-none"); 
            } else {
                player.isInvulnerable = true;
                setTimeout(() => { player.isInvulnerable = false; }, 2000);
            }
        }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i]; p.y += p.speed;
        if (checkCollisionCircle({ x: player.x, y: player.y, radius: 30 }, p)) {
            if (p.type === "shield") { shieldActive = true; setTimeout(() => shieldActive = false, 6000); }
            else if (p.type === "multishot") { multishotActive = true; setTimeout(() => multishotActive = false, 6000); }
            else if (p.type === "speed") {
                speedBoostActive = true; player.speed = player.baseSpeed + 4; 
                setTimeout(() => { speedBoostActive = false; player.speed = player.baseSpeed; }, 6000);
            }
            powerUps.splice(i, 1);
        } else if (p.y > canvas.height) powerUps.splice(i, 1);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        if (checkCollisionRectCircle(bullets[i], enemyBase)) {
            enemyBase.life--;
            bullets.splice(i, 1);
            lastHitTime = Date.now(); 

            const explClone = explosionSound.cloneNode();
            explClone.volume = 0.6;
            explClone.play().catch(e => console.log("Audio play failed:", e));

            if (enemyBase.life <= 0) {
                gameState = "level_cleared"; 
                if(btnTogglePause) btnTogglePause.classList.add("d-none"); 
                clearInterval(virusIntervalId); clearInterval(powerUpIntervalId); clearInterval(massiveWaveIntervalId);
                if (nextLevelScreen) nextLevelScreen.classList.remove("d-none");
            }
        }
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("firewallHighScore", highScore);
    }

    if (enemyHealthBar) {
        const hpPercent = Math.max(0, (enemyBase.life / enemyBase.maxLife) * 100);
        enemyHealthBar.style.width = hpPercent + "%";

        if (hpPercent < 25) {
            enemyHealthBar.style.backgroundColor = "#fff"; 
            enemyHealthBar.style.boxShadow = "0 0 15px #fff";
        } else {
            enemyHealthBar.style.backgroundColor = "#ff007a"; 
            enemyHealthBar.style.boxShadow = "0 0 10px #ff007a";
        }
    }

    if(scoreText) scoreText.innerText = score;
    if(highScoreText) highScoreText.innerText = highScore; 
    if(playerLivesText) playerLivesText.innerText = player.lives;
}

// =======================
// DRAW
// =======================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 242, 255, 0.2)"; ctx.font = "bold 100px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText(currentLevel === 10 ? "NIVEL 10: JEFE" : "NIVEL " + currentLevel, canvas.width / 2, canvas.height / 2 + 30);

    // BASE ENEMIGA
    ctx.save();
    if (currentLevel === 10 && (Date.now() - lastHitTime > 1500) && enemyBase.life < enemyBase.maxLife && gameState === "playing") {
        ctx.filter = "sepia(100%) hue-rotate(90deg) saturate(300%)"; 
        ctx.shadowBlur = 30; ctx.shadowColor = "#39ff14";
    } else if (enemyBase.life <= enemyBase.maxLife * 0.5) {
        ctx.filter = "sepia(100%) hue-rotate(-50deg) saturate(500%)"; 
        ctx.shadowBlur = 30; ctx.shadowColor = "#ff0000";
    } else {
        ctx.shadowBlur = 10; ctx.shadowColor = "#ff007a";
    }
    ctx.drawImage(baseImg, enemyBase.x - enemyBase.width / 2, enemyBase.y - enemyBase.height / 2, enemyBase.width, enemyBase.height);
    ctx.restore();

    // SECTOR
    ctx.drawImage(sectorImg, dataSector.x - dataSector.width / 2, dataSector.y - dataSector.height / 2, dataSector.width, dataSector.height);
    
    // Barra de vida del SECTOR (Canvas)
    const barWidth = 80;
    const barHeight = 8;
    const barX = dataSector.x - barWidth / 2;
    const barY = dataSector.y + dataSector.height / 2 + 10; 

    const healthPercent = dataSector.life / dataSector.maxLife;

    let barColor = "#39ff14"; 
    if (healthPercent <= 0.5 && healthPercent > 0.25) {
        barColor = "#ffcc00"; 
    } else if (healthPercent <= 0.25) {
        barColor = "#ff0000"; 
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = barColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = barColor; 
    ctx.fillRect(barX, barY, Math.max(0, barWidth * healthPercent), barHeight);
    
    ctx.shadowBlur = 0; 
    ctx.fillStyle = "#fff"; 
    ctx.font = "bold 12px 'Courier New'";
    ctx.fillText("HP " + dataSector.life + "/" + dataSector.maxLife, dataSector.x, barY + 20);

    // JUGADOR
    ctx.save();
    if (player.isInvulnerable) {
        ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 150)); 
    }
    
    if (shieldActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#39ff14"; }
    else if (speedBoostActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#00f2ff"; }
    else if (multishotActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#ffcc00"; }
    
    ctx.drawImage(playerImg, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    ctx.restore(); 

    // OBJETOS
    ctx.fillStyle = "#00f2ff";
    bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });

    enemies.forEach(enemy => { ctx.drawImage(virusImg, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height); });

    powerUps.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.type === "shield") ctx.fillStyle = "#39ff14"; 
        else if (p.type === "multishot") ctx.fillStyle = "#ffcc00"; 
        else if (p.type === "speed") ctx.fillStyle = "#00f2ff"; 
        ctx.fill(); ctx.strokeStyle = "white"; ctx.stroke();
        ctx.fillStyle = "black"; ctx.font = "bold 12px Arial";
        let letter = p.type === "shield" ? "S" : (p.type === "multishot" ? "M" : "V");
        ctx.fillText(letter, p.x, p.y + 4);
    });

    // MIRA (SOLO SI NO ES MÓVIL)
    if (!isMobile) {
        ctx.strokeStyle = "#ff007a"; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2);
        ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke();
    }
}

// ==========================================
// LÓGICA PARA CELULAR (TOUCH CONTROLS)
// ==========================================
function setKey(key, status) {
    keys[key] = status;
}

if(btnUp) {
    btnUp.addEventListener("touchstart", (e) => { e.preventDefault(); setKey("w", true); });
    btnUp.addEventListener("touchend", (e) => { e.preventDefault(); setKey("w", false); });
}
if(btnDown) {
    btnDown.addEventListener("touchstart", (e) => { e.preventDefault(); setKey("s", true); });
    btnDown.addEventListener("touchend", (e) => { e.preventDefault(); setKey("s", false); });
}
if(btnLeft) {
    btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); setKey("a", true); });
    btnLeft.addEventListener("touchend", (e) => { e.preventDefault(); setKey("a", false); });
}
if(btnRight) {
    btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); setKey("d", true); });
    btnRight.addEventListener("touchend", (e) => { e.preventDefault(); setKey("d", false); });
}

// Botón de Disparo Móvil
if(btnFire) {
    btnFire.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (gameState !== "playing") return;

        const angle = Math.atan2(
            (enemyBase.y + enemyBase.height/2) - player.y, 
            enemyBase.x - player.x
        );

        const soundClone = shootSound.cloneNode();
        soundClone.volume = 0.3;
        soundClone.play().catch(e => console.log(e));

        if (multishotActive) {
            [-0.2, 0, 0.2].forEach(offset => {
                bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle + offset) * 10, dy: Math.sin(angle + offset) * 10, radius: 6 });
            });
        } else {
            bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle) * 10, dy: Math.sin(angle) * 10, radius: 6 });
        }
    });
}

// Ajuste del touch en el canvas
canvas.addEventListener("touchstart", (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouse.x = (touch.clientX - rect.left) * scaleX;
    mouse.y = (touch.clientY - rect.top) * scaleY;
}, {passive: false});

function gameLoop() {
    
    // MOSTRAR U OCULTAR CONTROLES MÓVILES
    if (mobileControlsContainer && isMobile) {
        if (gameState === "playing") {
            mobileControlsContainer.style.display = "flex";
        } else {
            mobileControlsContainer.style.display = "none";
        }
    }

    if (gameState === "playing") {
        update(); 
        draw();
    } else if (gameState === "start" || gameState === "paused") {
        draw(); 
    } else if (gameState === "gameover") {
        if(gameOverScreen) gameOverScreen.classList.remove("d-none");
    } else if (gameState === "win") {
        if(winScreen) winScreen.classList.remove("d-none");
    } 
    requestAnimationFrame(gameLoop);
}

function restartGame() { location.reload(); }

gameLoop();