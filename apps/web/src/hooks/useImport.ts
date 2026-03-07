import { useState } from 'react';
import { useToastStore } from '../stores/toast.store';
import { useApi } from './useApi';

interface ImportOptions {
  allowPartial?: boolean;
  skipDuplicates?: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  message: string;
}

export const useImport = () => {
  const toastStore = useToastStore();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const api = useApi();

  const importData = async (params: {
    type: 'customers' | 'services' | 'staff';
    file: File;
    options?: ImportOptions;
  }) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', params.file);
      
      if (params.options?.allowPartial) {
        formData.append('allowPartial', 'true');
      }
      
      if (params.options?.skipDuplicates) {
        formData.append('skipDuplicates', 'true');
      }

      const response = await api.post<{
        success: boolean;
        data: {
          imported: number;
          failed: number;
          errors: string[];
          message: string;
        };
      }>(`/import/${params.type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(response.data);
      toastStore.success(`Successfully imported ${response.data.imported} items`);
      
      if (response.data.errors.length > 0) {
        toastStore.warning(`${response.data.errors.length} rows had errors`);
      }
      
      return response.data;
    } catch (error: any) {
      const errorResult: ImportResult = {
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Import failed'],
        message: error.message || 'Unknown error occurred'
      };
      
      setImportResult(errorResult);
      toastStore.error('Import failed');
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importData,
    isImporting,
    importResult,
    setImportResult
  };
};
