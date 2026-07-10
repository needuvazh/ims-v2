'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Avatar,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@ims/shared-ui';
import {
  User,
  UploadCloud,
  Trash2,
  Laptop,
  Smartphone,
  History,
  Key,
  ShieldCheck,
  Camera,
  Info,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  updateProfileAction,
  terminateSessionAction,
  type UpdateProfileState,
} from './actions';

const initialState: UpdateProfileState = {};

export interface ProfileFormProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    userType: string;
    status: string;
    photoUrl: string | null;
  };
  activeSessions: Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    lastAccessAt: string;
    tokenHash: string;
  }>;
  loginHistory: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    status: string;
    failureReason: string | null;
    createdAt: string;
  }>;
  currentSessionJti: string;
}

function parseUserAgent(ua: string | null) {
  if (!ua)
    return { browser: 'Unknown Browser', os: 'Unknown OS', isMobile: false };
  const lower = ua.toLowerCase();

  let browser = 'Browser';
  if (lower.includes('chrome') || lower.includes('crios')) browser = 'Chrome';
  else if (lower.includes('safari') && !lower.includes('chrome'))
    browser = 'Safari';
  else if (lower.includes('firefox')) browser = 'Firefox';
  else if (lower.includes('edge')) browser = 'Edge';

  let os = 'OS';
  if (lower.includes('macintosh') || lower.includes('mac os')) os = 'macOS';
  else if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  const isMobile =
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone');
  return { browser, os, isMobile };
}

