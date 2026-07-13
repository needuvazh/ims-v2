"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "@ims/shared-ui";
import { CheckCircle2, Calendar, Clock, MessageSquare } from "lucide-react";
import { completeFollowUpAction } from "../actions";

interface LogCorporateFollowUpDrawerProps {
  followUp: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actorId: string;
}

function formatDate(dateInput: any) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function LogCorporateFollowUpDrawer({
  followUp,
  isOpen,
  onClose,
  onSuccess,
  actorId,
}: LogCorporateFollowUpDrawerProps) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpType, setNextFollowUpType] = useState<"Call" | "Email" | "Meeting">("Call");
  const [nextFollowUpNotes, setNextFollowUpNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOutcomeNotes("");
      setScheduleNext(false);
      setNextFollowUpDate("");
      setNextFollowUpType("Call");
      setNextFollowUpNotes("");
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate outcome notes
    if (outcomeNotes.trim().length < 5) {
      setError("Outcome notes must be at least 5 characters long.");
      setLoading(false);
      return;
    }

    if (scheduleNext) {
      if (!nextFollowUpDate) {
        setError("Next scheduled follow-up date is required.");
        setLoading(false);
        return;
      }
      const nDate = new Date(nextFollowUpDate);
      if (nDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
        setError("Next follow-up date cannot be in the past.");
        setLoading(false);
        return;
      }
      if (!nextFollowUpNotes.trim()) {
        setError("Next follow-up notes/objectives are required.");
        setLoading(false);
        return;
      }
    }

    try {
      await completeFollowUpAction(
        followUp.id,
        outcomeNotes,
        nextFollowUpDate || undefined,
        actorId,
        scheduleNext,
        nextFollowUpType,
        nextFollowUpNotes
      );
      
      // Reset state
      setOutcomeNotes("");
      setScheduleNext(false);
      setNextFollowUpDate("");
      setNextFollowUpType("Call");
      setNextFollowUpNotes("");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log follow-up outcome");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[color:var(--ims-surface)] p-6 shadow-lg border-l border-[color:var(--ims-border)]">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-[color:var(--ims-ink)] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Log Follow-up Outcome
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</div>}

          <div className="space-y-5 text-sm text-[color:var(--ims-ink)]">
            <div className="grid grid-cols-2 gap-4 bg-[color:var(--ims-accent-soft)] p-4 rounded-2xl border border-[color:var(--ims-border)]">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Follow-up Type</span>
                <span className="text-sm font-bold mt-1 block">{followUp?.followUpType}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Scheduled Date</span>
                <span className="text-sm font-semibold mt-1 block">
                  {followUp && formatDate(followUp.followUpDate)}
                </span>
              </div>
            </div>

            <Textarea
              label="Meeting / Call Outcome"
              required
              placeholder="Describe what was achieved, the client's response, or details of the conversation..."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="min-h-[90px]"
            />

            <div className="border-t border-[color:var(--ims-border)] pt-5">
              <Checkbox
                label="Schedule Next Follow-Up"
                description="Automatically create a new scheduled follow-up for this lead."
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
              />
            </div>

            {scheduleNext && (
              <div className="space-y-4 bg-[color:var(--ims-accent-soft)] p-5 rounded-2xl border border-[color:var(--ims-border)] animate-scale-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Next Scheduled Date"
                    required
                    helperText="Format: DD/MM/YYYY"
                    min={todayStr}
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                  />
                  <Select
                    label="Next Follow-up Type"
                    required
                    placeholder="Select Type"
                    options={[
                      { value: "Call", label: "Call" },
                      { value: "Email", label: "Email" },
                      { value: "Meeting", label: "Meeting" },
                    ]}
                    value={nextFollowUpType}
                    onValueChange={(val: any) => setNextFollowUpType(val)}
                  />
                </div>
                <Textarea
                  label="Next Meeting Notes / Objectives"
                  required
                  placeholder="Objectives/agenda for the next touchpoint..."
                  value={nextFollowUpNotes}
                  onChange={(e) => setNextFollowUpNotes(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[color:var(--ims-border)] pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? "Completing..." : "Save Outcome"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
