'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Checkbox,
  Badge,
} from '@ims/shared-ui';
import { Plus, Tag, GraduationCap, DollarSign, Calendar, RefreshCw, Landmark, Info, AlertCircle, Check, ArrowLeft } from 'lucide-react';

interface BranchOption {
  id: string;
  branchName: string;
  branchCode: string;
}

interface BatchOption {
  id: string;
  batchCode: string;
  batchNameEnglish: string;
}

interface CourseConfigsPanelProps {
  courseId: string;
  branches: BranchOption[];
  batches: BatchOption[];
}

// --- Zod Validation Schemas ---
const pricingFormSchema = z.object({
  branchId: z.string().optional(),
  batchId: z.string().optional(),
  customerType: z.enum(['Individual', 'Corporate', 'WalkIn']),
  batchType: z.string().min(1, 'Batch type is required'),
  currency: z.literal('OMR'),
  basePrice: z.coerce.number().positive('Price must be greater than zero'),
  taxPercentage: z.coerce.number().nonnegative('Tax percentage cannot be negative').default(5),
  isTaxExempt: z.boolean().default(false),
  taxExemptionReason: z.string().optional(),
  taxExemptionCode: z.string().optional(),
  effectiveStartDate: z.string().nonempty('Start date is required'),
  effectiveEndDate: z.string().optional(),
}).refine((data) => {
  if (data.isTaxExempt) {
    return !!data.taxExemptionReason && !!data.taxExemptionCode;
  }
  return true;
}, {
  message: 'Reason and Code are required for tax exemption',
  path: ['taxExemptionReason'],
});

const discountFormSchema = z.object({
  branchId: z.string().optional(),
  batchId: z.string().optional(),
  discountType: z.enum(['Individual', 'Corporate', 'EarlyBird']),
  discountMode: z.enum(['Percentage', 'FixedAmount']),
  discountValue: z.coerce.number().positive('Value must be greater than zero'),
  requiresApproval: z.boolean().default(false),
  effectiveStartDate: z.string().nonempty('Start date is required'),
  effectiveEndDate: z.string().optional(),
});

const completionRuleFormSchema = z.object({
  minimumAttendancePercent: z.coerce.number().int().min(0).max(100, 'Percent must be between 0 and 100'),
  examRequired: z.boolean().default(false),
  feeClearanceRequired: z.boolean().default(true),
  manualApprovalRequired: z.boolean().default(false),
  effectiveStartDate: z.string().nonempty('Start date is required'),
  effectiveEndDate: z.string().optional(),
});

