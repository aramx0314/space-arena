class Bot {
    constructor(logger) {
        this.id = "";
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.dirX = 0;
        this.dirY = 0;
        this.dirR = 0;
        this.isDead = false;
        this.logger = logger;

        // websocket
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        this.ws = new WebSocket(`${proto}://${location.host}/ws`);
        this.ws.addEventListener('message', (e) => {
            const msg = JSON.parse(e.data);
            // this.logger("[" + this.id + "] recv message: " + JSON.stringify(msg));
            // 첫 초기화 패킷 수신
            if (msg.type === 'hello') {
                // ready 메시지 전송
                this.id = msg.client_id;
                this.ws.send(JSON.stringify({type: 'ready', client_id: this.id}));
                this.logger("[" + this.id + "] send message: ready");
            } else if (msg.type === 'error') {
                location.reload(true);
            } else if (msg.type === 'start') {
                this.logger("[" + this.id + "] game start");
                setTimeout(() => {
                    this.run();
                }, 1500);
            } else if (msg.type === 'ingame') {
                const ev = msg.event;
                const data = ev.data;
                // 플레이어 생성 데이터
                if (ev.type === 'player_create') {
                    if (this.id === ev.owner_id) {
                        this.x = data.x;
                        this.y = data.y;
                        this.angle = data.angle;
                    }
                }
                // 게임 종료
                else if (ev.type === 'game_victory' || (ev.type === 'player_dead' && ev.owner_id === this.id)) {
                    this.isDead = true;
                }
            }
        });
    }

    run() {
        this.move();
        this.rotate();
        this.sendMove();
        this.fire();
    }

    // 랜덤 상/하/좌/우 이동
    move() {
        if (this.isDead) {
            return;
        }
        this.dirX = Math.floor(Math.random() * 2 - 1);
        this.dirY = Math.floor(Math.random() * 2 - 1);
        setTimeout(() => this.move(), getRandomInt(25, 100));
    }

    // 랜덤 좌/우 회전
    rotate() {
        if (this.isDead) {
            return;
        }
        this.dirR = Math.floor(Math.random() * 2 - 1);
        setTimeout(() => this.rotate(), getRandomInt(10, 60));
    }

    // 이동 이벤트 전송
    sendMove() {
        if (this.isDead) {
            return;
        }
        const ev = {type: 'player_move', owner_id: this.id,
            data: {dir_x: this.dirX, dir_y: this.dirY, dir_r: this.dirR}};
        this.ws.send(JSON.stringify({type: 'ingame', client_id: this.id, event: ev}));
        // this.logger("[" + this.id + "] send message: player_move: " + this.dirX + "," + this.dirY + "," + this.dirR);
        setTimeout(() => this.sendMove(), getRandomInt(70, 120));
    }

    // 랜덤 레이저 발사
    fire() {
        if (this.isDead) {
            return;
        }
        if (Math.floor(Math.random() * 2) > 0) {
            const ev = {type: 'player_fire', owner_id: this.id};
            this.ws.send(JSON.stringify({type: 'ingame', client_id: this.id, event: ev}));
            // this.logger("[" + this.id + "] send message: player_fire");
        }
        setTimeout(() => this.fire(), getRandomInt(200, 500));
    }
}