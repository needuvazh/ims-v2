'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Calendar,
  User,
  ShieldAlert,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  FileMinus,
  Loader2,
  FileText,
  DollarSign,
  Receipt,
  Plus,
  Trash2,
  AlertCircle,
  ArrowDownToLine,
  CreditCard,
  Lock,
  Landmark,
  Building,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@ims/shared-ui';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  createInvoiceAction,
  issueInvoiceAction,
  recordPaymentAction,
} from '../../../finance/invoices/actions';

interface AuditHistoryItem {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  remarks: string;
}

interface EnrollmentDetail {
  id: string;
  enrollmentNumber: string;
  enrollmentStatus: string;
  createdAt: string;
  branchName: string;
  branchId: string;
  courseId: string;
  courseName: string;
  batchId: string | null;
  batchCode: string;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
  pricingSource: string;
  resolvedPrice: string;
  resolvedDiscount: string;
  finalAmount: string;
  paymentValidationRequired: boolean;
  priceEvaluationTimestamp: string | null;
  paymentCollected: string;
  enrollmentType: string;
  corporateAccountName?: string | null;
  corporateAccountCode?: string | null;
  corporateAccountId?: string | null;
  contractNumber?: string | null;
  studentProfileId: string;
  photoUrl: string | null;
  resolvedDiscounts?: Array<{
    id: string;
    discountType: string;
    discountMode: string;
    discountValue: number;
    calculatedAmount: number;
  }>;
}

interface InvoiceLineItem {
  id: string;
  descriptionEnglish: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

interface PaymentReceipt {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  remarks: string;
}

interface ClientInstallment {
  id: string;
  sequenceNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
}

interface ClientInstallmentPlan {
  id: string;
  planName: string;
  status: string;
  numberOfInstallments: number;
  totalAmount: number;
  installments: ClientInstallment[];
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  subCategory: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lineItems: InvoiceLineItem[];
  payments: PaymentReceipt[];
  installmentPlans: ClientInstallmentPlan[];
}

interface BatchOption {
  id: string;
  batchCode: string;
  capacity: number;
  currentEnrollmentCount: number;
  waitingListEnabled: boolean;
}

interface EnrollmentDetailsClientProps {
  detail: {
    enrollment: EnrollmentDetail;
    history: AuditHistoryItem[];
  };
  sessionUserId: string;
  sessionPermissions: string[];
  invoices: InvoiceDetail[];
  branches: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  batches: BatchOption[];
}

const formatDateSafe = (dateStr: string | Date) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function EnrollmentDetailsClient({
  detail,
  sessionUserId,
  sessionPermissions,
  invoices: initialInvoices,
  branches,
  courses,
  batches,
}: EnrollmentDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { enrollment, history } = detail;

  // Invoice logs state
  const [invoices, setInvoices] = useState<InvoiceDetail[]>(initialInvoices);

  // Sync initialInvoices prop to invoices state reactively
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Drop Modal State
  const [isDropOpen, setIsDropOpen] = useState(false);
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [dropReasonCode, setDropReasonCode] = useState('PERSONAL');
  const [dropRemarks, setDropRemarks] = useState('');

  // Change Batch Modal State
  const [isChangeBatchOpen, setIsChangeBatchOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(enrollment.batchId);

  // Payment Record Modal state
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('0');
  const [payMethod, setPayMethod] = useState<'Cash' | 'BankTransfer' | 'Card' | 'Online' | 'Cheque'>('Cash');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payReference, setPayReference] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // ID Card Generation State
  const [downloadingCard, setDownloadingCard] = useState(false);

  const handleDownloadCard = async () => {
    setDownloadingCard(true);
    try {
      const res = await fetch(`/api/v1/enrollments/${enrollment.id}/id-card/download`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.messageEnglish || 'Failed to download course card.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-card-${enrollment.enrollmentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Course card downloaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download course card.');
    } finally {
      setDownloadingCard(false);
    }
  };

  // Invoice Generation State (if no invoices exist)
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
      isFromMaster?: boolean;
    }>
  >([]);
  const [numberOfInstallments, setNumberOfInstallments] = useState(2);
  const [installments, setInstallments] = useState<Array<{ dueDate: string; amount: string }>>([]);

