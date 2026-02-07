import nipplejs from 'nipplejs';

/**
 * Touch controls for mobile/tablet:
 * - Left-side virtual joystick (movement)
 * - Right-side swipe area (camera look)
 * - Tap-hold on right side → mine/attack
 * - Jump button
 */
export class TouchControls {
  /** Movement vector from joystick (-1 to 1 per axis) */
  moveX = 0;
  moveZ = 0;

  /** Camera rotation delta per frame (radians) */
  lookDeltaX = 0;
  lookDeltaY = 0;

  /** Whether the player is "holding" to mine (tap-hold on right side) */
  isMining = false;

  /** Whether jump was pressed this frame */
  jumpPressed = false;

  private container: HTMLDivElement;
  private joystickManager: nipplejs.JoystickManager | null = null;
  private jumpBtn: HTMLButtonElement;
  private lookArea: HTMLDivElement;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lookTouchId: number | null = null;
  private mineTimer: ReturnType<typeof setTimeout> | null = null;
  private _enabled = false;

  constructor() {
    // Container for all touch controls
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 50;
      pointer-events: none; display: none;
    `;
    document.body.appendChild(this.container);

    // Jump button (bottom-right)
    this.jumpBtn = document.createElement('button');
    this.jumpBtn.textContent = 'JUMP';
    this.jumpBtn.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 60;
      width: 70px; height: 70px; border-radius: 50%;
      background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4);
      color: white; font-family: monospace; font-size: 12px; font-weight: bold;
      pointer-events: auto; touch-action: none;
      display: none;
    `;
    document.body.appendChild(this.jumpBtn);

    // Right-side look/mine area (occupies right half of screen)
    this.lookArea = document.createElement('div');
    this.lookArea.style.cssText = `
      position: fixed; top: 0; right: 0; width: 50%; height: 100%;
      z-index: 51; pointer-events: auto; touch-action: none;
      display: none;
    `;
    document.body.appendChild(this.lookArea);

    this.setupJumpButton();
    this.setupLookArea();
  }

  /** Enable touch controls (call on touch devices) */
  enable(): void {
    if (this._enabled) return;
    this._enabled = true;

    this.container.style.display = 'block';
    this.jumpBtn.style.display = 'block';
    this.lookArea.style.display = 'block';

    this.setupJoystick();
  }

  /** Disable touch controls */
  disable(): void {
    if (!this._enabled) return;
    this._enabled = false;

    this.container.style.display = 'none';
    this.jumpBtn.style.display = 'none';
    this.lookArea.style.display = 'none';

    if (this.joystickManager) {
      this.joystickManager.destroy();
      this.joystickManager = null;
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Call each frame to consume look deltas */
  consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  /** Check and consume jump press */
  consumeJump(): boolean {
    if (this.jumpPressed) {
      this.jumpPressed = false;
      return true;
    }
    return false;
  }

  private setupJoystick(): void {
    // Create joystick zone (left half of screen, lower portion)
    const zone = document.createElement('div');
    zone.style.cssText = `
      position: fixed; bottom: 0; left: 0; width: 50%; height: 50%;
      z-index: 52; pointer-events: auto; touch-action: none;
    `;
    this.container.appendChild(zone);

    this.joystickManager = nipplejs.create({
      zone,
      mode: 'dynamic',
      position: { left: '25%', bottom: '25%' },
      color: 'rgba(255, 255, 255, 0.3)',
      size: 100,
      threshold: 0.1,
      fadeTime: 200,
    });

    this.joystickManager.on('move', (_e, data) => {
      if (data.vector) {
        // nipplejs uses X/Y where Y is up; we map to moveX/moveZ
        this.moveX = data.vector.x;
        this.moveZ = -data.vector.y; // negative because forward is -Z
      }
    });

    this.joystickManager.on('end', () => {
      this.moveX = 0;
      this.moveZ = 0;
    });
  }

  private setupJumpButton(): void {
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpPressed = true;
    }, { passive: false });
  }

  private setupLookArea(): void {
    this.lookArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.lookTouchId !== null) return; // already tracking a touch

      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;

      // Start mine timer (tap-hold = mine)
      this.mineTimer = setTimeout(() => {
        this.isMining = true;
      }, 200); // 200ms hold = mining
    }, { passive: false });

    this.lookArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.lookTouchId) {
          const dx = touch.clientX - this.lastTouchX;
          const dy = touch.clientY - this.lastTouchY;
          this.lookDeltaX += dx * 0.004; // sensitivity
          this.lookDeltaY += dy * 0.004;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;

          // If significant movement, cancel mine timer (this is a swipe, not a hold)
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            if (this.mineTimer) {
              clearTimeout(this.mineTimer);
              this.mineTimer = null;
            }
          }
        }
      }
    }, { passive: false });

    const endTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.lookTouchId) {
          this.lookTouchId = null;
          this.isMining = false;
          if (this.mineTimer) {
            clearTimeout(this.mineTimer);
            this.mineTimer = null;
          }
        }
      }
    };

    this.lookArea.addEventListener('touchend', endTouch);
    this.lookArea.addEventListener('touchcancel', endTouch);
  }

  dispose(): void {
    this.disable();
    this.container.remove();
    this.jumpBtn.remove();
    this.lookArea.remove();
  }
}
