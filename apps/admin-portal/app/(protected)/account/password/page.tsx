import { ChangePasswordForm } from './change-password-form';

export const metadata = { title: 'Change Password | IMS Admin' };
export const dynamic = 'force-dynamic';

export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <ChangePasswordForm />
    </div>
  );
}