  // Initialize line items from enrollment resolved pricing on load
  useEffect(() => {
    const defaultItems = [
      {
        descriptionEnglish: `Course Fee: ${enrollment.courseName} (${enrollment.enrollmentNumber})`,
        quantity: 1,
        unitPrice: Number(enrollment.resolvedPrice),
        isDiscount: false,
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        sourceBranchId: enrollment.branchId,
        isFromMaster: true,
      },
    ];

    if (enrollment.resolvedDiscounts && enrollment.resolvedDiscounts.length > 0) {
      enrollment.resolvedDiscounts.forEach((d) => {
        defaultItems.push({
          descriptionEnglish: `Discount: ${d.discountType} (${d.discountMode === 'Percentage' ? d.discountValue + '%' : d.discountValue + ' OMR'}) (${enrollment.enrollmentNumber})`,
          quantity: 1,
          unitPrice: d.calculatedAmount,
          isDiscount: true,
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          sourceBranchId: enrollment.branchId,
          isFromMaster: true,
        });
      });
    } else if (Number(enrollment.resolvedDiscount) > 0) {
      defaultItems.push({
        descriptionEnglish: `Discount: Scholarship/Promo (${enrollment.enrollmentNumber})`,
        quantity: 1,
        unitPrice: Number(enrollment.resolvedDiscount),
        isDiscount: true,
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        sourceBranchId: enrollment.branchId,
        isFromMaster: true,
      });
    }
    setLineItems(defaultItems);
  }, [enrollment]);

  // Interactively compute invoice totals
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

  // Dynamically resolve values to display in the header snapshot grid
  const displayBasePrice = invoices.length > 0
    ? Number(enrollment.resolvedPrice)
    : subtotal;

  const displayDiscount = invoices.length > 0
    ? Math.max(
        Number(enrollment.resolvedDiscount),
        invoices.reduce((sum, inv) => sum + inv.lineItems.reduce((liSum, li) => liSum + li.discountAmount, 0), 0)
      )
    : totalDiscount;

  const displayFinalAmount = invoices.length > 0
    ? (displayBasePrice - displayDiscount)
    : taxableAmount;

