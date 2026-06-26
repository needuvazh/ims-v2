import { PrismaClient } from '@prisma/client';
import { convertLeadAction } from './actions';

export default async function LeadsPage() {
  const prisma = new PrismaClient();
  const leads = await prisma.lead.findMany({
    include: { branch: true, counselor: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Leads Management</h1>
      <div className="bg-white shadow rounded-lg p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2 border-b">Name</th>
              <th className="p-2 border-b">Email</th>
              <th className="p-2 border-b">Stage</th>
              <th className="p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id}>
                <td className="p-2 border-b">{lead.firstName} {lead.lastName}</td>
                <td className="p-2 border-b">{lead.email}</td>
                <td className="p-2 border-b">{lead.stage}</td>
                <td className="p-2 border-b">
                  {lead.stage !== 'Converted' ? (
                    <form action={async () => {
                      'use server';
                      await convertLeadAction(lead.id);
                    }} noValidate>
                      <button type="submit" className="text-blue-600 hover:underline">
                        Convert to Student
                      </button>
                    </form>
                  ) : (
                    <span className="text-gray-500">Converted</span>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
