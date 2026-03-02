export interface BusinessProfile {
    id: string;
    tenantId: string;
    businessName: string;
    logoUrl?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    brandColor: string;
    accentColor: string;
    policyText?: string;
}

export interface TenantConfig {
    features: {
        aiSummaryEnabled: boolean;
        auditLogging: boolean;
    };
    booking: {
        allowGuestBooking: boolean;
        cancellationLeadTimeHours: number;
    };
}
