import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService, PRESET_THEMES, AppTheme, ThemeColors } from '../../core/services/theme.service';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-admin-themes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-themes.component.html',
  styleUrls: ['./admin-themes.component.scss']
})
export class AdminThemesComponent implements OnDestroy {
  themeService = inject(ThemeService);
  snackbar = inject(SnackbarService);

  presetThemes = PRESET_THEMES;
  activeThemeId = this.themeService.activeThemeId;
  isSaving = this.themeService.isSaving;

  showCustomBuilder = signal(false);
  isPreviewingCustom = signal(false);

  customName = 'My Custom Theme';
  customEmoji = '🎨';

  customColors = signal<ThemeColors>({
    primary: '#6B1E3C',
    primaryLight: '#8E2850',
    primaryDark: '#4A1229',
    primaryRgb: '107, 30, 60',
    secondary: '#C9A84C',
    secondaryLight: '#DFC270',
    secondaryDark: '#A8882D',
    accent: '#FDF5F0',
    accentLight: '#FFF9F6',
    background: '#FBF8F5',
    surface: '#ffffff',
    textMain: '#1C0F14',
    textSecondary: '#4A2535',
    textMuted: '#9C8490'
  });

  private prePreviewThemeId = '';
  private prePreviewCustomTheme: AppTheme | null = null;

  openCustomBuilder() {
    const active = this.themeService.getActiveTheme();
    this.customColors.set({ ...active.colors });
    this.customName = 'My Custom Theme';
    this.customEmoji = '🎨';
    this.showCustomBuilder.set(true);
    this.isPreviewingCustom.set(false);
  }

  closeCustomBuilder() {
    if (this.isPreviewingCustom()) {
      this.themeService.previewTheme(this.prePreviewThemeId, this.prePreviewCustomTheme || undefined);
      this.isPreviewingCustom.set(false);
    }
    this.showCustomBuilder.set(false);
  }

  onPrimaryColorChange(hex: string) {
    const shades = this.themeService.deriveShades(hex);
    const rgb = this.themeService.hexToRgb(hex);
    const bg = this.themeService.deriveBackground(hex);
    const textMain = this.themeService.deriveTextMain(hex);
    this.customColors.update(c => ({
      ...c, primary: hex,
      primaryLight: shades.light, primaryDark: shades.dark, primaryRgb: rgb,
      background: bg, textMain: textMain, textSecondary: shades.dark, textMuted: shades.light
    }));
    if (this.isPreviewingCustom()) this.livePreviewCustom();
  }

  onSecondaryColorChange(hex: string) {
    const shades = this.themeService.deriveShades(hex);
    this.customColors.update(c => ({ ...c, secondary: hex, secondaryLight: shades.light, secondaryDark: shades.dark }));
    if (this.isPreviewingCustom()) this.livePreviewCustom();
  }

  onAccentColorChange(hex: string) {
    const shades = this.themeService.deriveShades(hex);
    this.customColors.update(c => ({ ...c, accent: hex, accentLight: shades.light }));
    if (this.isPreviewingCustom()) this.livePreviewCustom();
  }

  onSurfaceColorChange(hex: string) {
    this.customColors.update(c => ({ ...c, surface: hex }));
    if (this.isPreviewingCustom()) this.livePreviewCustom();
  }

  livePreviewCustom() {
    if (!this.isPreviewingCustom()) {
      this.prePreviewThemeId = this.activeThemeId();
      this.prePreviewCustomTheme = this.themeService.customTheme();
      this.isPreviewingCustom.set(true);
    }
    this.themeService.previewTheme('custom', this.buildCustomTheme());
  }

  private buildCustomTheme(): AppTheme {
    return {
      id: 'custom', name: this.customName,
      description: 'Custom theme created by admin',
      emoji: this.customEmoji, isPreset: false,
      colors: { ...this.customColors() },
      createdAt: new Date().toISOString()
    };
  }

  async saveCustomTheme() {
    await this.themeService.saveTheme('custom', this.buildCustomTheme());
    this.isPreviewingCustom.set(false);
    this.showCustomBuilder.set(false);
  }

  async applyPreset(themeId: string) {
    this.themeService.previewTheme(themeId);
    await this.themeService.saveTheme(themeId);
  }

  indexLabel(i: number): string {
    return (i + 1).toString().padStart(2, '0');
  }

  ngOnDestroy() {
    if (this.isPreviewingCustom()) {
      this.themeService.previewTheme(this.activeThemeId(), this.themeService.customTheme() || undefined);
    }
  }
}
