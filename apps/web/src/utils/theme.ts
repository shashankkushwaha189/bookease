/**
 * Applies dynamic tenant branding globally by updating the cascading CSS
 * custom variables injected deep into Tailwind's theme config.
 * 
 * @param brandColor Primary business branding color
 * @param accentColor Secondary business branding mapping to soft arrays
 */
export function applyTenantTheme(brandColor: string, accentColor: string) {
    document.documentElement.style.setProperty("--color-brand", brandColor);

    // Safely infer an rgba soft variant off accent (or optionally use exact strings mapped)
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    document.documentElement.style.setProperty("--color-brand-soft", hexToRgba(accentColor, 0.2));
}
