"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  Button,
  Input,
  Textarea,
  Select,
  MultiSelect,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ims/shared-ui";
import { logVisitAction, createFollowUpAction } from "../../../actions";
import { useRouter } from "next/navigation";

interface FormProps {
  lead: any;
  actorId: string;
  className?: string;
  courses?: Array<{ id: string; name: string }>;
}

const logVisitFormSchema = z.object({
  meetingDate: z.string().min(1, "Meeting date is required").refine(
    (val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    },
    {
      message: "Meeting date cannot be in the past",
    }
  ),
  companyNameSnapshot: z.string().min(1, "Company name is required"),
  contactPersonNameSnapshot: z.string().min(1, "Contact person name is required"),
  contactNumberSnapshot: z.string().min(1, "Contact number is required"),
  emailSnapshot: z.string().min(1, "Email is required").email("Invalid email format"),
  discussionNotes: z.string().min(1, "Discussion notes are required"),
  coursesDiscussed: z.array(z.string()).min(1, "At least one course must be selected"),
  expectedCandidates: z.coerce.number({
    required_error: "Expected candidates is required",
    invalid_type_error: "Expected candidates must be a number",
  }).min(1, "Expected candidates must be at least 1"),
  expectedTrainingDate: z.string().min(1, "Expected start date is required").refine(
    (val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    },
    {
      message: "Expected start date cannot be in the past",
    }
  ),
  visitOutcome: z.string().min(1, "Visit outcome is required"),
});

type LogVisitFormInput = z.infer<typeof logVisitFormSchema>;

