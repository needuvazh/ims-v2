import { assertAnyPermission } from "../../../lib/auth-guard";
import { getCorporateAccountsAction } from "../actions";
import { prisma } from "@ims/database";
import Link from "next/link";
import { Home, Briefcase, Plus, Search, Building2, CreditCard, Ban } from "lucide-react";
import {
  Breadcrumbs,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
} from "@ims/shared-ui";

export const metadata = { title: "Corporate Accounts - Corporate Training | ASTI IMS" };

export default async function CorporateAccountsPage(props: {
  searchParams: Promise<{
    branchId?: string;
    search?: string;
    status?: string;
    billingCycle?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertAnyPermission(["corporate-training.accounts.read", "lead.read"]);

  // Resolve allowed branch scopes
  const { branchScopeResolver } = await import("@/lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  const accounts = await getCorporateAccountsAction({
    branchId: searchParams.branchId || undefined,
    search: searchParams.search || undefined,
    status: searchParams.status || undefined,
    billingCycle: searchParams.billingCycle || undefined,
    allowedBranchIds,
  });

  const branches = await prisma.branch.findMany({
    where: { status: "Active" },
  });

  const totalOutstanding = accounts.reduce(
    (acc: number, cur: any) => acc + Number(cur.currentOutstanding || 0),
    0
  );

  const blockedAccountsCount = accounts.filter(
    (a: any) => a.blockOnCreditLimit && Number(a.currentOutstanding) >= Number(a.creditLimit)
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="B2B Corporate Accounts"
        description="Manage corporate clients, credit limits, contracts, and view exposure dashboards."
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
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              {
                label: "Accounts",
              },
            ]}
          />
        }
      >
        <Link href="/corporate-training/accounts/create">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Widgets */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{accounts.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-indigo-50/20 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">
              {totalOutstanding.toFixed(3)} OMR
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-red-50/20 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Credit Blocked Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {blockedAccountsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-emerald-50/20 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {accounts.reduce((acc: number, a: any) => acc + (a.contracts?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter bar */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <form method="GET" className="grid gap-4 md:grid-cols-4">
            <div>
              <Input
                name="search"
                defaultValue={searchParams.search || ""}
                placeholder="Search code or company name..."
                className="w-full"
              />
            </div>
            <div>
              <Select
                name="branchId"
                defaultValue={searchParams.branchId || ""}
                options={[
                  { value: "", label: "All Branches" },
                  ...branches.map((b) => ({ value: b.id, label: b.branchName })),
                ]}
              />
            </div>
            <div>
              <Select
                name="status"
                defaultValue={searchParams.status || ""}
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Suspended", label: "Suspended" },
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="flex-1">
                <Search className="h-4 w-4 mr-1.5" /> Filter
              </Button>
              <Link href="/corporate-training/accounts" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                  <th className="p-4">Account Code</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Branch Scope</th>
                  <th className="p-4 text-right">Credit Limit</th>
                  <th className="p-4 text-right">Outstanding</th>
                  <th className="p-4 text-center">Block On Exceed?</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No corporate accounts registered matching filter rules.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc: any) => {
                    const isExceeded = Number(acc.currentOutstanding) >= Number(acc.creditLimit);
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                          {acc.accountCode}
                        </td>
                        <td className="p-4 font-semibold text-slate-900">
                          {acc.accountName}
                        </td>
                        <td className="p-4 text-slate-500">
                          {acc.branch?.branchName || "Unassigned"}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">
                          {Number(acc.creditLimit).toFixed(3)} OMR
                        </td>
                        <td
                          className={`p-4 text-right font-semibold ${
                            isExceeded ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {Number(acc.currentOutstanding || 0).toFixed(3)} OMR
                        </td>
                        <td className="p-4 text-center">
                          {acc.blockOnCreditLimit ? (
                            <Badge variant="error" className="flex items-center gap-1 mx-auto w-fit">
                              <Ban className="h-3 w-3" /> Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="mx-auto w-fit">
                              No
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={acc.status === "Active" ? "default" : "muted"}>
                            {acc.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Link href={`/corporate-training/accounts/${acc.id}`}>
                            <Button variant="outline" size="sm">
                              360 View
                            </Button>
                          </Link>
                          <Link href={`/corporate-training/accounts/${acc.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
