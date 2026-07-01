# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 7 — Validation Rules, Error Catalog, Notifications

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Custom Business Validation Rules

The following rules must be executed in the backend service layer before executing database transactions.

---

### 1.1 Course Code Uniqueness and Standard
*   **Validation Logic:** Sanitizes and forces the input string to uppercase.
*   **Algorithm:**
    ```typescript
    function validateCourseCode(code: string): boolean {
      const sanitizedCode = code.trim().toUpperCase();
      const codeRegex = /^[A-Z0-9-]{3,20}$/;
      if (!codeRegex.test(sanitizedCode)) {
        throw new Error("ERR_CRS_INVALID_CODE_FORMAT");
      }
      return true;
    }
    ```

---

### 1.2 Pricing Exclusivity Overlap Check
*   **Validation Logic:** Ensures that for a given pricing dimension (Course, Branch, Customer Type, Batch Type, Currency), there is never more than one active price.
*   **Algorithm:**
    ```typescript
    async function checkPricingOverlap(
      pricingInput: PricingInput,
      pricingRepository: ICoursePricingRepository // Injected domain repository interface
    ): Promise<boolean> {
      const overlaps = await pricingRepository.findOverlappingPricing({
        courseId: pricingInput.courseId,
        branchId: pricingInput.branchId,
        customerType: pricingInput.customerType,
        batchType: pricingInput.batchType,
        currency: pricingInput.currency,
        startDate: pricingInput.effectiveStartDate,
        endDate: pricingInput.effectiveEndDate
      });
      if (overlaps.length > 0) {
        throw new Error("ERR_CRS_MULTIPLE_ACTIVE_PRICING");
      }
      return true;
    }
    ```

---

### 1.3 Completion Rule Validation
*   **Validation Logic:** Enforces structural bounds on completion thresholds.
*   **Algorithm:**
    ```typescript
    function validateCompletionRules(rules: CompletionRulesInput): boolean {
      if (rules.minimumAttendancePercent < 0 || rules.minimumAttendancePercent > 100) {
        throw new Error("ERR_CRS_INVALID_ATTENDANCE_LIMIT");
      }
      if (rules.effectiveStartDate >= rules.effectiveEndDate && rules.effectiveEndDate !== null) {
        throw new Error("ERR_CRS_INVALID_DATE_RANGE");
      }
      return true;
    }
    ```

---

### 1.4 Trainer Scheduling Overlap Check
*   **Validation Logic:** Scans the target trainer's weekly timetable sessions to block concurrent assignment. To preserve Bounded Context separation, the timetable sessions are queried through a public Scheduling application service interface rather than querying the database tables directly.
*   **Algorithm:**
    ```typescript
    async function validateTrainerAssignment(
      trainerId: string,
      targetBatchId: string,
      assignedFrom: Date,
      assignedTo: Date,
      schedulingService: ISchedulingService, // Injected cross-context service interface
      batchTrainerRepository: IBatchTrainerRepository // Injected domain repository interface
    ): Promise<boolean> {
      // 1. Get proposed batch sessions via Scheduling Context Service
      const newSessions = await schedulingService.getSessionsByBatch(targetBatchId);
      
      // 2. Get overlapping batches where trainer is assigned (Internal to Batch Context)
      const activeAssignments = await batchTrainerRepository.findActiveAssignmentsByTrainer(
        trainerId,
        assignedFrom,
        assignedTo
      );
      
      const assignedBatchIds = activeAssignments
        .filter(a => a.batchId !== targetBatchId)
        .map(a => a.batchId);
      
      // 3. Query sessions of overlapping batches via Scheduling Context Service
      const existingSessions = await schedulingService.getSessionsForBatches(
        assignedBatchIds,
        assignedFrom,
        assignedTo
      );
      
      // 4. Check for day & hour intersections
      for (const newSess of newSessions) {
        for (const existSess of existingSessions) {
          if (
            newSess.sessionDate.toDateString() === existSess.sessionDate.toDateString() &&
            newSess.startTime < existSess.endTime &&
            newSess.endTime > existSess.startTime
          ) {
            throw new Error(`ERR_CRS_TRAINER_SCHEDULE_CONFLICT: Trainer is already scheduled on ${newSess.sessionDate.toLocaleDateString()} from ${newSess.startTime} to ${newSess.endTime}`);
          }
        }
      }
      return true;
    }
    ```

