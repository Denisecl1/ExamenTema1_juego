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
// Puedes agregar un <span id="levelText"> en tu HTML para mostrar el nivel
const levelText = document.getElementById("levelText"); 
const gameOverScreen = document.getElementById("gameOverScreen");
const winScreen = document.getElementById("winScreen");

// =======================
// ESTADO DEL JUEGO Y NIVELES
// =======================
let gameState = "playing";
let score = 0;
let currentLevel = 1;
const maxLevels = 10;

// Estados de Power-ups
let shieldActive = false;
let multishotActive = false;
let speedBoostActive = false;

// =======================
// JUGADOR
// =======================
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 70, height: 70,
    baseSpeed: 5,
    speed: 5
};

// =======================
// BASE ENEMIGA (JEFE)
// =======================
const enemyBase = {
    x: canvas.width / 2,
    y: 90,
    width: 130, height: 130,
    life: 50,
    speed: 2,
    direction: 1
};

// =======================
// SECTOR A PROTEGER (ÚNICO)
// =======================
const dataSector = { 
    x: canvas.width / 2, 
    y: 520, 
    width: 90, height: 90, 
    life: 5, 
    maxLife: 5 
};

const keys = {};
const mouse = { x: 0, y: 0 };
const bullets = [];
const enemies = [];
const powerUps = [];

// =======================
// CONTROLADORES DE SPAWN
// =======================
let virusIntervalId;
let powerUpIntervalId;

function startSpawners() {
    clearInterval(virusIntervalId);
    clearInterval(powerUpIntervalId);

    // Dificultad: Entre más nivel, menos tiempo entre virus (más rápido salen)
    // Nivel 1: 1500ms, Nivel 10: 600ms
    let spawnRate = Math.max(600, 1500 - ((currentLevel - 1) * 100));

    virusIntervalId = setInterval(() => {
        if (gameState === "playing") {
            const angle = Math.atan2(
                dataSector.y - (enemyBase.y + enemyBase.height / 2),
                dataSector.x - enemyBase.x
            );

            // Dificultad: Los virus también son ligeramente más rápidos cada nivel
            let baseVirusSpeed = 1.5 + (currentLevel * 0.2);

            enemies.push({
                x: enemyBase.x,
                y: enemyBase.y + enemyBase.height / 2,
                width: 50, height: 50,
                speed: baseVirusSpeed + Math.random(), 
                dx: Math.cos(angle),
                dy: Math.sin(angle),
                zigzagOffset: Math.random() * 100,
                zigzagSpeed: 0.08 + Math.random() * 0.05,
                radius: 25
            });
        }
    }, spawnRate);

    // Generar PowerUps cada 10 segundos
    powerUpIntervalId = setInterval(() => {
        if (gameState === "playing") {
            const types = ["shield", "multishot", "speed"];
            const selectedType = types[Math.floor(Math.random() * types.length)];
            
            powerUps.push({
                x: Math.random() * (canvas.width - 40) + 20,
                y: -20,
                radius: 14,
                speed: 2,
                type: selectedType
            });
        }
    }, 10000);
}

// Iniciar los spawners por primera vez
startSpawners();

// =======================
// EVENTOS INPUT
// =======================
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// DISPARO
canvas.addEventListener("click", () => {
    if (gameState !== "playing") return;

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    if (multishotActive) {
        // Dispara 3 balas en abanico
        const offsets = [-0.2, 0, 0.2]; // Ángulos de desvío
        offsets.forEach(offset => {
            bullets.push({
                x: player.x, y: player.y,
                dx: Math.cos(angle + offset) * 10,
                dy: Math.sin(angle + offset) * 10,
                radius: 6
            });
        });
    } else {
        // Disparo normal
        bullets.push({
            x: player.x, y: player.y,
            dx: Math.cos(angle) * 10,
            dy: Math.sin(angle) * 10,
            radius: 6
        });
    }
});

