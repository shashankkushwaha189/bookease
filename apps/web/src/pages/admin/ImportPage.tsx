import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useToastStore } from '../../stores/toast.store';
import { useImport } from '../../hooks/useImport';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  message: string;
}

const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const toastStore = useToastStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { importData } = useImport();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importData({
        type: 'customers',
        file: selectedFile,
        options: {
          allowPartial: true,
          skipDuplicates: true
        }
      });

      setImportResult(result);
      toastStore.success(`Successfully imported ${result.imported} customers`);
      
      if (result.errors.length > 0) {
        toastStore.warning(`${result.errors.length} rows had errors`);
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Import failed'],
        message: error.message || 'Unknown error occurred'
      });
      toastStore.error('Import failed');
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Data</h1>
        <p className="text-gray-600">Import customers, services, and staff data from CSV files</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Import Customers</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="ml-2">Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import Customers</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {importResult && (
          <div className={`mt-4 p-4 rounded-md ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <h3 className={`text-lg font-semibold ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </h3>
                <p className="text-sm text-gray-600">{importResult.message}</p>
              </div>
              <div className="text-sm text-gray-500">
                {importResult.success && (
                  <React.Fragment>
                    <span>Imported: <strong>{importResult.imported}</strong></span>
                    {importResult.failed > 0 && (
                      <React.Fragment>, Failed: <strong>{importResult.failed}</strong></React.Fragment>
                    )}
                  </React.Fragment>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">Errors:</span>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
