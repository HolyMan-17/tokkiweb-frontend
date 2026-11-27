export interface ViewportPreset {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly kind: 'mobile' | 'tablet' | 'desktop';
}

export const VIEWPORTS: readonly ViewportPreset[] = [
  { name: 'mobile-360', width: 360, height: 740, kind: 'mobile' },
  { name: 'mobile-375', width: 375, height: 812, kind: 'mobile' },
  { name: 'tablet-768', width: 768, height: 1024, kind: 'tablet' },
  { name: 'laptop-1280', width: 1280, height: 800, kind: 'desktop' },
  { name: 'desktop-1440', width: 1440, height: 900, kind: 'desktop' },
  { name: 'desktop-1680', width: 1680, height: 900, kind: 'desktop' },
  { name: 'desktop-1920', width: 1920, height: 1080, kind: 'desktop' },
] as const;

export const MOBILE_VIEWPORTS = VIEWPORTS.filter((v) => v.kind === 'mobile');
export const WIDE_VIEWPORTS = VIEWPORTS.filter((v) => v.width >= 768);
export const DESKTOP_VIEWPORTS = VIEWPORTS.filter((v) => v.kind === 'desktop');

/** Canonical 3-breakpoint audit set (mobile, tablet, wide desktop). */
export const CORE_AUDIT_VIEWPORTS: readonly ViewportPreset[] = VIEWPORTS.filter((v) =>
  v.name === 'mobile-360' || v.name === 'tablet-768' || v.name === 'desktop-1680',
);