---

# 2. Error Catalog

The following structured application errors must be returned by Next.js API handlers or Server Actions.

| Error Code | HTTP Status | User-Facing Message (English) | User-Facing Message (Arabic) | Description |
| --- | --- | --- | --- | --- |
| `ERR_CRS_DUPLICATE_CODE` | 409 | Course code already exists in catalog. | رمز الدورة التدريبية موجود بالفعل. | Triggered if new course code conflicts with existing record. |
| `ERR_CRS_DUPLICATE_NAME` | 409 | Course name already exists in this department. | اسم الدورة موجود بالفعل في هذا القسم. | Triggered if same course name exists inside department scope. |
| `ERR_CRS_ACTIVE_COURSE_LOCKED`| 422 | Cannot modify duration of active course with running batches. | لا يمكن تعديل مدة الدورة النشطة مع وجود دفعات جارية. | Fired when trying to edit core fields on active courses. |
| `ERR_CRS_MISSING_PRICING_OR_RULES`| 422 | Pricing or completion rules are missing for this course. | أسعار الدورة أو شروط إتمامها مفقودة. | Fired when attempting to publish course without pricing/rules. |
| `ERR_CRS_ACTIVE_BATCHES_EXIST` | 422 | Cannot deactivate course with active batch delivery. | لا يمكن إلغاء تنشيط الدورة مع وجود دفعات نشطة. | Fired when deactivating a course that has open/in-progress batches. |
| `ERR_CRS_INVALID_DATE_RANGE` | 400 | The effective end date must be after start date. | تاريخ الانتهاء الفعلي يجب أن يكون بعد تاريخ البدء. | Basic date validation error. |
| `ERR_CRS_MULTIPLE_ACTIVE_PRICING`| 400 | Overlapping active pricing records exist for this combination. | توجد سجلات أسعار نشطة متداخلة لهذه الدورة. | Fired during pricing overlap validation check. |
| `ERR_CRS_DUPLICATE_BATCH_CODE` | 409 | Batch code must be unique across all branches. | رمز دفعة التدريب يجب أن يكون فريداً. | Block duplicate batch insertions. |
| `ERR_CRS_BATCH_NO_TRAINER` | 422 | Cannot open enrollment without assigning a primary trainer. | لا يمكن فتح التسجيل دون تعيين مدرب رئيسي. | Fired when transitioning batch to OpenForEnrollment without trainer. |
| `ERR_CRS_BATCH_FULL` | 422 | Selected batch is full. Standard enrollment blocked. | دفعة التدريب ممتلئة. التسجيل العادي محظور. | Fired during capacity validation checks. |
| `ERR_CRS_DUPLICATE_WAITLIST_ENTRY`| 422 | Student is already queued on the waitlist for this batch. | الطالب مسجل بالفعل في قائمة الانتظار لهذه الدورة. | Fired when adding student to waitlist twice. |
| `ERR_CRS_BATCH_NOT_FULL` | 400 | Batch has available seats. Waitlist creation blocked. | الدفعة بها مقاعد شاغرة. لا يمكن الإنشاء بقائمة الانتظار. | Fired when waitlisting for under-capacity batches. |
| `ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED`| 409 | A primary trainer has already been allocated for overlapping dates. | تم تعيين مدرب رئيسي بالفعل لهذه التواريخ. | Restricts primary trainer counts to 1 per batch. |
| `ERR_CRS_TRAINER_SCHEDULE_CONFLICT`| 409 | Trainer has a session scheduling conflict. | المدرب لديه تعارض في جدول الحصص. | Triggered by scheduling conflict algorithm. |
| `ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED`| 422 | Parent course does not permit walk-in completions. | الدورة الرئيسية لا تسمح بإتمام التدريب السريع. | Blocks walk-in toggling on courses lacking configuration flags. |
| `ERR_CRS_INVALID_ARABIC_SCRIPT` | 400 | Arabic text fields must contain Arabic script characters only. | حقول النص العربي يجب أن تحتوي على أحرف عربية فقط. | Fired if regex block check fails on Arabic names or descriptions. |
| `ERR_CRS_PRICING_IMMUTABLE` | 422 | Active course pricing is immutable. Please create a new version with non-overlapping dates. | الأسعار النشطة للدورة غير قابلة للتعديل. يرجى إنشاء نسخة جديدة بتواريخ غير متداخلة. | Fired if a user attempts to update an active pricing record directly. |
| `ERR_CRS_RULE_IMMUTABLE` | 422 | Active completion rules are immutable. Please create a new version with updated dates. | شروط الإتمام النشطة غير قابلة للتعديل. يرجى إنشاء نسخة جديدة. | Fired if a user attempts to update active completion rules directly. |

