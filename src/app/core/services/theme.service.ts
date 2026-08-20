import { Injectable, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore, doc, getDoc, setDoc, onSnapshot } from '@angular/fire/firestore';
import { SnackbarService } from './snackbar.service';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryRgb: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  background: string;
  surface: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
}

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isPreset: boolean;
  colors: ThemeColors;
  createdAt?: string;
}

export const PRESET_THEMES: AppTheme[] = [
  {
    id: 'classic-maroon',
    name: 'Classic Maroon',
    description: 'Timeless Wine Burgundy & Champagne Gold',
    emoji: '🍷',
    isPreset: true,
    colors: {
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
    }
  },
  {
    id: 'royal-elegance',
    name: 'Royal Elegance',
    description: 'Deep Purple Royalty with Shimmering Gold',
    emoji: '👑',
    isPreset: true,
    colors: {
      primary: '#2C1654',
      primaryLight: '#3D2270',
      primaryDark: '#1A0D33',
      primaryRgb: '44, 22, 84',
      secondary: '#C9A84C',
      secondaryLight: '#DFC270',
      secondaryDark: '#A8882D',
      accent: '#F5F0FF',
      accentLight: '#FAF7FF',
      background: '#F8F5FF',
      surface: '#ffffff',
      textMain: '#120A1F',
      textSecondary: '#3D2270',
      textMuted: '#9485AD'
    }
  },
  {
    id: 'blush-romance',
    name: 'Blush Romance',
    description: 'Soft Rose & Delicate Pink for Weddings',
    emoji: '🌸',
    isPreset: true,
    colors: {
      primary: '#8B2252',
      primaryLight: '#A83368',
      primaryDark: '#621638',
      primaryRgb: '139, 34, 82',
      secondary: '#E8A0BF',
      secondaryLight: '#F2C0D5',
      secondaryDark: '#C47898',
      accent: '#FFF0F5',
      accentLight: '#FFF7FA',
      background: '#FFF5F8',
      surface: '#ffffff',
      textMain: '#1F0814',
      textSecondary: '#5A1835',
      textMuted: '#B07090'
    }
  },
  {
    id: 'emerald-luxury',
    name: 'Emerald Luxury',
    description: 'Forest Green Elegance with Golden Sage',
    emoji: '💎',
    isPreset: true,
    colors: {
      primary: '#1B4332',
      primaryLight: '#2D6A4F',
      primaryDark: '#0D2218',
      primaryRgb: '27, 67, 50',
      secondary: '#A3B18A',
      secondaryLight: '#BFC9AA',
      secondaryDark: '#7A8E64',
      accent: '#F0F7F0',
      accentLight: '#F7FAF7',
      background: '#F0F7F2',
      surface: '#ffffff',
      textMain: '#0A1F14',
      textSecondary: '#1B4332',
      textMuted: '#7A9080'
    }
  },
  {
    id: 'modern-mint',
    name: 'Modern Mint',
    description: 'Fresh Teal & Minty Cool Palette',
    emoji: '🌿',
    isPreset: true,
    colors: {
      primary: '#2D6A4F',
      primaryLight: '#40916C',
      primaryDark: '#1B4332',
      primaryRgb: '45, 106, 79',
      secondary: '#95D5B2',
      secondaryLight: '#B7E4C7',
      secondaryDark: '#74C69D',
      accent: '#F0FFF4',
      accentLight: '#F7FFF9',
      background: '#F0FFF5',
      surface: '#ffffff',
      textMain: '#0A1F14',
      textSecondary: '#2D6A4F',
      textMuted: '#74A080'
    }
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    description: 'Sophisticated Dark Navy with Warm Gold',
    emoji: '🌙',
    isPreset: true,
    colors: {
      primary: '#1A1A2E',
      primaryLight: '#2E2E4E',
      primaryDark: '#0D0D1A',
      primaryRgb: '26, 26, 46',
      secondary: '#E2C97E',
      secondaryLight: '#EDD99A',
      secondaryDark: '#C8A84E',
      accent: '#F5F5FA',
      accentLight: '#FAFAFF',
      background: '#F0F0FA',
      surface: '#ffffff',
      textMain: '#0A0A1A',
      textSecondary: '#2E2E4E',
      textMuted: '#808098'
    }
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Ethereal Purple Haze & Soft Lavender',
    emoji: '💜',
    isPreset: true,
    colors: {
      primary: '#5C4B8A',
      primaryLight: '#7560A8',
      primaryDark: '#3D3260',
      primaryRgb: '92, 75, 138',
      secondary: '#C9B8E8',
      secondaryLight: '#DDD0F2',
      secondaryDark: '#A896CC',
      accent: '#F5F0FF',
      accentLight: '#FAF7FF',
      background: '#F5F0FF',
      surface: '#ffffff',
      textMain: '#1A1028',
      textSecondary: '#5C4B8A',
      textMuted: '#9080B8'
    }
  },
  {
    id: 'peach-delight',
    name: 'Peach Delight',
    description: 'Warm Terracotta & Peachy Coral Vibes',
    emoji: '🍑',
    isPreset: true,
    colors: {
      primary: '#C4622D',
      primaryLight: '#D97840',
      primaryDark: '#9A4B22',
      primaryRgb: '196, 98, 45',
      secondary: '#F4A261',
      secondaryLight: '#F7BB85',
      secondaryDark: '#D88040',
      accent: '#FFF8F5',
      accentLight: '#FFFBF8',
      background: '#FFF5F0',
      surface: '#ffffff',
      textMain: '#1F100A',
      textSecondary: '#7A3020',
      textMuted: '#B07060'
    }
  },
  {
    id: 'sage-serenity',
    name: 'Sage Serenity',
    description: 'Calming Sage Green & Natural Tones',
    emoji: '🌾',
    isPreset: true,
    colors: {
      primary: '#4A7C59',
      primaryLight: '#6A9C78',
      primaryDark: '#2F5038',
      primaryRgb: '74, 124, 89',
      secondary: '#B7D5C4',
      secondaryLight: '#CEE5D7',
      secondaryDark: '#92B8A5',
      accent: '#F5FBF7',
      accentLight: '#FAFDF8',
      background: '#F0F8F3',
      surface: '#ffffff',
      textMain: '#0F1E14',
      textSecondary: '#2F5038',
      textMuted: '#7A9880'
    }
  },
  {
    id: 'navy-copper',
    name: 'Navy & Copper',
    description: 'Bold Navy Blue with Rich Copper Accents',
    emoji: '⚓',
    isPreset: true,
    colors: {
      primary: '#1B2A4A',
      primaryLight: '#2C3F6A',
      primaryDark: '#0E1628',
      primaryRgb: '27, 42, 74',
      secondary: '#B87333',
      secondaryLight: '#D08B4A',
      secondaryDark: '#8C5520',
      accent: '#F5F7FA',
      accentLight: '#FAFBFD',
      background: '#F0F3F8',
      surface: '#ffffff',
      textMain: '#0A1020',
      textSecondary: '#1B2A4A',
      textMuted: '#707890'
    }
  },
  // ── 10 PROFESSIONALLY CURATED PALETTES ──────────────────
  // Each has: rich dark primary (sidebar/header) + vibrant secondary (badges/accents)
  // + warm light background (content area) + readable text

  {
    // ── Deep Navy + Electric Gold (Premium Corporate)
    id: 'midnight-navy',
    name: 'Midnight Navy',
    description: 'Refined Deep Navy with Electric Gold',
    emoji: '🌃',
    isPreset: true,
    colors: {
      primary: '#0F2044',
      primaryLight: '#1A3366',
      primaryDark: '#060F22',
      primaryRgb: '15, 32, 68',
      secondary: '#F5C518',
      secondaryLight: '#FFD84D',
      secondaryDark: '#C9A010',
      accent: '#F0F4FF',
      accentLight: '#F8FAFE',
      background: '#F4F6FC',
      surface: '#ffffff',
      textMain: '#0A1020',
      textSecondary: '#0F2044',
      textMuted: '#5C6E8A'
    }
  },
  {
    // ── Imperial Purple + Warm Gold (Luxury Brand)
    id: 'imperial-purple',
    name: 'Imperial Purple',
    description: 'Majestic Deep Purple with Warm Gold',
    emoji: '👑',
    isPreset: true,
    colors: {
      primary: '#3B0764',
      primaryLight: '#5B1890',
      primaryDark: '#210340',
      primaryRgb: '59, 7, 100',
      secondary: '#F59E0B',
      secondaryLight: '#FBBF40',
      secondaryDark: '#D47E08',
      accent: '#F8F0FF',
      accentLight: '#FCF7FF',
      background: '#F5EEFF',
      surface: '#ffffff',
      textMain: '#160228',
      textSecondary: '#3B0764',
      textMuted: '#8A60AA'
    }
  },
  {
    // ── Deep Forest + Champagne (Sophisticated Luxury)
    id: 'forest-prestige',
    name: 'Forest Prestige',
    description: 'Deep Forest Green with Champagne Gold',
    emoji: '🌿',
    isPreset: true,
    colors: {
      primary: '#1A3C34',
      primaryLight: '#2A5C50',
      primaryDark: '#0C2220',
      primaryRgb: '26, 60, 52',
      secondary: '#C8A96A',
      secondaryLight: '#DEC48E',
      secondaryDark: '#A8884A',
      accent: '#F0F8F5',
      accentLight: '#F7FCFA',
      background: '#EDF7F3',
      surface: '#ffffff',
      textMain: '#081510',
      textSecondary: '#1A3C34',
      textMuted: '#5A8070'
    }
  },
  {
    // ── Deep Teal + Vivid Amber (Bold Professional)
    id: 'teal-amber',
    name: 'Teal & Amber',
    description: 'Bold Deep Teal with Vivid Amber Pop',
    emoji: '🌊',
    isPreset: true,
    colors: {
      primary: '#003B4A',
      primaryLight: '#005E78',
      primaryDark: '#001E26',
      primaryRgb: '0, 59, 74',
      secondary: '#E97B04',
      secondaryLight: '#FF9A28',
      secondaryDark: '#C06000',
      accent: '#F0FBFE',
      accentLight: '#F7FDFF',
      background: '#EAFAFE',
      surface: '#ffffff',
      textMain: '#001018',
      textSecondary: '#003B4A',
      textMuted: '#408898'
    }
  },
  {
    // ── Dark Slate + Coral (Modern & Fresh)
    id: 'slate-coral',
    name: 'Slate & Coral',
    description: 'Sophisticated Slate with Vibrant Coral',
    emoji: '🪸',
    isPreset: true,
    colors: {
      primary: '#1E2E45',
      primaryLight: '#2E4460',
      primaryDark: '#0F1825',
      primaryRgb: '30, 46, 69',
      secondary: '#FF5252',
      secondaryLight: '#FF7575',
      secondaryDark: '#D43030',
      accent: '#F5F8FF',
      accentLight: '#FAFCFF',
      background: '#F2F6FB',
      surface: '#ffffff',
      textMain: '#0A1220',
      textSecondary: '#1E2E45',
      textMuted: '#607090'
    }
  },
  {
    // ── Onyx + Rose Gold (Apple-Inspired Premium)
    id: 'onyx-rose',
    name: 'Onyx & Rose',
    description: 'Jet Black with Rose Gold Shimmer',
    emoji: '🖤',
    isPreset: true,
    colors: {
      primary: '#1C1C1E',
      primaryLight: '#2C2C2E',
      primaryDark: '#000000',
      primaryRgb: '28, 28, 30',
      secondary: '#C8956C',
      secondaryLight: '#E0B090',
      secondaryDark: '#A87048',
      accent: '#F8F8FA',
      accentLight: '#FAFAFA',
      background: '#F4F4F6',
      surface: '#ffffff',
      textMain: '#1C1C1E',
      textSecondary: '#3C3C3E',
      textMuted: '#808088'
    }
  },
  {
    // ── Royal Cobalt + Bright Gold (Prestige Corporate)
    id: 'cobalt-prestige',
    name: 'Cobalt Prestige',
    description: 'Royal Cobalt Blue with Bright Gold',
    emoji: '💎',
    isPreset: true,
    colors: {
      primary: '#003087',
      primaryLight: '#0048BB',
      primaryDark: '#001855',
      primaryRgb: '0, 48, 135',
      secondary: '#FFB800',
      secondaryLight: '#FFD04D',
      secondaryDark: '#CC9200',
      accent: '#F0F5FF',
      accentLight: '#F7FAFF',
      background: '#EEF4FF',
      surface: '#ffffff',
      textMain: '#000D28',
      textSecondary: '#003087',
      textMuted: '#4D72B0'
    }
  },
  {
    // ── Deep Crimson + Platinum (Bold Luxury)
    id: 'crimson-prestige',
    name: 'Crimson Prestige',
    description: 'Deep Crimson Red with Platinum Silver',
    emoji: '♟️',
    isPreset: true,
    colors: {
      primary: '#7C0A02',
      primaryLight: '#A01408',
      primaryDark: '#500601',
      primaryRgb: '124, 10, 2',
      secondary: '#9E9E9E',
      secondaryLight: '#BDBDBD',
      secondaryDark: '#757575',
      accent: '#FFF5F5',
      accentLight: '#FFFAFA',
      background: '#FFF8F8',
      surface: '#ffffff',
      textMain: '#1A0400',
      textSecondary: '#500601',
      textMuted: '#A06060'
    }
  },
  {
    // ── Deep Jade + Bright Coral (Bold & Vibrant)
    id: 'jade-coral',
    name: 'Jade & Coral',
    description: 'Deep Jade Green with Bright Coral Pop',
    emoji: '💠',
    isPreset: true,
    colors: {
      primary: '#004225',
      primaryLight: '#006B40',
      primaryDark: '#001F10',
      primaryRgb: '0, 66, 37',
      secondary: '#FF6B6B',
      secondaryLight: '#FF9090',
      secondaryDark: '#CC4444',
      accent: '#F0FBF5',
      accentLight: '#F7FDFB',
      background: '#EAFAF3',
      surface: '#ffffff',
      textMain: '#000F08',
      textSecondary: '#004225',
      textMuted: '#407858'
    }
  },
  {
    // ── Aubergine + Electric Teal (Bold & Modern)
    id: 'aubergine-teal',
    name: 'Aubergine & Teal',
    description: 'Deep Aubergine with Electric Teal',
    emoji: '🍇',
    isPreset: true,
    colors: {
      primary: '#3D1A55',
      primaryLight: '#5C2878',
      primaryDark: '#220D32',
      primaryRgb: '61, 26, 85',
      secondary: '#00BFA5',
      secondaryLight: '#33D4BC',
      secondaryDark: '#009980',
      accent: '#F8F2FF',
      accentLight: '#FCF8FF',
      background: '#F4EDFF',
      surface: '#ffffff',
      textMain: '#140820',
      textSecondary: '#3D1A55',
      textMuted: '#8858AA'
    }
  }
];

