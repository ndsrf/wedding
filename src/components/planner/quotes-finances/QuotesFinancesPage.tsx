'use client';

import { useState } from 'react';
import { ContractsList } from './contracts/ContractsList';
import { QuotesList } from './quotes/QuotesList';
import { InvoicesList } from './invoices/InvoicesList';

type Tab = 'quotes' | 'contracts' | 'invoices';

interface FinancialSummary {
  total_quotes: number;
  accepted_quotes: number;
  invoiced_total: number;
  amount_received: number;
  currency: string;
}

const VALID_TABS = ['quotes', 'contracts', 'invoices'] as const;

interface QuotesFinancesPageProps {
  summary?: FinancialSummary;
  initialTab?: string;
}

const TABS = [
  { id: 'quotes' as Tab, label: 'Quotes', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
  { id: 'contracts' as Tab, label: 'Contracts', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  )},
  { id: 'invoices' as Tab, label: 'Invoices & Payments', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
];

export function QuotesFinancesPage({ summary, initialTab }: QuotesFinancesPageProps) {
  const resolvedInitial = VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'quotes';
  const [activeTab, setActiveTab] = useState<Tab>(resolvedInitial);

  const defaultCurrency = summary?.currency ?? 'EUR';

  function fmt(amount: number) {
    return new Intl.NumberFormat('en', { style: 'currency', currency: defaultCurrency, maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-gray-900">{summary.total_quotes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Quotes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-green-600">{summary.accepted_quotes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Accepted</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-gray-900">{fmt(summary.invoiced_total)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Invoiced</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-rose-600">{fmt(summary.amount_received)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Received</p>
            {summary.invoiced_total > 0 && (
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((summary.amount_received / summary.invoiced_total) * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'quotes' && <QuotesList />}
          {activeTab === 'contracts' && <ContractsList />}
          {activeTab === 'invoices' && <InvoicesList />}
        </div>
      </div>
    </div>
  );
}
