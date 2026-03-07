/**
 * CRM Integration System for BookEase
 * Supports multiple CRM platforms with unified interface
 */

export interface CRMProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'sales' | 'marketing' | 'support' | 'general';
  features: string[];
  setupRequired: boolean;
  apiDocs?: string;
}

export interface CRMIntegration {
  id: string;
  providerId: string;
  isActive: boolean;
  config: Record<string, any>;
  lastSync?: Date;
  syncStatus: 'connected' | 'disconnected' | 'error' | 'syncing';
  errorMessage?: string;
  webhookUrl?: string;
}

export interface CRMFieldMapping {
  localField: string;
  crmField: string;
  required: boolean;
  transform?: (value: any) => any;
}

export interface CRMSyncConfig {
  syncCustomers: boolean;
  syncAppointments: boolean;
  syncInvoices: boolean;
  syncDirection: 'bidirectional' | 'to-crm' | 'from-crm';
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  fieldMappings: CRMFieldMapping[];
}

// Available CRM providers
export const crmProviders: CRMProvider[] = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'World\'s #1 CRM platform for sales, service, and marketing',
    logo: '/logos/salesforce.svg',
    category: 'sales',
    features: ['Contact sync', 'Lead management', 'Opportunity tracking', 'Custom objects'],
    setupRequired: true,
    apiDocs: 'https://developer.salesforce.com/docs',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Inbound marketing, sales, and service platform',
    logo: '/logos/hubspot.svg',
    category: 'marketing',
    features: ['Contact sync', 'Company sync', 'Deal tracking', 'Marketing automation'],
    setupRequired: true,
    apiDocs: 'https://developers.hubspot.com/docs',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Complete CRM solution for growing businesses',
    logo: '/logos/zoho.svg',
    category: 'general',
    features: ['Contact sync', 'Lead management', 'Inventory tracking', 'Analytics'],
    setupRequired: true,
    apiDocs: 'https://www.zoho.com/crm/help/api/',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales-focused CRM with pipeline management',
    logo: '/logos/pipedrive.svg',
    category: 'sales',
    features: ['Contact sync', 'Deal pipeline', 'Activity tracking', 'Goal setting'],
    setupRequired: true,
    apiDocs: 'https://developers.pipedrive.com/docs',
  },
  {
    id: 'freshworks',
    name: 'Freshworks CRM',
    description: 'AI-powered CRM for customer engagement',
    logo: '/logos/freshworks.svg',
    category: 'support',
    features: ['Contact sync', 'Ticket management', 'Sales sequences', 'AI insights'],
    setupRequired: true,
    apiDocs: 'https://developers.freshworks.com/docs',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work OS with CRM capabilities',
    logo: '/logos/monday.svg',
    category: 'general',
    features: ['Contact sync', 'Project management', 'Automation', 'Custom workflows'],
    setupRequired: true,
    apiDocs: 'https://developer.monday.com/docs',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Flexible database with CRM capabilities',
    logo: '/logos/airtable.svg',
    category: 'general',
    features: ['Custom tables', 'Form views', 'Automations', 'API access'],
    setupRequired: false,
    apiDocs: 'https://airtable.com/developers/web/api',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace with database features',
    logo: '/logos/notion.svg',
    category: 'general',
    features: ['Database sync', 'Page creation', 'Relations', 'Formulas'],
    setupRequired: false,
    apiDocs: 'https://developers.notion.com/docs',
  },
];

// Default field mappings for common CRM fields
export const defaultFieldMappings: CRMFieldMapping[] = [
  { localField: 'firstName', crmField: 'first_name', required: true },
  { localField: 'lastName', crmField: 'last_name', required: true },
  { localField: 'email', crmField: 'email', required: true },
  { localField: 'phone', crmField: 'phone', required: false },
  { localField: 'address', crmField: 'address', required: false },
  { localField: 'city', crmField: 'city', required: false },
  { localField: 'state', crmField: 'state', required: false },
  { localField: 'zipCode', crmField: 'zip_code', required: false },
  { localField: 'country', crmField: 'country', required: false },
  { localField: 'notes', crmField: 'description', required: false },
  { localField: 'tags', crmField: 'tags', required: false },
];

