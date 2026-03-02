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
    document.documentElement.style.setProperty("--color-brand-soft", accentColor + "20");
}
