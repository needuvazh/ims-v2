"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { Button, Select } from "@ims/shared-ui";
import { getB2BEnrollmentLookupsAction, enrollCorporateParticipantsAction } from "../actions";

interface GroupEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateAccountId: string;
  actorId: string;
  selectedParticipantIds: string[];
  selectedParticipantNames: string[];
}

export function GroupEnrollmentModal({
  isOpen,
  onClose,
  corporateAccountId,
  actorId,
  selectedParticipantIds,
  selectedParticipantNames,
}: GroupEnrollmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<{ courses: any[]; batches: any[]; contracts: any[] }>({
    courses: [],
    batches: [],
    contracts: [],
  });

  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [contractId, setContractId] = useState("");
  const [statusReport, setStatusReport] = useState<Array<{ success: boolean; error?: string }> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg(null);
      setStatusReport(null);
      setCourseId("");
      setBatchId("");
      setContractId("");

      getB2BEnrollmentLookupsAction(corporateAccountId)
        .then((res) => {
          setLookups(res);
        })
        .catch((err) => {
          setErrorMsg(err.message || "Failed to load lookup items.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, corporateAccountId]);

  if (!isOpen) return null;

  const filteredBatches = lookups.batches.filter((b) => b.courseId === courseId);

  async function handleEnroll() {
    if (!courseId) {
      setErrorMsg("Please select a target course.");
      return;
    }
    if (!batchId) {
      setErrorMsg("Please select a target batch.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await enrollCorporateParticipantsAction(
        {
          corporateAccountId,
          participantIds: selectedParticipantIds,
          courseId,
          batchId,
          contractId: contractId || undefined,
        },
        actorId
      );
      setStatusReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to enroll selected candidates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800 text-lg">
            B2B Group Corporate Enrollment
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="text-sm font-semibold p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
              ✗ {errorMsg}
            </div>
          )}

          {statusReport ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 border-b pb-2">Enrollment Progress Report</h4>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {statusReport.map((rep, idx) => {
                  const candidateName = selectedParticipantNames[idx] || "Candidate";
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                        rep.success
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                          : "bg-red-50/50 border-red-100 text-red-800"
                      }`}
                    >
                      {rep.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <div>
                        {rep.success ? (
                          <span>Successfully enrolled {candidateName}.</span>
                        ) : (
                          <span>
                            Failed to enroll {candidateName}: {rep.error}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border text-sm text-slate-600 space-y-1">
                <strong>Enrolling Candidates ({selectedParticipantIds.length}):</strong>
                <p className="text-xs font-semibold text-slate-700">
                  {selectedParticipantNames.join(", ")}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Course
                </label>
                <Select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setBatchId("");
                  }}
                  className="w-full"
                  options={[
                    { value: "", label: "Select a Course..." },
                    ...lookups.courses.map((c) => ({
                      value: c.id,
                      label: `${c.nameEnglish} (${c.courseCode || "No Code"})`,
                    })),
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Batch
                </label>
                <Select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full"
                  disabled={!courseId}
                  options={[
                    { value: "", label: "Select a Batch..." },
                    ...filteredBatches.map((b) => ({
                      value: b.id,
                      label: `${b.batchNameEnglish || b.batchCode} (${b.batchCode}) [Capacity: ${b.capacity}]`,
                    })),
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Corporate Contract (Optional)
                </label>
                <Select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full"
                  options={[
                    { value: "", label: "Select Won Contract (None)..." },
                    ...lookups.contracts.map((c) => ({
                      value: c.id,
                      label: `Contract #${c.contractNumber}`,
                    })),
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
          {statusReport ? (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEnroll}
                disabled={loading || !courseId || !batchId}
              >
                {loading ? "Processing..." : "Enroll Group"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
