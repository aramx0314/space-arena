// 게임 오브젝트 width, height: 서버와 동일한 값이어야 함
const GAME_OBJECT_WIDTH = 48;
const GAME_OBJECT_HEIGHT = 48;

// 게임 오브젝트 스프라이트 시트 이미지
const spriteSheetImg = new Image();
spriteSheetImg.src = "res/sprite_sheet.png";

// 색상별 우주선 프레임
const playerShipBodyFrame = [
    [{x: 0, y: 0, w: 32, h: 32}, {x: 32, y: 0, w: 32, h: 32}, {x: 64, y: 0, w: 32, h: 32}], // blue
    [{x: 0, y: 32, w: 32, h: 32}, {x: 32, y: 32, w: 32, h: 32}, {x: 64, y: 32, w: 32, h: 32}], // red
    [{x: 0, y: 64, w: 32, h: 32}, {x: 32, y: 64, w: 32, h: 32}, {x: 64, y: 64, w: 32, h: 32}], // black
    [{x: 96, y: 0, w: 32, h: 32}, {x: 128, y: 0, w: 32, h: 32}, {x: 160, y: 0, w: 32, h: 32}], // yellow
    [{x: 0, y: 96, w: 32, h: 32}, {x: 32, y: 96, w: 32, h: 32}, {x: 64, y: 96, w: 32, h: 32}], // orange
    [{x: 0, y: 160, w: 32, h: 32}, {x: 32, y: 160, w: 32, h: 32}, {x: 64, y: 160, w: 32, h: 32}], // green
    [{x: 0, y: 128, w: 32, h: 32}, {x: 32, y: 128, w: 32, h: 32}, {x: 64, y: 128, w: 32, h: 32}], // purple
    [{x: 96, y: 64, w: 32, h: 32}, {x: 128, y: 64, w: 32, h: 32}, {x: 160, y: 64, w: 32, h: 32}], // sky
    [{x: 96, y: 32, w: 32, h: 32}, {x: 128, y: 32, w: 32, h: 32}, {x: 160, y: 32, w: 32, h: 32}], // gray
];

// 우주선 부스터 프레임
const playerShipBoostFrame = [
    {x: 96, y: 96, w: 32, h: 32},
    {x: 128, y: 96, w: 32, h: 32},
    {x: 160, y: 96, w: 32, h: 32},
];

// 플레이어 회전 상수
const PLAYER_ROTATE_NONE = 0;
const PLAYER_ROTATE_LEFT = 1;
const PLAYER_ROTATE_RIGTH = 2;

// 게임 플레이어
class Player {
    constructor(id, idx, x, y, angle, moveSpeed, rotateSpeed) {
        this.id = id;
        this.idx = idx;
        this.w = GAME_OBJECT_WIDTH;
        this.h = GAME_OBJECT_HEIGHT;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.dirX = 0;
        this.dirY = 0;
        this.dirR = 0;
        this.alpha = 1;
        this.isDead = false;
        this.moveSpeed = moveSpeed;
        this.rotateSpeed = rotateSpeed;
        this.shipBodyFrame = playerShipBodyFrame[idx];
    }

    update(dt) {
        if (this.isDead) {
            return;
        }

        // 회전 업데이트
        this.angle += this.rotateSpeed * dt * this.dirR;

        // 이동 업데이트
        let vx = Math.cos(this.angle) * this.dirX + Math.cos(this.angle + Math.PI / 2) * this.dirY;
        let vy = Math.sin(this.angle) * this.dirX + Math.sin(this.angle + Math.PI / 2) * this.dirY;
        let len = Math.hypot(vx, vy);
        if (len > 0) {
            vx /= len;
            vy /= len;
            this.x += vx * this.moveSpeed * dt;
            this.y += vy * this.moveSpeed * dt;
        }
    }

    draw(ctx) {
        if (this.isDead) {
            return;
        }

        let rotateStatus = 0;
        if (this.dirR === 0) rotateStatus = 0;
        else if (this.dirR === -1) rotateStatus = 1;
        else if (this.dirR === 1) rotateStatus = 2;

        const shipBodyFrame = this.shipBodyFrame[rotateStatus];
        ctx.drawImage(spriteSheetImg,
            shipBodyFrame.x, shipBodyFrame.y, shipBodyFrame.w, shipBodyFrame.h,
            -(this.w / 2), -(this.h / 2), this.w, this.h
        );
        if (this.dirX !== 0 || this.dirY !== 0 || this.dirR !== 0) {
            const shipBoostFrame = playerShipBoostFrame[rotateStatus];
            ctx.drawImage(spriteSheetImg,
                shipBoostFrame.x, shipBoostFrame.y, shipBoostFrame.w, shipBoostFrame.h,
                -(this.w / 2), -(this.h / 2), this.w, this.h
            );
        }
    }
};

// 발사체 이미지 프레임
const projectileFrame = [
    {x: 128, y: 128, w: 32, h: 32}, // 레이저 이미지
    {x: 160, y: 128, w: 32, h: 32}, // 에너지볼 이미지
];

// 발사체 오브젝트
class Projectile {
    constructor(ownerId, idx, x, y, angle, moveSpeed) {
        this.ownerId = ownerId;
        this.idx = idx;
        this.x = x;
        this.y = y;
        this.w = GAME_OBJECT_WIDTH;
        this.h = GAME_OBJECT_HEIGHT;
        this.angle = angle;
        this.moveSpeed = moveSpeed;
    }