// =======================
// LÓGICA DE MOVIMIENTO
// =======================
function moveEnemyBase() {
    enemyBase.x += enemyBase.speed * enemyBase.direction;
    if (enemyBase.x - enemyBase.width / 2 <= 0 || enemyBase.x + enemyBase.width / 2 >= canvas.width) {
        enemyBase.direction *= -1;
    }
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
function checkCollisionCircle(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
}
function checkCollisionRectCircle(circle, rect) {
    let distX = Math.abs(circle.x - rect.x);
    let distY = Math.abs(circle.y - rect.y);
    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;
    if (distX <= (rect.width / 2)) return true;
    if (distY <= (rect.height / 2)) return true;
    let dx = distX - rect.width / 2;
    let dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

// =======================
// FUNCIÓN SUBIR DE NIVEL
// =======================
function levelUp() {
    currentLevel++;
    if (currentLevel > maxLevels) {
        gameState = "win";
        return;
    }
    
    // Aumentar dificultad de la base
    enemyBase.life = 50 + (currentLevel * 10);
    enemyBase.speed = 2 + (currentLevel * 0.5);
    
    // Mejorar nuestro sector de protección
    dataSector.maxLife = 5 + (currentLevel * 2);
    dataSector.life = dataSector.maxLife;

    // Limpiar pantalla
    enemies.length = 0;
    bullets.length = 0;
    powerUps.length = 0;

    // Reiniciar spawners con nueva dificultad
    startSpawners();

    if(levelText) levelText.innerText = currentLevel;
}

// =======================
// UPDATE (Lógica Principal)
// =======================
function update() {
    movePlayer();
    moveEnemyBase();

    // Actualizar Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx; b.y += b.dy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    }

    // Actualizar Enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.zigzagOffset += enemy.zigzagSpeed;
        const oscillation = Math.sin(enemy.zigzagOffset) * 2.5; 
        const perpX = -enemy.dy;
        const perpY = enemy.dx;

        enemy.x += (enemy.dx * enemy.speed) + (perpX * oscillation);
        enemy.y += (enemy.dy * enemy.speed) + (perpY * oscillation);

        // Rebote entre virus
        for (let j = i + 1; j < enemies.length; j++) {
            if (checkCollisionCircle(enemy, enemies[j])) {
                let tempDx = enemy.dx; let tempDy = enemy.dy;
                enemy.dx = enemies[j].dx; enemy.dy = enemies[j].dy;
                enemies[j].dx = tempDx; enemies[j].dy = tempDy;
            }
        }

        // Bala vs Virus
        for (let k = bullets.length - 1; k >= 0; k--) {
            if (checkCollisionRectCircle(bullets[k], enemy)) {
                enemies.splice(i, 1);
                bullets.splice(k, 1);
                score += 10;
                break; 
            }
        }
        if (enemies[i] !== enemy) continue; 

        // Virus vs Sector Único
        if (checkCollisionRectCircle(enemy, dataSector)) {
            dataSector.life--;
            enemies.splice(i, 1);
            if (dataSector.life <= 0) gameState = "gameover";
        }
        if (enemies[i] !== enemy) continue;

        // Virus vs Jugador
        if (!shieldActive && checkCollisionCircle(
            { x: enemy.x, y: enemy.y, radius: enemy.radius },
            { x: player.x, y: player.y, radius: 30 }
        )) {
            gameState = "gameover";
        }
    }

    // Actualizar PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        p.y += p.speed;

        if (checkCollisionCircle({ x: player.x, y: player.y, radius: 30 }, p)) {
            if (p.type === "shield") {
                shieldActive = true;
                setTimeout(() => shieldActive = false, 6000);
            } else if (p.type === "multishot") {
                multishotActive = true;
                setTimeout(() => multishotActive = false, 6000);
            } else if (p.type === "speed") {
                speedBoostActive = true;
                player.speed = player.baseSpeed + 4; // Aumenta velocidad
                setTimeout(() => {
                    speedBoostActive = false;
                    player.speed = player.baseSpeed;
                }, 6000);
            }
            powerUps.splice(i, 1);
        } else if (p.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }

    // Bala vs Base Enemiga (NIVEL COMPLETADO)
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (checkCollisionRectCircle(bullets[i], enemyBase)) {
            enemyBase.life--;
            bullets.splice(i, 1);

            if (enemyBase.life <= 0) {
                levelUp(); // En lugar de ganar, subimos de nivel
            }
        }
    }

    // Textos HTML
    if(baseLifeText) baseLifeText.innerText = enemyBase.life;
    if(scoreText) scoreText.innerText = score;
}

// =======================
// DRAW (Dibujado)
// =======================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Indicador de Nivel en el Canvas
    ctx.fillStyle = "rgba(0, 242, 255, 0.2)";
    ctx.font = "bold 100px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("NIVEL " + currentLevel, canvas.width / 2, canvas.height / 2 + 30);

    // Dibujar Base Enemiga
    ctx.drawImage(baseImg, enemyBase.x - enemyBase.width / 2, enemyBase.y - enemyBase.height / 2, enemyBase.width, enemyBase.height);

    // Dibujar Sector Único
    ctx.drawImage(sectorImg, dataSector.x - dataSector.width / 2, dataSector.y - dataSector.height / 2, dataSector.width, dataSector.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px 'Courier New'";
    ctx.fillText("HP: " + dataSector.life + "/" + dataSector.maxLife, dataSector.x, dataSector.y + 60);

    // Dibujar Jugador
    ctx.save();
    if (shieldActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#39ff14"; }
    else if (speedBoostActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#00f2ff"; }
    else if (multishotActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#ffcc00"; }
    
    ctx.drawImage(playerImg, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    ctx.restore();

    // Dibujar Balas
    ctx.fillStyle = "#00f2ff";
    bullets.forEach(b => {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    });

    // Dibujar Enemigos
    enemies.forEach(enemy => {
        ctx.drawImage(virusImg, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
    });

    // Dibujar PowerUps con letras y colores
    powerUps.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        if (p.type === "shield") ctx.fillStyle = "#39ff14"; // Verde
        else if (p.type === "multishot") ctx.fillStyle = "#ffcc00"; // Amarillo
        else if (p.type === "speed") ctx.fillStyle = "#00f2ff"; // Azul

        ctx.fill(); ctx.strokeStyle = "white"; ctx.stroke();
        
        ctx.fillStyle = "black";
        ctx.font = "bold 12px Arial";
        let letter = p.type === "shield" ? "S" : (p.type === "multishot" ? "M" : "V");
        ctx.fillText(letter, p.x, p.y + 4);
    });

    // Mira
    ctx.strokeStyle = "#ff007a";
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15);
    ctx.stroke();
}

// =======================
// GAME LOOP
// =======================
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

gameLoop();

// =======================
// REINICIAR SISTEMA
// =======================
function restartGame() {
    location.reload();
}