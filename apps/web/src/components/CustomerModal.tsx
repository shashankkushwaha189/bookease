import React from 'react';
import { X, User, Mail, Phone, Tag } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    tags: string[];
  };
  onSave: (customerData: {
    name: string;
    email: string;
    phone?: string;
    tags: string[];
  }) => Promise<void>;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
}) => {
  const [formData, setFormData] = React.useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    tags: customer?.tags?.join(', ') || '',
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const customerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        tags: formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
      };

      await onSave(customerData);
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter customer's full name"
              leftIcon={<User className="w-4 h-4" />}
              required
            />
          </div>

          {/* Email */}
          <div>
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="customer@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          {/* Tags */}
          <div>
            <Input
              label="Tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="vip, regular, premium (comma separated)"
              leftIcon={<Tag className="w-4 h-4" />}
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter tags separated by commas
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !formData.name || !formData.email}
              loading={isLoading}
            >
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
