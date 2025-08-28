// 게임 씬 상태 정의
const GAME_SCENE_STATUS_NONE = "none";
const GAME_SCENE_STATUS_FADE_IN = "fade_in";
const GAME_SCENE_STATUS_END = "end";

class SceneGame {
    constructor(id, canvas, ws) {
        this.id = id; 
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.ws = ws;
        this.status = GAME_SCENE_STATUS_FADE_IN;
        this.opacity = 0.0;

        this.endGameImage;
        this.endGameVictory = new UIImage("res/ui_end_victory.png", canvas.width / 2, canvas.height / 2 - 40, 36, 7, 7, 0.0);
        this.endGameOver = new UIImage("res/ui_end_gameover.png", canvas.width / 2, canvas.height / 2 - 40, 43, 7, 7, 0.0);

        this.gameWorld = new GameWorld();
        this.myPlayer = new Player(id, 0, 0, 0, 0, 0, 0);
        this.players = new Map();
        this.projectiles = new Map();
        this.effects = [];
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2 + 100;

        this.inputDirX = 0;
        this.inputDirY = 0;
        this.inputDirR = 0;
        this.inputFire = false;
        this.input_keys = {};
        addEventListener('keydown', e => {
            this.input_keys[e.key.toLowerCase()] = true;
        });
        addEventListener('keyup', e => {
            this.input_keys[e.key.toLowerCase()] = false;
        });

        // 백그라운드 별 이미지 생성
        this.bgStarList = [];
        for (let i=0; i<15; i++) {
            this.bgStarList[i] = new BgStar(0, this.canvas.width, 0, this.canvas.height);
        }
    }

    updateInput() {
        if (this.myPlayer.isDead) {
            return;
        }

        // 방향 및 회전 입력 체크
        let dirX = 0, dirY = 0, dirR = 0;
        if (this.input_keys['a']) dirX -= 1;
        if (this.input_keys['d']) dirX += 1;
        if (this.input_keys['w']) dirY -= 1;
        if (this.input_keys['s']) dirY += 1;
        if (this.input_keys['j']) dirR -= 1;
        if (this.input_keys['k']) dirR += 1;
        if (this.inputDirX !== dirX || this.inputDirY !== dirY || this.inputDirR !== dirR) {
            const ev = {type: 'player_move', owner_id: this.id, data: {dir_x: dirX, dir_y: dirY, dir_r: dirR}};
            ws.send(JSON.stringify({type: 'ingame', client_id: this.id, event: ev}));
        }
        this.inputDirX = dirX;
        this.inputDirY = dirY;
        this.inputDirR = dirR;

        // 레이저 발사 입력 체크
        let inputFire = false;
        if (this.input_keys['l']) inputFire = true;
        if (this.inputFire === true && inputFire !== false) {
            const ev = {type: 'player_fire', owner_id: this.id};
            ws.send(JSON.stringify({type: 'ingame', client_id: this.id, event: ev}));
        }
        this.inputFire = inputFire;
    }

