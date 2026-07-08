import { NextResponse } from 'next/server';
import { prisma } from '@ims/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Query active, non-deleted documents where the expiryDate has passed
    const now = new Date();
    const expiredDocuments = await prisma.document.findMany({
      where: {
        status: 'Active',
        isDeleted: false,
        expiryDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        version: true,
      },
    });

    let updatedCount = 0;
    for (const doc of expiredDocuments) {
      await prisma.document.update({
        where: { id: doc.id, version: doc.version },
        data: {
          status: 'Expired',
          version: { increment: 1 },
        },
      });
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${updatedCount} expired documents.`,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Failed to process expired documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 },
    );
  }
}
