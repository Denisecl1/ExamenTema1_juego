const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 600;

// =======================
// CARGA DE IMÁGENES (SPRITES)
// =======================
const baseImg = new Image();
baseImg.src = "img/base.png";

const virusImg = new Image();
virusImg.src = "img/virus.png";

const playerImg = new Image();
playerImg.src = "img/nave.png"; // NAVE

const sectorImg = new Image();
sectorImg.src = "img/sector.png"; // SECTORES A PROTEGER

// =======================
// HUD ELEMENTOS
// =======================
const baseLifeText = document.getElementById("baseLife");
const scoreText = document.getElementById("score");
const shieldText = document.getElementById("shieldStatus");
const gameOverScreen = document.getElementById("gameOverScreen");
const winScreen = document.getElementById("winScreen");

// =======================
// ESTADO DEL JUEGO
// =======================
let gameState = "playing";
let score = 0;
let shieldActive = false;

// =======================
// JUGADOR (NAVE DEFENSA - QUIETA VISUALMENTE)
// =======================
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 70,
    height: 70,
    speed: 4
};

// =======================
// BASE ENEMIGA (AHORA CON MOVIMIENTO)
// =======================
const enemyBase = {
    x: canvas.width / 2,
    y: 90,
    width: 130,
    height: 130,
    life: 50,
    speed: 2,
    direction: 1 // 1 = derecha, -1 = izquierda
};

// =======================
// SECTORES DE DATOS (BASES A PROTEGER)
// =======================
const dataSectors = [
    { x: 200, y: 520, width: 90, height: 90, life: 5 },
    { x: 800, y: 520, width: 90, height: 90, life: 5 }
];

// =======================
const keys = {};
const mouse = { x: 0, y: 0 };
const bullets = [];
const enemies = [];
const powerUps = [];

// =======================
// EVENTOS TECLADO
// =======================
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// =======================
// MOUSE (MIRA)
// =======================
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// =======================
// DISPARO VECTORIAL (HACIA EL MOUSE)
// =======================
canvas.addEventListener("click", () => {
    if (gameState !== "playing") return;

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8,
        radius: 6
    });
});

// =======================
// MOVIMIENTO DE LA BASE ENEMIGA (NUEVO)
// =======================
function moveEnemyBase() {
    enemyBase.x += enemyBase.speed * enemyBase.direction;

    // Rebotar en bordes del canvas
    if (
        enemyBase.x - enemyBase.width / 2 <= 0 ||
        enemyBase.x + enemyBase.width / 2 >= canvas.width
    ) {
        enemyBase.direction *= -1;
    }
}

// =======================
// SPAWN DE VIRUS DESDE LA BASE EN MOVIMIENTO (MEJORADO)
// =======================
setInterval(() => {
    if (gameState === "playing") {

        // Elegir sector más cercano desde la base
        let target = dataSectors[0];
        let minDist = Infinity;

        dataSectors.forEach(sector => {
            const d = Math.hypot(sector.x - enemyBase.x, sector.y - enemyBase.y);
            if (d < minDist) {
                minDist = d;
                target = sector;
            }
        });

        // Calcular dirección hacia el sector objetivo
        const angle = Math.atan2(
            target.y - (enemyBase.y + enemyBase.height / 2),
            target.x - enemyBase.x
        );

        enemies.push({
            x: enemyBase.x,
            y: enemyBase.y + enemyBase.height / 2,
            width: 50,
            height: 50,
            speed: 1.6 + Math.random() * 0.5,
            dx: Math.cos(angle),
            dy: Math.sin(angle)
        });
    }
}, 1500);

// =======================
// SPAWN POWER-UPS (ESCUDO)
// =======================
setInterval(() => {
    if (gameState === "playing") {
        powerUps.push({
            x: Math.random() * canvas.width,
            y: -20,
            radius: 14,
            speed: 2,
            type: "shield"
        });
    }
}, 8000);

// =======================
// COLISION CIRCULO-CIRCULO
// =======================
function checkCollisionCircle(a, b) {
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    return dist < a.radius + b.radius;
}

