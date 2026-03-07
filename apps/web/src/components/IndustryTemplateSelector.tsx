import React, { useState } from 'react';
import { Building2, Palette, Clock, Mail, Settings, Check, ArrowRight, Eye } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { industryTemplates, templateUtils, type IndustryTemplate } from '../utils/industry-templates';
import Button from './ui/Button';

interface IndustryTemplateSelectorProps {
  onTemplateSelect?: (template: IndustryTemplate) => void;
  onTemplateApply?: (template: IndustryTemplate) => void;
  showPreview?: boolean;
}

const IndustryTemplateSelector: React.FC<IndustryTemplateSelectorProps> = ({
  onTemplateSelect,
  onTemplateApply,
  showPreview = true,
}) => {
  const toastStore = useToastStore();
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleTemplateSelect = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect?.(template);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      const success = await templateUtils.applyTemplate(selectedTemplate, 'current-tenant');
      
      if (success) {
        toastStore.success(`${selectedTemplate.name} template applied successfully!`);
        onTemplateApply?.(selectedTemplate);
      } else {
        toastStore.error('Failed to apply template. Please try again.');
      }
    } catch (error) {
      toastStore.error('Error applying template');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePreview = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const getCategoryIcon = (category: IndustryTemplate['category']) => {
    switch (category) {
      case 'healthcare': return '🏥';
      case 'salon': return '💇';
      case 'consulting': return '💼';
      case 'education': return '🎓';
      case 'fitness': return '💪';
      default: return '🏢';
    }
  };

  const getCategoryColor = (category: IndustryTemplate['category']) => {
    switch (category) {
      case 'healthcare': return 'bg-blue-100 text-blue-700';
      case 'salon': return 'bg-purple-100 text-purple-700';
      case 'consulting': return 'bg-gray-100 text-gray-700';
      case 'education': return 'bg-green-100 text-green-700';
      case 'fitness': return 'bg-orange-100 text-orange-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (previewMode && selectedTemplate) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Preview Header */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPreviewMode(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-neutral-600">{selectedTemplate.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(false)}
                size="sm"
              >
                Back to Selection
              </Button>
              <Button
                onClick={handleApplyTemplate}
                loading={isApplying}
                size="sm"
              >
                Apply Template
              </Button>
            </div>
          </div>
        </div>

        {/* Template Preview Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Services ({selectedTemplate.services.length})
              </h4>
              <div className="space-y-3">
                {selectedTemplate.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: service.color }}
                      />
                      <div>
                        <p className="font-medium text-neutral-900">{service.name}</p>
                        <p className="text-sm text-neutral-600">{service.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-neutral-900">{service.duration} min</p>
                      {service.price && (
                        <p className="text-sm text-neutral-600">${service.price}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features Preview */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Industry Features
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedTemplate.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-neutral-50 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-neutral-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Settings Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Working Hours
              </h4>
              <div className="space-y-2">
                {Object.entries(selectedTemplate.defaultSettings.workingHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-neutral-600">{day}</span>
                    <span className="text-neutral-900">
                      {hours.isOpen ? `${hours.openTime} - ${hours.closeTime}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Templates
              </h4>
              <div className="space-y-2">
                {selectedTemplate.emailTemplates.map((template, index) => (
                  <div key={index} className="p-2 bg-neutral-50 rounded-lg">
                    <p className="text-sm font-medium text-neutral-900">{template.name}</p>
                    <p className="text-xs text-neutral-600">{template.subject}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedTemplate.compliance && (
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h4 className="text-lg font-semibold text-neutral-900 mb-4">Compliance</h4>
                <div className="space-y-2">
                  {Object.entries(selectedTemplate.compliance).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-neutral-600">{key}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        value ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {value ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Industry Templates</h3>
            <p className="text-sm text-neutral-600">
              Choose a pre-configured template for your industry to get started quickly
            </p>
          </div>
          {selectedTemplate && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => handlePreview(selectedTemplate)}
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleApplyTemplate}
                loading={isApplying}
                size="sm"
              >
                Apply Template
              </Button>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2">
          {['all', 'healthcare', 'salon', 'consulting', 'education', 'fitness'].map((category) => (
            <button
              key={category}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                category === 'all'
                  ? 'bg-neutral-200 text-neutral-700'
                  : getCategoryColor(category as IndustryTemplate['category'])
              }`}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {industryTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-brand-500 bg-brand-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            {/* Template Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getCategoryIcon(template.category)}</div>
                <div>
                  <h4 className="font-semibold text-neutral-900">{template.name}</h4>
                  <p className="text-sm text-neutral-600">{template.category}</p>
                </div>
              </div>
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: template.color }}
              >
                {selectedTemplate?.id === template.id && (
                  <div className="w-full h-full rounded-full bg-brand-500" />
                )}
              </div>
            </div>

            {/* Template Description */}
            <p className="text-sm text-neutral-600 mb-4">{template.description}</p>

            {/* Template Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-2 bg-neutral-50 rounded-lg">
                <p className="text-lg font-semibold text-neutral-900">{template.services.length}</p>
                <p className="text-xs text-neutral-600">Services</p>
              </div>
              <div className="text-center p-2 bg-neutral-50 rounded-lg">
                <p className="text-lg font-semibold text-neutral-900">{template.features.length}</p>
                <p className="text-xs text-neutral-600">Features</p>
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Key Features:</p>
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 3).map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
                  >
                    {feature}
                  </span>
                ))}
                {template.features.length > 3 && (
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                    +{template.features.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Compliance Badge */}
            {template.compliance && (
              <div className="mt-4 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700">Compliance Ready</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {industryTemplates.length === 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-neutral-400" />
          </div>
          <h4 className="text-lg font-semibold text-neutral-900 mb-2">No Templates Available</h4>
          <p className="text-neutral-600">
            Industry templates will be available soon.
          </p>
        </div>
      )}
    </div>
  );
};

export default IndustryTemplateSelector;
