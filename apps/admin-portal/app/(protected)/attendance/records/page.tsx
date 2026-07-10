import { redirect } from 'next/navigation';

export default async function AttendanceRecordsRedirectPage(props: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await props.searchParams;
  if (sessionId) {
    redirect(`/attendance/sessions?sessionId=${sessionId}`);
  }
  redirect('/attendance/sessions');
}
