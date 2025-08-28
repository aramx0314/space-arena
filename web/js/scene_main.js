// 메인 씬 상태 정의
const MAIN_SCENE_STATUS_NONE = "none";
const MAIN_SCENE_STATUS_FADE_IN = "fade_in";
const MAIN_SCENE_STATUS_READY = "ready";
const MAIN_SCENE_STATUS_READY_WAIT = "ready_wait";
const MAIN_SCENE_STATUS_CANCEL_WAIT = "cancel_wait";
const MAIN_SCENE_STATUS_FADE_OUT = "fade_out";
const MAIN_SCENE_STATUS_END = "end";

class SceneMain {
    constructor(id, canvas, ws) {
        this.id = id;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.ws = ws;
        this.status = MAIN_SCENE_STATUS_FADE_IN;
        this.moving = false;
        this.opacity = 0.0;
        this.yOffset = 0;

        // 버튼 생성 및 초기 설정
        this.startBtn = new UIButton("res/ui_btn_start.png",
            canvas.width / 2, canvas.height / 2 + 100, 26, 7, 5, () => {
            if (this.status === MAIN_SCENE_STATUS_READY_WAIT) {
                return;
            }
            // 게임 시작 요청
            ws.send(JSON.stringify({type: 'ready', client_id: this.id}));
            this.status = MAIN_SCENE_STATUS_READY_WAIT;
        });
        this.cancelBtn = new UIButton("res/ui_btn_cancel.png",
            canvas.width / 2, canvas.height / 2 + 100, 31, 7, 5, () => {
            if (this.status === MAIN_SCENE_STATUS_CANCEL_WAIT) {
                return;
            }
            // 게임 시작 취소
            ws.send(JSON.stringify({type: 'cancel', client_id: this.id}));
            this.status = MAIN_SCENE_STATUS_CANCEL_WAIT;
        });
        this.btn = this.startBtn;

        // 버튼 마우스 hover 체크
        this.btnMouseHoverCheck = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const hovering = mx >= this.btn.x && mx <= this.btn.x + this.btn.w &&
                my >= this.btn.y && my <= this.btn.y + this.btn.h;
            if (hovering !== this.btn.hovering) {
                this.btn.hovering = hovering;
            }
        };
        canvas.addEventListener("mousemove", this.btnMouseHoverCheck);

        // 버튼 클릭 감지
        this.btnClickCheck = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX >= this.btn.x && mouseX <= this.btn.x + this.btn.w &&
                mouseY >= this.btn.y && mouseY <= this.btn.y + this.btn.h) {
                this.btn.clicked = true;
                this.btn.clickEvent();
            }
        };
        canvas.addEventListener("click", this.btnClickCheck);

        // space 키 입력 감지하여 버튼 클릭 처리
        this.spaceKeyUpCheck = (e) => {
            if (e.key === ' ') {
                this.btn.clicked = true;
                this.btn.clickEvent();
            }
        };
        addEventListener('keyup', this.spaceKeyUpCheck);

        // 왼쪽 타이틀 이미지
        this.titleLeft = new UIImage("res/ui_title_left.png",
            canvas.width / 2 - 115, canvas.height / 2 - 40, 26, 7, 7);

        // 오른쪽 타이틀 이미지
        this.titleRight = new UIImage("res/ui_title_right.png",
            canvas.width / 2 + 115, canvas.height / 2 - 40, 26, 7, 7);

        // 타이틀 우주선 이미지
        this.titleShip = new UIImage("res/ui_title_ship_body.png",
            canvas.width / 2, canvas.height / 2 - 40, 32, 32, 1.5);

        // 타이틀 우주선 부스터 이미지
        this.titleShipBoost = new UIImage("res/ui_title_ship_boost.png",
            canvas.width / 2, canvas.height / 2 - 40, 32, 32, 1.5);

        // 백그라운드 별 이미지 생성
        this.bgStarList = [];
        for (let i=0; i<15; i++) {
            this.bgStarList[i] = new BgStar(0, this.canvas.width, 0, this.canvas.height);
        }
    }

    updateAndDraw(dt) {
        if (this.status === MAIN_SCENE_STATUS_END) {
            return;
        }

        // 백그라운드 별 이미지 업데이트 및 그리기
        this.ctx.save();
        for (let i=0; i<this.bgStarList.length; i++) {
            const bgStar = this.bgStarList[i];
            if (this.status === MAIN_SCENE_STATUS_READY ||
                this.status === MAIN_SCENE_STATUS_FADE_OUT ||
                this.status === MAIN_SCENE_STATUS_CANCEL_WAIT) {
                bgStar.y += 300 * dt;
            }
            bgStar.update(dt);
            bgStar.drawAbs(this.ctx);
            if (bgStar.isDead ||
                bgStar.x > this.canvas.width || bgStar.x < 0 || bgStar.y > this.canvas.height || bgStar.y < 0) {
                this.bgStarList[i] = new BgStar(0, this.canvas.width, 0, this.canvas.height);
            }
        }
        this.ctx.restore();

        // 타이틀 우주선 이미지 업데이트 및 그리기
        this.titleShip.draw(this.ctx);
        if (this.status === MAIN_SCENE_STATUS_READY ||
            this.status === MAIN_SCENE_STATUS_FADE_OUT ||
            this.status === MAIN_SCENE_STATUS_CANCEL_WAIT) {
            this.titleShipBoost.draw(this.ctx);
        }

        // 타이틀 및 버튼 그리기
        this.ctx.save();
        // fade out 상태의 경우, y축 이동 효과 적용
        if (this.status === MAIN_SCENE_STATUS_FADE_OUT) {
            this.ctx.translate(0, this.yOffset);
            this.yOffset += 200 * dt;
        }
        this.titleLeft.draw(this.ctx);
        this.titleRight.draw(this.ctx);
        this.btn.draw(this.ctx);
        this.ctx.restore();

        // fade in/out 효과 적용
        if (this.status === MAIN_SCENE_STATUS_FADE_OUT) {
            this.fadeOut(dt);
        } else if (this.status === MAIN_SCENE_STATUS_FADE_IN) {
            this.fadeIn(dt);
        }
    }

    processMsg(msg) {
        if (msg.type === 'ready') {
            // ready 상태로 변경
            this.status = MAIN_SCENE_STATUS_READY;
            this.moving = true;
            this.btn.clicked = false;
            // cancel 버튼 활성화
            this.btn = this.cancelBtn;
        } else if (msg.type === 'cancel') {
            // none 상태로 변경
            this.status = MAIN_SCENE_STATUS_NONE;
            this.moving = false;
            this.btn.clicked = false;
            // start 버튼 활성화
            this.btn = this.startBtn;
        }
    }

    setFadeOut() {
        this.status = MAIN_SCENE_STATUS_FADE_OUT;
        canvas.removeEventListener("mousemove", this.btnMouseHoverCheck);
        canvas.removeEventListener("click", this.btnClickCheck);
        removeEventListener("keyup", this.spaceKeyUpCheck);
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

    fadeOut(dt) {
        this.opacity -= 0.5 * dt;
        this.opacity = this.opacity < 0 ? 0 : this.opacity;
        if (this.opacity === 0) {
            this.status = GAME_SCENE_STATUS_END;
        }
        this.ctx.globalCompositeOperation = "destination-in"; 
        this.ctx.fillStyle = "rgba(0,0,0," + this.opacity + ")";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }
};