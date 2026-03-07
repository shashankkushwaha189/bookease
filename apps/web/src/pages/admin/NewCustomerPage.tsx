import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerModal from '../../components/CustomerModal';
import { customersApi } from '../../api/customers';
import { useToastStore } from '../../stores/toast.store';

const NewCustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const { success, error } = useToastStore();

  const handleSaveCustomer = async (customerData: {
    name: string;
    email: string;
    phone?: string;
    tags: string[];
  }) => {
    try {
      await customersApi.createCustomer(customerData);
      success('Customer created successfully');
      navigate('/admin/customers');
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      error('Failed to create customer');
      throw err;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    navigate('/admin/customers');
  };

  return (
    <div className="p-6">
      <CustomerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomer}
      />
    </div>
  );
};

export default NewCustomerPage;
