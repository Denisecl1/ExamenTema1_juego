const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// Registro de teclas para movimiento fluido
const teclas = { w: false, a: false, s: false, d: false };
let mousePos = { x: 0, y: 0 };

window.addEventListener("keydown", (e) => teclas[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => teclas[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

class Jugador {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radio = 15;
        this.velocidad = 5;
        this.color = "#00f2ff";
    }

    dibujar() {
        // Dibujar el cuerpo del jugador
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();

        // Dibujar una "línea de puntería" hacia el mouse
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = "rgba(0, 242, 255, 0.3)";
        ctx.stroke();
        ctx.setLineDash([]);
    }

    actualizar() {
        if (teclas.w && this.y > this.radio) this.y -= this.velocidad;
        if (teclas.s && this.y < canvas.height - this.radio) this.y += this.velocidad;
        if (teclas.a && this.x > this.radio) this.x -= this.velocidad;
        if (teclas.d && this.x < canvas.width - this.radio) this.x += this.velocidad;
    }
}

const jugador = new Jugador();

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    jugador.actualizar();
    jugador.dibujar();

    requestAnimationFrame(animate);
}

animate();