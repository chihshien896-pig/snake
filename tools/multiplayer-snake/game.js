const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('current-score');
const rankList = document.getElementById('rank-list');

// 全域變數
let myId = null;
let player = null;
let otherSnakes = {}; // 儲存其他玩家的蛇物件
let foods = {}; // 儲存地圖上的食物


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
    constructor(x, y, color, name, isLocal = false) {
        this.name = name;
        this.color = color;
        this.isLocal = isLocal;
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
        
        if (this.isLocal) {
            const dx = mouse.x - head.x;
            const dy = mouse.y - head.y;
            const targetAngle = Math.atan2(dy, dx);
            
            // 平滑轉向邏輯
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.1; // 轉向速度
        }

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

class Food {
    constructor(id, x, y, value, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.value = value;
        this.color = color;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 匿名登入並初始化遊戲
auth.signInAnonymously().then(() => {
    myId = auth.currentUser.uid;
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    const randomName = "玩家 " + Math.floor(Math.random() * 1000);
    
    // 建立本地玩家
    player = new Snake(canvas.width / 2, canvas.height / 2, randomColor, randomName, true);
    
    // 向 Firebase 註冊
    const myRef = db.ref(`players/${myId}`);
    myRef.set({
        name: player.name,
        color: player.color,
        segments: player.segments,
        angle: player.angle,
        score: player.segments.length,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    // 離線自動刪除
    myRef.onDisconnect().remove();

    // 監聽其他玩家
    db.ref('players').on('value', (snapshot) => {
        const playersData = snapshot.val() || {};
        
        // 更新或新增其他玩家
        Object.keys(playersData).forEach(id => {
            if (id === myId) return;
            
            const data = playersData[id];
            if (!otherSnakes[id]) {
                otherSnakes[id] = new Snake(data.segments[0].x, data.segments[0].y, data.color, data.name, false);
            }
            
            // 同步資料
            otherSnakes[id].segments = data.segments;
            otherSnakes[id].angle = data.angle;
            otherSnakes[id].color = data.color;
            otherSnakes[id].name = data.name;
        });
        
        // 刪除已離開的玩家
        Object.keys(otherSnakes).forEach(id => {
            if (!playersData[id]) {
                delete otherSnakes[id];
            }
        });

        // 更新排行榜
        updateLeaderboard(playersData);
    });

    // 監聽食物
    db.ref('foods').on('value', (snapshot) => {
        const foodsData = snapshot.val() || {};
        foods = {};
        Object.keys(foodsData).forEach(id => {
            const data = foodsData[id];
            foods[id] = new Food(id, data.x, data.y, data.v, data.color);
        });
    });

    // 定期嘗試生成食物 (如果地圖上食物太少)
    setInterval(() => {
        if (Object.keys(foods).length < 50) {
            const id = Math.random().toString(36).substring(2, 9);
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            db.ref(`foods/${id}`).set({
                x: x, y: y, v: 1, color: color
            });
        }
    }, 2000);

    // 開始主迴圈
    gameLoop();
}).catch(err => {
    console.error("Auth error:", err);
});

function updateLeaderboard(playersData) {
    const sorted = Object.values(playersData).sort((a, b) => (b.score || 0) - (a.score || 0));
    rankList.innerHTML = sorted.slice(0, 5).map((p, i) => 
        `<li>${i+1}. ${p.name} - ${p.score || 0}</li>`
    ).join('');
}

// 遊戲主迴圈
function gameLoop() {
    // 清除畫布
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製背景網格 (增加空間感)
    drawGrid();

    if (player) {
        // 更新與繪製玩家
        player.update();
        player.draw();

        // 繪製其他玩家
        Object.values(otherSnakes).forEach(snake => {
            snake.draw();
        });

        // 繪製食物
        Object.values(foods).forEach(food => {
            food.draw();
        });

        // 碰撞檢查 (食物)
        const head = player.segments[0];
        Object.keys(foods).forEach(id => {
            const food = foods[id];
            const dist = Math.hypot(head.x - food.x, head.y - food.y);
            if (dist < player.radius + 5) {
                // 吃到食物！
                db.ref(`foods/${id}`).remove();
                player.length += 2; // 增加長度
            }
        });

        // 推送本地狀態到 Firebase
        db.ref(`players/${myId}`).update({
            segments: player.segments,
            angle: player.angle,
            score: player.segments.length,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });

        // 更新分數 UI
        scoreElement.innerText = player.segments.length;
    }

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
