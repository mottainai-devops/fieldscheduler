import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface ScheduledReport {
  id: number;
  templateId: number;
  templateName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string;
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
}

export default function ScheduledReports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipients, setRecipients] = useState('');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');

  // Fetch scheduled reports
  const { data: scheduledReports, refetch } = trpc.reporting.getScheduledReports.useQuery({});
  
  // Fetch templates for dropdown
  const { data: templates } = trpc.reporting.getTemplates.useQuery({});

  // Create scheduled report mutation
  const createSchedule = trpc.reporting.createScheduledReport.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      resetForm();
      alert('Scheduled report created successfully!');
    },
    onError: (error) => {
      alert(`Error creating scheduled report: ${error.message}`);
    },
  });

  // Toggle report active status
  const toggleStatus = trpc.reporting.toggleScheduledReport.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Delete scheduled report
  const deleteSchedule = trpc.reporting.deleteScheduledReport.useMutation({
    onSuccess: () => {
      refetch();
      alert('Scheduled report deleted successfully!');
    },
  });

  const resetForm = () => {
    setSelectedTemplate(null);
    setFrequency('weekly');
    setRecipients('');
    setFormat('excel');
  };

  const handleCreateSchedule = () => {
    if (!selectedTemplate) {
      alert('Please select a report template');
      return;
    }

    if (!recipients.trim()) {
      alert('Please enter at least one recipient email');
      return;
    }

    // Validate email format
    const emailList = recipients.split(',').map(e => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    createSchedule.mutate({
      templateId: selectedTemplate,
      frequency,
      recipients,
      format,
      filters: {},
    });
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleStatus.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      deleteSchedule.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scheduled Reports</h1>
            <p className="mt-2 text-gray-600">
              Automate report generation and delivery via email
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Schedule New Report
          </button>
        </div>

        {/* Scheduled Reports List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheduledReports && scheduledReports.length > 0 ? (
                scheduledReports.map((report: ScheduledReport) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.templateName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {report.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={report.recipients}>
                        {report.recipients}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 uppercase">{report.format}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.lastRun ? new Date(report.lastRun).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.nextRun).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(report.id, report.isActive)}
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          report.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {report.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg
                        className="h-12 w-12 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-lg font-medium">No scheduled reports</p>
                      <p className="text-sm mt-1">Create your first scheduled report to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Schedule Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Schedule New Report</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Template *
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a template...</option>
                    {templates?.map((template: any) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['daily', 'weekly', 'monthly'].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setFrequency(freq as any)}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors capitalize ${
                          frequency === freq
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients (comma-separated emails) *
                  </label>
                  <textarea
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="john@example.com, jane@example.com"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['excel', 'pdf', 'csv'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt as any)}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors uppercase ${
                          format === fmt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleCreateSchedule}
                    disabled={createSchedule.isLoading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {createSchedule.isLoading ? 'Creating...' : 'Create Schedule'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
