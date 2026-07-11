'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  FileText,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Check,
  Loader2,
  Sparkles,
  Search,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Tag,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  Button,
  Badge,
  Select,
  Input,
} from '@ims/shared-ui';
import {
  convertLeadAction,
  getUpcomingBatchesAction,
  saveLeadProfileWizardAction,
  lookupStudentProfileAction,
  resolveCoursePricingAction,
} from '../../../actions';

const nationalityOptions = [
  { value: 'Omani', label: 'Omani' },
  { value: 'Saudi', label: 'Saudi' },
  { value: 'Emirati', label: 'Emirati' },
  { value: 'Bahraini', label: 'Bahraini' },
  { value: 'Qatari', label: 'Qatari' },
  { value: 'Kuwaiti', label: 'Kuwaiti' },
  { value: 'Yemeni', label: 'Yemeni' },
  { value: 'Egyptian', label: 'Egyptian' },
  { value: 'Indian', label: 'Indian' },
  { value: 'Pakistani', label: 'Pakistani' },
  { value: 'Bangladeshi', label: 'Bangladeshi' },
  { value: 'Filipino', label: 'Filipino' },
  { value: 'Syrian', label: 'Syrian' },
  { value: 'Jordanian', label: 'Jordanian' },
  { value: 'Sudanese', label: 'Sudanese' },
  { value: 'Other', label: 'Other' },
];

const identitySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  dateOfBirth: z.string().refine((val) => {
    if (!val) return false;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date of birth'),
  nationality: z.string().min(1, 'Nationality is required'),
  nationalId: z.string().min(1, 'ID / National Number is required'),
  gender: z.enum(['Male', 'Female']),
});

type IdentityFormData = z.infer<typeof identitySchema>;

interface ConvertLeadWizardProps {
  lead: any;
  initialDocuments?: any[];
}

