/**
 * Proyecto: Ciber-Defensa: Firewall Protocol
 * Autora: Diana Denise Campos Lozano - Ingeniería en TIC
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 600;

// =======================
// CARGA DE IMÁGENES (SPRITES)
// =======================
const baseImg = new Image(); baseImg.src = "img/base.png";
const virusImg = new Image(); virusImg.src = "img/virus.png";
const playerImg = new Image(); playerImg.src = "img/nave.png";
const sectorImg = new Image(); sectorImg.src = "img/sector.png";

// =======================
// HUD ELEMENTOS
// =======================
const baseLifeText = document.getElementById("baseLife");
const scoreText = document.getElementById("score");
const shieldText = document.getElementById("shieldStatus");
const levelText = document.getElementById("levelText"); 
const gameOverScreen = document.getElementById("gameOverScreen");
const winScreen = document.getElementById("winScreen");
const nextLevelScreen = document.getElementById("nextLevelScreen");
const btnNextLevel = document.getElementById("btnNextLevel");

// =======================
// ESTADO DEL JUEGO Y NIVELES
// =======================
let gameState = "playing";
let score = 0;
let currentLevel = 1;
const maxLevels = 10;

let shieldActive = false;
let multishotActive = false;
let speedBoostActive = false;

// =======================
// JUGADOR
// =======================
const player = {
    x: canvas.width / 2, y: canvas.height / 2,
    width: 70, height: 70,
    baseSpeed: 5, speed: 5
};

// =======================
// BASE ENEMIGA (JEFE)
// =======================
const enemyBase = {
    x: canvas.width / 2, y: 90,
    width: 130, height: 130,
    maxLife: 50, life: 50, 
    speed: 2, direction: 1
};

// =======================
// SECTOR A PROTEGER (ÚNICO)
// =======================
const dataSector = { 
    x: canvas.width / 2, y: 520, 
    width: 90, height: 90, 
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
    clearInterval(virusIntervalId);
    clearInterval(powerUpIntervalId);
    clearInterval(massiveWaveIntervalId);

    let spawnRate = Math.max(600, 1500 - ((currentLevel - 1) * 100));

    // Spawn Normal
    virusIntervalId = setInterval(() => {
        if (gameState === "playing") spawnVirus();
    }, spawnRate);

    // Spawn PowerUps
    powerUpIntervalId = setInterval(() => {
        if (gameState === "playing") {
            const types = ["shield", "multishot", "speed"];
            const selectedType = types[Math.floor(Math.random() * types.length)];
            powerUps.push({
                x: Math.random() * (canvas.width - 40) + 20, y: -20,
                radius: 14, speed: 2, type: selectedType
            });
        }
    }, 10000);

    // NUEVO: Oleada Masiva
    massiveWaveIntervalId = setInterval(() => {
        if (gameState === "playing") spawnMassiveWave();
    }, 12000);
}

function spawnVirus() {
    const angle = Math.atan2(dataSector.y - (enemyBase.y + enemyBase.height / 2), dataSector.x - enemyBase.x);
    let baseVirusSpeed = 1.5 + (currentLevel * 0.2);
    enemies.push(createEnemyObject(angle, baseVirusSpeed));
}

// CORRECCIÓN: Genera muchos virus en abanico separados
function spawnMassiveWave() {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 7) * i; 
        let speed = 1.5 + (currentLevel * 0.2);
        
        // Separamos el punto de aparición (Radio de 45px)
        let radioAparicion = 45; 
        let startX = enemyBase.x + Math.cos(angle) * radioAparicion;
        let startY = (enemyBase.y + enemyBase.height / 2) + Math.sin(angle) * radioAparicion;

        enemies.push({
            x: startX, y: startY,
            width: 50, height: 50,
            speed: speed + Math.random(), 
            dx: Math.cos(angle), dy: Math.sin(angle),
            zigzagOffset: Math.random() * 100, zigzagSpeed: 0.08 + Math.random() * 0.05,
            radius: 25
        });
    }
}

function createEnemyObject(angle, speed) {
    return {
        x: enemyBase.x, y: enemyBase.y + enemyBase.height / 2,
        width: 50, height: 50,
        speed: speed + Math.random(), 
        dx: Math.cos(angle), dy: Math.sin(angle),
        zigzagOffset: Math.random() * 100, zigzagSpeed: 0.08 + Math.random() * 0.05,
        radius: 25
    };
}

startSpawners();

// =======================
// EVENTOS INPUT
// =======================
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("click", () => {
    if (gameState !== "playing") return;
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

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
    });
}

// =======================
// LÓGICA DE MOVIMIENTO
// =======================
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

// =======================
// COLISIONES
// =======================
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
        if(winScreen) winScreen.classList.remove("d-none");
        return;
    }
    
    enemyBase.maxLife = 50 + (currentLevel * 10);
    enemyBase.life = enemyBase.maxLife;
    enemyBase.speed = 2 + (currentLevel * 0.5);
    
    dataSector.maxLife = 5 + (currentLevel * 2);
    dataSector.life = dataSector.maxLife;

    enemies.length = 0; bullets.length = 0; powerUps.length = 0;
    startSpawners();
    if(levelText) levelText.innerText = currentLevel;
}

// =======================
// UPDATE
// =======================
function update() {
    movePlayer(); moveEnemyBase();

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

        // CORRECCIÓN: Rebote entre virus con separación
        for (let j = i + 1; j < enemies.length; j++) {
            if (checkCollisionCircle(enemy, enemies[j])) {
                let tempDx = enemy.dx, tempDy = enemy.dy;
                enemy.dx = enemies[j].dx; enemy.dy = enemies[j].dy;
                enemies[j].dx = tempDx; enemies[j].dy = tempDy;

                // Física de separación para romper el bucle
                enemy.x += enemy.dx * 3;
                enemy.y += enemy.dy * 3;
            }
        }

        for (let k = bullets.length - 1; k >= 0; k--) {
            if (checkCollisionRectCircle(bullets[k], enemy)) {
                enemies.splice(i, 1); bullets.splice(k, 1); score += 10; break; 
            }
        }
        if (enemies[i] !== enemy) continue; 

        if (checkCollisionRectCircle(enemy, dataSector)) {
            dataSector.life--; enemies.splice(i, 1);
            if (dataSector.life <= 0) gameState = "gameover";
        }
        if (enemies[i] !== enemy) continue;

        if (!shieldActive && checkCollisionCircle({ x: enemy.x, y: enemy.y, radius: enemy.radius }, { x: player.x, y: player.y, radius: 30 })) {
            gameState = "gameover";
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

    // BALA VS BASE ENEMIGA
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (checkCollisionRectCircle(bullets[i], enemyBase)) {
            enemyBase.life--;
            bullets.splice(i, 1);

            if (enemyBase.life <= 0) {
                gameState = "level_cleared"; 
                clearInterval(virusIntervalId);
                clearInterval(powerUpIntervalId);
                clearInterval(massiveWaveIntervalId);
                if (nextLevelScreen) nextLevelScreen.classList.remove("d-none");
            }
        }
    }

    if(baseLifeText) baseLifeText.innerText = enemyBase.life;
    if(scoreText) scoreText.innerText = score;
}

// =======================
// DRAW
// =======================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 242, 255, 0.2)"; ctx.font = "bold 100px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText("NIVEL " + currentLevel, canvas.width / 2, canvas.height / 2 + 30);

    ctx.save();
    if (enemyBase.life <= enemyBase.maxLife * 0.5) {
        ctx.filter = "sepia(100%) hue-rotate(-50deg) saturate(500%)"; 
        ctx.shadowBlur = 30; ctx.shadowColor = "#ff0000";
    } else {
        ctx.shadowBlur = 10; ctx.shadowColor = "#ff007a";
    }
    ctx.drawImage(baseImg, enemyBase.x - enemyBase.width / 2, enemyBase.y - enemyBase.height / 2, enemyBase.width, enemyBase.height);
    ctx.restore();

    ctx.drawImage(sectorImg, dataSector.x - dataSector.width / 2, dataSector.y - dataSector.height / 2, dataSector.width, dataSector.height);
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px 'Courier New'";
    ctx.fillText("HP: " + dataSector.life + "/" + dataSector.maxLife, dataSector.x, dataSector.y + 60);

    ctx.save();
    if (shieldActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#39ff14"; }
    else if (speedBoostActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#00f2ff"; }
    else if (multishotActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#ffcc00"; }
    ctx.drawImage(playerImg, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    ctx.restore();

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

    ctx.strokeStyle = "#ff007a"; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke();
}

function gameLoop() {
    if (gameState === "playing") {
        update(); draw();
    } else if (gameState === "gameover") {
        if(gameOverScreen) gameOverScreen.classList.remove("d-none");
    } else if (gameState === "win") {
        if(winScreen) winScreen.classList.remove("d-none");
    } 
    requestAnimationFrame(gameLoop);
}

function restartGame() { location.reload(); }

gameLoop();