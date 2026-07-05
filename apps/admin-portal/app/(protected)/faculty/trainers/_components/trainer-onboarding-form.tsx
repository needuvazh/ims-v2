'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, UserRoundCheck, Copy, Check, Loader2, User, Briefcase, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  Alert,
} from '@ims/shared-ui';

type BranchOption = {
  id: string;
  branchName: string;
  branchCode: string;
};

type SelectedUser = {
  userId: string;
  personId: string;
  username: string;
  fullName: string;
  email: string;
  mobile: string | null;
  status: string;
  defaultBranchId: string | null;
  branchIds: string[];
};

type ExistingTrainer = {
  id: string;
  trainerCode: string;
  status: string;
};

type SearchResult = SelectedUser;

type Props = {
  selectedUser: SelectedUser | null;
  selectedUserSearchHint: string;
  branchOptions: BranchOption[];
  initialBranchId: string;
  existingTrainer: ExistingTrainer | null;
  canSearch: boolean;
  generatedTrainerCode: string | null;
};

export function TrainerOnboardingForm({
  selectedUser,
  selectedUserSearchHint,
  branchOptions,
  initialBranchId,
  existingTrainer,
  canSearch,
  generatedTrainerCode,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(selectedUser ? 2 : 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [trainerType, setTrainerType] = useState('');
  const [status, setStatus] = useState('Active');
  const [specialization, setSpecialization] = useState('');
  const [qualificationSummary, setQualificationSummary] = useState('');
  const [effectiveStartDate, setEffectiveStartDate] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [branchId, setBranchId] = useState(initialBranchId);

  const branchLookup = useMemo(() => new Map(branchOptions.map((branch) => [branch.id, branch])), [branchOptions]);
  const selectedBranches = selectedUser
    ? selectedUser.branchIds.map((branchId) => branchLookup.get(branchId)).filter(Boolean) as BranchOption[]
    : [];

  const handleSearch = async () => {
    const query = searchTerm.trim();
    if (!query) {
      toast.error('Enter a name, email, mobile number, or username.');
      return;
    }

    setIsSearching(true);
    setLastSearchQuery(query);
    setFocusedResultIndex(-1);
    try {
      const response = await fetch(`/api/v1/iam/users/search?query=${encodeURIComponent(query)}&pageSize=8`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.messageEnglish || 'User search failed.');
      }

      setResults(payload.data.items as SearchResult[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'User search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedResultIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedResultIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedResultIndex >= 0) {
      e.preventDefault();
      selectUser(results[focusedResultIndex].userId);
    }
  };

  const selectUser = (userId: string) => {
    router.push(`/faculty/trainers/new?userId=${encodeURIComponent(userId)}`);
  };

  const isStep2Valid = trainerType && status && specialization && effectiveStartDate;

  const handleNext = () => {
    if (step === 1) {
      if (!selectedUser) {
        setErrorMsg('Please select an IAM user to continue.');
        return;
      }
      setErrorMsg(null);
      setStep(2);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser || !generatedTrainerCode) {
      setErrorMsg('Select an IAM person first.');
      return;
    }

    if (!isStep2Valid) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    const payload = {
      personId: selectedUser.personId,
      branchId,
      trainerCode: generatedTrainerCode,
      trainerType,
      specialization: specialization.trim(),
      qualificationSummary: qualificationSummary.trim() || null,
      status,
      effectiveStartDate,
      effectiveEndDate: effectiveEndDate || null,
    };

    try {
      const response = await fetch('/api/v1/faculty/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.messageEnglish || 'Unable to save trainer.');
      }

      toast.success('Trainer profile created.');
      router.push(`/faculty/trainers/${body.data.trainer.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save trainer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTrainerCode = () => {
    if (generatedTrainerCode) {
      navigator.clipboard.writeText(generatedTrainerCode);
      setCopied(true);
      toast.success('Trainer code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (existingTrainer) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
        <div className="bg-amber-100/60 px-5 py-4 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200/60">
              <AlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Trainer Profile Already Exists</h3>
              <p className="text-xs text-amber-700">This IAM person is already registered as a trainer in the system.</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-amber-200">
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Status</span>
                <Badge variant={existingTrainer.status === 'Active' ? 'success' : 'warning'}>{existingTrainer.status}</Badge>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-amber-200">
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Code</span>
                <code className="text-sm font-mono font-semibold text-amber-900">{existingTrainer.trainerCode}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(existingTrainer.trainerCode);
                    toast.success('Trainer code copied.');
                  }}
                  className="rounded-lg p-1 text-amber-400 transition hover:bg-amber-100 hover:text-amber-600"
                  aria-label="Copy trainer code"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push(`/faculty/trainers/${existingTrainer.id}`)}
              className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-50 hover:border-amber-400"
            >
              Open Trainer Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5 lg:space-y-6">
      {errorMsg && (
        <Alert variant="error" title="Form Validation Error">
          {errorMsg}
        </Alert>
      )}

      {/* Stepper Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span className={`text-sm font-semibold ${step === 1 ? 'text-slate-800' : 'text-slate-400'}`}>
              Select IAM Person
            </span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={`text-sm font-semibold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>
              Trainer Profile Details
            </span>
          </div>
        </div>
        <div className="text-xs font-medium text-slate-400">Step {step} of 2</div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Card 1: IAM User Search */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <UserRoundCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Search IAM Directory</h3>
                <p className="text-xs text-slate-500">Find an existing IAM user to register as a trainer</p>
              </div>
            </div>

            {canSearch ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, email, mobile, or username"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      leftIcon={<Search className="h-4 w-4" />}
                    />
                  </div>
                  <Button type="button" onClick={handleSearch} disabled={isSearching} className="shrink-0">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2">{isSearching ? 'Searching...' : 'Search'}</span>
                  </Button>
                </div>

                {results.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.map((user, index) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => selectUser(user.userId)}
                        className={`flex w-full items-start justify-between gap-4 rounded-xl border p-3 text-left transition ${
                          index === focusedResultIndex
                            ? 'border-indigo-300 bg-indigo-50/50'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800">{user.fullName}</p>
                          <p className="text-xs text-slate-500">
                            {user.username} &middot; {user.email}
                          </p>
                          {user.mobile && <p className="text-xs text-slate-400">{user.mobile}</p>}
                        </div>
                        <Badge variant={user.status === 'Active' ? 'success' : 'muted'}>{user.status}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {lastSearchQuery && results.length === 0 && (
                  <Alert variant="warning" title="No IAM profile found">
                    <p className="text-xs mt-1">
                      No user found for <span className="font-semibold">{lastSearchQuery}</span>. Create the IAM profile first.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" onClick={() => router.push('/iam/users/create')}>Create IAM profile</Button>
                      <Button variant="ghost" onClick={() => { setSearchTerm(''); setResults([]); setLastSearchQuery(''); }}>Clear</Button>
                    </div>
                  </Alert>
                )}

                {!selectedUser && results.length === 0 && !lastSearchQuery && (
                  <p className="text-sm text-slate-500">{selectedUserSearchHint}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{selectedUserSearchHint}</p>
            )}
          </div>

          {/* Card 2: Selected User Summary */}
          <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Selected Person</h3>
                  <p className="text-xs text-slate-500">Review identity details before proceeding</p>
                </div>
              </div>

              {selectedUser ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-600">
                      {selectedUser.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">{selectedUser.fullName}</p>
                      <p className="text-xs text-slate-500">@{selectedUser.username}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{selectedUser.email}</span>
                        {selectedUser.mobile && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{selectedUser.mobile}</span>
                        )}
                        <Badge variant={selectedUser.status === 'Active' ? 'success' : 'muted'}>{selectedUser.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">IAM Branch Assignments</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBranches.length > 0 ? selectedBranches.map((branch) => (
                        <span key={branch.id} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {branch.branchName}
                        </span>
                      )) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">All branches</span>
                      )}
                    </div>
                  </div>

                  {generatedTrainerCode && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Generated Trainer Code</p>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <code className="flex-1 text-sm font-mono font-semibold text-slate-800">{generatedTrainerCode}</code>
                        <button
                          type="button"
                          onClick={handleCopyTrainerCode}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                          aria-label="Copy trainer code"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No IAM user selected</p>
                  <p className="text-xs text-slate-400 mt-1">Search and select a user from the directory</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 sm:pt-6">
              <Button type="button" onClick={handleNext} disabled={!selectedUser}>
                Next: Trainer Profile Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedUser && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Card 1: Branch & Trainer Details */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md lg:col-span-2 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Trainer Assignment & Type</h3>
                <p className="text-xs text-slate-500">Configure branch, trainer type, and engagement status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>Primary Branch</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select Branch"
                    value={branchId}
                    onValueChange={setBranchId}
                    options={branchOptions.map((b) => ({
                      value: b.id,
                      label: `${b.branchName} (${b.branchCode})${b.id === selectedUser.defaultBranchId ? ' - Default' : ''}${selectedUser.branchIds.includes(b.id) ? ' - Assigned' : ''}`,
                    }))}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Trainer Code</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2 h-11 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4">
                    <code className="flex-1 text-sm font-mono font-semibold text-slate-800">{generatedTrainerCode}</code>
                    <button
                      type="button"
                      onClick={handleCopyTrainerCode}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                      aria-label="Copy trainer code"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>Trainer Type</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select type"
                    value={trainerType}
                    onValueChange={setTrainerType}
                    options={[
                      { value: 'FullTime', label: 'Full-time' },
                      { value: 'PartTime', label: 'Part-time' },
                      { value: 'Freelance', label: 'Freelance' },
                    ]}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel required>Status</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select status"
                    value={status}
                    onValueChange={setStatus}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' },
                      { value: 'Suspended', label: 'Suspended' },
                    ]}
                  />
                </FormControl>
              </FormField>
            </div>
          </div>

          {/* Card 2: Summary */}
          <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Review Parameters</h3>
                  <p className="text-xs text-slate-500">Check configured options before submitting</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Name:</span>
                  <span className="text-slate-800">{selectedUser.fullName}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Branch:</span>
                  <span className="text-slate-800">
                    {branchOptions.find((b) => b.id === branchId)?.branchName || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/50">
                  <span className="font-medium">Trainer Type:</span>
                  <span className="text-slate-800">{trainerType || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className="text-slate-800 font-bold">{status || 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                Back
              </Button>
              <Button type="submit" disabled={isSaving || !isStep2Valid} className="w-full sm:w-auto">
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Trainer'
                )}
              </Button>
            </div>
          </div>

          {/* Card 3: Professional Information */}
          <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md lg:col-span-2 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Professional Information</h3>
                <p className="text-xs text-slate-500">Specialization, qualifications, and effective dates</p>
              </div>
            </div>

            <FormField>
              <FormLabel required>Specialization</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., HVAC, Electrical, Plumbing, IT Networking"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel>Qualification Summary</FormLabel>
              <FormControl>
                <textarea
                  placeholder="e.g., B.Tech Mechanical, 10+ years industry experience, certified HVAC trainer"
                  value={qualificationSummary}
                  onChange={(e) => setQualificationSummary(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 py-3 text-sm text-[color:var(--ims-ink)] shadow-[0_8px_24px_rgba(16,36,58,0.04)] outline-none transition-all placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] resize-none"
                />
              </FormControl>
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>Effective Start Date</FormLabel>
                <FormControl>
                  <Input type="date" value={effectiveStartDate} onChange={(e) => setEffectiveStartDate(e.target.value)} />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Effective End Date</FormLabel>
                <FormControl>
                  <Input type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
                </FormControl>
              </FormField>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
