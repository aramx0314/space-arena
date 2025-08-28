class UIButton {
    constructor(img_src, x, y, w, h, scale, clickEvent) {
        this.img = new Image();
        this.img.src = img_src;
        this.w = w * scale;
        this.h = h * scale;
        this.x = x - (this.w / 2);
        this.y = y - (this.h / 2);
        this.hovering = false;
        this.clicked = false;
        this.clickEvent = clickEvent;
    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
        if (this.hovering || this.clicked) {
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.globalCompositeOperation = "source-over";
        }
    }
};

class UIImage {
    constructor(img_src, x, y, w, h, scale, alpha = 1.0) {
        this.img = new Image();
        this.img.src = img_src;
        this.w = w * scale;
        this.h = h * scale;
        this.x = x - (this.w / 2);
        this.y = y - (this.h / 2);
        this.alpha = alpha;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
        ctx.restore();
    }
};