// =======================
// COLISION CIRCULO-RECTANGULO
// =======================
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
// MOVIMIENTO DEL JUGADOR (SIN ROTACIÓN)
// =======================
function movePlayer() {
    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

// =======================
// UPDATE (LÓGICA)
// =======================
function update() {
    movePlayer();
    moveEnemyBase(); // ⭐ BASE ENEMIGA EN MOVIMIENTO

    // Mover balas
    bullets.forEach((b, i) => {
        b.x += b.dx;
        b.y += b.dy;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    });

    // Movimiento enemigos hacia sectores
    enemies.forEach((enemy, eIndex) => {
        enemy.x += enemy.dx * enemy.speed;
        enemy.y += enemy.dy * enemy.speed;

        // Bala vs virus
        bullets.forEach((b, bIndex) => {
            if (checkCollisionRectCircle(b, enemy)) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                score += 10;
            }
        });

        // Virus vs sectores
        dataSectors.forEach((sector) => {
            if (checkCollisionRectCircle(
                { x: enemy.x, y: enemy.y, radius: 20 },
                sector
            )) {
                sector.life--;
                enemies.splice(eIndex, 1);

                if (sector.life <= 0) {
                    gameState = "gameover";
                }
            }
        });

        // Virus vs jugador
        if (!shieldActive && checkCollisionCircle(
            { x: enemy.x, y: enemy.y, radius: 25 },
            { x: player.x, y: player.y, radius: 30 }
        )) {
            gameState = "gameover";
        }
    });

    // PowerUps (escudo)
    powerUps.forEach((p, i) => {
        p.y += p.speed;

        if (checkCollisionCircle(
            { x: player.x, y: player.y, radius: 30 },
            p
        )) {
            shieldActive = true;
            shieldText.textContent = "ON";

            setTimeout(() => {
                shieldActive = false;
                shieldText.textContent = "OFF";
            }, 5000);

            powerUps.splice(i, 1);
        }
    });

    // Bala vs BASE ENEMIGA
    bullets.forEach((b, i) => {
        if (checkCollisionRectCircle(b, enemyBase)) {
            enemyBase.life--;
            bullets.splice(i, 1);

            if (enemyBase.life <= 0) {
                gameState = "win";
            }
        }
    });

    baseLifeText.textContent = enemyBase.life;
    scoreText.textContent = score;
}

// =======================
// DRAW (RENDER)
// =======================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BASE ENEMIGA (EN MOVIMIENTO)
    ctx.drawImage(
        baseImg,
        enemyBase.x - enemyBase.width / 2,
        enemyBase.y - enemyBase.height / 2,
        enemyBase.width,
        enemyBase.height
    );

    ctx.fillStyle = "#ff0040";
    ctx.font = "18px Arial";
    ctx.fillText("Base: " + enemyBase.life, enemyBase.x - 40, enemyBase.y - 90);

    // NAVE (QUIETA)
    ctx.drawImage(
        playerImg,
        player.x - player.width / 2,
        player.y - player.height / 2,
        player.width,
        player.height
    );

    // ESCUDO
    if (shieldActive) {
        ctx.strokeStyle = "#00ff9c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
        ctx.stroke();
    }

    // SECTORES (BASES A PROTEGER)
    dataSectors.forEach(sector => {
        ctx.drawImage(
            sectorImg,
            sector.x - sector.width / 2,
            sector.y - sector.height / 2,
            sector.width,
            sector.height
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.fillText(
            "HP: " + sector.life,
            sector.x - 25,
            sector.y - sector.height / 2 - 10
        );
    });

    // BALAS
    ctx.fillStyle = "#ff00ff";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // VIRUS (SALEN DE LA BASE Y ATACAN SECTORES)
    enemies.forEach(enemy => {
        ctx.drawImage(
            virusImg,
            enemy.x - enemy.width / 2,
            enemy.y - enemy.height / 2,
            enemy.width,
            enemy.height
        );
    });

    // POWERUPS
    ctx.fillStyle = "#00ff9c";
    powerUps.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // MIRA
    ctx.strokeStyle = "#00ffea";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2);
    ctx.stroke();
}

// =======================
// GAME LOOP
// =======================
function gameLoop() {
    if (gameState === "playing") {
        update();
        draw();
    } else if (gameState === "gameover") {
        gameOverScreen.classList.remove("d-none");
    } else if (gameState === "win") {
        winScreen.classList.remove("d-none");
    }

    requestAnimationFrame(gameLoop);
}

function restartGame() {
    location.reload();
}

gameLoop();