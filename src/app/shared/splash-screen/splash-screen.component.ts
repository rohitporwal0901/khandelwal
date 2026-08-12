import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-root">
      <!-- Left door -->
      <div class="door door-left" [class.open]="doorsOpen()">
        <div class="door-inner">
          <div class="door-edge"></div>
        </div>
      </div>

      <!-- Right door -->
      <div class="door door-right" [class.open]="doorsOpen()">
        <div class="door-inner">
          <div class="door-edge"></div>
        </div>
      </div>

      <!-- Logo — sits above doors, fades out when doors open -->
      <div class="logo-center" [class.fade]="doorsOpen()">
        <div class="logo-wrap">
          <img src="assets/kc-logo.png" alt="Khandelwal Cards" class="splash-logo">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .splash-root {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
    }

    /* ── Doors ─────────────────────────── */
    .door {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 50%;
      background: linear-gradient(160deg, #4A1229 0%, #6B1E3C 60%, #3A0D20 100%);
      transition: transform 0.85s cubic-bezier(0.76, 0, 0.24, 1);
      will-change: transform;
    }

    .door-left  { left: 0; }
    .door-right { right: 0; }

    /* Gold seam line on door edges */
    .door-inner {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .door-left .door-edge {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, #C9A84C 30%, #DFC270 50%, #C9A84C 70%, transparent);
    }

    .door-right .door-edge {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, #C9A84C 30%, #DFC270 50%, #C9A84C 70%, transparent);
    }

    /* Subtle grain/texture overlay on doors */
    .door::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%);
    }

    /* Open state — slide out */
    .door-left.open  { transform: translateX(-100%); }
    .door-right.open { transform: translateX(100%); }

    /* ── Logo ──────────────────────────── */
    .logo-center {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.4s ease 0.3s;
    }

    .logo-center.fade {
      opacity: 0;
    }

    .logo-wrap {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid transparent;
      background:
        linear-gradient(white, white) padding-box,
        linear-gradient(135deg, #C9A84C, #DFC270, #A8882D, #C9A84C) border-box;
      box-shadow:
        0 0 40px rgba(201,168,76,0.45),
        0 8px 32px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      animation: logoPulse 1.5s ease-in-out infinite alternate;
    }

    @keyframes logoPulse {
      from { box-shadow: 0 0 24px rgba(201,168,76,0.35), 0 8px 32px rgba(0,0,0,0.5); }
      to   { box-shadow: 0 0 52px rgba(201,168,76,0.65), 0 8px 32px rgba(0,0,0,0.5); }
    }

    .splash-logo {
      width: 90px;
      height: 90px;
      object-fit: cover;
      border-radius: 50%;
    }
  `]
})
export class SplashScreenComponent implements OnInit {
  doorsOpen = signal(false);

  ngOnInit(): void {
    // Hold for 1s, then open doors
    setTimeout(() => this.doorsOpen.set(true), 1000);
  }
}
