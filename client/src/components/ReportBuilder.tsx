import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  reportType: string;
  category: string;
  config: any;
  isSystem: boolean;
}

export default function ReportBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportType, setReportType] = useState<string>('customer');
  const [filters, setFilters] = useState<any>({});
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = trpc.reporting.getTemplates.useQuery({});
  
  // Generate report mutation
  const generateReport = trpc.reporting.generateReport.useMutation({
    onSuccess: (data) => {
      setReportData(data);
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
      setIsGenerating(false);
    },
  });

  const handleGenerateReport = () => {
    if (!selectedTemplate) {
      alert('Please select a report template');
      return;
    }

    setIsGenerating(true);
    generateReport.mutate({
      templateId: selectedTemplate.id,
      filters,
      format: 'json',
    });
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!reportData) return;
    
    // Implement export logic
    console.log(`Exporting report as ${format}`);
    alert(`Export as ${format} - Coming soon!`);
  };

  const systemTemplates = templates?.filter(t => t.isSystem) || [];
  const customTemplates = templates?.filter(t => !t.isSystem) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report Builder</h1>
          <p className="mt-2 text-gray-600">
            Create custom reports or use pre-built templates to analyze your data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Template Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Templates</h2>
              
              {templatesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading templates...</p>
                </div>
              ) : (
                <>
                  {/* System Templates */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">System Templates</h3>
                    <div className="space-y-2">
                      {systemTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          <div className="flex gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {template.reportType}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {template.category}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Templates */}
                  {customTemplates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">My Templates</h3>
                      <div className="space-y-2">
                        {customTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template)}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                              selectedTemplate?.id === template.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                + Create New Template
              </button>
            </div>
          </div>

          {/* Main Content - Report Configuration & Preview */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="space-y-6">
                {/* Report Configuration */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-gray-600 mb-6">{selectedTemplate.description}</p>

                  {/* Filters */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Filters</h3>
                    
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Report Type Specific Filters */}
                    {selectedTemplate.reportType === 'customer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => setFilters({ ...filters, customerType: e.target.value })}
                        >
                          <option value="">All Types</option>
                          <option value="residential">Residential</option>
                          <option value="business">Business</option>
                        </select>
                      </div>
                    )}

                    {selectedTemplate.reportType === 'route' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Route Status
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                          <option value="">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    )}

                    {selectedTemplate.reportType === 'worker' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Worker Status
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        'Generate Report'
                      )}
                    </button>
                    {reportData && (
                      <>
                        <button
                          onClick={() => handleExport('excel')}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Export Excel
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Export PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Report Preview */}
                {reportData && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
                      <span className="text-sm text-gray-500">
                        Generated: {new Date(reportData.generatedAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Summary Cards */}
                    {reportData.data.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(reportData.data.summary).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {reportData.data.data.length > 0 &&
                              Object.keys(reportData.data.data[0]).map((key) => (
                                <th
                                  key={key}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {key}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.data.data.slice(0, 10).map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {Object.values(row).map((value: any, cellIdx) => (
                                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {value?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.data.data.length > 10 && (
                        <div className="text-center py-4 text-sm text-gray-500">
                          Showing 10 of {reportData.data.recordCount} records. Export to see all data.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No template selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a template from the left sidebar to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
