import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Palette, Phone, Mail, MapPin, FileText, Building } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../stores/toast.store';
import { applyTenantTheme } from '../../utils/theme';

// Form validation schema
const businessProfileSchema = z.object({
  logoUrl: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  description: z.string().max(500, "Description must be 500 characters or less"),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional(),
  address: z.string().optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color"),
  policyText: z.string().optional(),
});

type BusinessProfileData = z.infer<typeof businessProfileSchema>;

interface BusinessProfile extends BusinessProfileData {
  id?: string;
  tenantId?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const BusinessProfilePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [debouncedPreview, setDebouncedPreview] = useState<BusinessProfileData | null>(null);

  const { success, error } = useToastStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<BusinessProfileData>({
    resolver: zodResolver(businessProfileSchema),
    mode: 'onChange',
  });

  // Watch all form values for preview
  const formValues = watch();

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPreview(formValues);
    }, 300);

    return () => clearTimeout(timer);
  }, [formValues]);

  // Update unsaved changes indicator
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // Apply theme colors when they change
  useEffect(() => {
    if (formValues.brandColor && formValues.accentColor) {
      applyTenantTheme(formValues.brandColor, formValues.accentColor);
    }
  }, [formValues.brandColor, formValues.accentColor]);

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Mock API call - replace with actual API
        const mockProfile: BusinessProfile = {
          businessName: 'BookEase Demo',
          description: 'Professional appointment booking system',
          phone: '+1 (555) 123-4567',
          email: 'contact@bookease.com',
          address: '123 Business St, Suite 100, City, State 12345',
          brandColor: '#1A56DB',
          accentColor: '#10B981',
          policyText: 'Cancellations must be made at least 24 hours in advance. No-shows will be charged the full service fee.',
          logoUrl: '',
        };
        
        setProfile(mockProfile);
        reset(mockProfile);
        setDebouncedPreview(mockProfile);
      } catch (err) {
        error('Failed to load business profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [reset, error]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!validTypes.includes(file.type)) {
        error('Please upload a PNG, JPEG, or WebP image');
        return;
      }

      if (file.size > maxSize) {
        error('Image must be smaller than 2MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setLogoFile(file);
        setValue('logoUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = () => {
    setLogoPreview('');
    setLogoFile(null);
    setValue('logoUrl', '');
  };

  const handleColorChange = (field: 'brandColor' | 'accentColor', value: string) => {
    // Ensure hex format
    const hexValue = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      setValue(field, hexValue);
    }
  };

  const onSubmit = async (data: BusinessProfileData) => {
    setIsSaving(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedProfile = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Current User', // Replace with actual user
      };
      
      setProfile(updatedProfile);
      success('Profile updated successfully');
      setHasUnsavedChanges(false);
    } catch (err) {
      error('Failed to save business profile');
    } finally {
      setIsSaving(false);
    }
  };

  const PreviewPanel: React.FC<{ data: BusinessProfileData | null }> = ({ data }) => {
    if (!data) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
        
        {/* Preview Header */}
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: data.brandColor || '#1A56DB' }}
          >
            {data.logoUrl ? (
              <img 
                src={data.logoUrl} 
                alt={data.businessName} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <Building className="w-8 h-8 text-white" />
            )}
          </div>
          <h4 
            className="text-xl font-bold mb-2"
            style={{ color: data.brandColor || '#1A56DB' }}
          >
            {data.businessName || 'Business Name'}
          </h4>
          {data.description && (
            <p className="text-neutral-600 text-sm">{data.description}</p>
          )}
        </div>

        {/* Contact Info */}
        {(data.phone || data.email || data.address) && (
          <div className="space-y-2 mb-6">
            {data.phone && (
              <div className="flex items-center text-sm text-neutral-600">
                <Phone className="w-4 h-4 mr-2" />
                {data.phone}
              </div>
            )}
            {data.email && (
              <div className="flex items-center text-sm text-neutral-600">
                <Mail className="w-4 h-4 mr-2" />
                {data.email}
              </div>
            )}
            {data.address && (
              <div className="flex items-start text-sm text-neutral-600">
                <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                {data.address}
              </div>
            )}
          </div>
        )}

        {/* Policy Preview */}
        {data.policyText && (
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 mr-2 text-neutral-600" />
              <span className="text-sm font-medium text-neutral-900">Booking Policy</span>
            </div>
            <p className="text-xs text-neutral-600">{data.policyText}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
          <p className="text-gray-600">Manage your business information and branding</p>
          {hasUnsavedChanges && (
            <span className="inline-flex items-center mt-2 text-sm text-amber-500">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              You have unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column - Form (60%) */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Section 1 - Identity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity</h2>
              
              {/* Logo Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">Business Logo</label>
                <div className="flex items-center space-x-4">
                  {logoPreview || formValues.logoUrl ? (
                    <div className="relative">
                      <img 
                        src={logoPreview || formValues.logoUrl} 
                        alt="Business logo" 
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Building className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPEG, WebP (max 2MB)</p>
                  </div>
                </div>
              </div>

              {/* Business Name */}
              <Input
                label="Business Name"
                {...register('businessName')}
                error={errors.businessName?.message}
                required
              />

              {/* Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe your business..."
                />
                <div className="flex justify-between mt-1">
                  {errors.description?.message && (
                    <span className="text-sm text-red-500">{errors.description.message}</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formValues.description?.length || 0}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2 - Contact */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              
              <div className="space-y-4">
                <Input
                  label="Phone Number"
                  {...register('phone')}
                  error={errors.phone?.message}
                />

                <Input
                  label="Email Address"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Address</label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter your business address..."
                  />
                  {errors.address?.message && (
                    <span className="text-sm text-red-500">{errors.address.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3 - Branding */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <Palette className="w-4 h-4 inline mr-2" />
                    Primary Brand Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      {...register('brandColor')}
                      className="h-10 w-20 border border-gray-200 rounded cursor-pointer"
                    />
                    <Input
                      placeholder="#000000"
                      value={formValues.brandColor}
                      onChange={(e) => handleColorChange('brandColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  {errors.brandColor?.message && (
                    <span className="text-sm text-red-500">{errors.brandColor.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <Palette className="w-4 h-4 inline mr-2" />
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      {...register('accentColor')}
                      className="h-10 w-20 border border-gray-200 rounded cursor-pointer"
                    />
                    <Input
                      placeholder="#000000"
                      value={formValues.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  {errors.accentColor?.message && (
                    <span className="text-sm text-red-500">{errors.accentColor.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4 - Policy */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Policy Text</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Cancellation & Booking Policy
                </label>
                <textarea
                  {...register('policyText')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter your booking and cancellation policy..."
                />
                {errors.policyText?.message && (
                  <span className="text-sm text-red-500">{errors.policyText.message}</span>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This text appears to customers before they book
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between">
              <div>
                {profile?.updatedAt && (
                  <p className="text-sm text-gray-500">
                    Last updated by {profile.updatedBy} at {new Date(profile.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={isSaving}
                disabled={!hasUnsavedChanges}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column - Preview (40%) */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <PreviewPanel data={debouncedPreview} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;
