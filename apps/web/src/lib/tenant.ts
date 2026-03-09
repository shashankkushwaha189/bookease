// 🏢 Tenant Management System
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  timezone: string;
  isActive: boolean;
}

export interface BusinessProfile {
  businessName: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  brandColor: string;
  accentColor: string;
  policyText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface TenantWithProfile extends Tenant {
  profile?: BusinessProfile;
}

// Default tenant configuration
export const DEFAULT_TENANT: Tenant = {
  id: 'b18e0808-27d1-4253-aca9-453897585106',
  name: 'HealthFirst Clinic',
  slug: 'demo-clinic',
  timezone: 'Asia/Kolkata',
  isActive: true,
};

// Default theme configuration
export const DEFAULT_THEME: BusinessProfile = {
  businessName: 'HealthFirst Clinic',
  brandColor: '#1A56DB',
  accentColor: '#7C3AED',
  logoUrl: undefined,
  description: undefined,
  phone: undefined,
  email: undefined,
  address: undefined,
  policyText: undefined,
  seoTitle: undefined,
  seoDescription: undefined,
};

// Tenant detection utilities
export class TenantDetector {
  private static tenantCache = new Map<string, { tenant: Tenant; expires: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect tenant from URL, domain, or query parameters
   */
  static async detectTenant(): Promise<Tenant> {
    // Try different detection methods in order of preference
    
    // 1. Check URL parameters
    const urlTenant = this.getTenantFromURL();
    if (urlTenant) {
      return urlTenant;
    }

    // 2. Check domain
    const domainTenant = await this.getTenantFromDomain();
    if (domainTenant) {
      return domainTenant;
    }

    // 3. Check query parameters
    const queryTenant = await this.getTenantFromQuery();
    if (queryTenant) {
      return queryTenant;
    }

    // 4. Return default tenant
    return DEFAULT_TENANT;
  }

  /**
   * Get tenant from URL slug
   */
  private static getTenantFromURL(): Tenant | null {
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if first segment is a tenant slug
    if (segments.length > 0) {
      const possibleSlug = segments[0];
      // Simple validation - you might want to check against known tenants
      if (possibleSlug.match(/^[a-z0-9-]+$/)) {
        return {
          ...DEFAULT_TENANT,
          slug: possibleSlug,
        };
      }
    }
    
    return null;
  }

  /**
   * Get tenant from domain
   */
  private static async getTenantFromDomain(): Promise<Tenant | null> {
    const hostname = window.location.hostname;
    
    // Check if it's a subdomain format (tenant.domain.com)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const parts = hostname.split('.');
      if (parts.length > 2) {
        const subdomain = parts[0];
        const cacheKey = `domain:${subdomain}`;
        
        // Check cache first
        const cached = this.tenantCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
          return cached.tenant;
        }
        
        // Fetch from API
        try {
          const response = await fetch(`/api/tenants/public/domain/${subdomain}`);
          if (response.ok) {
            const data = await response.json();
            const tenant = data.data;
            
            // Cache the result
            this.tenantCache.set(cacheKey, {
              tenant,
              expires: Date.now() + this.CACHE_TTL,
            });
            
            return tenant;
          }
        } catch (error) {
          console.error('Error fetching tenant by domain:', error);
        }
      }
    }
    
    return null;
  }

  /**
   * Get tenant from query parameters
   */
  private static async getTenantFromQuery(): Promise<Tenant | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantSlug = urlParams.get('tenant');
    
    if (tenantSlug) {
      const cacheKey = `slug:${tenantSlug}`;
      
      // Check cache first
      const cached = this.tenantCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.tenant;
      }
      
      // Fetch from API
      try {
        const response = await fetch(`/api/tenants/public/slug/${tenantSlug}`);
        if (response.ok) {
          const data = await response.json();
          const tenant = data.data;
          
          // Cache the result
          this.tenantCache.set(cacheKey, {
            tenant,
            expires: Date.now() + this.CACHE_TTL,
          });
          
          return tenant;
        }
      } catch (error) {
        console.error('Error fetching tenant by slug:', error);
      }
    }
    
    return null;
  }

  /**
   * Clear tenant cache
   */
  static clearCache(): void {
    this.tenantCache.clear();
  }

  /**
   * Get cached tenant
   */
  static getCachedTenant(slugOrDomain: string): Tenant | null {
    const cacheKey = slugOrDomain.includes('.') ? `domain:${slugOrDomain}` : `slug:${slugOrDomain}`;
    const cached = this.tenantCache.get(cacheKey);
    return cached && cached.expires > Date.now() ? cached.tenant : null;
  }
}

