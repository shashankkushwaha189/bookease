import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Download, 
  Check, 
  X, 
  AlertTriangle, 
  FileText, 
  Users, 
  Settings, 
  Calendar,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useToastStore } from '../../stores/toast.store';
import { importApi } from '../../api/import';

// Types
interface ImportStep {
  upload: 'upload';
  preview: 'preview';
  result: 'result';
}

interface ParsedRow {
  id: number;
  data: Record<string, any>;
  errors: string[];
  isValid: boolean;
}

interface ImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  skippedRows: number;
  errors?: string[];
}

interface ExportOptions {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  tags?: string[];
}

// API Hooks (real API implementations)
const useImport = (type: 'customers' | 'services' | 'staff') => {
  const [isImporting, setIsImporting] = React.useState(false);
  const toastStore = useToastStore();

  const validateCSV = async (file: File): Promise<any> => {
    try {
      let response;
      switch (type) {
        case 'customers':
          response = await importApi.validateCustomers(file);
          break;
        case 'services':
          response = await importApi.validateServices(file);
          break;
        case 'staff':
          response = await importApi.validateStaff(file);
          break;
        default:
          throw new Error('Invalid import type');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Validation failed:', error);
      throw error;
    }
  };

  const importData = async (file: File, options?: any): Promise<any> => {
    setIsImporting(true);
    try {
      let response;
      switch (type) {
        case 'customers':
          response = await importApi.importCustomers(file, options);
          break;
        case 'services':
          response = await importApi.importServices(file, options);
          break;
        case 'staff':
          response = await importApi.importStaff(file, options);
          break;
        default:
          throw new Error('Invalid import type');
      }
      toastStore.success(`${type} imported successfully`);
      return response.data.data;
    } catch (error: any) {
      console.error('Import failed:', error);
      toastStore.error(`Failed to import ${type}: ${error.message}`);
      throw error;
    } finally {
      setIsImporting(false);
    }
  };
      },
      {
        id: 4,
        data: { name: 'Lisa Anderson', email: 'lisa.anderson@email.com', phone: '+1 (555) 234-5678' },
        errors: [],
        isValid: true
      },
      {
        id: 5,
        data: { name: 'James Taylor', email: 'james.taylor@email.com', phone: '+1 (555) 345-6789' },
        errors: [],
        isValid: true
      },
      {
        id: 6,
        data: { name: '', email: 'empty.name@email.com', phone: '+1 (555) 456-1234' },
        errors: ['Name is required'],
        isValid: false
      },
      {
        id: 7,
        data: { name: 'Michael Wilson', email: 'michael.wilson@email.com', phone: '+1 (555) 567-8901' },
        errors: [],
        isValid: true
      }
    ];

    return mockData;
  };

  const importData = async (rows: ParsedRow[], importOnlyValid: boolean): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const validRows = rows.filter(row => row.isValid);
      const invalidRows = rows.filter(row => !row.isValid);
      
      const result: ImportResult = {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        importedRows: importOnlyValid ? validRows.length : validRows.length,
        skippedRows: importOnlyValid ? invalidRows.length : 0
      };

      return result;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return { parseCSV, importData, isImporting };
};