export function CourseConfigsPanel({ courseId, branches, batches }: CourseConfigsPanelProps) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'discounts' | 'rules'>('pricing');

  // Lists State
  const [pricings, setPricings] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer States
  const [drawerType, setDrawerType] = useState<'create-pricing' | 'view-pricing' | 'create-discount' | 'view-discount' | 'create-rule' | 'view-rule' | null>(null);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [activeRecordLogs, setActiveRecordLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form Hooks
  const pricingForm = useForm({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      branchId: '',
      batchId: '',
      customerType: 'Individual' as const,
      batchType: 'Regular',
      currency: 'OMR' as const,
      basePrice: 0,
      taxPercentage: 5,
      isTaxExempt: false,
      taxExemptionReason: '',
      taxExemptionCode: '',
      effectiveStartDate: new Date().toISOString().split('T')[0],
      effectiveEndDate: '',
    },
  });

  const discountForm = useForm({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      branchId: '',
      batchId: '',
      discountType: 'Individual' as const,
      discountMode: 'Percentage' as const,
      discountValue: 0,
      requiresApproval: false,
      effectiveStartDate: new Date().toISOString().split('T')[0],
      effectiveEndDate: '',
    },
  });

  const ruleForm = useForm({
    resolver: zodResolver(completionRuleFormSchema),
    defaultValues: {
      minimumAttendancePercent: 80,
      examRequired: false,
      feeClearanceRequired: true,
      manualApprovalRequired: false,
      effectiveStartDate: new Date().toISOString().split('T')[0],
      effectiveEndDate: '',
    },
  });

  const isPricingTaxExempt = pricingForm.watch('isTaxExempt');
  const isSubmittingPricing = pricingForm.formState.isSubmitting;
  const isSubmittingDiscount = discountForm.formState.isSubmitting;
  const isSubmittingRule = ruleForm.formState.isSubmitting;

  // Fetch Lists
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricingRes, discountRes, rulesRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/pricing`),
        fetch(`/api/v1/courses/${courseId}/discounts`),
        fetch(`/api/v1/courses/${courseId}/completion-rules`),
      ]);

      if (pricingRes.ok) {
        const json = await pricingRes.json();
        setPricings(json.data || []);
      }
      if (discountRes.ok) {
        const json = await discountRes.json();
        setDiscounts(json.data || []);
      }
      if (rulesRes.ok) {
        const json = await rulesRes.json();
        setRules(json.data || []);
      }
    } catch (err) {
      toast.error('Failed to load configurations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  // Fetch Audit Logs for View Drawer
  const fetchAuditLogs = async (entityType: 'CoursePricing' | 'CourseDiscount' | 'CourseCompletionRule', entityId: string) => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`/api/v1/courses/${courseId}/audit-logs?entityType=${entityType}&entityId=${entityId}`);
      if (res.ok) {
        const json = await res.json();
        setActiveRecordLogs(json.data || []);
      } else {
        toast.error('Failed to fetch audit log trail.');
      }
    } catch (err) {
      toast.error('Error fetching audit log trail.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const openViewDrawer = (type: 'view-pricing' | 'view-discount' | 'view-rule', record: any) => {
    setActiveRecord(record);
    setDrawerType(type);
    const entityType = type === 'view-pricing' ? 'CoursePricing' : type === 'view-discount' ? 'CourseDiscount' : 'CourseCompletionRule';
    fetchAuditLogs(entityType, record.id);
  };

  const closeDrawer = () => {
    setDrawerType(null);
    setActiveRecord(null);
    setActiveRecordLogs([]);
    pricingForm.reset();
    discountForm.reset();
    ruleForm.reset();
  };

  // Submit Handlers
  const handlePricingSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        branchId: data.branchId || null,
        batchId: data.batchId || null,
        effectiveEndDate: data.effectiveEndDate || null,
        taxExemptionReason: data.isTaxExempt ? data.taxExemptionReason : null,
        taxExemptionCode: data.isTaxExempt ? data.taxExemptionCode : null,
      };

      const res = await fetch(`/api/v1/courses/${courseId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.messageEnglish || 'Failed to save pricing rule.');

      toast.success('Pricing rule saved successfully.');
      closeDrawer();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred.');
    }
  };

  const handleDiscountSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        branchId: data.branchId || null,
        batchId: data.batchId || null,
        effectiveEndDate: data.effectiveEndDate || null,
      };

      const res = await fetch(`/api/v1/courses/${courseId}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.messageEnglish || 'Failed to save discount.');

      toast.success('Discount campaign saved successfully.');
      closeDrawer();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred.');
    }
  };

  const handleRuleSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        effectiveEndDate: data.effectiveEndDate || null,
      };

      const res = await fetch(`/api/v1/courses/${courseId}/completion-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.messageEnglish || 'Failed to save graduation rule.');

      toast.success('Graduation rule version saved successfully.');
      closeDrawer();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred.');
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'Indefinite';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'Inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'Superseded':
        return <Badge variant="info">Superseded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'Superseded':
        return 'text-blue-700 bg-blue-50 border border-blue-200';
      default:
        return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
      {/* Configuration Tabs Header */}
      <div className="border-b border-slate-200 bg-slate-50 flex justify-between items-center px-6 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'pricing'
                ? 'border-[color:var(--ims-brand)] text-[color:var(--ims-brand)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Pricing Configurations
          </button>
          <button
            onClick={() => setActiveTab('discounts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'discounts'
                ? 'border-[color:var(--ims-brand)] text-[color:var(--ims-brand)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Tag className="h-4 w-4" />
            Discounts & Segments
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-[color:var(--ims-brand)] text-[color:var(--ims-brand)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Graduation Completion Rules
          </button>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="text-slate-500 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-all"
          title="Refresh Data"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {loading && pricings.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">Loading configurations...</div>
        )}

        {/* Pricing Tab */}
        {!loading && activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Fee Structure Overrides</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage global default pricing and branch or batch overrides.</p>
              </div>
              <Button size="sm" onClick={() => setDrawerType('create-pricing')} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Pricing Override
              </Button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="p-4 text-xs uppercase">Level</th>
                    <th className="p-4 text-xs uppercase">Customer Segment</th>
                    <th className="p-4 text-xs uppercase">Batch Type</th>
                    <th className="p-4 text-xs uppercase text-right">Base Price</th>
                    <th className="p-4 text-xs uppercase text-right">VAT</th>
                    <th className="p-4 text-xs uppercase">Exemption Status</th>
                    <th className="p-4 text-xs uppercase">Validity Dates</th>
                    <th className="p-4 text-xs uppercase">Status</th>
                    <th className="p-4 text-xs uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pricings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                        No pricing configurations defined. Click "Add Pricing Override" to start.
                      </td>
                    </tr>
                  ) : (
                    pricings.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                        <td className="p-4 font-semibold text-slate-700">
                          {p.batchId ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-100">Batch Override</span>
                          ) : p.branchId ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-100">Branch Override</span>
                          ) : (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">Global Default</span>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{p.customerType}</td>
                        <td className="p-4">{p.batchType}</td>
                        <td className="p-4 text-right font-bold text-slate-800">{Number(p.basePrice).toFixed(3)} {p.currency}</td>
                        <td className="p-4 text-right">{Number(p.taxPercentage).toFixed(1)}%</td>
                        <td className="p-4">
                          {p.isTaxExempt ? (
                            <span className="text-emerald-700 font-medium text-xs">
                              Exempt ({p.taxExemptionCode})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Standard Rate</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-medium">
                          {formatDate(p.effectiveStartDate)} - {formatDate(p.effectiveEndDate)}
                        </td>
                        <td className="p-4">{getStatusBadge(p.status)}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openViewDrawer('view-pricing', p)}
                            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Discounts Tab */}
        {!loading && activeTab === 'discounts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Promotions & Discounts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define early bird offers, corporate fee cuts, or individual discounts.</p>
              </div>
              <Button size="sm" onClick={() => setDrawerType('create-discount')} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Discount Rule
              </Button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="p-4 text-xs uppercase">Scope</th>
                    <th className="p-4 text-xs uppercase">Type</th>
                    <th className="p-4 text-xs uppercase">Calculation Mode</th>
                    <th className="p-4 text-xs uppercase text-right">Value</th>
                    <th className="p-4 text-xs uppercase">Approvals</th>
                    <th className="p-4 text-xs uppercase">Validity Dates</th>
                    <th className="p-4 text-xs uppercase">Status</th>
                    <th className="p-4 text-xs uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        No discounts or promotional policies configured.
                      </td>
                    </tr>
                  ) : (
                    discounts.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                        <td className="p-4 font-semibold text-slate-700">
                          {d.batchId ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-100">Batch Specific</span>
                          ) : d.branchId ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-100">Branch Specific</span>
                          ) : (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">Global Campaign</span>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{d.discountType}</td>
                        <td className="p-4">{d.discountMode}</td>
                        <td className="p-4 text-right font-bold text-slate-800">
                          {d.discountMode === 'Percentage' ? `${Number(d.discountValue).toFixed(1)}%` : `${Number(d.discountValue).toFixed(3)} OMR`}
                        </td>
                        <td className="p-4">
                          {d.requiresApproval ? (
                            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">Requires Approval</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Auto-Applied</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-medium">
                          {formatDate(d.effectiveStartDate)} - {formatDate(d.effectiveEndDate)}
                        </td>
                        <td className="p-4">{getStatusBadge(d.status)}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openViewDrawer('view-discount', d)}
                            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completion Rules Tab */}
        {!loading && activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Graduation & Certificate Issuance Invariants</h3>
                <p className="text-xs text-slate-500 mt-0.5">Determine requirements for attendance thresholds, assessments, and fee clearances.</p>
              </div>
              <Button size="sm" onClick={() => setDrawerType('create-rule')} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Configure Rule Version
              </Button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="p-4 text-xs uppercase">Min. Attendance</th>
                    <th className="p-4 text-xs uppercase">Exam Needed?</th>
                    <th className="p-4 text-xs uppercase">Zero Balance?</th>
                    <th className="p-4 text-xs uppercase">Manual Review?</th>
                    <th className="p-4 text-xs uppercase">Effective Range</th>
                    <th className="p-4 text-xs uppercase">Status</th>
                    <th className="p-4 text-xs uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No graduation completion rules defined. A course must have a rule to be published.
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                        <td className="p-4 font-bold text-slate-800">{r.minimumAttendancePercent}%</td>
                        <td className="p-4">
                          {r.examRequired ? (
                            <span className="text-rose-600 font-semibold text-xs">Required</span>
                          ) : (
                            <span className="text-slate-400 text-xs">No exam</span>
                          )}
                        </td>
                        <td className="p-4">
                          {r.feeClearanceRequired ? (
                            <span className="text-rose-600 font-semibold text-xs">Required</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Not required</span>
                          )}
                        </td>
                        <td className="p-4">
                          {r.manualApprovalRequired ? (
                            <span className="text-rose-600 font-semibold text-xs">Required</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Auto-approve</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-medium">
                          {formatDate(r.effectiveStartDate)} - {formatDate(r.effectiveEndDate)}
                        </td>
                        <td className="p-4">{getStatusBadge(r.status)}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openViewDrawer('view-rule', r)}
                            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── SIDE DRAWER PANEL ─── */}
      {drawerType && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeDrawer}
          />

          {/* Drawer Body container */}
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out translate-x-0"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {drawerType.startsWith('create') ? (
                    <Plus className="h-5 w-5 text-[color:var(--ims-brand)]" />
                  ) : (
                    <Landmark className="h-5 w-5 text-[color:var(--ims-brand)]" />
                  )}
                  {drawerType === 'create-pricing' && 'Configure Pricing Override'}
                  {drawerType === 'view-pricing' && 'Pricing Override Details'}
                  {drawerType === 'create-discount' && 'Configure Discount Campaign'}
                  {drawerType === 'view-discount' && 'Discount Campaign Details'}
                  {drawerType === 'create-rule' && 'Configure Graduation Rule'}
                  {drawerType === 'view-rule' && 'Graduation Rule Details'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {drawerType.startsWith('create') ? 'Specify override variables for this course.' : 'View status metrics and audit history logs.'}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-full transition-all text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6">
              {/* 1. Create Pricing Override Form */}
              {drawerType === 'create-pricing' && (
                <form onSubmit={pricingForm.handleSubmit(handlePricingSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="pricing-branchId">Target Branch (Override)</FormLabel>
                      <FormControl>
                        <Select
                          id="pricing-branchId"
                          value={pricingForm.watch('branchId') || ''}
                          onChange={(e) => pricingForm.setValue('branchId', e.target.value)}
                          options={[
                            { value: '', label: '-- Global Default --' },
                            ...branches.map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
                          ]}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.branchId?.message}</FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="pricing-batchId">Target Batch (Override)</FormLabel>
                      <FormControl>
                        <Select
                          id="pricing-batchId"
                          value={pricingForm.watch('batchId') || ''}
                          onChange={(e) => pricingForm.setValue('batchId', e.target.value)}
                          options={[
                            { value: '', label: '-- None (Branch/Global) --' },
                            ...batches.map((b) => ({ value: b.id, label: b.batchCode })),
                          ]}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.batchId?.message}</FormError>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="customerType">Customer Type</FormLabel>
                      <FormControl>
                        <Select
                          id="customerType"
                          value={pricingForm.watch('customerType')}
                          onChange={(e) => pricingForm.setValue('customerType', e.target.value as any)}
                          options={[
                            { value: 'Individual', label: 'Individual Student' },
                            { value: 'Corporate', label: 'Corporate Client' },
                            { value: 'WalkIn', label: 'Walk-In FastTrack' },
                          ]}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.customerType?.message}</FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="batchType">Batch Type</FormLabel>
                      <FormControl>
                        <Select
                          id="batchType"
                          value={pricingForm.watch('batchType')}
                          onChange={(e) => pricingForm.setValue('batchType', e.target.value)}
                          options={[
                            { value: 'Regular', label: 'Regular Sessions' },
                            { value: 'FastTrack', label: 'Fast Track' },
                            { value: 'Weekend', label: 'Weekend Programs' },
                          ]}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.batchType?.message}</FormError>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-2">
                      <FormField>
                        <FormLabel htmlFor="basePrice">Base Tuition Fee</FormLabel>
                        <FormControl className="relative">
                          <Input
                            id="basePrice"
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            className="pr-12 text-right font-bold"
                            {...pricingForm.register('basePrice')}
                            disabled={isSubmittingPricing}
                          />
                          <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">OMR</div>
                        </FormControl>
                        <FormError>{pricingForm.formState.errors.basePrice?.message}</FormError>
                      </FormField>
                    </div>

                    <div>
                      <FormField>
                        <FormLabel htmlFor="taxPercentage">Oman VAT Rate</FormLabel>
                        <FormControl>
                          <Input
                            id="taxPercentage"
                            type="number"
                            step="0.1"
                            disabled={isPricingTaxExempt || isSubmittingPricing}
                            className="text-right"
                            {...pricingForm.register('taxPercentage')}
                          />
                        </FormControl>
                        <FormError>{pricingForm.formState.errors.taxPercentage?.message}</FormError>
                      </FormField>
                    </div>
                  </div>

                  <FormField className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <FormControl>
                      <Checkbox
                        id="isTaxExempt"
                        checked={pricingForm.watch('isTaxExempt')}
                        onChange={(e: any) => {
                          const checked = e.target.checked;
                          pricingForm.setValue('isTaxExempt', checked);
                          if (checked) {
                            pricingForm.setValue('taxPercentage', 0);
                          } else {
                            pricingForm.setValue('taxPercentage', 5);
                          }
                        }}
                        disabled={isSubmittingPricing}
                      />
                    </FormControl>
                    <div>
                      <FormLabel htmlFor="isTaxExempt" className="font-bold text-slate-700 text-xs">Logically Tax Exempt</FormLabel>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Toggle tax exemption for this pricing override.</span>
                    </div>
                  </FormField>

                  {isPricingTaxExempt && (
                    <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-lg space-y-3">
                      <div className="flex gap-1.5 text-xs font-semibold text-emerald-800">
                        <AlertCircle className="h-4 w-4" />
                        Tax Exemption Declarations
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="taxExemptionCode" className="text-emerald-900">Exemption Code</FormLabel>
                          <FormControl>
                            <Input
                              id="taxExemptionCode"
                              placeholder="EX-VAT-OMAN-..."
                              className="bg-white border-emerald-200"
                              {...pricingForm.register('taxExemptionCode')}
                              disabled={isSubmittingPricing}
                            />
                          </FormControl>
                          <FormError>{pricingForm.formState.errors.taxExemptionCode?.message}</FormError>
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="taxExemptionReason" className="text-emerald-900">Legal Justification</FormLabel>
                          <FormControl>
                            <Input
                              id="taxExemptionReason"
                              placeholder="Authority decree reference"
                              className="bg-white border-emerald-200"
                              {...pricingForm.register('taxExemptionReason')}
                              disabled={isSubmittingPricing}
                            />
                          </FormControl>
                          <FormError>{pricingForm.formState.errors.taxExemptionReason?.message}</FormError>
                        </FormField>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="effectiveStartDate">Effective Start Date</FormLabel>
                      <FormControl>
                        <Input id="effectiveStartDate" type="date" {...pricingForm.register('effectiveStartDate')} disabled={isSubmittingPricing} />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.effectiveStartDate?.message}</FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="effectiveEndDate">Effective End Date</FormLabel>
                      <FormControl>
                        <Input id="effectiveEndDate" type="date" {...pricingForm.register('effectiveEndDate')} disabled={isSubmittingPricing} />
                      </FormControl>
                      <FormError>{pricingForm.formState.errors.effectiveEndDate?.message}</FormError>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={closeDrawer} disabled={isSubmittingPricing}>Cancel</Button>
                    <Button type="submit" disabled={isSubmittingPricing}>
                      {isSubmittingPricing ? 'Saving Override...' : 'Save Pricing Rule'}
                    </Button>
                  </div>
                </form>
              )}

              {/* 2. View Pricing Details & Audit logs */}
              {drawerType === 'view-pricing' && activeRecord && (
                <div className="space-y-6">
                  {/* Scope details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Scope level</span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.batchId ? 'Batch Override' : activeRecord.branchId ? 'Branch Override' : 'Global Default'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Segment</span>
                      <span className="font-semibold text-slate-700">{activeRecord.customerType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Base Price</span>
                      <span className="font-bold text-slate-800 text-sm">{Number(activeRecord.basePrice).toFixed(3)} {activeRecord.currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Oman VAT</span>
                      <span className="font-semibold text-slate-700">{Number(activeRecord.taxPercentage).toFixed(1)}%</span>
                    </div>
                    {activeRecord.isTaxExempt && (
                      <div className="col-span-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-900 mt-1">
                        <span className="font-bold block text-[10px] uppercase">Tax Exemption:</span>
                        <p className="mt-0.5">Code: {activeRecord.taxExemptionCode} | Reason: {activeRecord.taxExemptionReason}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Validity Range</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} - {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Status Status</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}>
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`} />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">Fetching audit history logs...</div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">No logs found.</div>
                    ) : (
                      <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6">
                        {activeRecordLogs.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            <span className="absolute -left-[31px] top-1 bg-white border-2 border-[color:var(--ims-brand)] rounded-full h-4 w-4 flex items-center justify-center">
                              <span className="bg-[color:var(--ims-brand)] rounded-full h-1.5 w-1.5" />
                            </span>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    log.action === 'Create' ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                                  }`}>
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">{log.performedBy}</span>
                                </div>
                                <span className="text-slate-400 text-[10px]">{new Date(log.performedAt).toLocaleString('en-GB')}</span>
                              </div>
                              {log.ipAddress && <p className="text-[10px] text-slate-400">IP: {log.ipAddress}</p>}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>{JSON.stringify(log.newValue, null, 2)}</pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">Old:</span>
                                      <pre className="text-red-600">{JSON.stringify(log.oldValue, null, 2)}</pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">New:</span>
                                      <pre className="text-emerald-700">{JSON.stringify(log.newValue, null, 2)}</pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Create Discount Campaign Form */}
              {drawerType === 'create-discount' && (
                <form onSubmit={discountForm.handleSubmit(handleDiscountSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discount-branchId">Target Branch</FormLabel>
                      <FormControl>
                        <Select
                          id="discount-branchId"
                          value={discountForm.watch('branchId') || ''}
                          onChange={(e) => discountForm.setValue('branchId', e.target.value)}
                          options={[
                            { value: '', label: '-- All Branches --' },
                            ...branches.map((b) => ({ value: b.id, label: b.branchName })),
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="discount-batchId">Target Batch</FormLabel>
                      <FormControl>
                        <Select
                          id="discount-batchId"
                          value={discountForm.watch('batchId') || ''}
                          onChange={(e) => discountForm.setValue('batchId', e.target.value)}
                          options={[
                            { value: '', label: '-- All Batches --' },
                            ...batches.map((b) => ({ value: b.id, label: b.batchCode })),
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discountType">Discount Type</FormLabel>
                      <FormControl>
                        <Select
                          id="discountType"
                          value={discountForm.watch('discountType')}
                          onChange={(e) => discountForm.setValue('discountType', e.target.value as any)}
                          options={[
                            { value: 'Individual', label: 'Individual Promotion' },
                            { value: 'Corporate', label: 'Corporate Deal' },
                            { value: 'EarlyBird', label: 'Early Bird Booking' },
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="discountMode">Discount Mode</FormLabel>
                      <FormControl>
                        <Select
                          id="discountMode"
                          value={discountForm.watch('discountMode')}
                          onChange={(e) => discountForm.setValue('discountMode', e.target.value as any)}
                          options={[
                            { value: 'Percentage', label: 'Percentage (%)' },
                            { value: 'FixedAmount', label: 'Fixed Amount (OMR)' },
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <FormField>
                    <FormLabel htmlFor="discountValue">Discount Value</FormLabel>
                    <FormControl className="relative">
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.001"
                        className="pr-12 text-right font-bold"
                        {...discountForm.register('discountValue')}
                        disabled={isSubmittingDiscount}
                      />
                      <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">
                        {discountForm.watch('discountMode') === 'Percentage' ? '%' : 'OMR'}
                      </div>
                    </FormControl>
                    <FormError>{discountForm.formState.errors.discountValue?.message}</FormError>
                  </FormField>

                  <FormField className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <FormControl>
                      <Checkbox
                        id="requiresApproval"
                        checked={discountForm.watch('requiresApproval')}
                        onChange={(e: any) => discountForm.setValue('requiresApproval', e.target.checked)}
                        disabled={isSubmittingDiscount}
                      />
                    </FormControl>
                    <div>
                      <FormLabel htmlFor="requiresApproval" className="font-bold text-slate-700 text-xs">Requires Admin Approval</FormLabel>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Toggle manual coordinator approval during registration.</span>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discount-effectiveStartDate">Effective Start Date</FormLabel>
                      <FormControl>
                        <Input id="discount-effectiveStartDate" type="date" {...discountForm.register('effectiveStartDate')} disabled={isSubmittingDiscount} />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="discount-effectiveEndDate">Effective End Date</FormLabel>
                      <FormControl>
                        <Input id="discount-effectiveEndDate" type="date" {...discountForm.register('effectiveEndDate')} disabled={isSubmittingDiscount} />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={closeDrawer} disabled={isSubmittingDiscount}>Cancel</Button>
                    <Button type="submit" disabled={isSubmittingDiscount}>
                      {isSubmittingDiscount ? 'Saving Campaign...' : 'Save Campaign'}
                    </Button>
                  </div>
                </form>
              )}

              {/* 4. View Discount Details & Audit logs */}
              {drawerType === 'view-discount' && activeRecord && (
                <div className="space-y-6">
                  {/* Scope details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Scope</span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.batchId ? 'Batch Campaign' : activeRecord.branchId ? 'Branch Campaign' : 'Global Campaign'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Campaign Type</span>
                      <span className="font-semibold text-slate-700">{activeRecord.discountType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Calculation Mode</span>
                      <span className="font-semibold text-slate-700">{activeRecord.discountMode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Discount Value</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {activeRecord.discountMode === 'Percentage' ? `${Number(activeRecord.discountValue).toFixed(1)}%` : `${Number(activeRecord.discountValue).toFixed(3)} OMR`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Requires Approval?</span>
                      <span className="font-semibold text-slate-700">{activeRecord.requiresApproval ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Validity Range</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} - {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}>
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`} />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">Fetching audit history logs...</div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">No logs found.</div>
                    ) : (
                      <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6">
                        {activeRecordLogs.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            <span className="absolute -left-[31px] top-1 bg-white border-2 border-[color:var(--ims-brand)] rounded-full h-4 w-4 flex items-center justify-center">
                              <span className="bg-[color:var(--ims-brand)] rounded-full h-1.5 w-1.5" />
                            </span>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    log.action === 'Create' ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                                  }`}>
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">{log.performedBy}</span>
                                </div>
                                <span className="text-slate-400 text-[10px]">{new Date(log.performedAt).toLocaleString('en-GB')}</span>
                              </div>
                              {log.ipAddress && <p className="text-[10px] text-slate-400">IP: {log.ipAddress}</p>}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>{JSON.stringify(log.newValue, null, 2)}</pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">Old:</span>
                                      <pre className="text-red-600">{JSON.stringify(log.oldValue, null, 2)}</pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">New:</span>
                                      <pre className="text-emerald-700">{JSON.stringify(log.newValue, null, 2)}</pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Create Completion Rule Form */}
              {drawerType === 'create-rule' && (
                <form onSubmit={ruleForm.handleSubmit(handleRuleSubmit)} className="space-y-4">
                  <FormField>
                    <FormLabel htmlFor="minimumAttendancePercent">Minimum Attendance Required</FormLabel>
                    <FormControl className="relative">
                      <Input
                        id="minimumAttendancePercent"
                        type="number"
                        className="pr-12 text-right font-bold"
                        {...ruleForm.register('minimumAttendancePercent')}
                        disabled={isSubmittingRule}
                      />
                      <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">%</div>
                    </FormControl>
                    <FormError>{ruleForm.formState.errors.minimumAttendancePercent?.message}</FormError>
                  </FormField>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block mb-1">Graduation Checks Required</span>

                    <FormField className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="examRequired"
                          checked={ruleForm.watch('examRequired')}
                          onChange={(e: any) => ruleForm.setValue('examRequired', e.target.checked)}
                          disabled={isSubmittingRule}
                        />
                      </FormControl>
                      <FormLabel htmlFor="examRequired" className="text-xs text-slate-600">Must pass all exams / assessments</FormLabel>
                    </FormField>

                    <FormField className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="feeClearanceRequired"
                          checked={ruleForm.watch('feeClearanceRequired')}
                          onChange={(e: any) => ruleForm.setValue('feeClearanceRequired', e.target.checked)}
                          disabled={isSubmittingRule}
                        />
                      </FormControl>
                      <FormLabel htmlFor="feeClearanceRequired" className="text-xs text-slate-600">Must clear all outstanding tuition fees</FormLabel>
                    </FormField>

                    <FormField className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="manualApprovalRequired"
                          checked={ruleForm.watch('manualApprovalRequired')}
                          onChange={(e: any) => ruleForm.setValue('manualApprovalRequired', e.target.checked)}
                          disabled={isSubmittingRule}
                        />
                      </FormControl>
                      <FormLabel htmlFor="manualApprovalRequired" className="text-xs text-slate-600">Requires academic director review</FormLabel>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="rule-effectiveStartDate">Effective Start Date</FormLabel>
                      <FormControl>
                        <Input id="rule-effectiveStartDate" type="date" {...ruleForm.register('effectiveStartDate')} disabled={isSubmittingRule} />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="rule-effectiveEndDate">Effective End Date</FormLabel>
                      <FormControl>
                        <Input id="rule-effectiveEndDate" type="date" {...ruleForm.register('effectiveEndDate')} disabled={isSubmittingRule} />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={closeDrawer} disabled={isSubmittingRule}>Cancel</Button>
                    <Button type="submit" disabled={isSubmittingRule}>
                      {isSubmittingRule ? 'Publishing Rule...' : 'Publish Rule Version'}
                    </Button>
                  </div>
                </form>
              )}

              {/* 6. View Rule Details & Audit logs */}
              {drawerType === 'view-rule' && activeRecord && (
                <div className="space-y-6">
                  {/* Scope details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Min. Attendance Threshold</span>
                      <span className="font-bold text-slate-800 text-sm">{activeRecord.minimumAttendancePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Exam Required?</span>
                      <span className="font-semibold text-slate-700">{activeRecord.examRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Tuition Fee Clearance?</span>
                      <span className="font-semibold text-slate-700">{activeRecord.feeClearanceRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Manual Director Approval?</span>
                      <span className="font-semibold text-slate-700">{activeRecord.manualApprovalRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Validity Range</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} - {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}>
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`} />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">Fetching audit history logs...</div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">No logs found.</div>
                    ) : (
                      <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6">
                        {activeRecordLogs.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            <span className="absolute -left-[31px] top-1 bg-white border-2 border-[color:var(--ims-brand)] rounded-full h-4 w-4 flex items-center justify-center">
                              <span className="bg-[color:var(--ims-brand)] rounded-full h-1.5 w-1.5" />
                            </span>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    log.action === 'Create' ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                                  }`}>
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">{log.performedBy}</span>
                                </div>
                                <span className="text-slate-400 text-[10px]">{new Date(log.performedAt).toLocaleString('en-GB')}</span>
                              </div>
                              {log.ipAddress && <p className="text-[10px] text-slate-400">IP: {log.ipAddress}</p>}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>{JSON.stringify(log.newValue, null, 2)}</pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">Old:</span>
                                      <pre className="text-red-600">{JSON.stringify(log.oldValue, null, 2)}</pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">New:</span>
                                      <pre className="text-emerald-700">{JSON.stringify(log.newValue, null, 2)}</pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