    updateAndDraw(dt) {
        // 입력 업데이트
        if (this.status !== GAME_SCENE_STATUS_END) {
            this.updateInput();
        }

        // 게임 월드 업데이트 및 그리기
        this.gameWorld.update(dt);
        drawGameObj(this.ctx, this.gameWorld, this.centerX, this.centerY,
            this.myPlayer.x, this.myPlayer.y, this.myPlayer.angle
        )

        // 백그라운드 별 이미지 업데이트 및 그리기
        for (let i=0; i<this.bgStarList.length; i++) {
            const bgStar = this.bgStarList[i];
            bgStar.update(dt);

            drawGameObj(
                this.ctx, bgStar, this.centerX, this.centerY,
                this.myPlayer.x, this.myPlayer.y, this.myPlayer.angle
            );

            if (bgStar.isDead ||
                bgStar.x > this.myPlayer.x + this.canvas.width / 2 ||
                bgStar.x < this.myPlayer.x - this.canvas.width / 2 ||
                bgStar.y > this.myPlayer.y + this.canvas.height / 2 ||
                bgStar.y < this.myPlayer.y - this.canvas.height / 2) {
                this.bgStarList[i] = new BgStar(
                    this.myPlayer.x - this.canvas.width / 2,
                    this.myPlayer.x + this.canvas.width / 2,
                    this.myPlayer.y - this.canvas.height / 2,
                    this.myPlayer.y + this.canvas.height / 2
                );
            }
        }

        // 플레이어 업데이트 및 그리기
        for (const [id, player] of this.players) {
            player.update(dt);

            // 월드 영역 밖으로 나가지 않도록 체크
            const dist = Math.hypot(player.x, player.y);
            if (dist > this.gameWorld.area) {
                const scale = this.gameWorld.area / dist;
                player.x = player.x * scale;
                player.y = player.y * scale;
            }

            if (id === this.id) {
                // 내 플레이어 그리기
                this.ctx.save();
                this.ctx.translate(this.centerX, this.centerY);
                player.draw(this.ctx);
                this.ctx.restore();
            } else {
                // 디른 플레이어 그리기
                drawGameObj(
                    this.ctx, player, this.centerX, this.centerY,
                    this.myPlayer.x, this.myPlayer.y, this.myPlayer.angle
                );
            }
        }

        // 발사체 업데이트 및 그리기
        for (const [id, projectile] of this.projectiles) {
            projectile.update(dt);
            drawGameObj(
                this.ctx, projectile, this.centerX, this.centerY,
                this.myPlayer.x, this.myPlayer.y, this.myPlayer.angle
            );
        }

        // 이펙트 업데이트 및 그리기
        for (let i=0; i<this.effects.length; i++) {
            const effect = this.effects[i];
            effect.update(dt);
            drawGameObj(
                this.ctx, effect, this.centerX, this.centerY,
                this.myPlayer.x, this.myPlayer.y, this.myPlayer.angle
            );
        }
        this.effects.filter(effect => effect.isDead);

        // 게임이 종료된 경우
        if (this.status === GAME_SCENE_STATUS_END){
            this.endGameImage.alpha += 1 * dt;
            this.endGameImage.draw(this.ctx);
        }

        // fade in 효과 적용
        if (this.status === GAME_SCENE_STATUS_FADE_IN) {
            this.fadeIn(dt);
        }
    }

    processMsg(msg) {
        if (msg.type === 'ingame') {
            const ev = msg.event;
            const data = ev.data;
            if (ev.type === 'game_init') {
                this.gameWorld.area = data.x;
                this.gameWorld.min_area = data.y;
                this.gameWorld.speed = data.move_speed;
            } else if (ev.type === 'game_victory') {
                // 게임 승리
                this.endGame(true);
            } else if (ev.type === 'player_create') {
                const player = new Player(ev.owner_id, data.idx,
                    data.x, data.y, data.angle, data.move_speed, data.rotate_speed);
                this.players.set(ev.owner_id, player);
                if (this.id === ev.owner_id) {
                    this.myPlayer = player;
                }
            } else if (ev.type === 'player_dead') {
                const player = this.players.get(ev.owner_id);
                player.isDead = true;
                // 게임 오버
                if (this.myPlayer.isDead) {
                    this.endGame(false);
                }
                this.effects.push(new Effect(ev.owner_id, EFFECT_TYPE_EXPLOSION, player.x, player.y, player.angle));
            } else if (ev.type === 'player_move') {
                const player = this.players.get(ev.owner_id);
                player.x = data.x;
                player.y = data.y;
                player.angle = data.angle;
                player.dirX = data.dir_x;
                player.dirY = data.dir_y;
                player.dirR = data.dir_r;
            } else if (ev.type === 'projectile_create') {
                const projectile = new Projectile(ev.owner_id, data.idx, data.x, data.y, data.angle, data.move_speed);
                this.projectiles.set(data.id, projectile);
            } else if (ev.type === 'projectile_extinction') {
                this.projectiles.delete(data.id);
            }
        }
    }

    endGame(win = false) {
        this.status = GAME_SCENE_STATUS_END;
        if (win) {
            this.endGameImage = this.endGameVictory;
        } else {
            this.endGameImage = this.endGameOver;
        }
    }

    fadeIn(dt) {
        this.opacity += 0.5 * dt;
        this.opacity = this.opacity > 1 ? 1 : this.opacity;
        if (this.opacity === 1) {
            this.status = GAME_SCENE_STATUS_NONE;
        }
        this.ctx.globalCompositeOperation = "destination-in"; 
        this.ctx.fillStyle = "rgba(0,0,0," + this.opacity + ")";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }
};
