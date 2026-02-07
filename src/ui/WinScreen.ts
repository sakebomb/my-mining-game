/**
 * Victory screen overlay with confetti animation.
 * Shown when the player buys the Victory Scepter.
 */
export class WinScreen {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private confetti: Particle[] = [];
  private animFrame: number | null = null;

  /** Called when player clicks "Play Again" (reset + reload) */
  onReset: (() => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 500;
      display: none; flex-direction: column;
      justify-content: center; align-items: center;
      background: rgba(0, 0, 0, 0.7);
    `;

    // Confetti canvas (behind text)
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
    this.overlay.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    // Victory text
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative; z-index: 1; text-align: center;
      font-family: sans-serif; color: white;
    `;
    content.innerHTML = `
      <h1 style="font-size: 64px; color: #ffdd44; text-shadow: 0 0 30px #ffdd44, 0 0 60px #ff8800; margin: 0;">
        YOU WIN!
      </h1>
      <p style="font-size: 24px; margin-top: 16px; color: #aaddff;">
        Congratulations! You dug deep and found victory!
      </p>
      <button id="win-play-again" style="
        margin-top: 32px; padding: 12px 32px; font-size: 20px;
        background: #446644; color: white; border: 2px solid #88cc88;
        border-radius: 8px; cursor: pointer; font-family: monospace;
      ">Play Again</button>
    `;
    this.overlay.appendChild(content);
    document.body.appendChild(this.overlay);

    // Wire up reset button
    document.getElementById('win-play-again')?.addEventListener('click', () => {
      this.onReset?.();
    });
  }

  /** Show the win screen with confetti */
  show(): void {
    this.overlay.style.display = 'flex';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Spawn confetti particles
    this.confetti = [];
    for (let i = 0; i < 200; i++) {
      this.confetti.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * -this.canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    this.animate();
  }

  private animate = (): void => {
    this.animFrame = requestAnimationFrame(this.animate);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.confetti) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.vy += 0.05; // gravity

      // Wrap horizontally
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;

      // Reset when off bottom
      if (p.y > this.canvas.height + 10) {
        p.y = -10;
        p.x = Math.random() * this.canvas.width;
        p.vy = Math.random() * 3 + 2;
      }

      // Draw confetti piece
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      this.ctx.restore();
    }
  };

  hide(): void {
    this.overlay.style.display = 'none';
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  dispose(): void {
    this.hide();
    this.overlay.remove();
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

const CONFETTI_COLORS = [
  '#ff0000', '#ff8800', '#ffff00', '#00ff00',
  '#0088ff', '#4400ff', '#8800ff', '#ffffff',
  '#ff44aa', '#44ffaa', '#ffdd44', '#44ddff',
];
