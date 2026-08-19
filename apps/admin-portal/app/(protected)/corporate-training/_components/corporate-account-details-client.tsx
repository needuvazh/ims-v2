"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Home,
  Briefcase,
  Compass,
  CreditCard,
  Ban,
  User,
  ShieldCheck,
  FileText,
  Clock,
  Trash2,
  Edit2,
  ShieldAlert,
} from "lucide-react";
import { CoordinatorModal } from "./coordinator-modal";
import { NominateModal } from "./nominate-modal";
import { BulkNominateModal } from "./bulk-nominate-modal";
import { GroupEnrollmentModal } from "./group-enrollment-modal";
import { ContractModal } from "./contract-modal";
import {
  deactivateCorporateContactAction,
  convertParticipantToStudentAction,
  requestCorporateBillingAction,
  activateCorporateContractAction,
} from "../actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumbs,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ims/shared-ui";

interface CorporateAccountDetailsClientProps {
  account: any;
  actorId: string;
}

export function CorporateAccountDetailsClient({
  account,
  actorId,
}: CorporateAccountDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [isNominateOpen, setIsNominateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isGroupEnrollOpen, setIsGroupEnrollOpen] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const creditLimit = Number(account.creditLimit || 0);
  const outstanding = Number(account.currentOutstanding || 0);
  const availableCredit = Math.max(0, creditLimit - outstanding);
  const creditUsedPercent = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
  const isExceeded = outstanding >= creditLimit;

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={account.accountName}
        description={`Manage operational directory profiles and track risk-control credit rules.`}
        backUrl="/corporate-training/accounts"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: "Corporate Training",
                href: "/corporate-training/accounts",
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              {
                label: "Accounts",
                href: "/corporate-training/accounts",
              },
              {
                label: account.accountCode,
                icon: <Compass className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      >
        <Link href={`/corporate-training/accounts/${account.id}/edit`}>
          <Button variant="primary">Edit Profile</Button>
        </Link>
      </PageHeader>

      {/* Credit exposure overview strip */}
      <Card className="shadow-sm border">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Account Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={account.status === "Active" ? "default" : "muted"}>
                  {account.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-1 md:pl-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Credit Limit
              </span>
              <span className="text-lg font-bold text-slate-800">
                {creditLimit.toFixed(3)} OMR
              </span>
            </div>

            <div className="space-y-1 md:pl-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Current Outstanding
              </span>
              <span
                className={`text-lg font-bold ${
                  isExceeded ? "text-red-600" : "text-slate-800"
                }`}
              >
                {outstanding.toFixed(3)} OMR
              </span>
            </div>

            <div className="space-y-1 md:pl-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Available Credit
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-800">
                  {availableCredit.toFixed(3)} OMR
                </span>
                {account.blockOnCreditLimit ? (
                  <Badge variant="error" className="flex items-center gap-0.5 text-[10px]">
                    <Ban className="h-3 w-3" /> Strict Block
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Warning Only
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1 md:pl-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Invoiced
              </span>
              <span className="text-lg font-bold text-slate-800">
                {Number(account.financeSummary?.totalInvoiced || 0).toFixed(3)} OMR
              </span>
            </div>

            <div className="space-y-1 md:pl-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Collections
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {Number(account.financeSummary?.totalCollected || 0).toFixed(3)} OMR
              </span>
            </div>
          </div>

          {/* Exposure bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>Credit Usage Progress</span>
              <span>{creditUsedPercent.toFixed(1)}% Used</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isExceeded ? "bg-red-500" : "bg-indigo-600"
                }`}
                style={{ width: `${Math.min(100, creditUsedPercent)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Cockpit */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="border-b w-full flex justify-start gap-4 bg-transparent p-0 rounded-none h-auto">
          <TabsTrigger
            value="overview"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Overview & Contracts ({account.contracts?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="contacts"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Contacts Directory ({account.contacts?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Participants ({account.participants?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Sales Pipeline ({account.leads?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Invoices & Payments ({account.invoices?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="enrollments"
            className="pb-3 pt-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-semibold text-slate-500 bg-transparent"
          >
            Enrollment Records ({account.enrollments?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="pt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Client Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Account Name</span>
                  <span className="text-slate-900 font-semibold">{account.accountName}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Account Code</span>
                  <span className="text-slate-900 font-mono font-semibold">{account.accountCode}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Billing Cycle</span>
                  <span className="text-slate-900">{account.billingCycle}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Target Branch</span>
                  <span className="text-slate-900">{account.branch?.branchName || "Unassigned"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Credit Rules Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Allocated Limit</span>
                  <span className="text-slate-900 font-semibold">{creditLimit.toFixed(3)} OMR</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Outstanding Balances</span>
                  <span className="text-slate-900 font-semibold">{outstanding.toFixed(3)} OMR</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Auto Block Flag</span>
                  <span className="text-slate-900">
                    {account.blockOnCreditLimit ? "Yes (Block on Exceed)" : "No (Warn on Exceed)"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contracts Card */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50 flex justify-between flex-row items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Corporate Training Contracts
                </CardTitle>
                <Badge variant="outline">{account.contracts?.length || 0} Contracts</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingContract(null);
                  setIsContractOpen(true);
                }}
              >
                + Register Contract
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!account.contracts || account.contracts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No contracts registered yet for this corporate client.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                        <th className="p-4">Contract Number</th>
                        <th className="p-4">Value (OMR)</th>
                        <th className="p-4">Billing Model</th>
                        <th className="p-4">Start Date</th>
                        <th className="p-4">End Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right animate-fade-in">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.contracts.map((con: any) => (
                        <tr key={con.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                            {con.contractNumber}
                          </td>
                          <td className="p-4 font-semibold text-slate-900">
                            {Number(con.contractValue).toFixed(3)} OMR
                          </td>
                          <td className="p-4 text-slate-600 font-mono text-xs">
                            {con.billingModel}
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(con.startDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-slate-500">
                            {con.endDate ? new Date(con.endDate).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="p-4">
                            <Badge variant={con.status === "Active" ? "default" : "warning"}>
                              {con.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            {con.status === "Draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to activate contract ${con.contractNumber}?`)) {
                                    try {
                                      await activateCorporateContractAction(con.id, actorId);
                                    } catch (err: any) {
                                      alert(err.message || "Failed to activate contract");
                                    }
                                  }
                                }}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 px-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setEditingContract(con);
                                setIsContractOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab Content */}
        <TabsContent value="contacts" className="pt-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50 flex justify-between flex-row items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Authorized Point of Contacts (Coordinators)
                </CardTitle>
                <Badge variant="outline">{account.contacts?.length || 0} Contacts</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingContact(null);
                  setIsModalOpen(true);
                }}
              >
                + Add Contact
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!account.contacts || account.contacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No point of contacts registered yet for this client.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                        <th className="p-4">National ID</th>
                        <th className="p-4">Contact Name</th>
                        <th className="p-4">Designation</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4 text-center">Primary?</th>
                        <th className="p-4 text-center">Portal?</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.contacts.map((contact: any) => {
                        const name = contact.person
                          ? `${contact.person.firstName} ${contact.person.lastName}`
                          : "Unknown";
                        return (
                          <tr key={contact.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                              {contact.person?.nationalId || "—"}
                            </td>
                            <td className="p-4 font-semibold text-slate-900">
                              {name}
                            </td>
                            <td className="p-4 text-slate-600">{contact.designation || "—"}</td>
                            <td className="p-4 text-slate-600">{contact.department || "—"}</td>
                            <td className="p-4 text-slate-500 font-mono text-xs">{contact.email}</td>
                            <td className="p-4 text-slate-500">{contact.phone || "—"}</td>
                            <td className="p-4 text-center">
                              {contact.isPrimary ? (
                                <Badge variant="default" className="mx-auto w-fit flex items-center gap-0.5">
                                  <ShieldCheck className="h-3 w-3" /> Yes
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <Badge variant={contact.portalAccessEnabled ? "success" : "muted"}>
                                {contact.portalAccessEnabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingContact(contact);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:border-red-200"
                                onClick={async () => {
                                  if (confirm("Are you sure you want to deactivate this contact?")) {
                                    await deactivateCorporateContactAction(contact.id, actorId);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab Content */}
        <TabsContent value="participants" className="pt-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50 flex justify-between flex-row items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Nominated Training Candidates (Participants)
                </CardTitle>
                <Badge variant="outline">{account.participants?.length || 0} Nominated</Badge>
              </div>
              <div className="space-x-2 flex items-center">
                {selectedCandidates.length > 0 && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsGroupEnrollOpen(true)}
                    >
                      Enroll Selected ({selectedCandidates.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={async () => {
                        if (
                          confirm(
                            `Are you sure you want to request invoicing for the ${selectedCandidates.length} selected candidates?`
                          )
                        ) {
                          await requestCorporateBillingAction(account.id, selectedCandidates, actorId);
                          setSelectedCandidates([]);
                        }
                      }}
                    >
                      Request Invoicing ({selectedCandidates.length})
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOpen(true)}
                >
                  + Bulk Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNominateOpen(true)}
                >
                  + Nominate Candidate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!account.participants || account.participants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No employee candidates nominated for this client yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                        <th className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              account.participants?.length > 0 &&
                              selectedCandidates.length === account.participants.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidates(account.participants.map((p: any) => p.id));
                              } else {
                                setSelectedCandidates([]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </th>
                        <th className="p-4">Emp Code</th>
                        <th className="p-4">Full Name</th>
                        <th className="p-4">National ID</th>
                        <th className="p-4">Designation</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Mobile</th>
                        <th className="p-4">Student Profile</th>
                        <th className="p-4">Billing Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.participants.map((part: any) => {
                        const name = part.person
                          ? `${part.person.firstName} ${part.person.lastName}`
                          : "Unknown";
                        return (
                          <tr key={part.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 w-10">
                              <input
                                type="checkbox"
                                checked={selectedCandidates.includes(part.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCandidates([...selectedCandidates, part.id]);
                                  } else {
                                    setSelectedCandidates(selectedCandidates.filter((id) => id !== part.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                            </td>
                            <td className="p-4 font-mono text-xs font-semibold text-slate-600">
                              {part.employeeCode || "—"}
                            </td>
                            <td className="p-4 font-semibold text-slate-900">{name}</td>
                            <td className="p-4 font-mono text-xs text-slate-700">
                              {part.person?.nationalId || "—"}
                            </td>
                            <td className="p-4 text-slate-600">{part.designation || "—"}</td>
                            <td className="p-4 text-slate-600">{part.department || "—"}</td>
                            <td className="p-4 text-slate-500 font-mono text-xs">
                              {part.person?.email || "—"}
                            </td>
                            <td className="p-4 text-slate-500">
                              {part.person?.mobile || "—"}
                            </td>
                            <td className="p-4">
                              {part.studentProfile ? (
                                <Link
                                  href={`/students/${part.studentProfile.id}`}
                                  className="text-indigo-600 font-mono text-xs font-bold hover:underline"
                                >
                                  {part.studentProfile.studentNumber}
                                </Link>
                              ) : (
                                <Badge variant="warning">Not Converted</Badge>
                              )}
                            </td>
                            <td className="p-4">
                              {part.enrollments && part.enrollments[0] ? (
                                <Badge
                                  variant={
                                    part.enrollments[0].billingStatus === "Invoiced"
                                      ? "success"
                                      : part.enrollments[0].billingStatus === "Requested"
                                        ? "warning"
                                        : "outline"
                                  }
                                >
                                  {part.enrollments[0].billingStatus}
                                </Badge>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {!part.linkedStudentProfileId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        `Are you sure you want to promote ${name} to a Student Profile?`
                                      )
                                    ) {
                                      await convertParticipantToStudentAction(part.id, actorId);
                                    }
                                  }}
                                >
                                  Convert to Student
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Pipeline Tab Content */}
        <TabsContent value="sales" className="pt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leads Card */}
            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">
                  B2B Opportunity Leads
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!account.leads || account.leads.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 text-sm">
                    No sales leads recorded for this account.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                          <th className="p-4">Lead Stage</th>
                          <th className="p-4">Expected Value</th>
                          <th className="p-4">Close Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {account.leads.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4">
                              <Badge variant="outline">{lead.stage}</Badge>
                            </td>
                            <td className="p-4 font-semibold text-slate-900">
                              {Number(lead.expectedValue).toFixed(3)} OMR
                            </td>
                            <td className="p-4 text-slate-500">
                              {new Date(lead.expectedCloseDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotations Card */}
            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Sales Quotations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!account.quotations || account.quotations.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 text-sm">
                    No quotations generated for this account yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                          <th className="p-4">Quote Number</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Grand Total</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {account.quotations.map((quote: any) => (
                          <tr key={quote.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                              {quote.quotationNumber}
                            </td>
                            <td className="p-4 text-slate-500">
                              {new Date(quote.quotationDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 font-semibold text-slate-900">
                              {Number(quote.totalAmount).toFixed(3)} OMR
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{quote.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices & Payments Tab Content */}
        <TabsContent value="invoices" className="pt-6 space-y-6">
          {/* Invoices Card */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50 flex justify-between flex-row items-center">
              <CardTitle className="text-base font-semibold text-slate-800">
                Raised B2B Tax Invoices
              </CardTitle>
              <Badge variant="outline">{account.invoices?.length || 0} Invoices</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {!account.invoices || account.invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No invoices raised by Finance for this client yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                        <th className="p-4">Invoice Number</th>
                        <th className="p-4">Issue Date</th>
                        <th className="p-4 text-right">Total Amount</th>
                        <th className="p-4 text-right">Outstanding</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(inv.issueDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-900">
                            {Number(inv.totalAmount).toFixed(3)} OMR
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-700">
                            {Number(inv.outstandingAmount).toFixed(3)} OMR
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                inv.status === "Paid"
                                  ? "default"
                                  : inv.status === "PartiallyPaid"
                                    ? "warning"
                                    : "error"
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">
                Payment Transactions & Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(!account.invoices || account.invoices.flatMap((i: any) => i.payments || []).length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No payment collections recorded against invoices yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                        <th className="p-4">Payment Date</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Reference No</th>
                        <th className="p-4 text-right">Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.invoices.flatMap((inv: any) =>
                        (inv.payments || []).map((pay: any) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 text-slate-500">
                              {new Date(pay.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-slate-800 font-semibold">{pay.paymentMethod}</td>
                            <td className="p-4 text-slate-600 font-mono text-xs">{pay.referenceNumber || "—"}</td>
                            <td className="p-4 text-right text-emerald-600 font-bold">
                              +{Number(pay.amount).toFixed(3)} OMR
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="pt-6 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">
                  B2B Corporate Enrollments
                </CardTitle>
                <div className="text-sm text-slate-500 mt-1">
                  Active learning paths and seat registration blocks registered under this account
                </div>
              </div>
              <Badge variant="outline" className="h-6">
                {(() => {
                  if (!account.enrollments) return 0;
                  const groups: string[] = [];
                  for (const enr of account.enrollments) {
                    const enrTime = new Date(enr.createdAt).getTime();
                    const batchId = enr.enrollment?.batchId;
                    const exists = groups.some((g: any) => {
                      return Math.abs(g.time - enrTime) <= 5000 && g.batchId === batchId;
                    });
                    if (!exists) {
                      groups.push({ time: enrTime, batchId } as any);
                    }
                  }
                  return groups.length;
                })()} Group Blocks
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {(!account.enrollments || account.enrollments.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="rounded-full bg-slate-50 p-4 border border-slate-100 mb-3 text-slate-400">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">No Group Enrollments</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Select nominated candidates and click "Group Enrollment" on the Participants tab to register them for training.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b text-slate-500 font-semibold">
                        <th className="p-4">Group Reference</th>
                        <th className="p-4">Course Details</th>
                        <th className="p-4">Batch Details</th>
                        <th className="p-4">Nominated Candidates</th>
                        <th className="p-4">Contract</th>
                        <th className="p-4">Billing Status</th>
                        <th className="p-4 text-center">Enrollment Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const groups: {
                          leaderId: string;
                          batchId: string;
                          courseName: string;
                          batchCode: string;
                          contractNumber: string | null;
                          createdAt: string;
                          candidateCount: number;
                          billingStatus: string;
                          status: string;
                        }[] = [];

                        const sorted = [...account.enrollments].sort(
                          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );

                        for (const enr of sorted) {
                          const enrTime = new Date(enr.createdAt).getTime();
                          const batchId = enr.enrollment?.batchId;

                          const existing = groups.find((g: any) => {
                            const gTime = new Date(g.createdAt).getTime();
                            return Math.abs(gTime - enrTime) <= 5000 && g.batchId === batchId;
                          });

                          if (existing) {
                            existing.candidateCount += 1;
                            if (enr.billingStatus === "Invoiced" && existing.billingStatus !== "Invoiced") {
                              existing.billingStatus = "Invoiced";
                            } else if (enr.billingStatus === "Requested" && existing.billingStatus === "NotRequested") {
                              existing.billingStatus = "Requested";
                            }
                            if (
                              (enr.enrollment?.enrollmentStatus === "Confirmed" || enr.enrollment?.enrollmentStatus === "Active") &&
                              existing.status === "Cancelled"
                            ) {
                              existing.status = enr.enrollment.enrollmentStatus;
                            }
                          } else {
                            groups.push({
                              leaderId: enr.id,
                              batchId,
                              courseName: enr.enrollment?.course?.nameEnglish || "N/A",
                              batchCode: enr.enrollment?.batch?.batchCode || "Waitlist",
                              contractNumber: enr.contract?.contractNumber || null,
                              createdAt: enr.createdAt,
                              candidateCount: 1,
                              billingStatus: enr.billingStatus,
                              status: enr.enrollment?.enrollmentStatus || "Draft",
                            });
                          }
                        }

                        return groups.map((g) => {
                          const dateLabel = new Date(g.createdAt).toLocaleDateString();
                          const groupRef = `G-ENR-${g.batchCode.replace(/[^A-Za-z0-9-]/g, "")}-${new Date(g.createdAt).getTime().toString().slice(-4)}`;

                          return (
                            <tr key={g.leaderId} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 font-mono font-bold text-slate-700">
                                {groupRef}
                                <div className="text-xs text-slate-400 font-normal font-sans mt-0.5">
                                  Enrolled on {dateLabel}
                                </div>
                              </td>
                              <td className="p-4 font-medium text-slate-800">
                                {g.courseName}
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-600 font-semibold">
                                {g.batchCode}
                              </td>
                              <td className="p-4 font-medium text-slate-800">
                                {g.candidateCount} Candidates
                              </td>
                              <td className="p-4">
                                {g.contractNumber ? (
                                  <span className="font-semibold text-slate-700">#{g.contractNumber}</span>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                              <td className="p-4">
                                {g.billingStatus === "Invoiced" ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Invoiced
                                  </Badge>
                                ) : g.billingStatus === "Requested" ? (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                    Requested
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-50 text-slate-600 border-slate-200">
                                    Not Billed
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                {(() => {
                                  switch (g.status) {
                                    case "Confirmed":
                                    case "Active":
                                      return (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                          Active / Confirmed
                                        </Badge>
                                      );
                                    case "Completed":
                                      return (
                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                          Completed
                                        </Badge>
                                      );
                                    case "Cancelled":
                                    case "Dropped":
                                      return (
                                        <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                                          {g.status}
                                        </Badge>
                                      );
                                    default:
                                      return (
                                        <Badge className="bg-slate-50 text-slate-700 border-slate-200">
                                          {g.status}
                                        </Badge>
                                      );
                                  }
                                })()}
                              </td>
                              <td className="p-4 text-right">
                                <Link href={`/corporate-training/group-enrollments/${g.leaderId}`}>
                                  <Button variant="outline" size="sm" className="h-8 text-xs">
                                    View Group Details
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CoordinatorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        corporateAccountId={account.id}
        actorId={actorId}
        contact={editingContact}
      />

      <NominateModal
        isOpen={isNominateOpen}
        onClose={() => setIsNominateOpen(false)}
        corporateAccountId={account.id}
        actorId={actorId}
      />

      <BulkNominateModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        corporateAccountId={account.id}
        actorId={actorId}
      />

      <GroupEnrollmentModal
        isOpen={isGroupEnrollOpen}
        onClose={() => {
          setIsGroupEnrollOpen(false);
          setSelectedCandidates([]);
        }}
        corporateAccountId={account.id}
        actorId={actorId}
        selectedParticipantIds={selectedCandidates}
        selectedParticipantNames={selectedCandidates.map((id) => {
          const part = account.participants.find((p: any) => p.id === id);
          return part?.person ? `${part.person.firstName} ${part.person.lastName}` : "Candidate";
        })}
      />

      <ContractModal
        isOpen={isContractOpen}
        onClose={() => setIsContractOpen(false)}
        corporateAccountId={account.id}
        actorId={actorId}
        contract={editingContract}
      />
    </div>
  );
}