const useExport = () => {
  const [isExporting, setIsExporting] = React.useState(false);

  const generateTemplate = (type: 'customers' | 'services' | 'staff') => {
    let csvContent = '';
    
    switch (type) {
      case 'customers':
        csvContent = 'Name,Email,Phone\nJohn Smith,john.smith@email.com,+1 (555) 123-4567';
        break;
      case 'services':
        csvContent = 'Name,Duration,Price,Description\nHaircut,30,45.00,Professional haircut service';
        break;
      case 'staff':
        csvContent = 'Name,Email,Phone,Bio\nSarah Johnson,sarah@salon.com,+1 (555) 987-6543,Senior stylist';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = async (type: 'appointments' | 'customers' | 'reports', options: ExportOptions) => {
    setIsExporting(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock CSV content
      let csvContent = '';
      
      switch (type) {
        case 'appointments':
          csvContent = 'Reference ID,Customer,Service,Staff,Date,Status\nBK-2024-00042,John Smith,Haircut,Sarah Johnson,2024-03-01T14:30:00,completed';
          break;
        case 'customers':
          csvContent = 'Name,Email,Phone,Total Appointments,Last Visit\nJohn Smith,john.smith@email.com,+1 (555) 123-4567,24,2024-03-01';
          break;
        case 'reports':
          csvContent = 'Date,Total Appointments,Revenue,Completed Rate\n2024-03-01,42,1250.00,85%';
          break;
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  const generateErrorReport = (rows: ParsedRow[]) => {
    const csvContent = 'Row,Error,Name,Email,Phone\n' + 
      rows.filter(row => !row.isValid)
        .map(row => `${row.id},"${row.errors.join('; ')}",${row.data.name || ''},${row.data.email || ''},${row.data.phone || ''}`)
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { generateTemplate, exportData, generateErrorReport, isExporting };
};

// Components
const FileUploadZone: React.FC<{
  onFileSelect: (file: File) => void;
  acceptedTypes: string;
  maxSize: number;
  isUploading?: boolean;
}> = ({ onFileSelect, acceptedTypes, maxSize, isUploading }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      alert('Only CSV files are allowed');
      return;
    }

    onFileSelect(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragOver ? 'border-primary bg-primary-soft' : 'border-neutral-300 hover:border-neutral-400'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInput}
        className="hidden"
      />
      
      <UploadCloud className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
      
      <p className="text-neutral-900 font-medium mb-2">
        Drag and drop your CSV file here, or click to browse
      </p>
      
      <p className="text-sm text-neutral-600 mb-4">
        Max 5MB, up to 10,000 rows. Download template below.
      </p>
      
      <Button
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        Choose File
      </Button>
    </div>
  );
};

const PreviewTable: React.FC<{
  rows: ParsedRow[];
  columns: string[];
  onImport: (importOnlyValid: boolean) => void;
  onCancel: () => void;
  isImporting: boolean;
}> = ({ rows, columns, onImport, onCancel, isImporting }) => {
  const validRows = rows.filter(row => row.isValid);
  const invalidRows = rows.filter(row => !row.isValid);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-neutral-900">
              {rows.length} total rows
            </span>
            <span className="text-sm text-success">
              {validRows.length} valid rows
            </span>
            <span className="text-sm text-danger">
              {invalidRows.length} invalid rows
            </span>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  Row
                </th>
                {columns.map((column, index) => (
                  <th key={index} className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    {column}
                  </th>
                ))}
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.slice(0, 10).map((row) => (
                <tr key={row.id} className={row.isValid ? '' : 'bg-danger-soft'}>
                  <td className="px-4 py-2 text-sm text-neutral-900">{row.id}</td>
                  {columns.map((column, index) => (
                    <td key={index} className="px-4 py-2 text-sm text-neutral-900">
                      {row.data[column] || ''}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    {row.isValid ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-soft text-success">
                        Valid
                      </span>
                    ) : (
                      <div className="relative group">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-soft text-danger">
                          Invalid
                        </span>
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {row.errors.join(', ')}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <Button variant="secondary" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onImport(true)}
          disabled={isImporting || validRows.length === 0}
          loading={isImporting}
        >
          Import Valid Rows ({validRows.length})
        </Button>
      </div>
    </div>
  );
};

const ImportResult: React.FC<{
  result: ImportResult;
  onImportMore: () => void;
  onErrorReport: () => void;
}> = ({ result, onImportMore, onErrorReport }) => {
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-success-soft border border-success rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-lg font-semibold text-success mb-2">
          {result.importedRows} records imported successfully
        </h3>
        
        <div className="text-sm text-neutral-600 space-y-1">
          <p>Total rows processed: {result.totalRows}</p>
          <p>Valid rows: {result.validRows}</p>
          {result.skippedRows > 0 && (
            <p>Skipped rows: {result.skippedRows}</p>
          )}
        </div>
      </div>

      {/* Error Report */}
      {result.skippedRows > 0 && (
        <div className="bg-warning-soft border border-warning rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium text-warning">
                {result.skippedRows} rows skipped due to errors
              </span>
            </div>
            
            <Button variant="secondary" size="sm" onClick={onErrorReport}>
              <Download className="w-4 h-4 mr-1" />
              Download Error Report
            </Button>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="text-center">
        <Button variant="primary" onClick={onImportMore}>
          Import More
        </Button>
      </div>
    </div>
  );
};

const ImportSection: React.FC<{
  type: 'customers' | 'services' | 'staff';
  title: string;
  icon: React.ReactNode;
  columns: string[];
}> = ({ type, title, icon, columns }) => {
  const [currentStep, setCurrentStep] = React.useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);

  const { parseCSV, importData, isImporting } = useImport(type);
  const { generateTemplate, generateErrorReport } = useExport();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    try {
      const rows = await parseCSV(file);
      setParsedRows(rows);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Failed to parse file:', error);
    }
  };

  const handleImport = async (importOnlyValid: boolean) => {
    try {
      const result = await importData(parsedRows, importOnlyValid);
      setImportResult(result);
      setCurrentStep('result');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleCancel = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParsedRows([]);
  };

  const handleImportMore = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
  };

  const handleErrorReport = () => {
    generateErrorReport(parsedRows);
  };

  const handleDownloadTemplate = () => {
    generateTemplate(type);
  };

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary-soft rounded-lg">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      </div>

      {currentStep === 'upload' && (
        <div className="space-y-6">
          <FileUploadZone
            onFileSelect={handleFileSelect}
            acceptedTypes=".csv"
            maxSize={5 * 1024 * 1024} // 5MB
          />
          
          <div className="text-center">
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'preview' && (
        <PreviewTable
          rows={parsedRows}
          columns={columns}
          onImport={handleImport}
          onCancel={handleCancel}
          isImporting={isImporting}
        />
      )}

      {currentStep === 'result' && importResult && (
        <ImportResult
          result={importResult}
          onImportMore={handleImportMore}
          onErrorReport={handleHandleErrorReport}
        />
      )}
    </div>
  );
};

// Main Component
const ImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'import' | 'export'>('import');
  const [exportOptions, setExportOptions] = React.useState<ExportOptions>({});
  const { exportData, isExporting } = useExport();

  const handleExportAppointments = async () => {
    try {
      await exportData('appointments', exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportCustomers = async () => {
    try {
      await exportData('customers', exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportReports = async () => {
    try {
      await exportData('reports', exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Import & Export</h1>
        <p className="text-neutral-600">Manage your data import and export operations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'import'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 inline mr-2" />
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'export'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'import' ? (
        <div className="space-y-6">
          <ImportSection
            type="customers"
            title="Import Customers"
            icon={<Users className="w-5 h-5 text-primary" />}
            columns={['Name', 'Email', 'Phone']}
          />
          
          <ImportSection
            type="services"
            title="Import Services"
            icon={<Settings className="w-5 h-5 text-primary" />}
            columns={['Name', 'Duration', 'Price', 'Description']}
          />
          
          <ImportSection
            type="staff"
            title="Import Staff"
            icon={<Users className="w-5 h-5 text-primary" />}
            columns={['Name', 'Email', 'Phone', 'Bio']}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Appointments Export */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Appointments</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Date Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={exportOptions.dateFrom || ''}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <span className="text-neutral-600">to</span>
                  <input
                    type="date"
                    value={exportOptions.dateTo || ''}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Status Filter</label>
                <div className="space-y-2">
                  {['completed', 'cancelled', 'no_show'].map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.status?.includes(status) || false}
                        onChange={(e) => {
                          const currentStatus = exportOptions.status || [];
                          if (e.target.checked) {
                            setExportOptions(prev => ({ ...prev, status: [...currentStatus, status] }));
                          } else {
                            setExportOptions(prev => ({ ...prev, status: currentStatus.filter(s => s !== status) }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-neutral-700 capitalize">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={handleExportAppointments}
                disabled={isExporting}
                loading={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Customers Export */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Customers</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Export Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="customer-export"
                      checked={!exportOptions.tags || exportOptions.tags.length === 0}
                      onChange={() => setExportOptions(prev => ({ ...prev, tags: [] }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-neutral-700">Export All</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="customer-export"
                      checked={exportOptions.tags && exportOptions.tags.length > 0}
                      onChange={() => setExportOptions(prev => ({ ...prev, tags: ['VIP', 'Regular'] }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-neutral-700">Filter by tag</span>
                  </label>
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={handleExportCustomers}
                disabled={isExporting}
                loading={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Reports Export */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary-soft rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Reports</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Date Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={exportOptions.dateFrom || ''}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <span className="text-neutral-600">to</span>
                  <input
                    type="date"
                    value={exportOptions.dateTo || ''}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={handleExportReports}
                disabled={isExporting}
                loading={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Summary CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