// CRM-specific configurations
export const crmConfigs = {
  salesforce: {
    authType: 'oauth2',
    scopes: ['api', 'refresh_token', 'offline_access'],
    baseUrl: 'https://login.salesforce.com',
    apiVersion: 'v58.0',
    fieldMappings: [
      ...defaultFieldMappings,
      { localField: 'id', crmField: 'Id', required: true },
      { localField: 'createdAt', crmField: 'CreatedDate', required: false },
      { localField: 'updatedAt', crmField: 'LastModifiedDate', required: false },
    ],
  },
  hubspot: {
    authType: 'oauth2',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    baseUrl: 'https://api.hubapi.com',
    fieldMappings: [
      ...defaultFieldMappings,
      { localField: 'id', crmField: 'id', required: true },
      { localField: 'createdAt', crmField: 'createdate', required: false },
      { localField: 'updatedAt', crmField: 'hs_lastmodifieddate', required: false },
    ],
  },
  zoho: {
    authType: 'oauth2',
    scopes: ['ZohoCRM.users.READ', 'ZohoCRM.contacts.CREATE', 'ZohoCRM.contacts.UPDATE'],
    baseUrl: 'https://www.zohoapis.com/crm/v2',
    fieldMappings: [
      ...defaultFieldMappings,
      { localField: 'id', crmField: 'id', required: true },
      { localField: 'createdAt', crmField: 'Created_Time', required: false },
      { localField: 'updatedAt', crmField: 'Modified_Time', required: false },
    ],
  },
  pipedrive: {
    authType: 'oauth2',
    scopes: ['default'],
    baseUrl: 'https://api.pipedrive.com/v1',
    fieldMappings: [
      ...defaultFieldMappings,
      { localField: 'id', crmField: 'id', required: true },
      { localField: 'createdAt', crmField: 'add_time', required: false },
      { localField: 'updatedAt', crmField: 'update_time', required: false },
    ],
  },
  airtable: {
    authType: 'api_key',
    baseUrl: 'https://api.airtable.com/v0',
    fieldMappings: [
      { localField: 'firstName', crmField: 'First Name', required: true },
      { localField: 'lastName', crmField: 'Last Name', required: true },
      { localField: 'email', crmField: 'Email', required: true },
      { localField: 'phone', crmField: 'Phone', required: false },
      { localField: 'address', crmField: 'Address', required: false },
      { localField: 'notes', crmField: 'Notes', required: false },
    ],
  },
  notion: {
    authType: 'oauth2',
    scopes: ['notion.databases.read', 'notion.databases.write'],
    baseUrl: 'https://api.notion.com/v1',
    fieldMappings: [
      { localField: 'firstName', crmField: 'First Name', required: true },
      { localField: 'lastName', crmField: 'Last Name', required: true },
      { localField: 'email', crmField: 'Email', required: true },
      { localField: 'phone', crmField: 'Phone', required: false },
      { localField: 'notes', crmField: 'Notes', required: false },
    ],
  },
};

