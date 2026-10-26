// One ball: its centre (x, y) and radius r in the domain, and its velocity in units per second.
export type Ball = {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
};

// The radius of every ball, and its speed at Geschwindigkeit 1, in units of the domain.
const radius = 0.1;
const speed = 0.15;

// Balls at random positions in a domain of the given width and height 1, each moving in a
// random direction.
export function createBalls(count: number, width: number): Ball[] {
    const balls: Ball[] = [];
    for (let k = 0; k < count; k++) {
        const angle = 2 * Math.PI * Math.random();
        balls.push({
            x: radius + Math.random() * (width - 2 * radius),
            y: radius + Math.random() * (1 - 2 * radius),
            r: radius,
            vx: speed * Math.cos(angle),
            vy: speed * Math.sin(angle),
        });
    }
    return balls;
}

// Moves every ball for the given time. A ball that reaches an edge of the domain bounces back.
export function moveBalls(balls: Ball[], seconds: number, width: number): void {
    for (const ball of balls) {
        ball.x += ball.vx * seconds;
        ball.y += ball.vy * seconds;

        if (ball.x < ball.r) {
            ball.x = ball.r;
            ball.vx = Math.abs(ball.vx);
        }
        if (ball.x > width - ball.r) {
            ball.x = width - ball.r;
            ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y < ball.r) {
            ball.y = ball.r;
            ball.vy = Math.abs(ball.vy);
        }
        if (ball.y > 1 - ball.r) {
            ball.y = 1 - ball.r;
            ball.vy = -Math.abs(ball.vy);
        }
    }
}