export function LogVisitButtonAndSheet({ lead, actorId, className, courses }: FormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setMessage(null);
      reset();
    }
  };

  const courseOptions = (courses || []).map((c) => ({
    value: c.name,
    label: c.name,
  }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LogVisitFormInput>({
    resolver: zodResolver(logVisitFormSchema),
    defaultValues: {
      meetingDate: new Date().toISOString().split("T")[0],
      companyNameSnapshot: lead.corporateAccount.accountName,
      contactPersonNameSnapshot: "",
      contactNumberSnapshot: "",
      emailSnapshot: "",
      discussionNotes: "",
      coursesDiscussed: [],
      expectedCandidates: 1,
      expectedTrainingDate: "",
      visitOutcome: "",
    },
  });

  async function onSubmit(data: LogVisitFormInput) {
    setLoading(true);
    setMessage(null);

    try {
      await logVisitAction(
        {
          corporateSalesLeadId: lead.id,
          corporateAccountId: lead.corporateAccountId,
          companyNameSnapshot: data.companyNameSnapshot,
          contactPersonNameSnapshot: data.contactPersonNameSnapshot,
          contactNumberSnapshot: data.contactNumberSnapshot,
          emailSnapshot: data.emailSnapshot,
          meetingDate: new Date(data.meetingDate),
          discussionNotes: data.discussionNotes,
          coursesDiscussed: data.coursesDiscussed.join(", "),
          expectedCandidates: Number(data.expectedCandidates),
          expectedTrainingDate: new Date(data.expectedTrainingDate),
          visitOutcome: data.visitOutcome,
          branchId: lead.branchId,
        },
        actorId
      );
      setMessage("✓ Marketing visit logged successfully!");
      setIsOpen(false);
      reset();
      router.refresh();
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message || "Failed to log visit"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        Log Visit
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-md md:max-w-lg w-full">
          <SheetHeader>
            <SheetTitle>Log Marketing Visit</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
            {message && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                message.startsWith("✓")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {message}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Meeting Date"
                required
                helperText="Format: DD/MM/YYYY"
                errorText={errors.meetingDate?.message}
                {...register("meetingDate")}
              />
              <Input
                type="text"
                label="Company Name"
                required
                readOnly
                className="bg-slate-50 cursor-not-allowed text-slate-500"
                errorText={errors.companyNameSnapshot?.message}
                {...register("companyNameSnapshot")}
              />
              <Input
                type="text"
                label="Contact Person Name"
                required
                placeholder="e.g. Salim Al Lawati"
                errorText={errors.contactPersonNameSnapshot?.message}
                {...register("contactPersonNameSnapshot")}
              />
              <Input
                type="text"
                label="Contact Number"
                required
                placeholder="e.g. +968 9912 3456"
                errorText={errors.contactNumberSnapshot?.message}
                {...register("contactNumberSnapshot")}
              />
              <div className="sm:col-span-2">
                <Input
                  type="email"
                  label="Contact Email"
                  required
                  placeholder="e.g. salim@company.com"
                  errorText={errors.emailSnapshot?.message}
                  {...register("emailSnapshot")}
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Discussion Notes"
                  required
                  placeholder="Provide discussion points, expectations..."
                  errorText={errors.discussionNotes?.message}
                  {...register("discussionNotes")}
                />
              </div>
              <div className="sm:col-span-2">
                <Controller
                  name="coursesDiscussed"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      label="Courses Discussed"
                      required
                      placeholder="Search and select courses..."
                      options={courseOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      errorText={errors.coursesDiscussed?.message}
                    />
                  )}
                />
              </div>
              <Input
                type="number"
                label="Expected Candidates"
                required
                errorText={errors.expectedCandidates?.message}
                {...register("expectedCandidates")}
              />
              <Input
                type="date"
                label="Expected Start Date"
                required
                helperText="Format: DD/MM/YYYY"
                errorText={errors.expectedTrainingDate?.message}
                {...register("expectedTrainingDate")}
              />
              <div className="sm:col-span-2">
                <Controller
                  name="visitOutcome"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Visit Outcome"
                      required
                      placeholder="Select outcome"
                      options={[
                        { value: "Requested Quotation", label: "Requested Quotation" },
                        { value: "Follow-up Scheduled", label: "Follow-up Scheduled" },
                        { value: "Interested", label: "Interested" },
                        { value: "No Interest", label: "No Interest" },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      errorText={errors.visitOutcome?.message}
                    />
                  )}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-[color:var(--ims-border)] pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? "Saving..." : "Log Visit"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ScheduleFollowUpButtonAndDialog({ lead, actorId, className }: FormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const todayStr = new Date().toLocaleDateString("en-CA");

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setMessage(null);
      setFollowUpNotes("");
      setFollowUpDate(new Date().toISOString().split("T")[0]);
      setFollowUpType("Call");
    }
  };

  // Follow Up Form State
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpType, setFollowUpType] = useState<"Call" | "Email" | "Meeting">("Call");
  const [followUpNotes, setFollowUpNotes] = useState("");

  async function handleScheduleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fDate = new Date(followUpDate);
    if (fDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
      setMessage("✗ Follow-up date cannot be in the past.");
      setLoading(false);
      return;
    }

    try {
      await createFollowUpAction(
        {
          corporateSalesLeadId: lead.id,
          assignedToUserId: actorId,
          followUpDate: fDate,
          followUpType,
          notes: followUpNotes,
          status: "Scheduled",
          branchId: lead.branchId,
        },
        actorId
      );
      setMessage("✓ Follow-up scheduled successfully!");
      setIsOpen(false);
      setFollowUpNotes("");
      router.refresh();
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message || "Failed to schedule follow-up"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        Schedule Follow-up
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[color:var(--ims-surface)] p-6 shadow-lg border-l border-[color:var(--ims-border)]">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold text-[color:var(--ims-ink)]">Schedule Follow-up</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleScheduleFollowUp} className="space-y-4 mt-2">
            {message && <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{message}</div>}

            <div className="space-y-3 text-xs text-[color:var(--ims-ink)]">
              <div>
                <label className="font-semibold text-[color:var(--ims-muted)] flex justify-between">
                  <span>Follow-up Date</span>
                  <span className="text-[10px] text-[color:var(--ims-muted)] font-normal italic">Format: DD/MM/YYYY</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1 w-full border border-[color:var(--ims-border)] p-2 rounded bg-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-[color:var(--ims-muted)]">Follow-up Type</label>
                <select
                  value={followUpType}
                  onChange={(e: any) => setFollowUpType(e.target.value)}
                  className="mt-1 w-full border border-[color:var(--ims-border)] p-2 rounded bg-white text-sm"
                >
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[color:var(--ims-muted)]">Notes / Objectives</label>
                <textarea
                  required
                  placeholder="Specify agenda or notes for this follow-up..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="mt-1 w-full border border-[color:var(--ims-border)] p-2 rounded bg-white text-sm min-h-[80px] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--ims-border)] pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? "Scheduling..." : "Schedule Follow-up"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
