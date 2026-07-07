## ADDED Requirements

### Requirement: Three-Stage Approval Workflow (FR-EXC-025)
The system SHALL enforce a sequential approval workflow: Trainer Recommendation → Academic Coordinator Review → Branch Manager Final Approval. Each stage requires specific permission, correct workflow state, branch mutation scope, actor eligibility, current evidence, and version match. Stages SHALL NOT be skipped.

#### Scenario: Trainer recommends completion
- **WHEN** an assigned Trainer with `completion.recommend` permission recommends completion for CourseCompletion in AwaitingTrainerRecommendation status
- **AND** evidence is current
- **THEN** the Trainer Recommendation stage SHALL be approved
- **AND** CourseCompletion SHALL transition to AwaitingCoordinatorReview

#### Scenario: Trainer rejects recommendation with reason
- **WHEN** an assigned Trainer rejects with reason "Practical competency incomplete"
- **THEN** the Trainer Recommendation stage SHALL be rejected
- **AND** CourseCompletion SHALL enter the configured rejected outcome
- **AND** the reason SHALL be auditable

#### Scenario: Reject Trainer recommendation from unassigned Trainer
- **WHEN** a Trainer not assigned to the Batch attempts to recommend completion
- **THEN** the system SHALL reject with 403 TRAINER_NOT_AUTHORIZED_FOR_BATCH

#### Scenario: Coordinator approves after Trainer Recommendation
- **WHEN** a Coordinator with `completion.coordinator-review` permission approves after Trainer Recommendation is approved
- **THEN** Coordinator Review SHALL be approved
- **AND** CourseCompletion SHALL transition to AwaitingFinalApproval

#### Scenario: Reject Coordinator approval before Trainer Recommendation
- **WHEN** a Coordinator attempts to approve when Trainer Recommendation is not approved
- **THEN** the system SHALL reject with 422 TRAINER_RECOMMENDATION_REQUIRED

#### Scenario: Branch Manager final approves valid completion
- **WHEN** a Branch Manager with `completion.final-approve` permission approves after Coordinator Review is approved
- **AND** completion evidence is current
- **THEN** CourseCompletion SHALL become Approved
- **AND** approvedBy SHALL equal the current user
- **AND** approvedAt SHALL be populated
- **AND** final CompletionApproval SHALL be approved

#### Scenario: Reject final approval before Coordinator approval
- **WHEN** a user attempts final approval when Coordinator Review is not approved
- **THEN** the system SHALL reject with 422 COORDINATOR_APPROVAL_REQUIRED

#### Scenario: Reject final approval with stale evidence
- **WHEN** a user attempts final approval
- **AND** Attendance evidence changed after evaluation
- **THEN** the system SHALL reject with 409 COMPLETION_EVIDENCE_STALE

### Requirement: Approval Stage Authorization (FR-EXC-026)
Each approval stage SHALL require stage-specific permission. `result.record` SHALL NOT imply `result.correct`. `completion.coordinator-review` SHALL NOT imply `completion.final-approve`. Consolidated report permission SHALL NOT grant mutation authority.

#### Scenario: Menu permission alone does not authorize mutation
- **WHEN** a user has `menu.exam-completion.exams` but NOT `exam.create`
- **AND** the user invokes the Create Exam API directly
- **THEN** the system SHALL reject with 403 FORBIDDEN

#### Scenario: Report permission does not authorize transactional update
- **WHEN** a user has `report.result-register.read` but lacks `result.correct`
- **AND** the user attempts Result correction
- **THEN** the system SHALL reject with 403 FORBIDDEN

### Requirement: Approval Concurrency Control (FR-EXC-027)
The system SHALL use optimistic locking via version field for approval actions. When two actors attempt the same approval stage concurrently, one SHALL succeed and one SHALL receive 409 CONCURRENCY_CONFLICT or APPROVAL_ALREADY_RECORDED.

#### Scenario: Approval race condition
- **WHEN** two approvers submit the same stage action concurrently
- **THEN** one SHALL succeed
- **AND** one SHALL receive conflict or already-recorded error
- **AND** a single final state transition SHALL occur

### Requirement: Approval History Preservation (FR-EXC-028)
The system SHALL preserve all CompletionApproval records. Prior approval history SHALL NOT be deleted during reevaluation. Reevaluation SHALL create new approval records, not overwrite existing ones.

#### Scenario: Preserve prior approval history during reevaluation
- **WHEN** CourseCompletion was previously approved
- **AND** reevaluation changes the outcome
- **THEN** previous CompletionApproval records SHALL remain preserved
- **AND** prior audit history SHALL remain preserved
