'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
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
  ResponsiveDataTable,
  Pagination,
  EmptyState,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@ims/shared-ui';
import {
  Plus,
  Tag,
  GraduationCap,
  DollarSign,
  Calendar,
  RefreshCw,
  Landmark,
  Info,
  AlertCircle,
  Check,
  ArrowLeft,
  ChevronDown,
  Search,
  X,
  FileText,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { CourseExamsConfigTab } from './course-exams-config-tab';

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

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleClear = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 py-2 text-sm text-[color:var(--ims-ink)] shadow-[0_8px_24px_rgba(16,36,58,0.04)] outline-none transition-all text-left"
        >
          <div className="flex flex-wrap gap-1.5 max-w-[90%]">
            {selectedValues.length === 0 ? (
              <span className="text-[color:var(--ims-muted)]">
                {placeholder || 'Select branches'}
              </span>
            ) : (
              selectedValues.map((val) => {
                const label =
                  options.find((o) => o.value === val)?.label || val;
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-lg border border-slate-200"
                  >
                    {label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-slate-900"
                      onClick={(e) => handleClear(e, val)}
                    />
                  </span>
                );
              })
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-[color:var(--ims-muted)] flex-shrink-0 ml-2" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-2 shadow-[0_18px_40px_rgba(16,36,58,0.12)]"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <div className="flex items-center border-b border-slate-100 px-3 pb-2 pt-1 mb-1">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--ims-muted)]"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No branches found.
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-slate-50 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-slate-800" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface CourseConfigsPanelProps {
  courseId: string;
  branches: BranchOption[];
  batches: BatchOption[];
}

// --- Zod Validation Schemas ---
const pricingFormSchema = z
  .object({
    branchIds: z.array(z.string()).optional(),
    customerTypes: z
      .array(z.enum(['Individual', 'Corporate', 'WalkIn']))
      .optional(),
    batchTypes: z.array(z.string()).optional(),
    currency: z.literal('OMR'),
    basePrice: z.coerce.number().positive('Price must be greater than zero'),
    taxPercentage: z.coerce
      .number()
      .nonnegative('Tax percentage cannot be negative')
      .default(5),
    isTaxExempt: z.boolean().default(false),
    taxExemptionReason: z.string().optional(),
    taxExemptionCode: z.string().optional(),
    effectiveStartDate: z.string().nonempty('Start date is required'),
    effectiveEndDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isTaxExempt) {
        return !!data.taxExemptionReason && !!data.taxExemptionCode;
      }
      return true;
    },
    {
      message: 'Reason and Code are required for tax exemption',
      path: ['taxExemptionReason'],
    },
  );

const discountFormSchema = z.object({
  branchIds: z.array(z.string()).optional(),
  discountType: z.enum(['Individual', 'Corporate', 'EarlyBird']),
  discountMode: z.enum(['Percentage', 'FixedAmount']),
  discountValue: z.coerce.number().positive('Value must be greater than zero'),
  requiresApproval: z.boolean().default(false),
  effectiveStartDate: z.string().nonempty('Start date is required'),
  effectiveEndDate: z.string().optional(),
});

const completionRuleFormSchema = z.object({
  minimumAttendancePercent: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, 'Percent must be between 0 and 100'),
  examRequired: z.boolean().default(false),
  feeClearanceRequired: z.boolean().default(true),
  manualApprovalRequired: z.boolean().default(false),
  effectiveStartDate: z.string().nonempty('Start date is required'),
  effectiveEndDate: z.string().optional(),
});