// CRM integration utilities
export const crmUtils = {
  getProviderById: (id: string): CRMProvider | undefined => {
    return crmProviders.find(provider => provider.id === id);
  },

  getConfigForProvider: (providerId: string): any => {
    return crmConfigs[providerId as keyof typeof crmConfigs] || null;
  },

  validateConfig: (providerId: string, config: Record<string, any>): boolean => {
    const providerConfig = crmUtils.getConfigForProvider(providerId);
    if (!providerConfig) return false;

    // Check required fields based on provider
    switch (providerId) {
      case 'salesforce':
      case 'hubspot':
      case 'zoho':
      case 'pipedrive':
      case 'notion':
        return config.accessToken && config.refreshToken;
      case 'airtable':
        return config.apiKey && config.baseId;
      default:
        return false;
    }
  },

  transformDataToCRM: (data: any, mappings: CRMFieldMapping[], providerId: string): any => {
    const transformed: any = {};
    
    mappings.forEach(mapping => {
      const value = data[mapping.localField];
      if (value !== undefined && value !== null) {
        transformed[mapping.crmField] = mapping.transform ? mapping.transform(value) : value;
      }
    });

    // Add provider-specific transformations
    const providerConfig = crmUtils.getConfigForProvider(providerId);
    if (providerConfig?.transformData) {
      return providerConfig.transformData(transformed);
    }

    return transformed;
  },

  transformDataFromCRM: (data: any, mappings: CRMFieldMapping[], providerId: string): any => {
    const transformed: any = {};
    
    mappings.forEach(mapping => {
      const value = data[mapping.crmField];
      if (value !== undefined && value !== null) {
        transformed[mapping.localField] = mapping.transform ? mapping.transform(value) : value;
      }
    });

    // Add provider-specific transformations
    const providerConfig = crmUtils.getConfigForProvider(providerId);
    if (providerConfig?.transformFromData) {
      return providerConfig.transformFromData(transformed);
    }

    return transformed;
  },

  generateWebhookUrl: (tenantId: string, providerId: string): string => {
    return `${process.env.VITE_API_URL}/webhooks/crm/${tenantId}/${providerId}`;
  },

  testConnection: async (providerId: string, config: Record<string, any>): Promise<boolean> => {
    try {
      const providerConfig = crmUtils.getConfigForProvider(providerId);
      if (!providerConfig) return false;

      // Test connection based on provider
      switch (providerId) {
        case 'salesforce':
          // Test Salesforce connection
          const response = await fetch(`${providerConfig.baseUrl}/services/data/v58.0/sobjects/Account/describe`, {
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          return response.ok;

        case 'hubspot':
          // Test HubSpot connection
          const hubspotResponse = await fetch(`${providerConfig.baseUrl}/crm/v3/objects/contacts`, {
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          return hubspotResponse.ok;

        case 'airtable':
          // Test Airtable connection
          const airtableResponse = await fetch(`${providerConfig.baseUrl}/${config.baseId}/metadata/v1`, {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          return airtableResponse.ok;

        default:
          return false;
      }
    } catch (error) {
      console.error('CRM connection test failed:', error);
      return false;
    }
  },

  // CRM-specific send functions
  sendToSalesforce: async (data: any, config: Record<string, any>): Promise<any> => {
    const response = await fetch('https://login.salesforce.com/services/data/v58.0/sobjects/Contact', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  sendToHubSpot: async (data: any, config: Record<string, any>): Promise<any> => {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: data }),
    });
    return response.json();
  },

  sendToZoho: async (data: any, config: Record<string, any>): Promise<any> => {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [data] }),
    });
    return response.json();
  },

  sendToAirtable: async (data: any, config: Record<string, any>): Promise<any> => {
    const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tableName || 'Contacts'}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: [{ fields: data }] }),
    });
    return response.json();
  },
};

// CRM sync types
export type CRMSyncEvent = 'customer.created' | 'customer.updated' | 'appointment.created' | 'appointment.updated' | 'appointment.completed';

export interface CRMSyncPayload {
  event: CRMSyncEvent;
  data: any;
  tenantId: string;
  timestamp: Date;
}

// Webhook event handlers
export const crmWebhookHandlers = {
  handleCustomerCreated: async (payload: CRMSyncPayload, integrations: CRMIntegration[]) => {
    const activeIntegrations = integrations.filter(integration => 
      integration.isActive && integration.syncStatus === 'connected'
    );

    for (const integration of activeIntegrations) {
      try {
        const providerConfig = crmUtils.getConfigForProvider(integration.providerId);
        const transformedData = crmUtils.transformDataToCRM(
          payload.data,
          integration.config.fieldMappings || defaultFieldMappings,
          integration.providerId
        );

        // Send to CRM based on provider
        await sendToCRM(integration.providerId, transformedData, integration.config);
      } catch (error) {
        console.error(`Failed to sync customer to ${integration.providerId}:`, error);
      }
    }
  },

  handleAppointmentCreated: async (payload: CRMSyncPayload, integrations: CRMIntegration[]) => {
    // Similar implementation for appointments
    console.log('Appointment created, syncing to CRM...');
  },

  handleAppointmentCompleted: async (payload: CRMSyncPayload, integrations: CRMIntegration[]) => {
    // Similar implementation for completed appointments
    console.log('Appointment completed, syncing to CRM...');
  },
};

// Helper function to send data to CRM
export const sendToCRM = async (providerId: string, data: any, config: Record<string, any>): Promise<any> => {
  const providerConfig = crmUtils.getConfigForProvider(providerId);
  if (!providerConfig) throw new Error(`Unknown CRM provider: ${providerId}`);

  switch (providerId) {
    case 'salesforce':
      return await crmUtils.sendToSalesforce(data, config);
    case 'hubspot':
      return await crmUtils.sendToHubSpot(data, config);
    case 'zoho':
      return await crmUtils.sendToZoho(data, config);
    case 'airtable':
      return await crmUtils.sendToAirtable(data, config);
    default:
      throw new Error(`CRM provider ${providerId} not implemented`);
  }
};
