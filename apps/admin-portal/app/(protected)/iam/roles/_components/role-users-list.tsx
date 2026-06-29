import Link from 'next/link';
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@ims/shared-ui';

interface UserItem {
  userId: string;
  username: string;
  status: string;
  fullName: string | null;
}

interface Props {
  users: UserItem[];
}

export function RoleUsersList({ users }: Props) {
  if (users.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center text-sm text-[color:var(--ims-muted)]">
          No users are currently assigned to this role.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-medium">Assigned Users ({users.length})</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="font-medium">
                {user.fullName || 'Unknown'}
              </TableCell>
              <TableCell className="text-[color:var(--ims-muted)]">{user.username}</TableCell>
              <TableCell>
                <Badge variant={user.status === 'Active' ? 'success' : 'default'}>{user.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/iam/users/${user.userId}`}
                  className="text-sm font-medium text-[color:var(--ims-brass)] hover:underline"
                >
                  View User
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