export function CourseConfigsPanel({
  courseId,
  branches,
  batches,
}: CourseConfigsPanelProps) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'discounts' | 'rules' | 'exams'>(
    'pricing',
  );

  // Lists State
  const [pricings, setPricings] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pricing URL-derived State
  const pricingPage = searchParams.get('pricingPage')
    ? parseInt(searchParams.get('pricingPage')!, 10)
    : 1;
  const pricingSearch = searchParams.get('pricingQ') || '';
  const pricingBranchFilter = searchParams.get('pricingBranchId') || '';
  const pricingStatusFilter = searchParams.get('pricingStatus') || '';
  const pricingSortBy =
    searchParams.get('pricingSortBy') || 'effectiveStartDate';
  const pricingSortOrder =
    (searchParams.get('pricingSortOrder') as 'asc' | 'desc') || 'desc';

  const [pricingTotal, setPricingTotal] = useState(0);
  const [searchValue, setSearchValue] = useState(pricingSearch);

  const updatePricingParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Discount URL-derived State
  const discountPage = searchParams.get('discountPage')
    ? parseInt(searchParams.get('discountPage')!, 10)
    : 1;
  const discountSearch = searchParams.get('discountQ') || '';
  const discountBranchFilter = searchParams.get('discountBranchId') || '';
  const discountStatusFilter = searchParams.get('discountStatus') || '';
  const discountSortBy =
    searchParams.get('discountSortBy') || 'effectiveStartDate';
  const discountSortOrder =
    (searchParams.get('discountSortOrder') as 'asc' | 'desc') || 'desc';

  const [discountTotal, setDiscountTotal] = useState(0);
  const [discountSearchValue, setDiscountSearchValue] =
    useState(discountSearch);

  const updateDiscountParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Rule URL-derived State
  const rulePage = searchParams.get('rulePage')
    ? parseInt(searchParams.get('rulePage')!, 10)
    : 1;
  const ruleStatusFilter = searchParams.get('ruleStatus') || '';
  const ruleSortBy = searchParams.get('ruleSortBy') || 'effectiveStartDate';
  const ruleSortOrder =
    (searchParams.get('ruleSortOrder') as 'asc' | 'desc') || 'desc';

  const [ruleTotal, setRuleTotal] = useState(0);

  const updateRuleParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Drawer States
  const [drawerType, setDrawerType] = useState<
    | 'create-pricing'
    | 'view-pricing'
    | 'create-discount'
    | 'view-discount'
    | 'create-rule'
    | 'view-rule'
    | null
  >(null);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [activeRecordLogs, setActiveRecordLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form Hooks
  const pricingForm = useForm({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      branchIds: [] as string[],
      customerTypes: [] as ('Individual' | 'Corporate' | 'WalkIn')[],
      batchTypes: [] as string[],
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
      branchIds: [] as string[],
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

      const pricingParams = new URLSearchParams({
        page: pricingPage.toString(),
        limit: '10',
        q: pricingSearch,
        branchId: pricingBranchFilter,
        status: pricingStatusFilter,
        sortBy: pricingSortBy,
        sortOrder: pricingSortOrder,
      });

      const discountParams = new URLSearchParams({
        page: discountPage.toString(),
        limit: '10',
        q: discountSearch,
        branchId: discountBranchFilter,
        status: discountStatusFilter,
        sortBy: discountSortBy,
        sortOrder: discountSortOrder,
      });

      const ruleParams = new URLSearchParams({
        page: rulePage.toString(),
        limit: '10',
        status: ruleStatusFilter,
        sortBy: ruleSortBy,
        sortOrder: ruleSortOrder,
      });

      const [pricingRes, discountRes, rulesRes] = await Promise.all([
        fetch(
          `/api/v1/courses/${courseId}/pricing?${pricingParams.toString()}`,
        ),
        fetch(
          `/api/v1/courses/${courseId}/discounts?${discountParams.toString()}`,
        ),
        fetch(
          `/api/v1/courses/${courseId}/completion-rules?${ruleParams.toString()}`,
        ),
      ]);

      if (pricingRes.ok) {
        const json = await pricingRes.json();
        setPricings(json.data || []);
        setPricingTotal(json.total || 0);
      }
      if (discountRes.ok) {
        const json = await discountRes.json();
        setDiscounts(json.data || []);
        setDiscountTotal(json.total || 0);
      }
      if (rulesRes.ok) {
        const json = await rulesRes.json();
        setRules(json.data || []);
        setRuleTotal(json.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load configurations data.');
    } finally {
      setLoading(false);
    }
  };

  // Pricing Search Debounce Effect
  useEffect(() => {
    if (searchValue === pricingSearch) return;
    const handler = setTimeout(() => {
      updatePricingParams({ pricingQ: searchValue || null, pricingPage: '1' });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue, pricingSearch, updatePricingParams]);

  // Sync pricing search input from URL changes
  useEffect(() => {
    setSearchValue(pricingSearch);
  }, [pricingSearch]);

  // Discount Search Debounce Effect
  useEffect(() => {
    if (discountSearchValue === discountSearch) return;
    const handler = setTimeout(() => {
      updateDiscountParams({
        discountQ: discountSearchValue || null,
        discountPage: '1',
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [discountSearchValue, discountSearch, updateDiscountParams]);

  // Sync discount search input from URL changes
  useEffect(() => {
    setDiscountSearchValue(discountSearch);
  }, [discountSearch]);

  // Main Fetch Trigger Effect
  useEffect(() => {
    fetchData();
  }, [
    courseId,
    pricingPage,
    pricingSearch,
    pricingBranchFilter,
    pricingStatusFilter,
    pricingSortBy,
    pricingSortOrder,
    discountPage,
    discountSearch,
    discountBranchFilter,
    discountStatusFilter,
    discountSortBy,
    discountSortOrder,
    rulePage,
    ruleStatusFilter,
    ruleSortBy,
    ruleSortOrder,
  ]);

  // Fetch Audit Logs for View Drawer
  const fetchAuditLogs = async (
    entityType: 'CoursePricing' | 'CourseDiscount' | 'CourseCompletionRule',
    entityId: string,
  ) => {
    try {
      setLoadingLogs(true);
      const res = await fetch(
        `/api/v1/courses/${courseId}/audit-logs?entityType=${entityType}&entityId=${entityId}`,
      );
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

  const openViewDrawer = (
    type: 'view-pricing' | 'view-discount' | 'view-rule',
    record: any,
  ) => {
    setActiveRecord(record);
    setDrawerType(type);
    const entityType =
      type === 'view-pricing'
        ? 'CoursePricing'
        : type === 'view-discount'
          ? 'CourseDiscount'
          : 'CourseCompletionRule';
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

  const handleDisablePricing = async (pricingId: string) => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pricingId, action: 'disable' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(
          json.messageEnglish || 'Failed to disable pricing override.',
        );
      } else {
        toast.success('Pricing override disabled successfully!');
        setPricings((prev) =>
          prev.map((p) =>
            p.id === pricingId ? { ...p, status: 'Inactive' } : p,
          ),
        );
        closeDrawer();
      }
    } catch (err) {
      toast.error('Error disabling pricing override.');
    }
  };

  const handleDisableDiscount = async (discountId: string) => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/discounts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: discountId, action: 'disable' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(
          json.messageEnglish || 'Failed to disable discount segment.',
        );
      } else {
        toast.success('Discount segment disabled successfully!');
        setDiscounts((prev) =>
          prev.map((d) =>
            d.id === discountId ? { ...d, status: 'Inactive' } : d,
          ),
        );
        closeDrawer();
      }
    } catch (err) {
      toast.error('Error disabling discount segment.');
    }
  };

  const handleDisableCompletionRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/completion-rules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, action: 'disable' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(
          json.messageEnglish || 'Failed to disable completion rule.',
        );
      } else {
        toast.success('Completion rule disabled successfully!');
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, status: 'Inactive' } : r)),
        );
        closeDrawer();
      }
    } catch (err) {
      toast.error('Error disabling completion rule.');
    }
  };

  // Submit Handlers
  const handlePricingSubmit = async (data: any) => {
    try {
      const branchIds =
        data.branchIds && data.branchIds.length > 0 ? data.branchIds : [null];
      const customerTypes =
        data.customerTypes && data.customerTypes.length > 0
          ? data.customerTypes
          : ['Individual', 'Corporate', 'WalkIn'];
      const batchTypes =
        data.batchTypes && data.batchTypes.length > 0
          ? data.batchTypes
          : ['Regular', 'FastTrack', 'Weekend'];

      await Promise.all(
        branchIds
          .flatMap((branchId: string | null) =>
            customerTypes.flatMap((customerType: string) =>
              batchTypes.map(async (batchType: string) => {
                const payload = {
                  ...data,
                  branchId,
                  batchId: null,
                  customerType,
                  batchType,
                  effectiveEndDate: data.effectiveEndDate || null,
                  taxExemptionReason: data.isTaxExempt
                    ? data.taxExemptionReason
                    : null,
                  taxExemptionCode: data.isTaxExempt
                    ? data.taxExemptionCode
                    : null,
                };

                const res = await fetch(`/api/v1/courses/${courseId}/pricing`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!res.ok || !json.success) {
                  throw new Error(
                    json.messageEnglish ||
                      `Failed to save pricing rule for branch: ${branchId}, customer: ${customerType}, batch: ${batchType}`,
                  );
                }
              }),
            ),
          )
          .flat(),
      );

      toast.success('Pricing rule override(s) saved successfully.');
      closeDrawer();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred.');
    }
  };

  const handleDiscountSubmit = async (data: any) => {
    try {
      const branchIds =
        data.branchIds && data.branchIds.length > 0 ? data.branchIds : [null];

      await Promise.all(
        branchIds.map(async (branchId: string | null) => {
          const payload = {
            ...data,
            branchId,
            batchId: null,
            effectiveEndDate: data.effectiveEndDate || null,
          };

          const res = await fetch(`/api/v1/courses/${courseId}/discounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(
              json.messageEnglish ||
                `Failed to save discount for branch: ${branchId}`,
            );
          }
        }),
      );

      toast.success('Discount overrides saved successfully.');
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
      if (!res.ok)
        throw new Error(
          json.messageEnglish || 'Failed to save graduation rule.',
        );

      toast.success('Graduation rule version saved successfully.');
      closeDrawer();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred.');
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'Indefinite';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  const pricingTotalPages = Math.ceil(pricingTotal / 10);

  const handleSort = (field: string) => {
    const nextOrder =
      pricingSortBy === field && pricingSortOrder === 'asc' ? 'desc' : 'asc';
    updatePricingParams({
      pricingSortBy: field,
      pricingSortOrder: nextOrder,
      pricingPage: '1',
    });
  };

  const pricingColumns = [
    {
      header: 'Level',
      render: (p: any) =>
        p.batchId ? (
          <div className="space-y-1">
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-100">
              Batch Override
            </span>
            <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
              Batch:{' '}
              {batches.find((b) => b.id === p.batchId)?.batchCode || p.batchId}
            </span>
          </div>
        ) : p.branchId ? (
          <div className="space-y-1">
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-100">
              Branch Override
            </span>
            <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
              Branch:{' '}
              {branches.find((b) => b.id === p.branchId)?.branchName ||
                p.branchId}
            </span>
          </div>
        ) : (
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
            Global Default
          </span>
        ),
    },
    {
      header: 'Customer Type',
      sortable: true,
      sortDirection: pricingSortBy === 'customerType' ? pricingSortOrder : null,
      onSort: () => handleSort('customerType'),
      render: (p: any) => (
        <span className="font-semibold text-slate-800">{p.customerType}</span>
      ),
    },
    {
      header: 'Batch Type',
      sortable: true,
      sortDirection: pricingSortBy === 'batchType' ? pricingSortOrder : null,
      onSort: () => handleSort('batchType'),
      render: (p: any) => <span className="text-slate-600">{p.batchType}</span>,
    },
    {
      header: 'Base Price',
      sortable: true,
      sortDirection: pricingSortBy === 'basePrice' ? pricingSortOrder : null,
      onSort: () => handleSort('basePrice'),
      className: 'text-right',
      render: (p: any) => (
        <span className="font-bold text-slate-800">
          {Number(p.basePrice).toFixed(3)} {p.currency}
        </span>
      ),
      headerClassName: 'text-right',
    },
    {
      header: 'Tax Rate',
      render: (p: any) => <span>{Number(p.taxPercentage).toFixed(1)}%</span>,
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Tax Exemption',
      render: (p: any) =>
        p.isTaxExempt ? (
          <span className="text-emerald-700 font-medium text-xs">
            Exempt ({p.taxExemptionCode})
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Standard Rate</span>
        ),
    },
    {
      header: 'Effective Range',
      sortable: true,
      sortDirection:
        pricingSortBy === 'effectiveStartDate' ? pricingSortOrder : null,
      onSort: () => handleSort('effectiveStartDate'),
      render: (p: any) => (
        <span className="text-slate-500 font-medium text-xs">
          {formatDate(p.effectiveStartDate)} - {formatDate(p.effectiveEndDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: pricingSortBy === 'status' ? pricingSortOrder : null,
      onSort: () => handleSort('status'),
      render: (p: any) => getStatusBadge(p.status),
    },
    {
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (p: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openViewDrawer('view-pricing', p)}
            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
          >
            View details
          </button>
          {p.status === 'Active' && (
            <button
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to disable this pricing override?',
                  )
                ) {
                  handleDisablePricing(p.id);
                }
              }}
              className="text-red-600 hover:underline text-xs font-semibold"
            >
              Disable
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderPricingCard = (p: any) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)] text-xs">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p flex flex-row justify-between items-center">
        <div>
          {p.batchId ? (
            <Badge
              variant="outline"
              className="text-rose-600 border-rose-200 bg-rose-50"
            >
              Batch Override
            </Badge>
          ) : p.branchId ? (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-200 bg-amber-50"
            >
              Branch Override
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-slate-600 border-slate-200 bg-slate-100"
            >
              Global Default
            </Badge>
          )}
          <span className="block text-[10px] text-slate-500 mt-1 font-semibold">
            {p.branchId
              ? branches.find((b) => b.id === p.branchId)?.branchName
              : 'All Branches'}
          </span>
        </div>
        {getStatusBadge(p.status)}
      </CardHeader>
      <CardContent className="p-card-p space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-semibold text-slate-400">Customer / Batch</p>
            <p className="text-slate-800">
              {p.customerType} / {p.batchType}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Base Price</p>
            <p className="text-slate-800 font-bold">
              {Number(p.basePrice).toFixed(3)} {p.currency}
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-slate-400">Effective dates</p>
            <p className="text-slate-600">
              {formatDate(p.effectiveStartDate)} -{' '}
              {formatDate(p.effectiveEndDate)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openViewDrawer('view-pricing', p)}
        >
          View Details
        </Button>
        {p.status === 'Active' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to disable this pricing override?',
                )
              ) {
                handleDisablePricing(p.id);
              }
            }}
          >
            Disable
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  const discountTotalPages = Math.ceil(discountTotal / 10);

  const handleDiscountSort = (field: string) => {
    const nextOrder =
      discountSortBy === field && discountSortOrder === 'asc' ? 'desc' : 'asc';
    updateDiscountParams({
      discountSortBy: field,
      discountSortOrder: nextOrder,
      discountPage: '1',
    });
  };

  const discountColumns = [
    {
      header: 'Level',
      render: (d: any) =>
        d.batchId ? (
          <div className="space-y-1">
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-100">
              Batch Campaign
            </span>
            <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
              Batch:{' '}
              {batches.find((b) => b.id === d.batchId)?.batchCode || d.batchId}
            </span>
          </div>
        ) : d.branchId ? (
          <div className="space-y-1">
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-100">
              Branch Campaign
            </span>
            <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
              Branch:{' '}
              {branches.find((b) => b.id === d.branchId)?.branchName ||
                d.branchId}
            </span>
          </div>
        ) : (
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
            Global Campaign
          </span>
        ),
    },
    {
      header: 'Discount Segment',
      sortable: true,
      sortDirection:
        discountSortBy === 'discountType' ? discountSortOrder : null,
      onSort: () => handleDiscountSort('discountType'),
      render: (d: any) => (
        <span className="font-semibold text-slate-800">{d.discountType}</span>
      ),
    },
    {
      header: 'Discount Value',
      sortable: true,
      sortDirection:
        discountSortBy === 'discountValue' ? discountSortOrder : null,
      onSort: () => handleDiscountSort('discountValue'),
      className: 'text-right',
      render: (d: any) => (
        <span className="font-bold text-slate-800">
          {d.discountMode === 'Percentage'
            ? `${Number(d.discountValue).toFixed(1)}%`
            : `${Number(d.discountValue).toFixed(3)} OMR`}
        </span>
      ),
      headerClassName: 'text-right',
    },
    {
      header: 'Requires Approval?',
      render: (d: any) =>
        d.requiresApproval ? (
          <span className="text-amber-600 font-semibold text-xs bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
            Requires Review
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Auto-Applied</span>
        ),
    },
    {
      header: 'Validity Dates',
      sortable: true,
      sortDirection:
        discountSortBy === 'effectiveStartDate' ? discountSortOrder : null,
      onSort: () => handleDiscountSort('effectiveStartDate'),
      render: (d: any) => (
        <span className="text-slate-500 font-medium text-xs">
          {formatDate(d.effectiveStartDate)} - {formatDate(d.effectiveEndDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: discountSortBy === 'status' ? discountSortOrder : null,
      onSort: () => handleDiscountSort('status'),
      render: (d: any) => getStatusBadge(d.status),
    },
    {
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (d: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openViewDrawer('view-discount', d)}
            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
          >
            View details
          </button>
          {d.status === 'Active' && (
            <button
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to disable this discount override?',
                  )
                ) {
                  handleDisableDiscount(d.id);
                }
              }}
              className="text-red-600 hover:underline text-xs font-semibold"
            >
              Disable
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderDiscountCard = (d: any) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)] text-xs">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p flex flex-row justify-between items-center">
        <div>
          {d.batchId ? (
            <Badge
              variant="outline"
              className="text-rose-600 border-rose-200 bg-rose-50"
            >
              Batch Campaign
            </Badge>
          ) : d.branchId ? (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-200 bg-amber-50"
            >
              Branch Campaign
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-slate-600 border-slate-200 bg-slate-100"
            >
              Global Campaign
            </Badge>
          )}
          <span className="block text-[10px] text-slate-500 mt-1 font-semibold">
            {d.branchId
              ? branches.find((b) => b.id === d.branchId)?.branchName
              : 'All Branches'}
          </span>
        </div>
        {getStatusBadge(d.status)}
      </CardHeader>
      <CardContent className="p-card-p space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-semibold text-slate-400">Discount Segment</p>
            <p className="text-slate-800">{d.discountType}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Discount Value</p>
            <p className="text-slate-800 font-bold">
              {d.discountMode === 'Percentage'
                ? `${Number(d.discountValue).toFixed(1)}%`
                : `${Number(d.discountValue).toFixed(3)} OMR`}
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-slate-400">Effective dates</p>
            <p className="text-slate-600">
              {formatDate(d.effectiveStartDate)} -{' '}
              {formatDate(d.effectiveEndDate)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openViewDrawer('view-discount', d)}
        >
          View Details
        </Button>
        {d.status === 'Active' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to disable this discount override?',
                )
              ) {
                handleDisableDiscount(d.id);
              }
            }}
          >
            Disable
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  const ruleTotalPages = Math.ceil(ruleTotal / 10);

  const handleRuleSort = (field: string) => {
    const nextOrder =
      ruleSortBy === field && ruleSortOrder === 'asc' ? 'desc' : 'asc';
    updateRuleParams({
      ruleSortBy: field,
      ruleSortOrder: nextOrder,
      rulePage: '1',
    });
  };

  const ruleColumns = [
    {
      header: 'Min Attendance',
      sortable: true,
      sortDirection:
        ruleSortBy === 'minimumAttendancePercent' ? ruleSortOrder : null,
      onSort: () => handleRuleSort('minimumAttendancePercent'),
      render: (r: any) => (
        <span className="font-semibold text-slate-800">
          {r.minimumAttendancePercent}%
        </span>
      ),
    },
    {
      header: 'Exam Required',
      render: (r: any) =>
        r.examRequired ? (
          <span className="text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
            Yes
          </span>
        ) : (
          <span className="text-slate-400 text-xs">No</span>
        ),
    },
    {
      header: 'Fee Clearance',
      render: (r: any) =>
        r.feeClearanceRequired ? (
          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
            Required
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Optional</span>
        ),
    },
    {
      header: 'Manual Approval',
      render: (r: any) =>
        r.manualApprovalRequired ? (
          <span className="text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
            Required
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Auto</span>
        ),
    },
    {
      header: 'Validity Dates',
      sortable: true,
      sortDirection: ruleSortBy === 'effectiveStartDate' ? ruleSortOrder : null,
      onSort: () => handleRuleSort('effectiveStartDate'),
      render: (r: any) => (
        <span className="text-slate-500 font-medium text-xs">
          {formatDate(r.effectiveStartDate)} - {formatDate(r.effectiveEndDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: ruleSortBy === 'status' ? ruleSortOrder : null,
      onSort: () => handleRuleSort('status'),
      render: (r: any) => getStatusBadge(r.status),
    },
    {
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (r: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openViewDrawer('view-rule', r)}
            className="text-[color:var(--ims-brand)] hover:underline text-xs font-semibold"
          >
            View details
          </button>
          {r.status === 'Active' && (
            <button
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to disable this completion rule version?',
                  )
                ) {
                  handleDisableCompletionRule(r.id);
                }
              }}
              className="text-red-600 hover:underline text-xs font-semibold"
            >
              Disable
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderRuleCard = (r: any) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)] text-xs">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p flex flex-row justify-between items-center">
        <div>
          <span className="font-semibold text-slate-800">Rule Version</span>
          <span className="block text-[10px] text-slate-500 mt-1 font-semibold">
            Min Attendance: {r.minimumAttendancePercent}%
          </span>
        </div>
        {getStatusBadge(r.status)}
      </CardHeader>
      <CardContent className="p-card-p space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-semibold text-slate-400">Exam Required</p>
            <p className="text-slate-800">{r.examRequired ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Fee Clearance</p>
            <p className="text-slate-800">
              {r.feeClearanceRequired ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-slate-400">Effective dates</p>
            <p className="text-slate-600">
              {formatDate(r.effectiveStartDate)} -{' '}
              {formatDate(r.effectiveEndDate)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openViewDrawer('view-rule', r)}
        >
          View Details
        </Button>
        {r.status === 'Active' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to disable this completion rule version?',
                )
              ) {
                handleDisableCompletionRule(r.id);
              }
            }}
          >
            Disable
          </Button>
        )}
      </CardFooter>
    </Card>
  );

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
          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'exams'
                ? 'border-[color:var(--ims-brand)] text-[color:var(--ims-brand)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Exam Masters
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
          <div className="py-12 text-center text-slate-500 text-sm">
            Loading configurations...
          </div>
        )}

        {/* Pricing Tab */}
        {!loading && activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Fee Structure Overrides
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage global default pricing and branch or batch overrides.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setDrawerType('create-pricing')}
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Pricing Override
              </Button>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] items-end">
              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Search
                </FormLabel>
                <div className="relative">
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search overrides by customer type or batch type..."
                    leftIcon={<Search className="h-4 w-4" />}
                    className="h-11 pr-10"
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue('');
                        updatePricingParams({
                          pricingQ: null,
                          pricingPage: '1',
                        });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Target Branch
                </FormLabel>
                <Select
                  value={pricingBranchFilter}
                  onChange={(e) => {
                    updatePricingParams({
                      pricingBranchId: e.target.value || null,
                      pricingPage: '1',
                    });
                  }}
                  options={[
                    { value: '', label: 'All Branches' },
                    ...branches.map((b) => ({
                      value: b.id,
                      label: b.branchName,
                    })),
                  ]}
                  className="h-11"
                  placeholder="All Branches"
                />
              </div>

              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Status
                </FormLabel>
                <Select
                  value={pricingStatusFilter}
                  onChange={(e) => {
                    updatePricingParams({
                      pricingStatus: e.target.value || null,
                      pricingPage: '1',
                    });
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Superseded', label: 'Superseded' },
                  ]}
                  className="h-11"
                  placeholder="All Statuses"
                />
              </div>
            </div>

            <ResponsiveDataTable
              data={pricings}
              columns={pricingColumns}
              renderCard={renderPricingCard}
              keyExtractor={(p) => p.id}
              emptyState={
                <EmptyState
                  icon={<DollarSign className="h-6 w-6" />}
                  title="No configurations found"
                  description="No pricing overrides match your current filter criteria."
                />
              }
            />

            {pricingTotalPages > 1 && (
              <Pagination
                page={pricingPage}
                totalPages={pricingTotalPages}
                totalCount={pricingTotal}
                limit={10}
                buildHref={(p) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('pricingPage', p.toString());
                  return `${pathname}?${params.toString()}`;
                }}
              />
            )}
          </div>
        )}

        {/* Discounts Tab */}
        {!loading && activeTab === 'discounts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Promotions & Discounts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define early bird offers, corporate fee cuts, or individual
                  discounts.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setDrawerType('create-discount')}
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Discount Rule
              </Button>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] items-end">
              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Search
                </FormLabel>
                <div className="relative">
                  <Input
                    value={discountSearchValue}
                    onChange={(e) => setDiscountSearchValue(e.target.value)}
                    placeholder="Search overrides by discount type..."
                    leftIcon={<Search className="h-4 w-4" />}
                    className="h-11 pr-10"
                  />
                  {discountSearchValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountSearchValue('');
                        updateDiscountParams({
                          discountQ: null,
                          discountPage: '1',
                        });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Target Branch
                </FormLabel>
                <Select
                  value={discountBranchFilter}
                  onChange={(e) => {
                    updateDiscountParams({
                      discountBranchId: e.target.value || null,
                      discountPage: '1',
                    });
                  }}
                  options={[
                    { value: '', label: 'All Branches' },
                    ...branches.map((b) => ({
                      value: b.id,
                      label: b.branchName,
                    })),
                  ]}
                  className="h-11"
                  placeholder="All Branches"
                />
              </div>

              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Status
                </FormLabel>
                <Select
                  value={discountStatusFilter}
                  onChange={(e) => {
                    updateDiscountParams({
                      discountStatus: e.target.value || null,
                      discountPage: '1',
                    });
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Superseded', label: 'Superseded' },
                  ]}
                  className="h-11"
                  placeholder="All Statuses"
                />
              </div>
            </div>

            <ResponsiveDataTable
              data={discounts}
              columns={discountColumns}
              renderCard={renderDiscountCard}
              keyExtractor={(d) => d.id}
              emptyState={
                <EmptyState
                  icon={<DollarSign className="h-6 w-6" />}
                  title="No discount policies found"
                  description="No discount configurations match your current filter criteria."
                />
              }
            />

            {discountTotalPages > 1 && (
              <Pagination
                page={discountPage}
                totalPages={discountTotalPages}
                totalCount={discountTotal}
                limit={10}
                buildHref={(p) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('discountPage', p.toString());
                  return `${pathname}?${params.toString()}`;
                }}
              />
            )}
          </div>
        )}

        {/* Completion Rules Tab */}
        {!loading && activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Graduation & Certificate Issuance Invariants
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Determine requirements for attendance thresholds, assessments,
                  and fee clearances.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setDrawerType('create-rule')}
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Configure Rule Version
              </Button>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end">
              <div /> {/* Spacer / align grid layout */}
              <div className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Status
                </FormLabel>
                <Select
                  value={ruleStatusFilter}
                  onChange={(e) => {
                    updateRuleParams({
                      ruleStatus: e.target.value || null,
                      rulePage: '1',
                    });
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Superseded', label: 'Superseded' },
                  ]}
                  className="h-11"
                  placeholder="All Statuses"
                />
              </div>
            </div>

            <ResponsiveDataTable
              data={rules}
              columns={ruleColumns}
              renderCard={renderRuleCard}
              keyExtractor={(r) => r.id}
              emptyState={
                <EmptyState
                  icon={<GraduationCap className="h-6 w-6" />}
                  title="No completion rules found"
                  description="No rules match your current filter criteria."
                />
              }
            />

            {ruleTotalPages > 1 && (
              <Pagination
                page={rulePage}
                totalPages={ruleTotalPages}
                totalCount={ruleTotal}
                limit={10}
                buildHref={(p) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('rulePage', p.toString());
                  return `${pathname}?${params.toString()}`;
                }}
              />
            )}
          </div>
        )}

        {!loading && activeTab === 'exams' && (
          <CourseExamsConfigTab courseId={courseId} />
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
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out translate-x-0">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {drawerType.startsWith('create') ? (
                    <Plus className="h-5 w-5 text-[color:var(--ims-brand)]" />
                  ) : (
                    <Landmark className="h-5 w-5 text-[color:var(--ims-brand)]" />
                  )}
                  {drawerType === 'create-pricing' &&
                    'Configure Pricing Override'}
                  {drawerType === 'view-pricing' && 'Pricing Override Details'}
                  {drawerType === 'create-discount' &&
                    'Configure Discount Campaign'}
                  {drawerType === 'view-discount' &&
                    'Discount Campaign Details'}
                  {drawerType === 'create-rule' && 'Configure Graduation Rule'}
                  {drawerType === 'view-rule' && 'Graduation Rule Details'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {drawerType.startsWith('create')
                    ? 'Specify override variables for this course.'
                    : 'View status metrics and audit history logs.'}
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
                <form
                  onSubmit={pricingForm.handleSubmit(handlePricingSubmit)}
                  className="space-y-4"
                >
                  <FormField>
                    <FormLabel>Target Branches (Override)</FormLabel>
                    <FormControl>
                      <Controller
                        name="branchIds"
                        control={pricingForm.control}
                        render={({ field }) => (
                          <MultiSelect
                            options={branches.map((b) => ({
                              value: b.id,
                              label: `${b.branchName} (${b.branchCode})`,
                            }))}
                            selectedValues={field.value || []}
                            onChange={(vals) => field.onChange(vals)}
                            placeholder="-- Global Default (All Branches) --"
                            disabled={isSubmittingPricing}
                          />
                        )}
                      />
                    </FormControl>
                    <FormError>
                      {(pricingForm.formState.errors.branchIds as any)?.message}
                    </FormError>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel>Customer Types</FormLabel>
                      <FormControl>
                        <Controller
                          name="customerTypes"
                          control={pricingForm.control}
                          render={({ field }) => (
                            <MultiSelect
                              options={[
                                {
                                  value: 'Individual',
                                  label: 'Individual Student',
                                },
                                {
                                  value: 'Corporate',
                                  label: 'Corporate Client',
                                },
                                { value: 'WalkIn', label: 'Walk-In FastTrack' },
                              ]}
                              selectedValues={field.value || []}
                              onChange={(vals) => field.onChange(vals)}
                              placeholder="-- All Customer Types --"
                              disabled={isSubmittingPricing}
                            />
                          )}
                        />
                      </FormControl>
                      <FormError>
                        {
                          (pricingForm.formState.errors.customerTypes as any)
                            ?.message
                        }
                      </FormError>
                    </FormField>

                    <FormField>
                      <FormLabel>Batch Types</FormLabel>
                      <FormControl>
                        <Controller
                          name="batchTypes"
                          control={pricingForm.control}
                          render={({ field }) => (
                            <MultiSelect
                              options={[
                                { value: 'Regular', label: 'Regular Sessions' },
                                { value: 'FastTrack', label: 'Fast Track' },
                                { value: 'Weekend', label: 'Weekend Programs' },
                              ]}
                              selectedValues={field.value || []}
                              onChange={(vals) => field.onChange(vals)}
                              placeholder="-- All Batch Types --"
                              disabled={isSubmittingPricing}
                            />
                          )}
                        />
                      </FormControl>
                      <FormError>
                        {
                          (pricingForm.formState.errors.batchTypes as any)
                            ?.message
                        }
                      </FormError>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-2">
                      <FormField>
                        <FormLabel htmlFor="basePrice">
                          Base Tuition Fee
                        </FormLabel>
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
                          <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">
                            OMR
                          </div>
                        </FormControl>
                        <FormError>
                          {pricingForm.formState.errors.basePrice?.message}
                        </FormError>
                      </FormField>
                    </div>

                    <div>
                      <FormField>
                        <FormLabel htmlFor="taxPercentage">
                          Oman VAT Rate
                        </FormLabel>
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
                        <FormError>
                          {pricingForm.formState.errors.taxPercentage?.message}
                        </FormError>
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
                      <FormLabel
                        htmlFor="isTaxExempt"
                        className="font-bold text-slate-700 text-xs"
                      >
                        Logically Tax Exempt
                      </FormLabel>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Toggle tax exemption for this pricing override.
                      </span>
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
                          <FormLabel
                            htmlFor="taxExemptionCode"
                            className="text-emerald-900"
                          >
                            Exemption Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="taxExemptionCode"
                              placeholder="EX-VAT-OMAN-..."
                              className="bg-white border-emerald-200"
                              {...pricingForm.register('taxExemptionCode')}
                              disabled={isSubmittingPricing}
                            />
                          </FormControl>
                          <FormError>
                            {
                              pricingForm.formState.errors.taxExemptionCode
                                ?.message
                            }
                          </FormError>
                        </FormField>

                        <FormField>
                          <FormLabel
                            htmlFor="taxExemptionReason"
                            className="text-emerald-900"
                          >
                            Legal Justification
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="taxExemptionReason"
                              placeholder="Authority decree reference"
                              className="bg-white border-emerald-200"
                              {...pricingForm.register('taxExemptionReason')}
                              disabled={isSubmittingPricing}
                            />
                          </FormControl>
                          <FormError>
                            {
                              pricingForm.formState.errors.taxExemptionReason
                                ?.message
                            }
                          </FormError>
                        </FormField>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="effectiveStartDate">
                        Effective Start Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="effectiveStartDate"
                          type="date"
                          {...pricingForm.register('effectiveStartDate')}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>
                        {
                          pricingForm.formState.errors.effectiveStartDate
                            ?.message
                        }
                      </FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="effectiveEndDate">
                        Effective End Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="effectiveEndDate"
                          type="date"
                          {...pricingForm.register('effectiveEndDate')}
                          disabled={isSubmittingPricing}
                        />
                      </FormControl>
                      <FormError>
                        {pricingForm.formState.errors.effectiveEndDate?.message}
                      </FormError>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                      disabled={isSubmittingPricing}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingPricing}>
                      {isSubmittingPricing
                        ? 'Saving Override...'
                        : 'Save Pricing Rule'}
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
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Scope level
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.batchId
                          ? 'Batch Override'
                          : activeRecord.branchId
                            ? 'Branch Override'
                            : 'Global Default'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Segment
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.customerType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Base Price
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {Number(activeRecord.basePrice).toFixed(3)}{' '}
                        {activeRecord.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Oman VAT
                      </span>
                      <span className="font-semibold text-slate-700">
                        {Number(activeRecord.taxPercentage).toFixed(1)}%
                      </span>
                    </div>
                    {activeRecord.isTaxExempt && (
                      <div className="col-span-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-900 mt-1">
                        <span className="font-bold block text-[10px] uppercase">
                          Tax Exemption:
                        </span>
                        <p className="mt-0.5">
                          Code: {activeRecord.taxExemptionCode} | Reason:{' '}
                          {activeRecord.taxExemptionReason}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Validity Range
                      </span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} -{' '}
                        {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Status Status
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}
                      >
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw
                        className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`}
                      />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        Fetching audit history logs...
                      </div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        No logs found.
                      </div>
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
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      log.action === 'Create'
                                        ? 'text-emerald-700 bg-emerald-50'
                                        : 'text-blue-700 bg-blue-50'
                                    }`}
                                  >
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">
                                    {log.performedBy}
                                  </span>
                                </div>
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(log.performedAt).toLocaleString(
                                    'en-GB',
                                  )}
                                </span>
                              </div>
                              {log.ipAddress && (
                                <p className="text-[10px] text-slate-400">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">
                                        Old:
                                      </span>
                                      <pre className="text-red-600">
                                        {JSON.stringify(log.oldValue, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">
                                        New:
                                      </span>
                                      <pre className="text-emerald-700">
                                        {JSON.stringify(log.newValue, null, 2)}
                                      </pre>
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

                  {/* Actions Footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                    >
                      Close
                    </Button>
                    {activeRecord.status === 'Active' && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to disable this pricing override?',
                            )
                          ) {
                            handleDisablePricing(activeRecord.id);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        Disable Override
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Create Discount Campaign Form */}
              {drawerType === 'create-discount' && (
                <form
                  onSubmit={discountForm.handleSubmit(handleDiscountSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discount-branchIds">
                        Target Branch(es)
                      </FormLabel>
                      <FormControl>
                        <Controller
                          control={discountForm.control}
                          name="branchIds"
                          render={({ field }) => (
                            <MultiSelect
                              options={branches.map((b) => ({
                                value: b.id,
                                label: b.branchName,
                              }))}
                              selectedValues={field.value || []}
                              onChange={field.onChange}
                              placeholder="Select Target Branches (Leave empty for Global)"
                              disabled={isSubmittingDiscount}
                            />
                          )}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discountType">
                        Discount Type
                      </FormLabel>
                      <FormControl>
                        <Select
                          id="discountType"
                          value={discountForm.watch('discountType')}
                          onChange={(e) =>
                            discountForm.setValue(
                              'discountType',
                              e.target.value as any,
                            )
                          }
                          options={[
                            {
                              value: 'Individual',
                              label: 'Individual Promotion',
                            },
                            { value: 'Corporate', label: 'Corporate Deal' },
                            { value: 'EarlyBird', label: 'Early Bird Booking' },
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="discountMode">
                        Discount Mode
                      </FormLabel>
                      <FormControl>
                        <Select
                          id="discountMode"
                          value={discountForm.watch('discountMode')}
                          onChange={(e) =>
                            discountForm.setValue(
                              'discountMode',
                              e.target.value as any,
                            )
                          }
                          options={[
                            { value: 'Percentage', label: 'Percentage (%)' },
                            {
                              value: 'FixedAmount',
                              label: 'Fixed Amount (OMR)',
                            },
                          ]}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <FormField>
                    <FormLabel htmlFor="discountValue">
                      Discount Value
                    </FormLabel>
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
                        {discountForm.watch('discountMode') === 'Percentage'
                          ? '%'
                          : 'OMR'}
                      </div>
                    </FormControl>
                    <FormError>
                      {discountForm.formState.errors.discountValue?.message}
                    </FormError>
                  </FormField>

                  <FormField className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <FormControl>
                      <Checkbox
                        id="requiresApproval"
                        checked={discountForm.watch('requiresApproval')}
                        onChange={(e: any) =>
                          discountForm.setValue(
                            'requiresApproval',
                            e.target.checked,
                          )
                        }
                        disabled={isSubmittingDiscount}
                      />
                    </FormControl>
                    <div>
                      <FormLabel
                        htmlFor="requiresApproval"
                        className="font-bold text-slate-700 text-xs"
                      >
                        Requires Admin Approval
                      </FormLabel>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Toggle manual coordinator approval during registration.
                      </span>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="discount-effectiveStartDate">
                        Effective Start Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="discount-effectiveStartDate"
                          type="date"
                          {...discountForm.register('effectiveStartDate')}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="discount-effectiveEndDate">
                        Effective End Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="discount-effectiveEndDate"
                          type="date"
                          {...discountForm.register('effectiveEndDate')}
                          disabled={isSubmittingDiscount}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                      disabled={isSubmittingDiscount}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingDiscount}>
                      {isSubmittingDiscount
                        ? 'Saving Campaign...'
                        : 'Save Campaign'}
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
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Scope
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.batchId
                          ? 'Batch Campaign'
                          : activeRecord.branchId
                            ? 'Branch Campaign'
                            : 'Global Campaign'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Campaign Type
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.discountType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Calculation Mode
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.discountMode}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Discount Value
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {activeRecord.discountMode === 'Percentage'
                          ? `${Number(activeRecord.discountValue).toFixed(1)}%`
                          : `${Number(activeRecord.discountValue).toFixed(3)} OMR`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Requires Approval?
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.requiresApproval ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Validity Range
                      </span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} -{' '}
                        {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Status
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}
                      >
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw
                        className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`}
                      />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        Fetching audit history logs...
                      </div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        No logs found.
                      </div>
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
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      log.action === 'Create'
                                        ? 'text-emerald-700 bg-emerald-50'
                                        : 'text-blue-700 bg-blue-50'
                                    }`}
                                  >
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">
                                    {log.performedBy}
                                  </span>
                                </div>
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(log.performedAt).toLocaleString(
                                    'en-GB',
                                  )}
                                </span>
                              </div>
                              {log.ipAddress && (
                                <p className="text-[10px] text-slate-400">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">
                                        Old:
                                      </span>
                                      <pre className="text-red-600">
                                        {JSON.stringify(log.oldValue, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">
                                        New:
                                      </span>
                                      <pre className="text-emerald-700">
                                        {JSON.stringify(log.newValue, null, 2)}
                                      </pre>
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

                  {/* Actions Footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                    >
                      Close
                    </Button>
                    {activeRecord.status === 'Active' && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to disable this discount override?',
                            )
                          ) {
                            handleDisableDiscount(activeRecord.id);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        Disable Override
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Create Completion Rule Form */}
              {drawerType === 'create-rule' && (
                <form
                  onSubmit={ruleForm.handleSubmit(handleRuleSubmit)}
                  className="space-y-4"
                >
                  <FormField>
                    <FormLabel htmlFor="minimumAttendancePercent">
                      Minimum Attendance Required
                    </FormLabel>
                    <FormControl className="relative">
                      <Input
                        id="minimumAttendancePercent"
                        type="number"
                        className="pr-12 text-right font-bold"
                        {...ruleForm.register('minimumAttendancePercent')}
                        disabled={isSubmittingRule}
                      />
                      <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">
                        %
                      </div>
                    </FormControl>
                    <FormError>
                      {
                        ruleForm.formState.errors.minimumAttendancePercent
                          ?.message
                      }
                    </FormError>
                  </FormField>

                  <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                      Graduation Requirements & Checks
                    </span>

                    <div className="grid gap-3">
                      {/* Checkbox 1: Exam Required */}
                      <label
                        htmlFor="examRequired"
                        className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-all cursor-pointer ${
                          ruleForm.watch('examRequired')
                            ? 'border-[color:var(--ims-brand)] bg-[color:var(--ims-brand)]/[0.02] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          id="examRequired"
                          checked={ruleForm.watch('examRequired')}
                          onChange={(e: any) =>
                            ruleForm.setValue('examRequired', e.target.checked)
                          }
                          disabled={isSubmittingRule}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">
                            Exam / Assessment Passing
                          </span>
                          <span className="block text-[11px] text-slate-500 leading-normal">
                            Students must take and pass all mandatory exams,
                            course assessments, or practical evaluations.
                          </span>
                        </div>
                      </label>

                      {/* Checkbox 2: Fee Clearance Required */}
                      <label
                        htmlFor="feeClearanceRequired"
                        className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-all cursor-pointer ${
                          ruleForm.watch('feeClearanceRequired')
                            ? 'border-[color:var(--ims-brand)] bg-[color:var(--ims-brand)]/[0.02] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          id="feeClearanceRequired"
                          checked={ruleForm.watch('feeClearanceRequired')}
                          onChange={(e: any) =>
                            ruleForm.setValue(
                              'feeClearanceRequired',
                              e.target.checked,
                            )
                          }
                          disabled={isSubmittingRule}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">
                            Financial Balance Clearance
                          </span>
                          <span className="block text-[11px] text-slate-500 leading-normal">
                            Restricts certificate release until the student
                            clears all outstanding tuition installment balances.
                          </span>
                        </div>
                      </label>

                      {/* Checkbox 3: Manual Approval Required */}
                      <label
                        htmlFor="manualApprovalRequired"
                        className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-all cursor-pointer ${
                          ruleForm.watch('manualApprovalRequired')
                            ? 'border-[color:var(--ims-brand)] bg-[color:var(--ims-brand)]/[0.02] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          id="manualApprovalRequired"
                          checked={ruleForm.watch('manualApprovalRequired')}
                          onChange={(e: any) =>
                            ruleForm.setValue(
                              'manualApprovalRequired',
                              e.target.checked,
                            )
                          }
                          disabled={isSubmittingRule}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800">
                            Academic Director Approval
                          </span>
                          <span className="block text-[11px] text-slate-500 leading-normal">
                            Forces a manual verification step where the academic
                            director reviews individual attendance logs and
                            grade books.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="rule-effectiveStartDate">
                        Effective Start Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="rule-effectiveStartDate"
                          type="date"
                          {...ruleForm.register('effectiveStartDate')}
                          disabled={isSubmittingRule}
                        />
                      </FormControl>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="rule-effectiveEndDate">
                        Effective End Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="rule-effectiveEndDate"
                          type="date"
                          {...ruleForm.register('effectiveEndDate')}
                          disabled={isSubmittingRule}
                        />
                      </FormControl>
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                      disabled={isSubmittingRule}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingRule}>
                      {isSubmittingRule
                        ? 'Publishing Rule...'
                        : 'Publish Rule Version'}
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
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Min. Attendance Threshold
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {activeRecord.minimumAttendancePercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Exam Required?
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.examRequired ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Tuition Fee Clearance?
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.feeClearanceRequired ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Manual Director Approval?
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeRecord.manualApprovalRequired ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Validity Range
                      </span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(activeRecord.effectiveStartDate)} -{' '}
                        {formatDate(activeRecord.effectiveEndDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Status
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 ${getStatusClass(activeRecord.status)}`}
                      >
                        {activeRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <RefreshCw
                        className={`h-4 w-4 text-slate-400 ${loadingLogs ? 'animate-spin' : ''}`}
                      />
                      Audit Trail Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        Fetching audit history logs...
                      </div>
                    ) : activeRecordLogs.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        No logs found.
                      </div>
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
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      log.action === 'Create'
                                        ? 'text-emerald-700 bg-emerald-50'
                                        : 'text-blue-700 bg-blue-50'
                                    }`}
                                  >
                                    {log.action}
                                  </span>
                                  <span className="font-bold text-slate-700">
                                    {log.performedBy}
                                  </span>
                                </div>
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(log.performedAt).toLocaleString(
                                    'en-GB',
                                  )}
                                </span>
                              </div>
                              {log.ipAddress && (
                                <p className="text-[10px] text-slate-400">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1 font-mono text-[10px] text-slate-600 overflow-x-auto">
                                {log.action === 'Create' ? (
                                  <pre>
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-red-500 block">
                                        Old:
                                      </span>
                                      <pre className="text-red-600">
                                        {JSON.stringify(log.oldValue, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">
                                        New:
                                      </span>
                                      <pre className="text-emerald-700">
                                        {JSON.stringify(log.newValue, null, 2)}
                                      </pre>
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

                  {/* Actions Footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                    >
                      Close
                    </Button>
                    {activeRecord.status === 'Active' && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to disable this completion rule version?',
                            )
                          ) {
                            handleDisableCompletionRule(activeRecord.id);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        Disable Rule Version
                      </Button>
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