// Business profile management
export class BusinessProfileManager {
  private static profileCache = new Map<string, { profile: BusinessProfile; expires: number }>();
  private static CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get business profile for tenant
   */
  static async getProfile(tenantSlug: string): Promise<BusinessProfile> {
    const cacheKey = `profile:${tenantSlug}`;
    
    // Check cache first
    const cached = this.profileCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.profile;
    }

    // Fetch from API
    try {
      const response = await fetch(`/api/business-profile/public/slug/${tenantSlug}`);
      
      if (!response.ok) {
        console.warn(`Business profile API returned ${response.status} for tenant: ${tenantSlug}`);
        return DEFAULT_THEME as BusinessProfile;
      }
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Business profile API returned non-JSON response (${contentType}) for tenant: ${tenantSlug}`);
        return DEFAULT_THEME as BusinessProfile;
      }
      
      const data = await response.json();
      const profile = data.data;
      
      // Cache the result
      this.profileCache.set(cacheKey, {
        profile,
        expires: Date.now() + this.CACHE_TTL,
      });
      
      return profile;
    } catch (error) {
      console.error('Error fetching business profile:', error);
    }

    // Return default profile
    return DEFAULT_THEME as BusinessProfile;
  }

  /**
   * Clear profile cache
   */
  static clearCache(): void {
    this.profileCache.clear();
  }

  /**
   * Get cached profile
   */
  static getCachedProfile(tenantSlug: string): BusinessProfile | null {
    const cacheKey = `profile:${tenantSlug}`;
    const cached = this.profileCache.get(cacheKey);
    return cached && cached.expires > Date.now() ? cached.profile : null;
  }
}

// Theme management
export class ThemeManager {
  /**
   * Apply theme to document
   */
  static applyTheme(profile: BusinessProfile): void {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--primary-color', profile.brandColor);
    root.style.setProperty('--accent-color', profile.accentColor);
    
    // Update meta tags for SEO
    this.updateMetaTags(profile);
    
    // Update favicon if logo is available
    if (profile.logoUrl) {
      this.updateFavicon(profile.logoUrl);
    }
  }

  /**
   * Update SEO meta tags
   */
  private static updateMetaTags(profile: BusinessProfile): void {
    // Update title
    document.title = profile.seoTitle || `${profile.businessName} - Book Appointment`;
    
    // Update or create description meta tag
    let descriptionMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.name = 'description';
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = profile.seoDescription || profile.description || `Book appointments at ${profile.businessName}`;
    
    // Update Open Graph tags
    this.updateMetaTag('og:title', profile.seoTitle || profile.businessName);
    this.updateMetaTag('og:description', profile.seoDescription || profile.description || `Book appointments at ${profile.businessName}`);
    this.updateMetaTag('og:image', profile.logoUrl || '');
    
    // Update Twitter Card tags
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', profile.seoTitle || profile.businessName);
    this.updateMetaTag('twitter:description', profile.seoDescription || profile.description || `Book appointments at ${profile.businessName}`);
    this.updateMetaTag('twitter:image', profile.logoUrl || '');
  }

  /**
   * Update or create meta tag
   */
  private static updateMetaTag(property: string, content: string): void {
    let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement ||
                  document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (property.startsWith('og:')) {
        metaTag.setAttribute('property', property);
      } else {
        metaTag.name = property;
      }
      document.head.appendChild(metaTag);
    }
    
    metaTag.content = content;
  }

  /**
   * Update favicon
   */
  private static updateFavicon(logoUrl: string): void {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = logoUrl;
  }

  /**
   * Reset theme to defaults
   */
  static resetTheme(): void {
    const root = document.documentElement;
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--accent-color');
    
    // Reset meta tags
    document.title = 'BookEase - Appointment Booking System';
    
    const descriptionMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (descriptionMeta) {
      descriptionMeta.content = 'Book appointments online with BookEase';
    }
  }
}

// Export utility functions
export const getTenant = () => TenantDetector.detectTenant();
export const getBusinessProfile = (tenantSlug: string) => BusinessProfileManager.getProfile(tenantSlug);
export const applyTheme = (profile: BusinessProfile) => ThemeManager.applyTheme(profile);
