'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowLeft, Loader2, Sparkles, Receipt, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Card, Button } from '@ims/shared-ui';
import { toast } from 'sonner';
import Link from 'next/link';
import { PricingPanel } from '../../_components/pricing-panel';
import { createEnrollmentWithBillingAction } from '../actions';

interface AdmissionsListItem {
  id: string;
  studentProfileId: string;
  courseId: string;
  branchId: string;
  label: string;
}

interface BatchItem {
  id: string;
  code: string;
  courseId: string;
}

interface CreateEnrollmentClientProps {
  admissions: AdmissionsListItem[];
  batches: BatchItem[];
}

export function CreateEnrollmentClient({
  admissions,
  batches,
}: CreateEnrollmentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic enrollment state
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<
    'Regular' | 'Corporate' | 'Online'
  >('Regular');
  
  // Pricing state
  const [pricingPreview, setPricingPreview] = useState<{
    pricingSource: string;
    resolvedPrice: string;
    resolvedDiscount: string;
    finalAmount: string;
    paymentValidationRequired: boolean;
    priceEvaluationTimestamp: string | null;
  } | null>(null);
  
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<string[]>([]);

  // Invoice config state
  const [invoiceSubCategory, setInvoiceSubCategory] = useState<
    'FullPayment' | 'Advance' | 'PartialPayment' | 'Installment'
  >('FullPayment');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(5);
  const [lineItems, setLineItems] = useState<
    Array<{
      descriptionEnglish: string;
      quantity: number;
      unitPrice: number;
      isDiscount: boolean;
      enrollmentId: string | null;
      courseId: string | null;
      sourceBranchId: string;
    }>
  >([]);

  const [numberOfInstallments, setNumberOfInstallments] = useState(2);
  const [installments, setInstallments] = useState<Array<{ dueDate: string; amount: string }>>([]);

  // Payment collection state
  const [paymentCollected, setPaymentCollected] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'BankTransfer' | 'Card' | 'Online' | 'Cheque'>('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');

  const selectedAdmission = admissions.find((a) => a.id === selectedAdmissionId);
  const filteredBatches = selectedAdmission
    ? batches.filter((b) => b.courseId === selectedAdmission.courseId)
    : [];

  // 1. Resolve course pricing
  useEffect(() => {
    let cancelled = false;
    if (!selectedAdmission || !selectedBatchId) {
      setPricingPreview(null);
      setPricingError(null);
      return;
    }

    const refreshPricing = async () => {
      setPricingLoading(true);
      setPricingError(null);

      try {
        const customerType = enrollmentType === 'Corporate' ? 'Corporate' : 'Individual';
        const promoQuery =
          appliedPromoCodes.length > 0
            ? `&promoCodes=${encodeURIComponent(appliedPromoCodes.join(','))}`
            : '';
        const response = await fetch(
          `/api/v1/courses/${selectedAdmission.courseId}/pricing/resolve?customerType=${encodeURIComponent(customerType)}&branchId=${selectedAdmission.branchId}&batchId=${selectedBatchId}${promoQuery}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to resolve pricing.');
        }

        if (!cancelled) {
          const resolvedDiscount = (data.data.applicableDiscounts ?? []).reduce(
            (
              sum: number,
              discount: { discountValue: number; discountMode: string },
            ) => {
              const val =
                discount.discountMode === 'Percentage'
                  ? (Number(data.data.basePrice) * discount.discountValue) / 100
                  : discount.discountValue;
              return sum + val;
            },
            0,
          );
          const finalAmount = Number(data.data.totalPrice);
          setPricingPreview({
            pricingSource: data.data.pricingSource,
            resolvedPrice: String(data.data.basePrice),
            resolvedDiscount: String(resolvedDiscount),
            finalAmount: String(Math.max(0, finalAmount - resolvedDiscount)),
            paymentValidationRequired:
              Math.max(0, finalAmount - resolvedDiscount) > 0,
            priceEvaluationTimestamp: new Date().toISOString(),
          });

          // Re-initialize custom line items table when new pricing is resolved
          const defaultItems = [
            {
              descriptionEnglish: `Course Fee: Tuition`,
              quantity: 1,
              unitPrice: Number(data.data.basePrice),
              isDiscount: false,
              enrollmentId: null,
              courseId: selectedAdmission.courseId,
              sourceBranchId: selectedAdmission.branchId,
            },
          ];
          if (resolvedDiscount > 0) {
            defaultItems.push({
              descriptionEnglish: `Discount: Scholarship/Promo`,
              quantity: 1,
              unitPrice: resolvedDiscount,
              isDiscount: true,
              enrollmentId: null,
              courseId: selectedAdmission.courseId,
              sourceBranchId: selectedAdmission.branchId,
            });
          }
          setLineItems(defaultItems);
        }
      } catch (error) {
        if (!cancelled) {
          setPricingPreview(null);
          setPricingError((error as Error).message || 'Failed to resolve pricing.');
        }
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    };

    void refreshPricing();

    return () => {
      cancelled = true;
    };
  }, [selectedAdmission, selectedBatchId, enrollmentType, appliedPromoCodes]);

  // Compute live subtotal, discount, VAT, and Net Amount from configurable line items state
  const subtotal = lineItems.reduce((sum, item) => {
    if (item.isDiscount) return sum;
    return sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
  }, 0);

  const totalDiscount = lineItems.reduce((sum, item) => {
    if (!item.isDiscount) return sum;
    return sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
  }, 0);

  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const vatAmount = Number((taxableAmount * (taxRate / 100)).toFixed(3));
  const finalInvoiceTotal = Number((taxableAmount + vatAmount).toFixed(3));

  // Pre-fill payment collection amount based on resolved pricing & subcategory
  useEffect(() => {
    if (invoiceSubCategory === 'FullPayment') {
      setPaymentCollected(String(finalInvoiceTotal));
    } else if (invoiceSubCategory === 'Installment') {
      // Auto plan installments first
      const baseAmount = Math.floor((finalInvoiceTotal / numberOfInstallments) * 1000) / 1000;
      const diff = Number((finalInvoiceTotal - baseAmount * numberOfInstallments).toFixed(3));
      const firstInstallment = Number((baseAmount + diff).toFixed(3));
      
      const plans = [];
      for (let i = 0; i < numberOfInstallments; i++) {
        const date = new Date(invoiceDate || new Date());
        date.setMonth(date.getMonth() + i + 1);
        plans.push({
          dueDate: date.toISOString().split('T')[0],
          amount: String(i === 0 ? firstInstallment : baseAmount),
        });
      }
      setInstallments(plans);
      // Default payment collected to first installment amount
      setPaymentCollected(String(firstInstallment));
    } else if (invoiceSubCategory === 'Advance' || invoiceSubCategory === 'PartialPayment') {
      const half = Number((finalInvoiceTotal / 2).toFixed(3));
      setPaymentCollected(String(half));
    }
  }, [finalInvoiceTotal, invoiceSubCategory, numberOfInstallments, invoiceDate]);

  const handleLineItemChange = (index: number, field: string, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        descriptionEnglish: 'Registration / Resource pack fees',
        quantity: 1,
        unitPrice: 0,
        isDiscount: false,
        enrollmentId: null,
        courseId: selectedAdmission?.courseId || null,
        sourceBranchId: selectedAdmission?.branchId || '',
      },
    ]);
  };

  const deleteLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error('At least one line item is required.');
      return;
    }
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmissionId) {
      toast.error('Please select an approved admission profile.');
      return;
    }
    if (!selectedBatchId) {
      toast.error('Please select a batch assignment.');
      return;
    }

    const paidAmount = Number(paymentCollected);

    if (paidAmount < 0) {
      toast.error('Payment collected amount cannot be negative.');
      return;
    }

    if (paidAmount > finalInvoiceTotal) {
      toast.error(`Payment collected (${paidAmount} OMR) cannot exceed Net invoice amount (${finalInvoiceTotal} OMR).`);
      return;
    }

    // If installment structure, validate summation
    if (invoiceSubCategory === 'Installment') {
      const sum = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
      if (Math.abs(sum - finalInvoiceTotal) > 0.01) {
        toast.error(`Sum of installments (${sum.toFixed(3)} OMR) must exactly match net invoice total (${finalInvoiceTotal.toFixed(3)} OMR).`);
        return;
      }
    }

    startTransition(async () => {
      const res = await createEnrollmentWithBillingAction({
        studentProfileId: selectedAdmission?.studentProfileId,
        admissionId: selectedAdmissionId,
        courseId: selectedAdmission?.courseId,
        batchId: selectedBatchId,
        enrollmentType,
        promoCodes: appliedPromoCodes,
        invoiceSubCategory,
        invoiceDate,
        invoiceDueDate,
        taxRate,
        lineItems,
        numberOfInstallments,
        installments,
        paymentCollected: paidAmount,
        paymentMethod,
        paymentDate,
        paymentReference,
        paymentRemarks,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to submit enrollment.');
        return;
      }

      toast.success('Enrollment, custom invoice, and payment recorded successfully!');
      router.push(`/enrollments/${res.data?.enrollmentId}`);
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/enrollments" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-indigo-600" />
              Setup Student Enrollment & Billing
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-7">
            Setup enrollment, configure custom invoice items and VAT %, and record manual receipt in a single page.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Setup Details */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-50 pb-2 flex items-center gap-1.5 font-outfit">
              <GraduationCap className="h-4.5 w-4.5 text-indigo-600" />
              1. Enrollment Details
            </h4>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admissions Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Approved Admission Profile
                  </label>
                  <select
                    value={selectedAdmissionId}
                    onChange={(e) => {
                      setSelectedAdmissionId(e.target.value);
                      setSelectedBatchId('');
                    }}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                    required
                  >
                    <option value="">-- Select Approved Student --</option>
                    {admissions.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enrollment Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Enrollment Type
                  </label>
                  <select
                    value={enrollmentType}
                    onChange={(e) => setEnrollmentType(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  >
                    <option value="Regular">Regular (Individual)</option>
                    <option value="Corporate">Corporate Sourced</option>
                    <option value="Online">Online Intake</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Batch Assignment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Target Learning Batch
                  </label>
                  <select
                    value={selectedBatchId}
                    disabled={!selectedAdmissionId || filteredBatches.length === 0}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    required
                  >
                    <option value="">
                      {!selectedAdmissionId
                        ? '-- Select Student Admission First --'
                        : filteredBatches.length === 0
                          ? '-- No Active Batches for this Course --'
                          : '-- Choose Batch --'}
                    </option>
                    {filteredBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Promo codes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Promo Codes (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, OMAN5"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const codes = promoInput
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setAppliedPromoCodes(codes);
                        toast.success('Promo codes applied!');
                      }}
                      variant="outline"
                      className="h-10 text-xs font-medium border-slate-300 hover:bg-slate-50"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Billing & Invoice Config */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-50 pb-2 flex items-center gap-1.5 font-outfit">
              <Receipt className="h-4.5 w-4.5 text-indigo-600" />
              2. Billing & Invoice Configuration
            </h4>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Billing Subcategory</label>
                  <select
                    value={invoiceSubCategory}
                    onChange={(e) => setInvoiceSubCategory(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  >
                    <option value="FullPayment">Full Payment</option>
                    <option value="Advance">Advance Payment</option>
                    <option value="PartialPayment">Partial Payment</option>
                    <option value="Installment">Installment Plan</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Payment Due Date</label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Configurable invoice line items table (similar to invoices/create) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">Invoice Line Items</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedAdmissionId}
                    onClick={addLineItem}
                    className="text-xs flex items-center gap-1 border-slate-200 py-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse bg-white">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 w-8 text-center">#</th>
                        <th className="p-3">Description (English)</th>
                        <th className="p-3 w-16 text-center">Qty</th>
                        <th className="p-3 w-28 text-right">Unit Price</th>
                        <th className="p-3 w-20 text-center">Discount?</th>
                        <th className="p-3 w-10 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            Select student profile and batch to populate course fees.
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.descriptionEnglish}
                                onChange={(e) => handleLineItemChange(index, 'descriptionEnglish', e.target.value)}
                                className="w-full h-8 rounded border border-slate-200 text-xs px-2 focus:outline-none"
                                required
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-12 h-8 rounded border border-slate-200 text-xs text-center focus:outline-none"
                                required
                              />
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-20 h-8 rounded border border-slate-200 text-xs text-right px-2 focus:outline-none font-mono"
                                  required
                                />
                                <span className="text-[10px] text-slate-400">OMR</span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.isDiscount}
                                onChange={(e) => handleLineItemChange(index, 'isDiscount', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => deleteLineItem(index)}
                                className="text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installment Plan Scheduler */}
              {invoiceSubCategory === 'Installment' && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Installment Schedule Planner</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600">Count:</span>
                      <select
                        value={numberOfInstallments}
                        onChange={(e) => setNumberOfInstallments(Number(e.target.value))}
                        className="h-8 rounded border border-slate-300 bg-white text-xs px-2 focus:outline-none"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                          <option key={num} value={num}>{num} Parts</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {installments.map((inst, index) => (
                      <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 w-8">#{index + 1}</span>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => {
                            const copy = [...installments];
                            copy[index].dueDate = e.target.value;
                            setInstallments(copy);
                          }}
                          className="h-8 rounded border border-slate-200 text-xs px-2 focus:outline-none flex-1"
                        />
                        <div className="flex items-center gap-1 w-28">
                          <input
                            type="number"
                            step="0.001"
                            value={inst.amount}
                            onChange={(e) => {
                              const copy = [...installments];
                              copy[index].amount = e.target.value;
                              setInstallments(copy);
                            }}
                            className="h-8 rounded border border-slate-200 text-xs px-2 focus:outline-none w-full text-right font-mono"
                          />
                          <span className="text-xs text-slate-400">OMR</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-right text-xs text-slate-500 font-medium">
                    Scheduled Total:{' '}
                    <span className="font-semibold text-indigo-600 font-mono">
                      {installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0).toFixed(3)} OMR
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Card 3: Payment details */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-50 pb-2 flex items-center gap-1.5 font-outfit">
              <CreditCard className="h-4.5 w-4.5 text-indigo-600" />
              3. Record Payment Collection (Manual)
            </h4>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Amount Collected</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      value={paymentCollected}
                      onChange={(e) => setPaymentCollected(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-3 pr-12 text-sm focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold font-mono">OMR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Card">Card Reader</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online Link</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reference / Receipt Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-998877, CHQ-204"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid first semester fees"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Resolved Pricing Preview & Creation Panel */}
        <div className="space-y-6">
          <Card className="bg-white border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
              Summary & Submit
            </h4>

            <div className="space-y-4">
              {pricingLoading && (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-500 ml-2">Resolving pricing snapshot…</span>
                </div>
              )}
              
              {pricingError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{pricingError}</p>
              )}

              {!pricingPreview && !pricingLoading && !pricingError && (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Select student and batch to preview pricing resolution.
                </p>
              )}

              {pricingPreview && (
                <div className="space-y-4">
                  <PricingPanel
                    pricingSource={pricingPreview.pricingSource}
                    resolvedPrice={pricingPreview.resolvedPrice}
                    resolvedDiscount={pricingPreview.resolvedDiscount}
                    finalAmount={pricingPreview.finalAmount}
                    paymentValidationRequired={pricingPreview.paymentValidationRequired}
                    priceEvaluationTimestamp={pricingPreview.priceEvaluationTimestamp}
                  />

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5 font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span>Invoice Subtotal:</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {subtotal.toFixed(3)} OMR
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Total discount:</span>
                      <span className="font-mono font-semibold">
                        -{totalDiscount.toFixed(3)} OMR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({taxRate}%):</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {vatAmount.toFixed(3)} OMR
                      </span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span>Net Invoice Amount:</span>
                      <span className="font-mono font-bold">
                        {finalInvoiceTotal.toFixed(3)} OMR
                      </span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between text-emerald-600">
                      <span>Payment Recorded:</span>
                      <span className="font-mono font-bold">
                        {Number(paymentCollected || 0).toFixed(3)} OMR
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Outstanding Due:</span>
                      <span className="font-mono font-bold">
                        {Math.max(0, finalInvoiceTotal - Number(paymentCollected || 0)).toFixed(3)} OMR
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Link href="/enrollments" className="flex-1">
                  <Button variant="outline" type="button" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isPending || !selectedAdmissionId || !selectedBatchId}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Submit Intake
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
