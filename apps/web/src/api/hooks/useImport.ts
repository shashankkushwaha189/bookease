import { useState, useEffect } from 'react';
import { importApi, type ImportResult, type RowValidationReport } from '../api';
import { useToastStore } from '../stores/toast.store';

export interface UseImportOptions {
  type: 'customers' | 'services' | 'staff';
}

export const useImport = (options: UseImportOptions) => {
  const [validationReport, setValidationReport] = useState<RowValidationReport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToastStore();

  const validateFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setValidationReport(null);
    
    try {
      let response;
      switch (options.type) {
        case 'customers':
          response = await importApi.validateCustomers(file);
          break;
        case 'services':
          response = await importApi.validateServices(file);
          break;
        case 'staff':
          response = await importApi.validateStaff(file);
          break;
      }
      
      setValidationReport(response.data.data);
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to validate file');
      showError('Failed to validate file');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importFile = async (file: File, importOptions?: {
    allowPartial?: boolean;
    skipDuplicates?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setImportResult(null);
    
    try {
      let response;
      switch (options.type) {
        case 'customers':
          response = await importApi.importCustomers(file, importOptions);
          break;
        case 'services':
          response = await importApi.importServices(file, importOptions);
          break;
        case 'staff':
          response = await importApi.importStaff(file, importOptions);
          break;
      }
      
      setImportResult(response.data.data);
      
      if (response.data.data.imported > 0) {
        success(`Successfully imported ${response.data.data.imported} ${options.type}`);
      }
      
      if (response.data.data.failed > 0) {
        showError(`${response.data.data.failed} ${options.type} failed to import`);
      }
      
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
      showError('Failed to import file');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setValidationReport(null);
    setImportResult(null);
    setError(null);
  };

  return {
    validationReport,
    importResult,
    loading,
    error,
    validateFile,
    importFile,
    clearResults,
  };
};

export const useImportTemplates = () => {
  const [templates, setTemplates] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToastStore();

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await importApi.getTemplates();
      setTemplates(response.data.data);
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
      showError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type: 'customers' | 'services' | 'staff') => {
    try {
      const response = await importApi.downloadTemplate(type);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError('Failed to download template');
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    downloadTemplate,
  };
};