export function ProfileForm({
  user,
  activeSessions,
  loginHistory,
  currentSessionJti,
}: ProfileFormProps) {
  const router = useRouter();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRevoking, startRevoking] = useTransition();

  const [state, formAction, isSaving] = useActionState(
    updateProfileAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success('Your profile changes were saved successfully.');
    }
  }, [state.success]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/v1/users/${user.id}/profile-photo`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload photo');
      }

      toast.success('Profile photo updated successfully!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    startRevoking(async () => {
      const res = await terminateSessionAction(sessionId);
      if (res.success) {
        toast.success('Session revoked successfully.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to revoke session.');
      }
    });
  };

  const userInitials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const userTypeBadgeColor =
    user.userType === 'Admin'
      ? 'default'
      : user.userType === 'Trainer'
        ? 'info'
        : 'success';

  return (
    <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      {/* Left Column: Visual Profile & Snapshot */}
      <div className="space-y-6 lg:sticky lg:top-24">
        {/* Visual Profile Card */}
        <Card className="overflow-hidden border-[color:var(--ims-brass-soft)] bg-gradient-to-b from-[color:var(--ims-accent-soft)]/20 to-white/40 shadow-sm">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-lg">Account Identity</CardTitle>
            <CardDescription>
              Your visual avatar and portal authorization details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            {/* Interactive Photo Upload Widget */}
            <div className="group relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-[color:var(--ims-brass)]/40 shadow-md">
              <Avatar
                src={
                  user.photoUrl
                    ? `/api/v1/users/${user.id}/profile-photo/view?v=${encodeURIComponent(
                        user.photoUrl,
                      )}`
                    : undefined
                }
                fallback={user.fullName}
                size="xl"
                className="h-full w-full"
              />
              {isUploadingPhoto ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : (
                <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 hover:opacity-100 focus-within:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                  <span className="mt-1 text-[10px] font-bold text-white">
                    Update Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
              )}
            </div>

            <h3 className="text-lg font-bold text-[color:var(--ims-ink)]">
              {user.fullName}
            </h3>
            <p className="text-xs text-[color:var(--ims-muted)]">
              {user.email}
            </p>

            <div className="mt-4 flex gap-2">
              <Badge variant={userTypeBadgeColor}>{user.userType}</Badge>
              <Badge variant="success">{user.status}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Alert Snapshot */}
        <Card className="border-[color:var(--ims-border)] bg-white/80 shadow-sm">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">Password & Access</CardTitle>
            <CardDescription className="text-xs">
              Need to refresh login credentials?
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[color:var(--ims-muted)]">
            <p>
              Your email address is managed by your administrator and cannot be
              edited directly. Use the Security or Change Password settings when
              updating your sign-in password.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Edit Profile, Active Sessions, and Login History */}
      <div className="space-y-6">
        {/* Profile Edit Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Update your canonical display name and contact phone number.
            </CardDescription>
          </CardHeader>
          <form action={formAction} noValidate>
            <CardContent className="space-y-4">
              {state.error ? (
                <Alert variant="error" description={state.error} />
              ) : null}

              <Input
                name="fullName"
                label="Full Name"
                required
                defaultValue={state.values?.fullName ?? user.fullName}
                autoComplete="name"
                helperText="How your name appears to colleagues and students."
              />

              <Input
                name="email"
                label="Email Address"
                defaultValue={user.email}
                disabled
                helperText="Your sign-in email address, managed by your administrator."
              />

              <Input
                name="phone"
                label="Contact Phone"
                defaultValue={state.values?.phone ?? user.phone ?? ''}
                autoComplete="tel"
                helperText="Optional contact mobile number."
              />
            </CardContent>
            <CardFooter className="justify-end bg-slate-50/50 p-4">
              <Button type="submit" loading={isSaving}>
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Active Sessions Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-[color:var(--ims-brass)]" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices currently signed in to your portal account.
              </CardDescription>
            </div>
            <Badge variant="outline">{activeSessions.length} Active</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {activeSessions.length === 0 ? (
              <p className="p-6 text-center text-sm text-[color:var(--ims-muted)]">
                No active sessions found.
              </p>
            ) : (
              activeSessions.map((sessionItem) => {
                const { browser, os, isMobile } = parseUserAgent(
                  sessionItem.userAgent,
                );
                const isCurrent = sessionItem.tokenHash === currentSessionJti;

                return (
                  <div
                    key={sessionItem.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                        {isMobile ? (
                          <Smartphone className="h-4.5 w-4.5" />
                        ) : (
                          <Laptop className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[color:var(--ims-ink)]">
                            {browser} on {os}
                          </span>
                          {isCurrent && (
                            <Badge variant="success" className="text-[9px] px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[color:var(--ims-muted)]">
                          IP: {sessionItem.ipAddress || 'Unknown'} • Active:{' '}
                          {new Date(sessionItem.lastAccessAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleRevokeSession(sessionItem.id)}
                        disabled={isRevoking}
                      >
                        {isRevoking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Login History Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-[color:var(--ims-brass)]" />
                Login History
              </CardTitle>
              <CardDescription>
                Recent login attempts on your account.
              </CardDescription>
            </div>
            {/* View More Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  View More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Sign-in Logs</DialogTitle>
                  <DialogDescription>
                    History of login attempts for your account (showing latest
                    50).
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-100">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Device / OS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loginHistory.map((lh) => {
                        const parsed = parseUserAgent(lh.userAgent);
                        return (
                          <tr key={lh.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium">
                              {new Date(lh.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  lh.status === 'Success' ? 'success' : 'error'
                                }
                                className="text-[10px]"
                              >
                                {lh.status}
                              </Badge>
                              {lh.failureReason && (
                                <p className="mt-0.5 text-[10px] text-rose-500">
                                  {lh.failureReason}
                                </p>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                              {lh.ipAddress || 'N/A'}
                            </td>
                            <td className="p-3">
                              {lh.browser || parsed.browser} on{' '}
                              {lh.os || parsed.os}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {loginHistory.length === 0 ? (
              <p className="p-6 text-center text-sm text-[color:var(--ims-muted)]">
                No login logs found.
              </p>
            ) : (
              loginHistory.slice(0, 5).map((log) => {
                const parsed = parseUserAgent(log.userAgent);
                const isSuccess = log.status === 'Success';

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/30"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[color:var(--ims-ink)]">
                        {log.browser || parsed.browser} on {log.os || parsed.os}
                      </span>
                      <p className="text-[10px] text-[color:var(--ims-muted)]">
                        IP: {log.ipAddress || 'Unknown'} •{' '}
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={isSuccess ? 'success' : 'error'}>
                        {log.status}
                      </Badge>
                      {log.failureReason && (
                        <span className="text-[10px] text-rose-500">
                          {log.failureReason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