export interface ThemeDocument {
  activeThemeId: string;
  customTheme?: AppTheme;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private firestore = inject(Firestore);
  private snackbar = inject(SnackbarService);

  activeThemeId = signal<string>('classic-maroon');
  customTheme = signal<AppTheme | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  private readonly THEME_DOC = 'settings-kh/theme';
  private readonly DEFAULT_THEME_ID = 'classic-maroon';
  private readonly CACHE_KEY = 'kh_active_theme_cache';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // ⚡ Apply cached theme IMMEDIATELY — before Firestore responds
    // This prevents the "maroon flash" on splash screen
    this.applyFromCache();
    this.loadThemeFromFirestore();
  }

  /** Apply theme from localStorage cache for instant load */
  private applyFromCache() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const { themeId, colors, customTheme } = JSON.parse(cached);
        if (themeId) {
          this.activeThemeId.set(themeId);
          if (customTheme) this.customTheme.set(customTheme);
          if (colors) this.applyColorsToDOM(colors);
        }
      }
    } catch { /* ignore parse errors */ }
  }

  /** Save theme to localStorage for next-load instant apply */
  private saveToCache(themeId: string, colors: ThemeColors, customTheme?: AppTheme) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({ themeId, colors, customTheme }));
    } catch { /* ignore storage errors */ }
  }

  private loadThemeFromFirestore() {
    const themeRef = doc(this.firestore, this.THEME_DOC);
    onSnapshot(themeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ThemeDocument;
        const themeId = data.activeThemeId || this.DEFAULT_THEME_ID;
        this.activeThemeId.set(themeId);
        if (data.customTheme) this.customTheme.set(data.customTheme);
        this.applyTheme(themeId, data.customTheme);
        // Cache for next-load instant apply
        const theme = themeId === 'custom' && data.customTheme
          ? data.customTheme
          : PRESET_THEMES.find(t => t.id === themeId) || PRESET_THEMES[0];
        this.saveToCache(themeId, theme.colors, data.customTheme);
      } else {
        this.applyTheme(this.DEFAULT_THEME_ID);
      }
    });
  }

  getActiveTheme(): AppTheme {
    const id = this.activeThemeId();
    if (id === 'custom') {
      return this.customTheme() || PRESET_THEMES[0];
    }
    return PRESET_THEMES.find(t => t.id === id) || PRESET_THEMES[0];
  }

  applyTheme(themeId: string, customTheme?: AppTheme) {
    if (!isPlatformBrowser(this.platformId)) return;

    let theme: AppTheme;
    if (themeId === 'custom' && customTheme) {
      theme = customTheme;
    } else {
      theme = PRESET_THEMES.find(t => t.id === themeId) || PRESET_THEMES[0];
    }

    this.applyColorsToDOM(theme.colors);
  }

  private applyColorsToDOM(colors: ThemeColors) {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = document.documentElement;

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-light', colors.primaryLight);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--primary-rgb', colors.primaryRgb);

    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-light', colors.secondaryLight);
    root.style.setProperty('--secondary-dark', colors.secondaryDark);

    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-light', colors.accentLight);

    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--surface-elevated', colors.surface);
    root.style.setProperty('--surface-muted', colors.accentLight);

    root.style.setProperty('--text-main', colors.textMain);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-muted', colors.textMuted);

    // Recompute shadows with new primary rgb
    root.style.setProperty('--shadow-xs', `0 1px 3px rgba(${colors.primaryRgb},0.06), 0 1px 2px rgba(0,0,0,0.03)`);
    root.style.setProperty('--shadow-sm', `0 2px 8px rgba(${colors.primaryRgb},0.08), 0 1px 3px rgba(0,0,0,0.04)`);
    root.style.setProperty('--shadow-md', `0 4px 16px rgba(${colors.primaryRgb},0.10), 0 2px 6px rgba(0,0,0,0.04)`);
    root.style.setProperty('--shadow-lg', `0 12px 32px rgba(${colors.primaryRgb},0.14), 0 4px 12px rgba(0,0,0,0.06)`);
    root.style.setProperty('--shadow-primary', `0 8px 24px rgba(${colors.primaryRgb},0.30)`);
    root.style.setProperty('--shadow-card', `0 2px 12px rgba(${colors.primaryRgb},0.08)`);
  }

  previewTheme(themeId: string, customTheme?: AppTheme) {
    this.applyTheme(themeId, customTheme);
  }

  async saveTheme(themeId: string, customTheme?: AppTheme): Promise<void> {
    this.isSaving.set(true);
    try {
      const themeRef = doc(this.firestore, this.THEME_DOC);
      const payload: ThemeDocument = {
        activeThemeId: themeId,
        updatedAt: new Date().toISOString()
      };
      if (customTheme && themeId === 'custom') {
        payload.customTheme = customTheme;
      }
      await setDoc(themeRef, payload, { merge: true });
      this.snackbar.show('✨ Theme applied successfully!', 'success');
    } catch (err) {
      console.error('Failed to save theme:', err);
      this.snackbar.show('Failed to save theme. Please try again.', 'error');
      throw err;
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Utility: Hex → RGB string for CSS vars */
  hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  /** Auto-derive lighter/darker shades from a base hex */
  deriveShades(hex: string): { light: string; dark: string } {
    const clean = hex.replace('#', '');
    let r = parseInt(clean.substring(0, 2), 16);
    let g = parseInt(clean.substring(2, 4), 16);
    let b = parseInt(clean.substring(4, 6), 16);

    // Light: blend toward white by 20%
    const lr = Math.min(255, Math.round(r + (255 - r) * 0.2));
    const lg = Math.min(255, Math.round(g + (255 - g) * 0.2));
    const lb = Math.min(255, Math.round(b + (255 - b) * 0.2));

    // Dark: blend toward black by 25%
    const dr = Math.max(0, Math.round(r * 0.75));
    const dg = Math.max(0, Math.round(g * 0.75));
    const db = Math.max(0, Math.round(b * 0.75));

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return {
      light: `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`,
      dark: `#${toHex(dr)}${toHex(dg)}${toHex(db)}`
    };
  }

  /** Derive background color (very light version of primary, mixed with white) */
  deriveBackground(primaryHex: string): string {
    const clean = primaryHex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);

    const br = Math.min(255, Math.round(r + (255 - r) * 0.94));
    const bg = Math.min(255, Math.round(g + (255 - g) * 0.94));
    const bb = Math.min(255, Math.round(b + (255 - b) * 0.94));

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(br)}${toHex(bg)}${toHex(bb)}`;
  }

  /** Derive text colors from primary */
  deriveTextMain(primaryHex: string): string {
    const clean = primaryHex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);

    // Very dark version of primary for text
    const tr = Math.max(0, Math.round(r * 0.25));
    const tg = Math.max(0, Math.round(g * 0.25));
    const tb = Math.max(0, Math.round(b * 0.25));

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(tr)}${toHex(tg)}${toHex(tb)}`;
  }
}
