'use client';

import { useMemo, useState } from 'react';
import { Card } from '@ims/shared-ui';
import { PreflightLookupWidget } from '../../_components/preflight-lookup-widget';
import { OtpClaimModal } from '../../_components/otp-claim-modal';
import { StudentProfileForm } from '../../_components/student-profile-form';

type BranchOption = { id: string; name: string };

type LookupMatch = {
  personFound: boolean;
  personId: string | null;
  maskedEmail: string | null;
  maskedMobile: string | null;
  studentProfileId: string | null;
};

type Props = {
  branches: BranchOption[];
};

export function StudentRegistrationWorkflow({ branches }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState(
    branches[0]?.id ?? '',
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [match, setMatch] = useState<LookupMatch | null>(null);

  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId)?.name ?? '',
    [branches, selectedBranchId],
  );

  const resetLookup = () => {
    setMatch(null);
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4 border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">
            Target Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              resetLookup();
            }}
            className="flex h-10 w-full rounded-lg border border-[#c1c7ce]/60 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[color:var(--ims-brass)]"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {selectedBranchName ? (
            <p className="text-xs text-[color:var(--ims-muted)]">
              Registering into {selectedBranchName}.
            </p>
          ) : null}
        </div>

        <PreflightLookupWidget
          branchId={selectedBranchId || undefined}
          onClear={resetLookup}
          onNoMatch={() => {
            setMatch(null);
            setShowCreateForm(true);
          }}
          onMatchFound={(result) => {
            setMatch({
              personFound: result.personFound,
              personId: result.personId,
              maskedEmail: result.maskedEmail,
              maskedMobile: result.maskedMobile,
              studentProfileId: result.studentProfileId,
            });
            setShowCreateForm(false);
          }}
        />
      </Card>

      {showCreateForm && !match ? (
        <StudentProfileForm
          key={selectedBranchId}
          mode="create"
          branches={branches}
          initialValues={{ branchId: selectedBranchId }}
          hideBranchSelector
          showHeader={false}
        />
      ) : null}

      {match?.personFound && match.personId && match.studentProfileId ? (
        <OtpClaimModal
          personId={match.personId}
          studentProfileId={match.studentProfileId}
          maskedEmail={match.maskedEmail}
          maskedMobile={match.maskedMobile}
          branchId={selectedBranchId}
          onClose={() => {
            setMatch(null);
            setShowCreateForm(false);
          }}
        />
      ) : null}
    </div>
  );
}
