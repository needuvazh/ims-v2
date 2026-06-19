import Link from 'next/link';
import { Button, Card, Input, PageHeader } from '@ims/shared-ui';
import { signInAction } from './actions';

export const metadata = {
  title: 'Sign in | IMS Admin',
};

export default function SignInPage() {
  return (
    <main className="w-full max-w-lg">
      <Card className="space-y-6">
        <PageHeader
          eyebrow="Authentication"
          title="Sign in to the admin portal"
          description="This foundation build uses a demo session until the real identity provider is wired in."
        />
        <form action={signInAction} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Email</span>
            <Input name="email" type="email" autoComplete="email" placeholder="admin@example.com" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Password</span>
            <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
          </label>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="submit">Sign in</Button>
            <Link className="text-sm font-medium text-[color:var(--ims-brass)]" href="/">
              Back to overview
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}
