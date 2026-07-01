import { NextResponse } from 'next/server';
import { followUpSchedulerService } from '../../../lib/runtime';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Secret or custom API key
    // For local development or different environments, this might be bypassed or configured differently.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // In production, ensure the request is authenticated to prevent unauthorized triggers.
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Execute the scheduler service
    const result = await followUpSchedulerService.processOverdueFollowUps('system');

    // 3. Return success response
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} overdue follow-ups.`,
      processedCount: result.processedCount,
    });
  } catch (error: any) {
    console.error('Failed to process overdue follow-ups:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