  // Auto-planner for installments
  useEffect(() => {
    if (invoiceSubCategory !== 'Installment') return;
    const baseAmt = Math.floor((finalInvoiceTotal / numberOfInstallments) * 1000) / 1000;
    const remainder = Number((finalInvoiceTotal - baseAmt * numberOfInstallments).toFixed(3));

    const newInstallments = [];
    const baseDate = new Date(invoiceDate || new Date());
    for (let i = 0; i < numberOfInstallments; i++) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() + i + 1);
      newInstallments.push({
        dueDate: d.toISOString().split('T')[0],
        amount: String(i === numberOfInstallments - 1 ? Number((baseAmt + remainder).toFixed(3)) : baseAmt),
      });
    }
    setInstallments(newInstallments);
  }, [finalInvoiceTotal, numberOfInstallments, invoiceSubCategory, invoiceDate]);

  const handleLineItemChange = (index: number, field: string, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        descriptionEnglish: 'Learning Resources / Service Fees',
        quantity: 1,
        unitPrice: 0,
        isDiscount: false,
        enrollmentId: null,
        courseId: null,
        sourceBranchId: enrollment.branchId,
        isFromMaster: false,
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

  // Workflow transitions (Submit, Approve, Cancel, Confirm)
  const handleTransition = async (action: 'submit' | 'approve' | 'cancel' | 'confirm') => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || `Failed to ${action} enrollment.`);
        }

        toast.success(`Enrollment successfully ${action === 'confirm' ? 'confirmed' : action + 'ed'}!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || `Failed to transition state.`);
      }
    });
  };

  const handleDropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/drop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            withdrawalDate: new Date(withdrawalDate).toISOString(),
            reasonCode: dropReasonCode,
            remarks: dropRemarks || null,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to drop enrollment.');
        }

        toast.success('Enrollment dropped successfully. Seat released.');
        setIsDropOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Failed to drop enrollment.');
      }
    });
  };

  const handleChangeBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      toast.error('Please select a batch.');
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/change-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchId: selectedBatchId }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to change batch.');
        }

        toast.success('Batch changed successfully.');
        setIsChangeBatchOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Failed to change batch.');
      }
    });
  };

  // 1. Generate Invoice submit action
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalDiscount > subtotal) {
      toast.error('Total discount amount cannot exceed the subtotal of items.');
      return;
    }

    if (invoiceSubCategory === 'Installment') {
      const sum = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
      if (Math.abs(sum - finalInvoiceTotal) > 0.01) {
        toast.error(`Installment allocations sum (${sum.toFixed(3)} OMR) must match invoice net total (${finalInvoiceTotal.toFixed(3)} OMR).`);
        return;
      }
    }

    startTransition(async () => {
      // Map line items into schema structure
      const nonDiscountItems = lineItems.filter((li) => !li.isDiscount);
      let remainingDiscount = totalDiscount;

      const mappedLineItems = nonDiscountItems.map((item) => {
        const itemPrice = Number(item.unitPrice);
        const itemDiscount = Math.min(itemPrice, remainingDiscount);
        remainingDiscount -= itemDiscount;

        return {
          enrollmentId: item.enrollmentId,
          courseId: item.courseId,
          sourceBranchId: item.sourceBranchId,
          descriptionEnglish: item.descriptionEnglish,
          quantity: 1,
          unitPrice: itemPrice,
          discountAmount: Number(itemDiscount.toFixed(3)),
          taxRate: taxRate / 100,
        };
      });

      const res = await createInvoiceAction({
        invoiceType: enrollment.enrollmentType === 'Corporate' ? 'CorporateInvoice' : 'StudentInvoice',
        category: enrollment.enrollmentType === 'Corporate' ? 'Corporate' : 'Student',
        subCategory: invoiceSubCategory,
        studentProfileId: enrollment.studentProfileId,
        corporateAccountId: enrollment.corporateAccountId || null,
        enrollmentId: enrollment.id,
        branchId: enrollment.branchId,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(invoiceDueDate),
        currency: 'OMR',
        lineItems: mappedLineItems,
        numberOfInstallments: invoiceSubCategory === 'Installment' ? numberOfInstallments : null,
        installments: invoiceSubCategory === 'Installment'
          ? installments.map((inst) => ({
            dueDate: new Date(inst.dueDate),
            amount: Number(inst.amount),
          }))
          : null,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to generate invoice.');
        return;
      }

      toast.success(`Invoice successfully generated: ${res.data?.invoiceNumber}`);
      router.refresh();
    });
  };

  // 2. Issue Invoice state change
  const handleIssueInvoice = async (invoiceId: string) => {
    startTransition(async () => {
      const res = await issueInvoiceAction(invoiceId);
      if (!res.success) {
        toast.error(res.error || 'Failed to issue invoice.');
        return;
      }
      toast.success(`Invoice ${res.data?.invoiceNumber} has been published/issued.`);
      router.refresh();
    });
  };

  // 3. Post manual receipt payment action
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = invoices.find((inv) => inv.id === payInvoiceId);
    if (!invoice) return;

    const outstanding = invoice.outstandingAmount;
    const paidAmt = Number(payAmount);

    if (paidAmt <= 0) {
      toast.error('Payment amount must be positive.');
      return;
    }

    if (paidAmt > outstanding) {
      toast.error(`Payment amount (${paidAmt} OMR) cannot exceed outstanding balance (${outstanding} OMR).`);
      return;
    }

    startTransition(async () => {
      const res = await recordPaymentAction({
        invoiceId: payInvoiceId,
        amount: paidAmt,
        paymentMethod: payMethod,
        paymentDate: new Date(payDate),
        referenceNumber: payReference || null,
        remarks: payRemarks || null,
        branchId: enrollment.branchId,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to post collection.');
        return;
      }

      toast.success(`Payment recorded! Receipt: ${res.data?.receiptNumber}`);
      setIsPayOpen(false);
      setPayRemarks('');
      setPayReference('');
      router.refresh();
    });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'BatchLevelOverride':
      case 'BatchLevel':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 text-[10px]">
            Batch Level Override
          </Badge>
        );
      case 'BranchLevelOverride':
      case 'BranchLevel':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[10px]">
            Branch Level Override
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50 text-[10px]">

          </Badge>
        );
    }
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Active':
      case 'Confirmed':
        return 'success';
      case 'Submitted':
      case 'Approved':
        return 'info';
      case 'Draft':
        return 'outline';
      case 'Dropped':
      case 'Cancelled':
        return 'error';
      case 'Completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const hasPaymentRecord = invoices.some((inv) => inv.payments && inv.payments.length > 0);
  const canSubmit =
    enrollment.enrollmentStatus === 'Draft' &&
    sessionPermissions.includes('enrollment.submit') &&
    hasPaymentRecord;
  const canApprove =
    enrollment.enrollmentStatus === 'Submitted' &&
    sessionPermissions.includes('enrollment.approve');
  const canCancel =
    ['Submitted', 'Approved'].includes(enrollment.enrollmentStatus) &&
    sessionPermissions.includes('enrollment.cancel');
  const canDrop =
    ['Confirmed', 'Active'].includes(enrollment.enrollmentStatus) &&
    sessionPermissions.includes('enrollment.drop');
  const canConfirm =
    enrollment.enrollmentStatus === 'Approved' &&
    sessionPermissions.includes('enrollment.approve') &&
    hasPaymentRecord;

  const isDraftWithoutPayment = enrollment.enrollmentStatus === 'Draft' && !hasPaymentRecord;
  const isApprovedWithoutPayment = enrollment.enrollmentStatus === 'Approved' && !hasPaymentRecord;

  const canChangeBatch =
    ['Draft', 'Submitted', 'Approved'].includes(enrollment.enrollmentStatus) &&
    sessionPermissions.includes('enrollment.submit');

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/enrollments" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2 font-outfit">
              <GraduationCap className="h-7 w-7 text-indigo-600" />
              Enrollment Detail Portal: {enrollment.enrollmentNumber}
            </h1>
            <Badge variant={getStatusBadgeVariant(enrollment.enrollmentStatus)} className="ml-2 font-semibold">
              {enrollment.enrollmentStatus}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 pl-7">
            Manage learning batch configurations, resolve invoice line items, and audit student payment logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Console details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enrollment info card */}
            <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm uppercase">
                  Enrollment Metadata
                </h4>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Target Course:</span>
                  <span className="font-semibold text-slate-800">{enrollment.courseName}</span>
                </div>
                <div className="flex justify-between items-center h-8">
                  <span>Assigned Batch:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">
                      {enrollment.batchCode || 'Course Waitlist (No Batch)'}
                    </span>
                    {canChangeBatch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBatchId(enrollment.batchId);
                          setIsChangeBatchOpen(true);
                        }}
                        className="h-7 px-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        {enrollment.batchId ? 'Change' : 'Assign'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Branch Location:</span>
                  <span className="font-medium text-slate-800">{enrollment.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Intake Class:</span>
                  <span className="font-medium text-slate-800">{enrollment.enrollmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created At:</span>
                  <span>{formatDateSafe(enrollment.createdAt)}</span>
                </div>
              </div>
            </Card>

            {/* Corporate Account details if applicable */}
            {enrollment.enrollmentType === 'Corporate' && enrollment.corporateAccountName && (
              <Card className="bg-amber-50/20 border border-amber-100/70 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-amber-100/50 pb-2">
                  <Building className="h-4.5 w-4.5 text-amber-700" />
                  <h4 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                    B2B Corporate Account Linkage
                  </h4>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Corporate Client:</span>
                    <span className="font-bold text-slate-800">{enrollment.corporateAccountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Code:</span>
                    <span className="font-mono text-slate-800">{enrollment.corporateAccountCode}</span>
                  </div>
                  {enrollment.contractNumber && (
                    <div className="flex justify-between">
                      <span>Contract Number:</span>
                      <span className="font-semibold text-slate-800">{enrollment.contractNumber}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Student metadata */}
            <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <User className="h-4.5 w-4.5 text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm uppercase">
                  Student Identity Details
                </h4>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Full Name:</span>
                  <span className="font-semibold text-slate-800">{enrollment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium text-indigo-600">{enrollment.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile Contact:</span>
                  <span className="font-medium text-slate-800">{enrollment.studentMobile}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Enrollment Course ID Card (Provisioned) */}
          {enrollment.enrollmentStatus === 'Confirmed' && (
            <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2 mb-4 font-outfit">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Course Identity Card (Provisioned)
              </h3>

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Mock Visual 3D Flip ID Card Design */}
                <div className="w-80 h-48 [perspective:1000px] group cursor-pointer mx-auto md:mx-0">
                  <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

                    {/* Front Side */}
                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-teal-800 to-teal-950 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg border border-teal-700/50">
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                        <CreditCard className="h-48 w-48 -mr-10 -mb-10" />
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] tracking-widest text-teal-200 block uppercase font-bold font-outfit">
                            AL SAUD TRAINING INST.
                          </span>
                          <span className="text-[8px] text-teal-300 block">
                            ASTI Institute Management System
                          </span>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8px] hover:bg-emerald-500/20 font-semibold">
                          ENROLLED
                        </Badge>
                      </div>

                      <div className="my-2 flex gap-3 items-center">
                        <div className="h-14 w-14 rounded-lg bg-teal-900 border border-teal-700/50 flex items-center justify-center text-teal-300 text-[10px] font-bold overflow-hidden shrink-0">
                          {enrollment.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/v1/students/${enrollment.studentProfileId}/profile-photo/view?v=${encodeURIComponent(enrollment.photoUrl)}`}
                              alt="Student Avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            'PHOTO'
                          )}
                        </div>
                        <div className="space-y-0.5 text-left min-w-0 flex-1">
                          <span className="text-xs font-semibold block truncate">
                            {enrollment.studentName}
                          </span>
                          <span className="text-[10px] text-teal-200 block font-mono font-medium">
                            ID: {enrollment.enrollmentNumber}
                          </span>
                          <span className="text-[8px] text-teal-300 block truncate">
                            Course: {enrollment.courseName}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-teal-800/40 pt-2 text-[8px] text-teal-200">
                        <div>
                          <span>VALID UNTIL: </span>
                          <span className="font-mono">DEC 2026</span>
                        </div>
                        <div className="font-mono">ASTI-ENR-CARD</div>
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-slate-950 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg border border-slate-800">
                      <div className="space-y-2">
                        <div className="border-b border-slate-800 pb-1 flex justify-between items-center">
                          <span className="text-[8px] tracking-widest text-slate-300 font-bold uppercase font-outfit">
                            TERMS & CONDITIONS
                          </span>
                          <span className="text-[6px] text-slate-400 font-mono">ASTI-ENR-V1</span>
                        </div>
                        <p className="text-[6.5px] text-slate-300 leading-relaxed text-left font-sans">
                          1. This card is issued for the enrolled course only and is non-transferable.
                          <br />
                          2. Cardholder must present this card upon request by institute authorities.
                          <br />
                          3. If lost, damaged, or withdrawn, this card becomes void immediately.
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-900 pt-2 text-left">
                        <div className="flex justify-between items-center text-[6px] text-slate-400">
                          <div>
                            <span className="block font-bold text-slate-300">ASTI Dubai Campus</span>
                            <span>Tel: +971 4 123 4567 | info@asti.ae</span>
                          </div>
                          <div className="text-right">
                            <span className="block border-b border-slate-800 pb-1 w-16 text-center font-serif italic text-[5px]">
                              Registrar
                            </span>
                          </div>
                        </div>

                        {/* Barcode Mock */}
                        <div className="h-5 bg-white rounded flex items-center justify-center p-1">
                          <div className="w-full h-full bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px)]" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Actions Column */}
                <div className="space-y-3 w-full md:w-64 text-left">
                  <div className="text-xs space-y-1">
                    <div className="text-slate-500">
                      ID Card Status:{' '}
                      <span className="font-semibold text-emerald-600">
                        Active & Confirmed
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Card Number:{' '}
                      <span className="font-mono">{enrollment.enrollmentNumber}</span>
                    </div>
                  </div>
                  <div>
                    <Button
                      id="enrollment-course-card-visual-download-btn"
                      onClick={handleDownloadCard}
                      disabled={downloadingCard}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 h-9 w-full flex justify-center items-center gap-2 font-semibold shadow-sm"
                    >
                      {downloadingCard ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="h-4.5 w-4.5" />
                      )}
                      Download Course Card PDF
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Combined Pricing Snapshot & Billing console */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-sm uppercase">
                    Pricing & Billing Console
                  </h4>
                </div>
                {getSourceBadge(enrollment.pricingSource)}
              </div>

              {/* Pricing Resolution details inline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Base Catalog Price</span>
                  <p className="font-mono text-sm font-semibold text-slate-800">
                    {displayBasePrice.toFixed(3)} OMR
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium text-emerald-600">Applied Discount</span>
                  <p className="font-mono text-sm font-bold text-emerald-600">
                    -{displayDiscount.toFixed(3)} OMR
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium text-indigo-600">Net Resolved Price</span>
                  <p className="font-mono text-sm font-extrabold text-indigo-600">
                    {displayFinalAmount.toFixed(3)} OMR
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Payment Validation</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {enrollment.paymentValidationRequired ? 'Required' : 'Not Required'}
                  </p>
                </div>
              </div>

              {enrollment.priceEvaluationTimestamp && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Pricing snapshot evaluated on {new Date(enrollment.priceEvaluationTimestamp).toLocaleString()}</span>
                </div>
              )}
            </div>

            {invoices.length === 0 ? (
              /* State A: Invoice Form Inline */
              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex gap-2 text-xs text-indigo-800">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    No invoices raised for this enrollment yet. Setup line items and VAT settings below to generate the billing invoice.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Billing Split Type</label>
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

                {/* Configurable line items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">Invoice Line Items</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItem}
                      className="text-xs flex items-center gap-1 border-slate-200 py-1"
                    >
                      <Plus className="h-3 w-3" /> Add Item
                    </Button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm border-collapse text-left bg-white">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3">Description (English)</th>
                          <th className="p-3 w-32 text-right">Price</th>
                          <th className="p-3 w-28 text-center">Discount?</th>
                          <th className="p-3 w-12 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.descriptionEnglish}
                                onChange={(e) => handleLineItemChange(index, 'descriptionEnglish', e.target.value)}
                                className="w-full h-8 rounded border border-slate-200 text-xs px-2 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed font-medium text-slate-800"
                                required
                                disabled={item.isFromMaster}
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
                                  className="w-24 h-8 rounded border border-slate-200 text-xs text-right px-2 focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  required
                                  disabled={item.isFromMaster}
                                />
                                <span className="text-[10px] text-slate-400">OMR</span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.isDiscount}
                                onChange={(e) => handleLineItemChange(index, 'isDiscount', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.isFromMaster}
                              />
                            </td>
                            <td className="p-2 text-center">
                              {item.isFromMaster ? (
                                <div className="flex justify-center text-slate-400" title="Configured from Pricing Master">
                                  <Lock className="h-4 w-4" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => deleteLineItem(index)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-sm">
                  {/* Installment Plan configuration */}
                  {invoiceSubCategory === 'Installment' ? (
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

                      <div className="grid grid-cols-1 gap-2.5">
                        {installments.map((inst, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-bold text-slate-400 w-6">#{index + 1}</span>
                              <input
                                type="date"
                                value={inst.dueDate}
                                onChange={(e) => {
                                  const copy = [...installments];
                                  copy[index].dueDate = e.target.value;
                                  setInstallments(copy);
                                }}
                                className="h-8 rounded-lg border border-slate-200 text-xs px-2.5 focus:outline-none w-36 font-medium text-slate-700"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                step="0.001"
                                value={inst.amount}
                                onChange={(e) => {
                                  const copy = [...installments];
                                  copy[index].amount = e.target.value;
                                  setInstallments(copy);
                                }}
                                className="h-8 w-24 rounded-lg border border-slate-200 text-xs px-2.5 focus:outline-none text-right font-mono font-bold text-slate-800"
                              />
                              <span className="text-xs font-semibold text-slate-400">OMR</span>
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
                  ) : (
                    <div />
                  )}

                  {/* Calculations card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 font-medium text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Subtotal:</span>
                      <span className="font-mono text-slate-900 font-semibold">{subtotal.toFixed(3)} OMR</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="text-xs">Scholarship / Discount:</span>
                      <span className="font-mono font-semibold">-{totalDiscount.toFixed(3)} OMR</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs flex items-center gap-1">
                        VAT Percentage (%):
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-12 h-6 text-center border border-slate-200 rounded text-xs focus:outline-none"
                        />
                      </span>
                      <span className="font-mono text-slate-900 font-semibold">{vatAmount.toFixed(3)} OMR</span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                      <span>Net Invoice Amount:</span>
                      <span className="font-mono text-indigo-600 text-base">{finalInvoiceTotal.toFixed(3)} OMR</span>
                    </div>

                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
                      >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Generate Invoice
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              /* State B: Invoices logs and balance summary */
              <div className="space-y-6">
                {invoices.map((inv) => (
                  <div key={inv.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/20 p-5 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 text-base">{inv.invoiceNumber}</span>
                          <Badge
                            variant={
                              inv.status === 'Paid'
                                ? 'success'
                                : inv.status === 'PartiallyPaid'
                                  ? 'info'
                                  : inv.status === 'Draft'
                                    ? 'outline'
                                    : 'error'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Date: {formatDateSafe(inv.invoiceDate)} | Split: {inv.subCategory}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status === 'Draft' && (
                          <Button
                            onClick={() => handleIssueInvoice(inv.id)}
                            disabled={isPending}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs py-1.5"
                          >
                            Issue Invoice
                          </Button>
                        )}
                        {(inv.status === 'Issued' || inv.status === 'PartiallyPaid') && (
                          <Button
                            onClick={() => {
                              setPayInvoiceId(inv.id);
                              setPayAmount(String(inv.outstandingAmount));
                              setIsPayOpen(true);
                            }}
                            disabled={isPending}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 flex items-center gap-1"
                          >
                            <DollarSign className="h-3.5 w-3.5" /> Record Payment
                          </Button>
                        )}
                        <a
                          href={`/api/v1/finance/invoices/${inv.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="outline" className="text-xs py-1.5 flex items-center gap-1 border-slate-200">
                            <ArrowDownToLine className="h-3.5 w-3.5 text-slate-500" /> PDF
                          </Button>
                        </a>
                      </div>
                    </div>

                    {/* Pricing summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 text-center">
                      <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-slate-400 font-medium">Invoice Total</span>
                        <p className="font-mono text-base text-slate-900 font-bold">{inv.totalAmount.toFixed(3)} OMR</p>
                      </div>
                      <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-slate-400 font-medium text-emerald-600">Collected Amount</span>
                        <p className="font-mono text-base text-emerald-600 font-bold">{inv.paidAmount.toFixed(3)} OMR</p>
                      </div>
                      <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-slate-400 font-medium text-rose-600">Outstanding Due</span>
                        <p className="font-mono text-base text-rose-600 font-bold">{inv.outstandingAmount.toFixed(3)} OMR</p>
                      </div>
                    </div>

                    {/* Installment Plan details if subCategory is Installment */}
                    {inv.installmentPlans && inv.installmentPlans.length > 0 && (
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-slate-700 block">
                          Installment Schedule Details ({inv.installmentPlans[0].planName})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {inv.installmentPlans[0].installments.map((inst) => (
                            <div
                              key={inst.id}
                              className={`p-3 rounded-lg border text-xs flex flex-col justify-between space-y-1.5 shadow-sm ${
                                inst.status === 'Paid'
                                  ? 'bg-emerald-50/30 border-emerald-100'
                                  : inst.status === 'Overdue'
                                    ? 'bg-rose-50/30 border-rose-100'
                                    : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex justify-between items-center font-semibold">
                                <span className="text-slate-500">Part #{inst.sequenceNumber}</span>
                                <Badge
                                  className="text-[10px] px-1.5 py-0.5"
                                  variant={
                                    inst.status === 'Paid'
                                      ? 'success'
                                      : inst.status === 'Overdue'
                                        ? 'error'
                                        : 'outline'
                                  }
                                >
                                  {inst.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-baseline font-mono">
                                <span className="text-slate-400 text-[10px]">Due Date:</span>
                                <span className="text-slate-600 font-semibold">
                                  {new Date(inst.dueDate).toLocaleDateString('en-OM', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline font-mono border-t border-slate-100 pt-1.5 mt-1">
                                <span className="text-slate-400 text-[10px]">Amount:</span>
                                <span className="text-slate-800 font-bold">
                                  {inst.amount.toFixed(3)} OMR
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline font-mono">
                                <span className="text-slate-400 text-[10px]">Paid:</span>
                                <span className="text-emerald-600 font-semibold">
                                  {inst.paidAmount.toFixed(3)} OMR
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Receipts listing */}
                    {inv.payments.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-slate-700 block">Collection Receipts history</span>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600 uppercase">
                              <tr>
                                <th className="p-2.5">Receipt #</th>
                                <th className="p-2.5">Method</th>
                                <th className="p-2.5">Collection Date</th>
                                <th className="p-2.5">Reference Code</th>
                                <th className="p-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                              {inv.payments.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-bold font-mono text-slate-900">{p.paymentNumber}</td>
                                  <td className="p-2.5">{p.paymentMethod}</td>
                                  <td className="p-2.5">{formatDateSafe(p.paymentDate)}</td>
                                  <td className="p-2.5 font-mono text-slate-400">{p.referenceNumber || 'N/A'}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">{p.amount.toFixed(3)} OMR</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Operational history */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Clock className="h-4.5 w-4.5 text-indigo-600" />
              <h4 className="font-semibold text-slate-800 text-sm uppercase">
                Lifecycle Audit Log
              </h4>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No lifecycle transition events recorded.</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-3 pl-4 space-y-5 py-2">
                {history.map((h) => (
                  <div key={h.id} className="relative text-sm space-y-1">
                    <span className="absolute -left-[21px] top-1 bg-indigo-50 border border-indigo-200 rounded-full h-3 w-3 block" />
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-slate-800">{h.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.performedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>Performed by: </span>
                      <span className="font-medium">{h.performedBy}</span>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-50/50 p-2 rounded-lg border border-slate-100 mt-1">
                      {h.remarks}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Actions column */}
        <div className="space-y-6">
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-50 pb-2 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-indigo-600" />
              Workflow Actions
            </h4>
            <div className="space-y-2.5">
              {canSubmit && (
                <Button
                  onClick={() => handleTransition('submit')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4.5 w-4.5" />
                  )}
                  Submit for Review
                </Button>
              )}

              {isDraftWithoutPayment && (
                <div className="space-y-2">
                  <Button
                    disabled
                    className="w-full flex justify-center items-center gap-2 bg-slate-100 text-slate-400 cursor-not-allowed font-semibold border border-slate-200/50"
                  >
                    <Clock className="h-4.5 w-4.5" />
                    Submit for Review
                  </Button>
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] p-2.5 rounded-xl flex gap-1.5 leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      An invoice must be generated and at least one payment recorded before submitting this enrollment for review.
                    </span>
                  </div>
                </div>
              )}

              {canApprove && (
                <Button
                  onClick={() => handleTransition('approve')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4.5 w-4.5" />
                  )}
                  Approve Enrollment
                </Button>
              )}

              {canCancel && (
                <Button
                  onClick={() => handleTransition('cancel')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5" />
                  )}
                  Reject / Cancel
                </Button>
              )}

              {canConfirm && (
                <Button
                  onClick={() => handleTransition('confirm')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4.5 w-4.5" />
                  )}
                  Confirm Enrollment
                </Button>
              )}

              {isApprovedWithoutPayment && (
                <div className="space-y-2">
                  <Button
                    disabled
                    className="w-full flex justify-center items-center gap-2 bg-slate-100 text-slate-400 cursor-not-allowed font-semibold border border-slate-200/50"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                    Confirm Enrollment
                  </Button>
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] p-2.5 rounded-xl flex gap-1.5 leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      At least one payment must be recorded on the invoice before this approved enrollment can be confirmed.
                    </span>
                  </div>
                </div>
              )}

              {canChangeBatch && (
                <Button
                  onClick={() => {
                    setSelectedBatchId(enrollment.batchId);
                    setIsChangeBatchOpen(true);
                  }}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                >
                  <Calendar className="h-4.5 w-4.5" />
                  {enrollment.batchId ? 'Change Batch' : 'Assign Batch'}
                </Button>
              )}

              {canDrop && (
                <Button
                  onClick={() => setIsDropOpen(true)}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                >
                  <FileMinus className="h-4.5 w-4.5" />
                  Drop Enrollment
                </Button>
              )}

              {enrollment.enrollmentStatus === 'Confirmed' && sessionPermissions.includes('enrollment.read') && (
                <Button
                  id="enrollment-course-card-download-btn"
                  onClick={handleDownloadCard}
                  disabled={downloadingCard}
                  className="w-full flex justify-center items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold"
                >
                  {downloadingCard ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4.5 w-4.5" />
                  )}
                  Download Course Card
                </Button>
              )}

              {!canSubmit && !canApprove && !canCancel && !canDrop && !canChangeBatch && !canConfirm && !isDraftWithoutPayment && !isApprovedWithoutPayment && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  No workflow actions are currently available for this status.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Drop Enrollment Modal */}
      <Dialog open={isDropOpen} onOpenChange={setIsDropOpen}>
        <DialogContent>
          <form onSubmit={handleDropSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-rose-700">Drop Student Enrollment</DialogTitle>
              <DialogDescription>
                This action is terminal and will withdraw the student from the batch, releasing their seat capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Withdrawal Date</label>
                <input
                  type="date"
                  required
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Drop Reason Code</label>
                <select
                  value={dropReasonCode}
                  onChange={(e) => setDropReasonCode(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                >
                  <option value="PERSONAL">Personal Reasons</option>
                  <option value="FINANCIAL">Financial Issues</option>
                  <option value="HEALTH">Medical / Health Reasons</option>
                  <option value="ACADEMIC">Academic Conflict</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Remarks / Explanation</label>
                <textarea
                  placeholder="Provide details about the student dropping..."
                  value={dropRemarks}
                  onChange={(e) => setDropRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="bg-rose-600 text-white hover:bg-rose-700">
                {isPending ? 'Dropping...' : 'Confirm Drop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Manual Payment Receipt Modal */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Record Payment Collection</DialogTitle>
              <DialogDescription>
                Post manual receipts collected at the cash counter or bank transfer clearing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Amount Collected</label>
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold font-mono">OMR</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full h-10 pr-12 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
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
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reference / Receipt Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-10294, CHQ-556"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared installment 1"
                    value={payRemarks}
                    onChange={(e) => setPayRemarks(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {isPending ? 'Posting...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Batch Modal */}
      <Dialog open={isChangeBatchOpen} onOpenChange={setIsChangeBatchOpen}>
        <DialogContent>
          <form onSubmit={handleChangeBatchSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Assign or Change Batch</DialogTitle>
              <DialogDescription>
                Select a different batch to assign to this student&apos;s enrollment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Select Batch</label>
                <select
                  value={selectedBatchId || ''}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Select a Batch --</option>
                  {batches
                    .filter((b) => b.id === enrollment.batchId || b.currentEnrollmentCount < b.capacity || b.waitingListEnabled)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchCode} (Capacity: {b.currentEnrollmentCount}/{b.capacity}){b.currentEnrollmentCount >= b.capacity && b.waitingListEnabled ? ' [Waitlist Only]' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">
                {isPending ? 'Saving...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