export function ConvertLeadWizard({ lead, initialDocuments = [] }: ConvertLeadWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Identity Lookup State
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [existingStudent, setExistingStudent] = useState<any>(null);
  const [lookupDone, setLookupDone] = useState(false);

  // Document Uploads State
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, { url: string; fileName: string; id?: string }>
  >({});
  const [uploadingStates, setUploadingStates] = useState<
    Record<string, boolean>
  >({});
  const [autoVerifyDocs, setAutoVerifyDocs] = useState(true);

  // Batch & Pricing State
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [discountCode, setDiscountCode] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [isResolvingPricing, setIsResolvingPricing] = useState(false);
  const [pricingDetails, setPricingDetails] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IdentityFormData>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      email: lead.email || '',
      phone: lead.phone || '',
      nationality: lead.nationality || '',
      nationalId: lead.nationalId || '',
      gender: lead.gender || 'Male',
      dateOfBirth: lead.dateOfBirth || '',
    },
  });

  const currentEmail = watch('email');
  const currentPhone = watch('phone');
  const currentNationalId = watch('nationalId');

  // Format initial documents
  useEffect(() => {
    if (initialDocuments.length > 0) {
      const initialMap: Record<string, { url: string; fileName: string; id?: string }> = {};
      for (const doc of initialDocuments) {
        initialMap[doc.documentType] = {
          url: doc.fileKey,
          fileName: doc.fileName,
          id: doc.id,
        };
      }
      setUploadedFiles(initialMap);
    }
  }, [initialDocuments]);

  // Handle Identity Lookup
  const handleIdentityLookup = async () => {
    if (!currentEmail && !currentPhone && !currentNationalId) {
      toast.error('Please enter at least one identity field (Email, Phone or National ID)');
      return;
    }
    setIsLookingUp(true);
    try {
      const res = await lookupStudentProfileAction({
        email: currentEmail || undefined,
        phone: currentPhone || undefined,
        nationalId: currentNationalId || undefined,
      });
      if (res.success) {
        setExistingStudent(res.data);
        setLookupDone(true);
        if (res.data) {
          toast.success('Existing student profile found! Prefilling profile details.');
          // Pre-fill form from existing student
          setValue('email', res.data.person.email || '');
          setValue('phone', res.data.person.phone || '');
          setValue('nationality', res.data.person.nationality || '');
          setValue('nationalId', res.data.person.nationalId || '');
          setValue('gender', (res.data.person.gender === 'Male' || res.data.person.gender === 'Female') ? res.data.person.gender : 'Male');
          if (res.data.person.dateOfBirth) {
            setValue('dateOfBirth', res.data.person.dateOfBirth.split('T')[0]);
          }
        } else {
          toast.info('No matching student profile found. Proceeding with new profile creation.');
        }
      } else {
        toast.error(res.error || 'Failed to lookup student profile');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lookup error');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Pre-fetch requirements for step 2
  useEffect(() => {
    if (step === 2) {
      const fetchReqs = async () => {
        setIsLoadingRequirements(true);
        try {
          const res = await fetch(
            `/api/v1/documents/requirements?targetEntity=STUDENT&branchId=${lead.branchId}&courseId=${lead.interestedCourseId || ''}`,
          );
          if (res.ok) {
            const result = await res.json();
            setRequirements(result.data || []);
          }
        } catch (err) {
          console.error('Failed to fetch requirements', err);
        } finally {
          setIsLoadingRequirements(false);
        }
      };
      fetchReqs();
    }
  }, [step, lead]);

  // Fetch batches for step 3
  useEffect(() => {
    if (step === 3) {
      const fetchBatches = async () => {
        setIsLoadingBatches(true);
        try {
          const res = await getUpcomingBatchesAction(lead.interestedCourseId, lead.branchId);
          if (res.success && res.data) {
            setBatches(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch batches', err);
        } finally {
          setIsLoadingBatches(false);
        }
      };
      fetchBatches();
    }
  }, [step, lead]);

  // Resolve pricing when batch or discount parameters change in step 3
  useEffect(() => {
    if (step === 3) {
      if (!selectedBatchId) {
        setPricingDetails(null);
        return;
      }
      const resolvePricing = async () => {
        setIsResolvingPricing(true);
        try {
          const res = await resolveCoursePricingAction({
            courseId: lead.interestedCourseId,
            branchId: lead.branchId,
            batchId: selectedBatchId,
            discountCode: discountCode || undefined,
            manualDiscountAmount: manualDiscount || undefined,
          });
          if (res.success) {
            setPricingDetails(res.data);
          } else {
            console.error(res.error);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsResolvingPricing(false);
        }
      };
      resolvePricing();
    }
  }, [step, selectedBatchId, discountCode, manualDiscount, lead]);

  // Document upload handler
  const handleLeadDocUpload = async (documentType: string, file: File | undefined) => {
    if (!file) return;

    setUploadingStates((prev) => ({ ...prev, [documentType]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerId', lead.personId);
      formData.append('documentType', documentType);
      formData.append('branchId', lead.branchId);

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload file');
      }

      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: {
          url: result.data.url,
          fileName: result.data.fileName,
          id: result.data.id,
        },
      }));
      toast.success(`Uploaded ${result.data.fileName} successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploadingStates((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  // Document clear handler
  const handleClearDoc = async (documentType: string) => {
    const targetFile = uploadedFiles[documentType];
    if (!targetFile) return;

    if (!confirm('Are you sure you want to delete this document? The file will be permanently deleted.')) {
      return;
    }

    if (targetFile.id) {
      try {
        const res = await fetch(`/api/v1/documents/${targetFile.id}`, {
          method: 'DELETE',
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.messageEnglish || 'Failed to delete document');
        }
        toast.success('Document deleted successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete document');
        return;
      }
    }

    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[documentType];
      return copy;
    });
  };

  // Step 1: Submit verification & move to Step 2
  const handleStep1Next = async (data: IdentityFormData) => {
    // Validate age
    const dob = new Date(data.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 12) {
      toast.error('Student must be at least 12 years old to convert.');
      return;
    }

    if (!lookupDone) {
      toast.error('Please verify student identity lookup first.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await saveLeadProfileWizardAction(lead.id, data);
      if (res.success) {
        toast.success('Lead profile details validated and saved.');
        setStep(2);
      } else {
        toast.error(res.error || 'Failed to save lead profile details.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save lead profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Step 2: Validate docs & move to Step 3
  const handleStep2Next = () => {
    // Validate mandatory requirements
    const missingMandatory = requirements
      .filter((req) => req.isMandatory)
      .filter((req) => !uploadedFiles[req.documentType]);

    if (missingMandatory.length > 0) {
      toast.error(
        `Please upload all required mandatory documents: ${missingMandatory
          .map((m) => m.documentType.replace(/_/g, ' '))
          .join(', ')}`,
      );
      return;
    }
    setStep(3);
  };

  // Step 3: Validate batch & move to Step 4
  const handleStep3Next = () => {
    if (!selectedBatchId) {
      toast.info('No batch selected. Proceeding to enroll student into the course waiting list.');
    }
    setStep(4);
  };

  // Step 4: Final convert & enroll execution
  const handleFinalConvert = async () => {
    setIsSubmitting(true);
    try {
      const docsPayload = Object.entries(uploadedFiles).map(([type, file]) => ({
        fileName: file.fileName,
        fileKey: file.url,
        fileType: file.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        documentType: type as any,
        id: file.id,
      }));

      // Gather profile updates from form
      const profileData = watch();

      const res = await convertLeadAction(
        lead.id,
        selectedBatchId,
        docsPayload,
        profileData,
        discountCode || undefined,
        manualDiscount || undefined,
      );

      if (res.success) {
        toast.success('Lead converted and draft enrollment created successfully!');
        router.push(`/leads/${lead.id}`);
        router.refresh();
      } else {
        toast.error((res as any).error || 'Failed to convert lead.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during conversion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Leads
      </Link>
      <div className="bg-white border border-slate-200/80 shadow-xl rounded-2xl p-6 md:p-8">
      {/* Wizard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Convert Lead to Student</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete the student admission process, verify identity/documents, and create a draft enrollment.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Lead Stage: {lead.stage}</span>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="grid grid-cols-4 gap-2 mb-8 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        {[
          { icon: User, label: '1. Identity Lookup' },
          { icon: FileText, label: '2. Documents' },
          { icon: Bookmark, label: '3. Batch & Pricing' },
          { icon: ShieldCheck, label: '4. Review & Confirm' },
        ].map((s, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div
              key={idx}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-bold scale-[1.02]'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                  : 'text-slate-500'
              }`}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{stepNum}</span>
              {isDone && <Check className="h-3 w-3 shrink-0 ml-1" />}
            </div>
          );
        })}
      </div>

      {/* Wizard Step Content */}
      <div className="min-h-[300px] mb-8">
        {/* STEP 1: IDENTITY LOOKUP & PROFILE EDIT */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Identity Search Bar */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                Step 1: Student Identity Lookup
              </h3>
              <p className="text-xs text-slate-500">
                Check if the student profile already exists in ASTI global database using email, phone, or national ID.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                  <Input type="email" value={currentEmail} disabled className="bg-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                  <Input type="text" value={currentPhone} disabled className="bg-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">National ID / Civil ID</label>
                  <Input type="text" value={currentNationalId} disabled className="bg-slate-100" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleIdentityLookup}
                  disabled={isLookingUp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Verify Identity & Search Database
                </Button>
              </div>
            </div>

            {/* Verification Result Display */}
            {lookupDone && (
              <div className="animate-fadeIn">
                {existingStudent ? (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-sm font-bold text-slate-800">Existing Student Record Found</h4>
                      </div>
                      <Badge className="bg-emerald-600 text-white border-none text-[10px] font-bold">
                        ID: {existingStudent.studentNumber}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Full Name</span>
                        <span className="font-semibold text-slate-800">
                          {existingStudent.person.firstName} {existingStudent.person.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Nationality</span>
                        <span className="font-semibold text-slate-800">{existingStudent.person.nationality || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Status</span>
                        <span className="font-semibold text-slate-800">{existingStudent.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Gender</span>
                        <span className="font-semibold text-slate-800">{existingStudent.person.gender}</span>
                      </div>
                    </div>

                    {existingStudent.admissions && existingStudent.admissions.length > 0 ? (
                      <div className="bg-white border border-emerald-100 rounded-lg p-3.5 space-y-2 mt-2">
                        <span className="text-xs font-bold text-emerald-800 block">Linked Admission History</span>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Admission No: {existingStudent.admissions[0].admissionNumber}</span>
                          <span className="text-slate-600">Date: {existingStudent.admissions[0].admissionDate.split('T')[0]}</span>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
                            {existingStudent.admissions[0].admissionStatus}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 italic mt-1.5">
                          Note: Since this student already has an active record, they will reuse their existing profile and the new draft enrollment will link directly to their active admission.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>No active admission record found for this profile. A new admission entry will be created.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-slate-800">New Student Profile Required</h4>
                    </div>
                    <p className="text-xs text-slate-500">
                      No matching records found. Proceeding to convert this lead as a brand-new student profile.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Editing Form */}
            {lookupDone && (
              <form onSubmit={handleSubmit(handleStep1Next)} className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Profile Details Verification
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DOB */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Date of Birth *</label>
                    <input
                      type="date"
                      {...register('dateOfBirth')}
                      className="block w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                    />
                    {errors.dateOfBirth && (
                      <span className="text-[10px] text-red-500 font-medium">{errors.dateOfBirth.message}</span>
                    )}
                  </div>

                  {/* Nationality */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nationality *</label>
                    <select
                      {...register('nationality')}
                      className="block w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                    >
                      <option value="">Select Nationality</option>
                      {nationalityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.nationality && (
                      <span className="text-[10px] text-red-500 font-medium">{errors.nationality.message}</span>
                    )}
                  </div>

                  {/* National ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Civil ID / Passport Number *</label>
                    <input
                      type="text"
                      {...register('nationalId')}
                      className="block w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      placeholder="Enter national ID"
                    />
                    {errors.nationalId && (
                      <span className="text-[10px] text-red-500 font-medium">{errors.nationalId.message}</span>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Gender *</label>
                    <div className="flex gap-4 pt-1.5">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input type="radio" value="Male" {...register('gender')} className="text-emerald-600 focus:ring-emerald-500" />
                        Male
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input type="radio" value="Female" {...register('gender')} className="text-emerald-600 focus:ring-emerald-500" />
                        Female
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    {isSavingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save & Proceed to Documents
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: DOCUMENTS UPLOADS */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Step 2: Document Check & Registration
              </h3>
              <p className="text-xs text-slate-500">
                Upload mandatory documents required by course and branch rules. Uploaded files will be auto-approved upon conversion.
              </p>
            </div>

            {isLoadingRequirements ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {requirements.map((req) => {
                  const hasFile = !!uploadedFiles[req.documentType];
                  const isUploading = !!uploadingStates[req.documentType];
                  return (
                    <div
                      key={req.id}
                      className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            {req.documentType.replace(/_/g, ' ')}
                          </span>
                          {req.isMandatory && (
                            <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-bold">Required</Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Document criteria target: {req.targetEntity}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasFile ? (
                          <div className="flex items-center gap-2.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs max-w-xs truncate">
                            <span className="text-emerald-700 font-semibold truncate">
                              {uploadedFiles[req.documentType].fileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClearDoc(req.documentType)}
                              className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1.5 cursor-pointer bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                            {isUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UploadCloud className="h-3.5 w-3.5" />
                            )}
                            Upload File
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,application/pdf"
                              disabled={isUploading}
                              onChange={(e) => handleLeadDocUpload(req.documentType, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Document verification policy checkbox */}
            <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoVerifyDocs}
                  onChange={(e) => setAutoVerifyDocs(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Verification Integrity Guarantee</span>
                  <span className="text-slate-500">
                    I confirm that all uploaded documents match the verified physical credentials and are authentic. The system will automatically mark these documents as **Verified** with counselor audit trails.
                  </span>
                </div>
              </label>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setStep(1)}
                className="bg-white border border-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleStep2Next}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                Continue to Batch
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: BATCH SELECTION & PRICING PREVIEW */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-emerald-600" />
                Step 3: Course Batch & Pricing Preview
              </h3>
              <p className="text-xs text-slate-500">
                Select a class batch for student enrollment and preview pricing resolved from ASTI master guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batch Selector */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Course Name</label>
                  <div className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700">
                    {lead.course?.nameEnglish || 'Unspecified Course'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Available Batch (Optional)</label>
                  {isLoadingBatches ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Fetching batches...
                    </div>
                  ) : batches.length > 0 ? (
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="block w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                    >
                      <option value="">No Batch / Course Waiting List Queue</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} - {b.batchNameEnglish} ({b.currentEnrollmentCount}/{b.capacity} seats)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                      No active upcoming batches found for this course in the lead&apos;s branch. You can proceed without selecting a batch to put the student on the Course Waitlist.
                    </div>
                  )}
                </div>

              </div>

              {/* Pricing Preview Panel */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 mb-4">
                  Pricing Preview
                </span>

                {isResolvingPricing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" /> Resolving pricing...
                  </div>
                ) : pricingDetails ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Course Fee</span>
                      <span className="font-semibold text-slate-800">OMR {pricingDetails.basePrice.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">VAT / Tax ({pricingDetails.taxPercentage}%)</span>
                      <span className="font-semibold text-slate-800">OMR {pricingDetails.taxAmount.toFixed(3)}</span>
                    </div>

                    <div className="bg-emerald-600/5 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center mt-4">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">Final Calculated Price</span>
                        <span className="text-[9px] text-slate-400">Pricing Policy: {pricingDetails.pricingSource}</span>
                      </div>
                      <span className="text-base font-bold text-emerald-700">
                        OMR {pricingDetails.finalAmount.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <AlertTriangle className="h-10 w-10 text-amber-500 stroke-[1.5] mb-2" />
                    <span className="text-xs font-semibold text-slate-700">Course Waitlist Mode</span>
                    <span className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                      Without a batch, the student is added directly to the waiting list queue with OMR 0.000 fee details.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="bg-white border border-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleStep3Next}
                disabled={isResolvingPricing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                Review details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRMATION */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 animate-pulse" />
                Step 4: Final Admission & Enrollment Review
              </h3>
              <p className="text-xs text-slate-500">
                Double-check all student metrics before converting. Draft enrollment record will be generated in CRM context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Metrics */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  Student & Admission Summary
                </span>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration Type</span>
                    <Badge className="bg-blue-50 text-blue-700 border-none font-bold">
                      {existingStudent ? 'Existing Profile (Reused)' : 'New Student Profile'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">FullName</span>
                    <span className="font-semibold text-slate-800">
                      {lead.firstName} {lead.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address</span>
                    <span className="font-semibold text-slate-800">{watch('email')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Number</span>
                    <span className="font-semibold text-slate-800">{watch('phone')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Civil ID / Passport</span>
                    <span className="font-semibold text-slate-800">{watch('nationalId')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Trail</span>
                    <span className="font-semibold text-slate-800">Auto-approved Counselor Audit Log</span>
                  </div>
                </div>
              </div>

              {/* Enrollment Summary */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  Enrollment & Pricing Summary
                </span>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enrollment Status</span>
                    <Badge className="bg-amber-50 text-amber-700 border-none font-bold">Draft</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Class Batch</span>
                    <span className="font-semibold text-slate-800">
                      {batches.find((b) => b.id === selectedBatchId)?.batchCode || 'Course Waitlist (No Batch)'}
                    </span>
                  </div>
                  {selectedBatchId && (
                    <>
                      <div className="flex justify-between border-t border-slate-100 pt-2">
                        <span className="text-slate-400">Base Course Price</span>
                        <span className="font-semibold text-slate-800">OMR {(pricingDetails?.basePrice ?? 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="text-slate-400 font-semibold text-red-600">Applied Discount</span>
                        <span>- OMR {(pricingDetails?.discountAmount ?? 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2">
                        <span className="text-slate-800 font-bold">Total Fee</span>
                        <span className="text-emerald-700 font-bold text-sm">
                          OMR {(pricingDetails?.finalAmount ?? 0).toFixed(3)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Warning callout */}
            <div className="border border-amber-100 bg-amber-50/20 rounded-xl p-4 text-xs text-amber-850 flex items-start gap-3">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Submit Hand-Off Confirmation</span>
                <span>
                  Once you click **Convert & Enroll**, this lead will be transitioned to the `Converted` CRM stage. The student profile will be established and a draft enrollment will be generated. The enrollment requires payment approval before class scheduling is verified.
                </span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setStep(3)}
                className="bg-white border border-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleFinalConvert}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 px-6"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Convert & Enroll Student
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
