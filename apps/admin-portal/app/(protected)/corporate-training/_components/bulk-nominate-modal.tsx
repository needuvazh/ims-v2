"use client";

import { useState } from "react";
import { X, PlayCircle, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@ims/shared-ui";
import { bulkNominateParticipantsAction } from "../actions";

interface BulkNominateModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateAccountId: string;
  actorId: string;
}

export function BulkNominateModal({
  isOpen,
  onClose,
  corporateAccountId,
  actorId,
}: BulkNominateModalProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusReport, setStatusReport] = useState<Array<{ success: boolean; error?: string; candidateName?: string }> | null>(null);

  if (!isOpen) return null;

  async function handleImport() {
    setLoading(true);
    setStatusReport(null);

    try {
      const lines = inputText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const candidates: any[] = [];

      for (const line of lines) {
        // Skip header lines
        if (line.toLowerCase().includes("nationalid") || line.toLowerCase().includes("firstname")) {
          continue;
        }

        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length >= 5) {
          candidates.push({
            nationalId: parts[0],
            firstName: parts[1],
            lastName: parts[2],
            email: parts[3] || null,
            phone: parts[4],
            employeeCode: parts[5] || null,
            designation: parts[6] || null,
            department: parts[7] || null,
          });
        }
      }

      if (candidates.length === 0) {
        throw new Error("No valid candidate rows detected. Ensure layout matches header specs.");
      }

      const res = await bulkNominateParticipantsAction(corporateAccountId, candidates, actorId);
      setStatusReport(res);
    } catch (err: any) {
      setStatusReport([{ success: false, error: err.message || "Failed to parse text input blocks." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800 text-lg">
            Bulk Nominate Candidates
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {statusReport ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 border-b pb-2">Import Results Report</h4>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {statusReport.map((rep, idx) => (
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
                        <span>Successfully nominated participant.</span>
                      ) : (
                        <span>
                          Failed to nominate {rep.candidateName || "Candidate"}: {rep.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100 leading-relaxed">
                <strong>Format Guidelines:</strong> Copy and paste rows from Excel/Google Sheets. Separate fields using commas or tabs.
                <br />
                Order: <code className="font-mono text-indigo-700 bg-white px-1 py-0.5 rounded border border-indigo-100">NationalID, FirstName, LastName, Email, Mobile, [EmpCode], [Designation], [Department]</code>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Raw Nomination Data
                </label>
                <textarea
                  className="w-full h-64 p-3 border rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="e.g.&#10;NID-445566,Sara,Al-Hadi,sara@alsaud.om,+968 9456 7890,EMP-103,Developer,IT&#10;NID-778899,Qais,Al-Busaidi,qais@co.om,+968 9111 2222,EMP-104,Operator,Operations"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
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
                onClick={handleImport}
                disabled={loading || !inputText.trim()}
              >
                {loading ? "Processing..." : "Parse & Import"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
