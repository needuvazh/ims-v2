## ADDED Requirements

### Requirement: Domain Event Emission (FR-EXC-NOTIF-001)
The system SHALL emit domain events to the transactional outbox for: ExamScheduled, ExamRescheduled, ExamCancelled, ResultRecorded, ResultFinalized, ResultCorrected, CompletionEvaluationCompleted, CompletionEvaluationFailed, CompletionRecommendationRequested, CompletionRecommended, CompletionRecommendationRejected, CoordinatorReviewRequested, CoordinatorReviewApproved, CoordinatorReviewRejected, FinalCompletionApprovalRequested, CourseCompletionApproved, CourseCompletionRejected, CompletionReevaluationRequired, CompletionReevaluated, CertificateEligible. Events SHALL be emitted after the related state change succeeds, in the same database transaction.

#### Scenario: Exam scheduling emits notification event
- **WHEN** an Exam moves from Draft to Scheduled
- **AND** the transaction commits
- **THEN** domain event "ExamScheduled" SHALL be emitted to the outbox
- **AND** Communication Management MAY create NotificationRequests from the event
- **AND** Module 10 SHALL NOT persist NotificationLog as its own entity

#### Scenario: Result correction emits sensitive change notification event
- **WHEN** a finalized Result is corrected successfully
- **AND** the transaction commits
- **THEN** event "ResultCorrected" SHALL contain: resultId, examId, enrollmentId, previousMarks, correctedMarks, previousResultStatus, currentResultStatus, reason, actorUserId

### Requirement: Certificate Eligibility Handoff (FR-EXC-NOTIF-002)
When CourseCompletion is approved and certificateAllowed is true, the system SHALL emit a CertificateEligible event containing courseCompletionId, enrollmentId, courseId, batchId, branchId, approvedByUserId, approvedAt, certificateAllowed, paymentValidationPassed. Module 10 SHALL NOT create Certificate records. Certificate creation remains the responsibility of Certificate Management.

#### Scenario: Certificate eligibility does not send issuance confirmation
- **WHEN** Module 10 emits "CertificateEligible"
- **AND** Communication processing occurs
- **THEN** no "certificate issued" notification SHALL be sent from that event
- **AND** only Certificate Management's issued event MAY trigger issue confirmation

### Requirement: Notification Deduplication (FR-EXC-NOTIF-003)
Notification requests SHALL be idempotent. Deduplication key: eventId + templateCode + recipientPersonId + channel. Repeated event delivery SHALL NOT create duplicate outbound messages.

#### Scenario: Duplicate domain event delivery
- **WHEN** the same eventId, templateCode, recipientPersonId, and channel are delivered twice
- **THEN** only one NotificationRequest SHALL be created
- **AND** no duplicate outbound message SHALL occur

### Requirement: Notification Suppression Rules (FR-EXC-NOTIF-004)
The system SHALL suppress notifications when: event is replayed and deduplication key already processed; recipient has no valid contact for selected channel; notification preference disables optional channel; event is internal-only; Student Result is not yet approved for Student publication; Certificate is only eligible but not yet issued; approval action was reverted before notification request creation.

#### Scenario: Suppress student notification for unpublished Result
- **WHEN** a Result is finalized but student publication policy is disabled
- **THEN** no Student notification SHALL be sent
- **AND** internal notification MAY still occur
