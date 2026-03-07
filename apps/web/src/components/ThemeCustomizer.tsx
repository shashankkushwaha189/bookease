import React, { useState, useEffect } from 'react';
import { Palette, Type, Layout, Download, Upload, RotateCcw, Eye } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { applyTenantTheme, applyIndustryTheme, resetToDefaultTheme, availableIndustryThemes } from '../utils/theme';
import { useTenantStore } from '../stores/tenant.store';
import Button from './ui/Button';

interface ThemeCustomizerProps {
  onSave?: (themeConfig: any) => void;
  onPreview?: (themeConfig: any) => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  onSave,
  onPreview,
}) => {
  const { businessProfile } = useTenantStore();
  const toastStore = useToastStore();
  
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'industry'>('colors');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#22c55e');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [customFont, setCustomFont] = useState('');

  useEffect(() => {
    if (businessProfile?.brandColor) {
      setBrandColor(businessProfile.brandColor);
    }
    if (businessProfile?.accentColor) {
      setAccentColor(businessProfile.accentColor);
    }
  }, [businessProfile]);

  const handleColorChange = (colorType: 'brand' | 'accent', value: string) => {
    if (colorType === 'brand') {
      setBrandColor(value);
    } else {
      setAccentColor(value);
    }
    
    // Auto-preview when colors change
    if (isPreviewing) {
      applyTenantTheme(
        colorType === 'brand' ? value : brandColor,
        colorType === 'accent' ? value : accentColor,
        selectedIndustry as any
      );
    }
  };

  const handleIndustrySelect = (industry: string) => {
    setSelectedIndustry(industry);
    applyIndustryTheme(industry as any);
    toastStore.success(`Applied ${industry} theme preset`);
  };

  const handlePreview = () => {
    setIsPreviewing(!isPreviewing);
    if (!isPreviewing) {
      applyTenantTheme(brandColor, accentColor, selectedIndustry as any);
      toastStore.info('Preview mode enabled');
    } else {
      resetToDefaultTheme();
      toastStore.info('Preview mode disabled');
    }
  };

  const handleSave = () => {
    const themeConfig = {
      brandColor,
      accentColor,
      industry: selectedIndustry,
      customFont,
    };
    
    onSave?.(themeConfig);
    toastStore.success('Theme configuration saved');
  };

  const handleReset = () => {
    setBrandColor('#3b82f6');
    setAccentColor('#22c55e');
    setSelectedIndustry('');
    setCustomFont('');
    resetToDefaultTheme();
    toastStore.info('Theme reset to default');
  };

  const handleExport = () => {
    const themeConfig = {
      brandColor,
      accentColor,
      industry: selectedIndustry,
      customFont,
    };
    
    const dataStr = JSON.stringify(themeConfig, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'bookease-theme.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toastStore.success('Theme configuration exported');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeConfig = JSON.parse(e.target?.result as string);
        
        setBrandColor(themeConfig.brandColor || '#3b82f6');
        setAccentColor(themeConfig.accentColor || '#22c55e');
        setSelectedIndustry(themeConfig.industry || '');
        setCustomFont(themeConfig.customFont || '');
        
        applyTenantTheme(
          themeConfig.brandColor || '#3b82f6',
          themeConfig.accentColor || '#22c55e',
          themeConfig.industry || undefined
        );
        
        toastStore.success('Theme configuration imported');
      } catch (error) {
        toastStore.error('Invalid theme configuration file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Theme Customization</h3>
            <p className="text-sm text-neutral-600">
              Customize your BookEase appearance for white-label deployment
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPreviewing ? 'primary' : 'outline'}
              onClick={handlePreview}
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreviewing ? 'Previewing' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('theme-import')?.click()}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="theme-import"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('colors')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'colors'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Palette className="w-4 h-4 mr-2 inline" />
            Colors
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'typography'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Type className="w-4 h-4 mr-2 inline" />
            Typography
          </button>
          <button
            onClick={() => setActiveTab('industry')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'industry'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Layout className="w-4 h-4 mr-2 inline" />
            Industry Presets
          </button>
        </div>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brand Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Primary Brand Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => handleColorChange('brand', e.target.value)}
                  className="h-10 w-20 border border-neutral-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => handleColorChange('brand', e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="#3b82f6"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Main color for buttons, links, and primary actions
              </p>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Accent Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="h-10 w-20 border border-neutral-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="#22c55e"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Secondary color for highlights and success states
              </p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 border border-neutral-200 rounded-lg">
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Color Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                className="h-16 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: brandColor }}
              >
                Primary
              </div>
              <div
                className="h-16 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: accentColor }}
              >
                Accent
              </div>
              <div
                className="h-16 rounded-lg flex items-center justify-center text-white font-medium text-sm bg-green-500"
              >
                Success
              </div>
              <div
                className="h-16 rounded-lg flex items-center justify-center text-white font-medium text-sm bg-red-500"
              >
                Error
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="space-y-6">
            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Custom Font Family (Optional)
              </label>
              <input
                type="text"
                value={customFont}
                onChange={(e) => setCustomFont(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder='"Inter", sans-serif'
              />
              <p className="text-xs text-neutral-500 mt-1">
                Custom font for brand differentiation (Google Fonts recommended)
              </p>
            </div>

            {/* Font Preview */}
            <div className="p-4 border border-neutral-200 rounded-lg">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Typography Preview</h4>
              <div className="space-y-3">
                <div className="text-3xl font-bold">Heading Large</div>
                <div className="text-xl font-semibold">Heading Medium</div>
                <div className="text-base">Body text regular</div>
                <div className="text-sm text-neutral-600">Small caption text</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Industry Presets Tab */}
      {activeTab === 'industry' && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIndustryThemes.map((theme) => (
              <div
                key={theme.key}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedIndustry === theme.key
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                onClick={() => handleIndustrySelect(theme.key)}
              >
                <h4 className="font-medium text-neutral-900 mb-1">{theme.name}</h4>
                <p className="text-sm text-neutral-600">
                  Industry-optimized colors and typography
                </p>
                {selectedIndustry === theme.key && (
                  <div className="mt-2 text-xs text-brand-600 font-medium">
                    ✓ Applied
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            {isPreviewing ? (
              <span className="text-brand-600 font-medium">Preview mode is active</span>
            ) : (
              <span>Click preview to see changes in real-time</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleReset}
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} size="sm">
              Save Theme
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;
