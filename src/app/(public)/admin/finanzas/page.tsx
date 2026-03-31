'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PrivateHeader from '@/components/PrivateHeader';
import { FileText, Download, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { useDocumentTitle, buildNupciTitle } from '@/hooks/useDocumentTitle';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';

type PriceType = 'PER_PERSON' | 'GLOBAL';

interface ProviderSummary {
  id: string;
  category_id: string;
  category_name: string;
  price_type: PriceType;
  budgeted_price: number | null;
  total_price: number | null;
  paid: number;
}

interface FinanzasData {
  planned_guests: number | null;
  attending_count: number;
  providers: ProviderSummary[];
  gifts: { amount: number; status: string }[];
}

export default function FinanzasPage() {
  const t = useTranslations('admin.finanzas');
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('title'), coupleNames));

  const [data, setData] = useState<FinanzasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plannedGuests, setPlannedGuests] = useState<number | ''>('');
  const [savingGuests, setSavingGuests] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/finanzas');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        if (json.data.planned_guests != null) {
          setPlannedGuests(json.data.planned_guests);
        }
      }
    } catch (error) {
      console.error('Error fetching finanzas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePlannedGuests = async () => {
    if (plannedGuests === '') return;
    setSavingGuests(true);
    try {
      await fetch('/api/admin/wedding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_guests: Number(plannedGuests) }),
      });
      await fetchData();
    } catch (error) {
      console.error('Error saving planned guests:', error);
    } finally {
      setSavingGuests(false);
    }
  };

  const getProjectedExpense = (p: ProviderSummary, guests: number): number => {
    if (!p.budgeted_price) return 0;
    return p.price_type === 'PER_PERSON' ? p.budgeted_price * guests : p.budgeted_price;
  };

  const getRealExpense = (p: ProviderSummary, guests: number): number => {
    if (!p.total_price) return 0;
    return p.price_type === 'PER_PERSON' ? p.total_price * guests : p.total_price;
  };

  const getRealExpenseConfirmed = (p: ProviderSummary, confirmed: number): number => {
    if (!p.total_price) return 0;
    return p.price_type === 'PER_PERSON' ? p.total_price * confirmed : p.total_price;
  };

  const handleExportExcel = () => {
    if (!data) return;
    const rows: string[][] = [];
    const pg = plannedGuests ? Number(plannedGuests) : 0;
    const ac = data.attending_count;

    rows.push([t('title')]);
    rows.push([]);
    rows.push(['', t('projected'), t('real')]);

    // Guests
    rows.push([t('sectionGuests')]);
    rows.push([t('plannedGuests'), pg.toString(), `${pg}(${ac})`]);
    rows.push([]);

    // Ingresos
    const totalGiftsReal = data.gifts.reduce((s, g) => s + g.amount, 0);
    rows.push([t('sectionIncome')]);
    rows.push([t('gifts'), '-', `${totalGiftsReal.toLocaleString()} €`]);
    rows.push([]);

    // Gastos
    rows.push([t('sectionExpenses')]);
    // Group by category
    const categories = [...new Set(data.providers.map(p => p.category_name))];
    categories.forEach(cat => {
      const catProviders = data.providers.filter(p => p.category_name === cat);
      const projCat = catProviders.reduce((s, p) => s + getProjectedExpense(p, pg), 0);
      const realCatGuests = catProviders.reduce((s, p) => s + getRealExpense(p, pg), 0);
      const realCatConfirmed = catProviders.reduce((s, p) => s + getRealExpenseConfirmed(p, ac), 0);
      rows.push([cat, projCat ? `${projCat.toLocaleString()} €` : '-', `${realCatGuests.toLocaleString()}(${realCatConfirmed.toLocaleString()}) €`]);
    });
    rows.push([]);

    const totalProjExpenses = data.providers.reduce((s, p) => s + getProjectedExpense(p, pg), 0);
    const totalRealExpenses = data.providers.reduce((s, p) => s + getRealExpense(p, pg), 0);
    const totalRealConfirmedExpenses = data.providers.reduce((s, p) => s + getRealExpenseConfirmed(p, ac), 0);

    rows.push([t('totalExpenses'), `${totalProjExpenses.toLocaleString()} €`, `${totalRealExpenses.toLocaleString()}(${totalRealConfirmedExpenses.toLocaleString()}) €`]);
    rows.push([]);

    const projBalance = 0 - totalProjExpenses;
    const realBalance = totalGiftsReal - totalRealExpenses;
    const realConfirmedBalance = totalGiftsReal - totalRealConfirmedExpenses;
    rows.push([t('balance'), `${projBalance.toLocaleString()} €`, `${realBalance.toLocaleString()}(${realConfirmedBalance.toLocaleString()}) €`]);

    const totalPaid = data.providers.reduce((s, p) => s + p.paid, 0);
    const totalPending = totalRealExpenses - totalPaid;
    rows.push([t('totalPaid'), '-', `${totalPaid.toLocaleString()} €`]);
    rows.push([t('totalPending'), '-', `${totalPending.toLocaleString()} €`]);

    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cuenta-de-resultados.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (tableRef.current) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('title')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background: #f3f4f6; padding: 8px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; }
              td { padding: 8px; border: 1px solid #d1d5db; }
              .section-header { background: #ede9fe; font-weight: bold; }
              .total-row { background: #f9fafb; font-weight: bold; }
              h1 { font-size: 18px; margin-bottom: 16px; }
              .balance-positive { color: #16a34a; }
              .balance-negative { color: #dc2626; }
            </style>
          </head>
          <body>
            ${tableRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PrivateHeader title={t('title')} backUrl="/admin" />
        <div className="flex items-center justify-center py-20 text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PrivateHeader title={t('title')} backUrl="/admin" />
        <div className="flex items-center justify-center py-20 text-gray-500">{t('noData')}</div>
      </div>
    );
  }

  const pg = plannedGuests ? Number(plannedGuests) : 0;
  const ac = data.attending_count;

  // Group providers by category
  const categoriesMap: Record<string, ProviderSummary[]> = {};
  data.providers.forEach(p => {
    if (!categoriesMap[p.category_name]) categoriesMap[p.category_name] = [];
    categoriesMap[p.category_name].push(p);
  });

  const totalGiftsReal = data.gifts.reduce((s, g) => s + g.amount, 0);
  const totalProjExpenses = data.providers.reduce((s, p) => s + getProjectedExpense(p, pg), 0);
  const totalRealExpensesGuests = data.providers.reduce((s, p) => s + getRealExpense(p, pg), 0);
  const totalRealExpensesConfirmed = data.providers.reduce((s, p) => s + getRealExpenseConfirmed(p, ac), 0);
  const totalPaid = data.providers.reduce((s, p) => s + p.paid, 0);
  const totalPending = totalRealExpensesGuests - totalPaid;

  const projBalance = -totalProjExpenses;
  const realBalanceGuests = totalGiftsReal - totalRealExpensesGuests;
  const realBalanceConfirmed = totalGiftsReal - totalRealExpensesConfirmed;

  const fmtCurrency = (val: number) => `${val.toLocaleString()} €`;
  const fmtDualReal = (guests: number, confirmed: number) => (
    <span>
      {fmtCurrency(guests)}<span className="text-gray-400 text-xs ml-1">({fmtCurrency(confirmed)})</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <PrivateHeader title={t('title')} backUrl="/admin" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Planned guests input */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-blue-800 whitespace-nowrap">
              {t('plannedGuests')}
            </label>
            <Input
              type="number"
              min={1}
              value={plannedGuests}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPlannedGuests(e.target.value ? Number(e.target.value) : '')
              }
              onBlur={handleSavePlannedGuests}
              className="w-32 bg-white"
              placeholder="0"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSavePlannedGuests}
              disabled={savingGuests || plannedGuests === ''}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {savingGuests ? t('saving') : t('save')}
            </Button>
            <p className="text-xs text-blue-600">
              {t('confirmedGuests')}: <strong>{ac}</strong>
            </p>
          </div>
        </Card>

        {/* Export buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            {t('exportExcel')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            {t('exportPDF')}
          </Button>
        </div>

        {/* Main table */}
        <div ref={tableRef}>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-700 w-1/2">{t('concept')}</th>
                <th className="text-right px-4 py-3 bg-violet-50 border border-gray-200 text-sm font-semibold text-violet-700">{t('projected')}</th>
                <th className="text-right px-4 py-3 bg-blue-50 border border-gray-200 text-sm font-semibold text-blue-700">
                  {t('real')}
                  <div className="text-xs font-normal text-blue-500">{t('realHint')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* GUESTS SECTION */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 border border-gray-200 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t('sectionGuests')}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700">{t('guestCount')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-violet-700 font-medium">{pg}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-blue-700 font-medium">
                  {pg}<span className="text-gray-400 text-xs ml-1">({ac})</span>
                </td>
              </tr>

              {/* INCOME SECTION */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 border border-gray-200 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {t('sectionIncome')}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700 pl-8">{t('gifts')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-gray-400">-</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-green-600 font-medium">
                  {fmtCurrency(totalGiftsReal)}
                  <span className="text-gray-400 text-xs ml-1">({fmtCurrency(totalGiftsReal)})</span>
                </td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-4 py-3 border border-gray-200 text-sm font-semibold text-gray-800">{t('totalIncome')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-bold text-gray-400">-</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-bold text-green-700">{fmtDualReal(totalGiftsReal, totalGiftsReal)}</td>
              </tr>

              {/* EXPENSES SECTION */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 border border-gray-200 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    {t('sectionExpenses')}
                  </div>
                </td>
              </tr>
              {Object.entries(categoriesMap).map(([catName, catProviders]) => {
                const projCat = catProviders.reduce((s, p) => s + getProjectedExpense(p, pg), 0);
                const realCatGuests = catProviders.reduce((s, p) => s + getRealExpense(p, pg), 0);
                const realCatConfirmed = catProviders.reduce((s, p) => s + getRealExpenseConfirmed(p, ac), 0);
                const priceType = catProviders[0]?.price_type;
                return (
                  <tr key={catName}>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700 pl-8">
                      {catName}
                      {priceType === 'PER_PERSON' && (
                        <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {t('perPerson')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-right text-violet-600 font-medium">
                      {projCat ? fmtCurrency(projCat) : '-'}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-right text-red-600 font-medium">
                      {realCatGuests || realCatConfirmed ? fmtDualReal(realCatGuests, realCatConfirmed) : '-'}
                    </td>
                  </tr>
                );
              })}
              {data.providers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 border border-gray-200 text-center text-gray-400 text-sm">{t('noExpenses')}</td>
                </tr>
              )}
              <tr className="bg-red-50">
                <td className="px-4 py-3 border border-gray-200 text-sm font-semibold text-gray-800">{t('totalExpenses')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-bold text-violet-700">{fmtCurrency(totalProjExpenses)}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-bold text-red-700">{fmtDualReal(totalRealExpensesGuests, totalRealExpensesConfirmed)}</td>
              </tr>

              {/* BALANCE */}
              <tr className="bg-gray-100">
                <td className="px-4 py-3 border border-gray-200 text-sm font-bold text-gray-900 uppercase">{t('balance')}</td>
                <td className={`px-4 py-3 border border-gray-200 text-sm text-right font-bold ${projBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmtCurrency(projBalance)}
                </td>
                <td className={`px-4 py-3 border border-gray-200 text-sm text-right font-bold`}>
                  <span className={realBalanceGuests >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {fmtCurrency(realBalanceGuests)}
                  </span>
                  <span className={`text-xs ml-1 ${realBalanceConfirmed >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    ({fmtCurrency(realBalanceConfirmed)})
                  </span>
                </td>
              </tr>

              {/* PAYMENTS */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 border border-gray-200 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  {t('sectionPayments')}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700 pl-8">{t('totalPaid')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-gray-400">-</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-semibold text-green-700">{fmtCurrency(totalPaid)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700 pl-8">{t('totalPending')}</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right text-gray-400">-</td>
                <td className="px-4 py-3 border border-gray-200 text-sm text-right font-semibold text-red-700">{fmtCurrency(totalPending)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 text-center border-violet-200 bg-violet-50">
            <p className="text-xs text-violet-600 font-medium uppercase mb-1">{t('totalProjected')}</p>
            <p className="text-xl font-bold text-violet-800">{fmtCurrency(totalProjExpenses)}</p>
          </Card>
          <Card className="p-4 text-center border-blue-200 bg-blue-50">
            <p className="text-xs text-blue-600 font-medium uppercase mb-1">{t('totalReal')}</p>
            <p className="text-lg font-bold text-blue-800">{fmtCurrency(totalRealExpensesGuests)}</p>
            <p className="text-xs text-blue-500">({fmtCurrency(totalRealExpensesConfirmed)})</p>
          </Card>
          <Card className="p-4 text-center border-green-200 bg-green-50">
            <p className="text-xs text-green-600 font-medium uppercase mb-1">{t('totalPaid')}</p>
            <p className="text-xl font-bold text-green-800">{fmtCurrency(totalPaid)}</p>
          </Card>
          <Card className="p-4 text-center border-red-200 bg-red-50">
            <p className="text-xs text-red-600 font-medium uppercase mb-1">{t('totalPending')}</p>
            <p className="text-xl font-bold text-red-800">{fmtCurrency(totalPending)}</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