    update(dt) {
        this.x += Math.cos(this.angle) * this.moveSpeed * dt;
        this.y += Math.sin(this.angle) * this.moveSpeed * dt;
    }

    draw(ctx) {
        ctx.save();
        const frame = projectileFrame[this.idx];
        ctx.rotate(- Math.PI / 2);
        ctx.drawImage(spriteSheetImg,
            frame.x, frame.y, frame.w, frame.h,
            -(this.w / 2), -(this.h / 2), this.w, this.h
        );
        ctx.restore();
    }
};

// 이펙트 오브젝트 타입
const EFFECT_TYPE_EXPLOSION = 0;

// 이펙트 이미지 프레임
const effectFrame = [
    {x: 96, y: 128, w: 32, h: 32},
]

// 게임 이펙트 오브젝트
class Effect {
    constructor(ownerId, type, x, y, angle) {
        this.ownerId = ownerId;
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = GAME_OBJECT_WIDTH;
        this.h = GAME_OBJECT_HEIGHT;
        this.angle = angle;
        this.alpha = 1;
        this.isDead = false;
    }

    update(dt) {
        this.alpha -= dt;
        if (this.alpha < 0) {
            this.alpha = 0;
            this.isDead = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        const frame = effectFrame[this.type];
        ctx.drawImage(spriteSheetImg,
            frame.x, frame.y, frame.w, frame.h,
            -(this.w / 2), -(this.h / 2), this.w, this.h
        );
        ctx.restore();
    }
};


// 백그라운드 별 이미지 프레임
const bgStarFrame = {x: 160, y: 160, w: 32, h: 32};

// 백그라운드 별 오브젝트
class BgStar {
    constructor(minX, maxX, minY, maxY) {
        this.scale = Math.random() * 1 + 0.25;
        this.w = GAME_OBJECT_WIDTH * this.scale;
        this.h = GAME_OBJECT_HEIGHT * this.scale;
        this.x = minX + Math.floor(Math.random() * (maxX - minX));
        this.y = minY + Math.floor(Math.random() * (maxY - minY));
        this.dirX = Math.random() < 0.5 ? -1 : 1;
        this.dirY = Math.random() < 0.5 ? -1 : 1;
        this.alpha = 0;
        this.dirA = 1;
        this.moveSpeed = Math.random() * 7 + 3;
        this.alphaSpeed = Math.random() * 5 + 10;
        this.lifeTime = Math.floor(Math.random() * 2) + 1;
        this.isDead = false;
    }

    update(dt) {
        if (this.isDead) return;

        // lifeTime 업데이트
        this.lifeTime -= dt;
        if (this.lifeTime < 0) this.lifeTime = 0;

        // 위치 업데이트
        this.x += this.dirX * this.moveSpeed * dt;
        this.y += this.dirY * this.moveSpeed * dt;

        // alpha 업데이트
        this.alpha += dt * this.alphaSpeed * 0.075 * this.dirA;
        if (this.alpha > 1) {
            this.dirA = this.dirA * -1;
            this.alpha = 1;
        } else if (this.alpha < 0) {
            this.dirA = this.dirA * -1;
            this.alpha = 0;
            if (this.lifeTime === 0) {
                this.dirA = 0;
                this.isDead = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(spriteSheetImg,
            bgStarFrame.x, bgStarFrame.y, bgStarFrame.w, bgStarFrame.h,
            -(this.w / 2), -(this.h / 2), this.w, this.h
        );
        ctx.restore();
    }

    drawAbs(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(spriteSheetImg,
            bgStarFrame.x, bgStarFrame.y, bgStarFrame.w, bgStarFrame.h,
            this.x, this.y, this.w, this.h);
        ctx.restore();
    }
};

// 월드 중앙 이미지 프레임
const worldCenterFrame = {x: 128, y: 160, w: 32, h: 32};

class GameWorld {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.w = GAME_OBJECT_WIDTH * 3.5;
        this.h = GAME_OBJECT_HEIGHT * 3.5;
        this.angle = 0;
        this.area = 0;
        this.min_area = 0;
        this.speed = 0;
    }

    update(dt) {
        this.area -= this.speed * dt;
        if (this.area < this.min_area) {
            this.area = this.min_area;
        }
        this.angle += Math.PI / 2 * dt * 0.25;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(40, 30, 135, 0.8)";
        ctx.lineWidth = 2;
        ctx.arc(0, 0, this.area, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.drawImage(spriteSheetImg,
            worldCenterFrame.x, worldCenterFrame.y, worldCenterFrame.w, worldCenterFrame.h,
            -(this.w / 2), -(this.h / 2), this.w, this.h
        );
    }
};

// 메인 플레이어와의 상대적인 위치/회전을 적용하여 그리는 함수
function drawGameObj(ctx, gameObj, cx, cy, sx, sy, sa) {
    const dx = gameObj.x - sx;
    const dy = gameObj.y - sy;
    const cosA = Math.cos(-sa);
    const sinA = Math.sin(-sa);
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;

    ctx.save();
    ctx.translate(cx + rx, cy + ry);
    ctx.rotate(gameObj.angle - sa);
    gameObj.draw(ctx);
    ctx.restore();
}