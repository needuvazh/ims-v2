import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnrollmentDetailsClient } from './enrollment-details-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockEnrollment = {
  id: 'enr-1',
  enrollmentNumber: 'ENR-2026-00001',
  enrollmentStatus: 'Confirmed',
  createdAt: '2026-07-10T12:00:00Z',
  branchName: 'Dubai Branch',
  branchId: 'branch-1',
  courseId: 'course-1',
  courseName: 'Full Stack Development',
  batchId: 'batch-1',
  batchCode: 'BATCH-101',
  studentName: 'Jane Doe',
  studentEmail: 'jane.doe@asti.ae',
  studentMobile: '+971501234567',
  pricingSource: 'GlobalDefault',
  resolvedPrice: '1500.000',
  resolvedDiscount: '100.000',
  finalAmount: '1400.000',
  paymentValidationRequired: true,
  priceEvaluationTimestamp: null,
  paymentCollected: '0.000',
  enrollmentType: 'Regular',
  studentProfileId: 'profile-1',
  photoUrl: null,
};

const mockProps = {
  detail: {
    enrollment: mockEnrollment,
    history: [],
  },
  sessionUserId: 'user-1',
  sessionPermissions: ['enrollment.read'],
  invoices: [],
  branches: [{ id: 'branch-1', name: 'Dubai Branch' }],
  courses: [{ id: 'course-1', name: 'Full Stack Development' }],
  batches: [{ id: 'batch-1', batchCode: 'BATCH-101', capacity: 20, currentEnrollmentCount: 5, waitingListEnabled: true }],
};

describe('EnrollmentDetailsClient UI button', () => {
  it('renders Download Course Card button when enrollment is Confirmed', () => {
    const props = {
      ...mockProps,
      detail: {
        ...mockProps.detail,
        enrollment: {
          ...mockEnrollment,
          enrollmentStatus: 'Confirmed',
        },
      },
    };
    const html = renderToStaticMarkup(<EnrollmentDetailsClient {...props} />);
    expect(html).toContain('id="enrollment-course-card-download-btn"');
    expect(html).toContain('Download Course Card');
  });

  it('does not render Download Course Card button when enrollment is Approved but not Confirmed', () => {
    const props = {
      ...mockProps,
      detail: {
        ...mockProps.detail,
        enrollment: {
          ...mockEnrollment,
          enrollmentStatus: 'Approved',
        },
      },
    };
    const html = renderToStaticMarkup(<EnrollmentDetailsClient {...props} />);
    expect(html).not.toContain('id="enrollment-course-card-download-btn"');
    expect(html).not.toContain('Download Course Card');
  });

  it('does not render Download Course Card button when user lacks read permission', () => {
    const props = {
      ...mockProps,
      sessionPermissions: [],
      detail: {
        ...mockProps.detail,
        enrollment: {
          ...mockEnrollment,
          enrollmentStatus: 'Confirmed',
        },
      },
    };
    const html = renderToStaticMarkup(<EnrollmentDetailsClient {...props} />);
    expect(html).not.toContain('id="enrollment-course-card-download-btn"');
  });
});
