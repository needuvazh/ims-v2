import { Button, Card, Input, PageHeader } from '@ims/shared-ui';

export default function StudentSignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <Card className="w-full space-y-6">
        <PageHeader
          eyebrow="Authentication"
          title="Student sign in"
          description="Reserved for the future identity provider integration."
        />
        <form className="space-y-4">
          <Input placeholder="student@example.com" />
          <Input type="password" placeholder="Password" />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </main>
  );
}