---

# 3. System Notification Events

The following notifications are dispatched asynchronously via the Communication module when domain events are recorded in the Outbox.

> [!IMPORTANT]
> **Cross-Context Variable Resolution Rule:** The Course Catalog & Batch contexts must not perform direct database queries or joins to retrieve personal data (such as student names, lead names, email addresses, or phone numbers) when preparing event payloads. All personal variable identifiers (e.g. `{{leadFirstName}}`, `{{studentName}}`) must be resolved either via public profile query interfaces exposed by the IAM/CRM/Admission contexts or passed inside the triggering Domain Event payload from the source context.

---

### 3.1 Event: `BatchOpenedForEnrollment`
*   **Trigger:** Batch status transitions to `OpenForEnrollment`.
*   **Target Recipient:** CRM Leads with interested course matches.
*   **Channel:** SMS & WhatsApp
*   **Template Variables:**
    *   `{{leadFirstName}}`: First name of the target lead.
    *   `{{courseName}}`: Bilingual course name.
    *   `{{startDate}}`: Batch launch date (GST timezone format).
    *   `{{branchName}}`: Assigned branch.
    *   `{{enrollmentLink}}`: Dynamic online registration URL path.
*   **Message Content (English):**
    > "Hello {{leadFirstName}}, enrollment is now open for {{courseName}} starting on {{startDate}} at ASTI {{branchName}}! Secure your seat here: {{enrollmentLink}}"
*   **Message Content (Arabic):**
    > "مرحباً {{leadFirstName}}، تم فتح باب التسجيل الآن لدورة {{courseName}} التي تبدأ في {{startDate}} في معهد آل سعود {{branchName}}! احجز مقعدك هنا: {{enrollmentLink}}"

---

### 3.2 Event: `WaitlistEntryCreated`
*   **Trigger:** Record added to `WaitingList` table.
*   **Target Recipient:** Queued student profile.
*   **Channel:** Email & WhatsApp
*   **Template Variables:**
    *   `{{studentName}}`: Student's name.
    *   `{{batchCode}}`: Code of target batch.
    *   `{{courseName}}`: Name of course.
    *   `{{queuePosition}}`: Numeric position in the queue.
*   **Message Content (English):**
    > "Dear {{studentName}}, you have been placed on the waiting list for {{courseName}} (Batch: {{batchCode}}). Your current queue position is #{{queuePosition}}. We will alert you immediately once a seat is released."

---

### 3.3 Event: `WaitlistEntryPromoted`
*   **Trigger:** Waitlist status transitions to `Promoted`.
*   **Target Recipient:** Promoted student.
*   **Channel:** Email & WhatsApp
*   **Template Variables:**
    *   `{{studentName}}`: Student name.
    *   `{{courseName}}`: Course name.
    *   `{{batchCode}}`: Batch code.
    *   `{{paymentLink}}`: Payment gateway link or OMR invoice checkout route.
*   **Message Content (English):**
    > "Congratulations {{studentName}}! A seat has been released for you in {{courseName}} (Batch: {{batchCode}}). Please complete your payment registration here to confirm your enrollment: {{paymentLink}}"
