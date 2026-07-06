/**
 * FinancialDashboard.tsx — T45 client-side update.
 *
 * Changes from T44 broken state:
 *   - Imports shared types (FinancialMetrics, FieldManagerMetrics, MafMetrics)
 *     from shared/types/financial.ts — Rule #89 / Pattern #65 prevention
 *   - Field references updated to match shared type names:
 *     - metrics.totalInvoiceAmount (was metrics.totalInvoices — was SUM, displayed raw)
 *     - metrics.totalPaymentAmount (was metrics.totalPayments — was SUM, displayed raw)
 *     - metrics.outstandingBalance (was metrics.outstandingBalance — already correct)
 *     - metrics.invoiceCount (was metrics.totalInvoices used as count — wrong)
 *     - metrics.paymentCount (was metrics.totalPayments used as count — wrong)
 *     - fm.invoiceCount (was fm.totalInvoices — undefined)
 *     - fm.invoiceTotal (was fm.totalInvoiceAmount — undefined)
 *     - fm.paymentCount (was fm.totalPayments — undefined)
 *     - fm.paymentTotal (was fm.totalPaymentAmount — undefined)
 *     - fm.outstanding (was fm.outstandingBalance — undefined)
 *   - formatCurrency applied to all currency displays (T32 Rule #66)
 *   - Large metric cards now show formatted currency amounts (not raw numbers)
 *   - Filter dropdowns wired to getMetrics via selectedFieldManager/selectedMAF params
 *   - Payment attribution cells show "0" with tooltip (T46+ pending)
 *   - MAF dropdown handles null maf → "(No MAF set)" display
 *   - "Clear filters" button added for all-time view
 */
import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../hooks/useAuth';
import MainLayout from './MainLayout';
import AppHeader from './AppHeader';
import { INVOICE_STATUS } from '@shared/constants/invoice-status';
import { formatCurrency } from '@/utils/currency';
import type { FinancialMetrics, FieldManagerMetrics, MafMetrics } from '@shared/types/financial';

const NULL_MAF_DISPLAY = '(No MAF set)';

