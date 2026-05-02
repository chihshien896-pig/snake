const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('current-score');

// 設定畫布大小為全螢幕
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 滑鼠位置紀錄
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

class Snake {
    constructor(x, y, color, name) {
        this.name = name;
        this.color = color;
        this.segments = []; // 儲存蛇身體的所有座標
        this.length = 20; // 初始長度 (段數)
        this.radius = 10; // 蛇的寬度
        this.speed = 3;
        this.angle = 0; // 當前行進角度
        
        // 初始化身體位置
        for (let i = 0; i < this.length; i++) {
            this.segments.push({ x: x, y: y });
        }
    }

    update() {
        // 1. 計算頭部轉向滑鼠的角度
        const head = this.segments[0];
        const dx = mouse.x - head.x;
        const dy = mouse.y - head.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // 平滑轉向邏輯
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * 0.1; // 轉向速度

        // 2. 移動頭部
        const nextX = head.x + Math.cos(this.angle) * this.speed;
        const nextY = head.y + Math.sin(this.angle) * this.speed;

        // 3. 更新身體各節點
        // 將新的頭部位置插入最前面，並移除最後一節
        this.segments.unshift({ x: nextX, y: nextY });
        
        // 保持長度
        if (this.segments.length > this.length) {
            this.segments.pop();
        }
    }

    draw() {
        // 繪製身體
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;
        
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();
        
        // 繪製眼睛 (讓蛇有方向感)
        const head = this.segments[0];
        ctx.fillStyle = "#fff";
        const eyeX1 = head.x + Math.cos(this.angle + 0.5) * 5;
        const eyeY1 = head.y + Math.sin(this.angle + 0.5) * 5;
        const eyeX2 = head.x + Math.cos(this.angle - 0.5) * 5;
        const eyeY2 = head.y + Math.sin(this.angle - 0.5) * 5;
        
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI * 2);
        ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 建立玩家的蛇
const player = new Snake(canvas.width / 2, canvas.height / 2, '#00ffff', '我');

// 遊戲主迴圈
function gameLoop() {
    // 清除畫布
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製背景網格 (增加空間感)
    drawGrid();

    // 更新與繪製玩家
    player.update();
    player.draw();

    // 更新分數 UI
    scoreElement.innerText = player.segments.length;

    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

gameLoop();
