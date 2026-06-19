import { Button, Card, Input, PageHeader } from '@ims/shared-ui';
import { createInstituteAction } from './actions';

export const metadata = {
  title: 'Organization | IMS Admin',
};

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Foundation module"
        title="Organization setup"
        description="This screen proves the protected App Router flow: server component, server action, Zod validation, and application service call."
      />
      <Card className="max-w-2xl space-y-5">
        <form action={createInstituteAction} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Institute code</span>
            <Input name="instituteCode" placeholder="IMS" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Institute name</span>
            <Input name="instituteName" placeholder="Institute Management System" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Primary email</span>
            <Input name="primaryEmail" type="email" placeholder="hello@example.com" />
          </label>
          <Button type="submit">Create institute</Button>
        </form>
      </Card>
    </div>
  );
}