export function FinancialDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedFieldManager, setSelectedFieldManager] = useState<string>('all');
  const [selectedMAF, setSelectedMAF] = useState<string>('all');
  // When true, omit date filter from queries (all-time view)
  const [allTime, setAllTime] = useState<boolean>(false);

  const dateParams = allTime
    ? {}
    : { startDate: dateRange.start, endDate: dateRange.end };

  const fmParam = selectedFieldManager !== 'all' ? selectedFieldManager : undefined;
  const mafParam = selectedMAF !== 'all' ? (selectedMAF === '__null__' ? null : selectedMAF) : undefined;

  // Fetch overall metrics — wired to date + FM + MAF filters (T45 Root Cause B + C fix)
  const { data: metrics, isLoading: metricsLoading } = trpc.financial.getMetrics.useQuery({
    ...dateParams,
    fieldManagerId: fmParam ?? undefined,
    maf: mafParam ?? undefined,
  });

  // Fetch metrics by field manager — worker-driven source (T45 Root Cause C fix)
  const { data: fieldManagerMetrics, isLoading: fmLoading } = trpc.financial.getMetricsByFieldManager.useQuery({
    ...dateParams,
  });

  // Fetch metrics by MAF — customer-driven source (T45 Root Cause C fix)
  const { data: mafMetrics, isLoading: mafLoading } = trpc.financial.getMetricsByMAF.useQuery({
    ...dateParams,
  });

  // Fetch recent invoices — date + FM + MAF filters applied (T45)
  const { data: recentInvoices, isLoading: invoicesLoading } = trpc.financial.getInvoices.useQuery({
    limit: 10,
    ...dateParams,
    fieldManagerId: fmParam ?? undefined,
    maf: mafParam ?? undefined,
  });

  // Fetch recent payments — date filter applied (T45)
  const { data: recentPayments, isLoading: paymentsLoading } = trpc.financial.getPayments.useQuery({
    limit: 10,
    ...dateParams,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Computed: % collected = totalPaymentAmount / totalInvoiceAmount
  const pctCollected = metrics && metrics.totalInvoiceAmount > 0
    ? ((metrics.totalPaymentAmount / metrics.totalInvoiceAmount) * 100).toFixed(1)
    : '—';

  return (
    <MainLayout>
      <AppHeader
        title="Financial Dashboard"
        subtitle="Zoho Books Integration - Invoices & Payments Analytics"
        showBackButton={true}
      />

      <div className="p-6 space-y-6">
        {/* Filter Options */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filter Options</h3>
            <button
              onClick={() => {
                setAllTime(true);
                setSelectedFieldManager('all');
                setSelectedMAF('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters (all-time view)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setAllTime(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setAllTime(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Manager</label>
              <select
                value={selectedFieldManager}
                onChange={(e) => setSelectedFieldManager(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Field Managers</option>
                {(fieldManagerMetrics as FieldManagerMetrics[] | undefined)?.map((fm) => (
                  <option key={fm.fieldManagerId} value={fm.fieldManagerId}>
                    {fm.fieldManagerName || fm.fieldManagerId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAF</label>
              <select
                value={selectedMAF}
                onChange={(e) => setSelectedMAF(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All MAFs</option>
                {(mafMetrics as MafMetrics[] | undefined)?.map((m) => (
                  <option key={m.maf ?? '__null__'} value={m.maf ?? '__null__'}>
                    {m.maf ?? NULL_MAF_DISPLAY}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {allTime && (
            <p className="text-xs text-blue-600 mt-2">Showing all-time data. Select dates to filter by range.</p>
          )}
        </div>

        {/* Overall Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Invoices */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {metricsLoading ? '...' : formatCurrency((metrics as FinancialMetrics | undefined)?.totalInvoiceAmount ?? 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {metricsLoading ? '...' : `${(metrics as FinancialMetrics | undefined)?.invoiceCount ?? 0} invoice(s)`}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Payments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {metricsLoading ? '...' : formatCurrency((metrics as FinancialMetrics | undefined)?.totalPaymentAmount ?? 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {metricsLoading ? '...' : `${(metrics as FinancialMetrics | undefined)?.paymentCount ?? 0} payment(s)`}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {metricsLoading ? '...' : formatCurrency((metrics as FinancialMetrics | undefined)?.outstandingBalance ?? 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {metricsLoading ? '...' : `${pctCollected}% collected`}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics by Field Manager */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Metrics by Field Manager</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payments
                    <span
                      className="ml-1 text-gray-400 cursor-help"
                      title="Payment attribution by field manager pending. zohoPayments has no fieldManagerId column. See T46+ roadmap."
                    >
                      ⓘ
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Amount
                    <span
                      className="ml-1 text-gray-400 cursor-help"
                      title="Payment attribution by field manager pending. zohoPayments has no fieldManagerId column. See T46+ roadmap."
                    >
                      ⓘ
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fmLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : fieldManagerMetrics && fieldManagerMetrics.length > 0 ? (
                  (fieldManagerMetrics as FieldManagerMetrics[]).map((fm) => (
                    <tr key={fm.fieldManagerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {fm.fieldManagerName || fm.fieldManagerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fm.invoiceCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(fm.invoiceTotal)}</td>
                      {/* Payment attribution pending T46+ — hardcoded 0 */}
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 italic"
                        title="Payment attribution by field manager pending. See T46+ roadmap."
                      >
                        0
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 italic"
                        title="Payment attribution by field manager pending. See T46+ roadmap."
                      >
                        {formatCurrency(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        {formatCurrency(fm.outstanding)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAF</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : recentInvoices && recentInvoices.length > 0 ? (
                  (recentInvoices as any[]).map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.maf || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === INVOICE_STATUS.PAID ? 'bg-green-100 text-green-800' :
                          invoice.status === INVOICE_STATUS.PARTIALLY_PAID ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No invoices found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : recentPayments && recentPayments.length > 0 ? (
                  (recentPayments as any[]).map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {payment.paymentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{payment.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.paymentDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.paymentMode}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No payments found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
