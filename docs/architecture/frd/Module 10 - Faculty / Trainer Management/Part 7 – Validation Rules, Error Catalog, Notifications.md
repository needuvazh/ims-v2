# Part 7 – Validation Rules, Error Catalog, Notifications

## 1. Custom Business Validation Schemas

### 1.1 Weekly Availability Overlap Check Algorithm
Before writing a new `TrainerAvailability` slot to the database, the system must execute an overlap query. Given a set of proposed slots, the validation logic must enforce:

$$\forall \text{ slots } A, B \text{ associated with } T \text{ on Day } D:$$
$$\text{If } (\text{DateRange}_A \cap \text{DateRange}_B \neq \emptyset):$$
$$\text{Then } (\text{StartTime}_A \ge \text{EndTime}_B) \lor (\text{EndTime}_A \le \text{StartTime}_B)$$

#### Implementation Reference (SQL/Prisma Query logic):
```typescript
const countOverlaps = await prisma.trainerAvailability.count({
  where: {
    trainerId: payload.trainerId,
    dayOfWeek: payload.dayOfWeek,
    isDeleted: false,
    status: "Active",
    // Check Date Range overlap
    AND: [
      { effectiveStartDate: { lte: payload.effectiveEndDate || new Date("9999-12-31") } },
      {
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: payload.effectiveStartDate } }
        ]
      }
    ],
    // Check Time range overlap
    NOT: [
      {
        OR: [
          { startTime: { gte: payload.endTime } },
          { endTime: { lte: payload.startTime } }
        ]
      }
    ]
  }
});
if (countOverlaps > 0) {
  throw new ValidationError("ERR_TRN_AVAILABILITY_OVERLAP");
}
```

---

### 1.2 Qualification & Document Upload Rules
* **Format Restriction:** Verification attachments uploaded to `TrainerQualification` must pass mimetype inspections matching `application/pdf`, `image/jpeg`, or `image/png`.
* **Size Boundary:** Maximum file upload length is **5,242,880 bytes** (5MB).
* **Completion Year Boundary:** For academic degrees (e.g. M.Sc., B.Sc., Ph.D.), `yearCompleted` must be $\le \text{current\_year}$ and $\ge \text{person.dateOfBirth} + 18$. For professional certifications (e.g. CCNA, CEH, PMP), `yearCompleted` must be $\ge \text{person.dateOfBirth} + 14$. The trainer's date of birth must be retrieved from the Identity Bounded Context API/Application Service (e.g. via `IdentityQueryService.getPersonById(personId)`) to avoid cross-context SQL joins.

---

## 2. Structured Error Code Catalog

The system uses specific error schemas to capture exceptions in this module.

| Error Code | HTTP Status | Domain Message | Recovery Action |
| :--- | :---: | :--- | :--- |
| `ERR_TRN_PERSON_ALREADY_LINKED` | `400` | "This person record is already associated with a trainer profile." | Select a different person or update the existing profile. |
| `ERR_TRN_AVAILABILITY_OVERLAP` | `422` | "The requested availability window overlaps with an existing time block." | Check the calendar grid to find open slots. |
| `ERR_TRN_COURSE_NOT_AUTHORIZED` | `400` | "Trainer is not authorized to deliver this course catalog item." | Map course authorization details on the course matrix. |
| `ERR_TRN_QUALIFICATION_EXPIRED` | `400` | "The mandatory qualification document has expired or is unverified." | Review qualification document approvals in Document Management. |
| `ERR_TRN_INVALID_COMPENSATION_RATE`| `422` | "Compensation value must be positive and format with exactly 3 decimals." | Re-enter rate using standard Omani Rial decimal format. |
| `ERR_TRN_BRANCH_ACCESS_DENIED` | `403` | "You do not have permission to view or edit trainer records in this branch."| Check your active session branch context. |
| `ERR_TRN_TRAINER_NOT_ASSIGNED_TO_BATCH` | `400` | "The trainer must be assigned to the batch before payment rates are defined."| Assign trainer to batch using Batch Allocation. |
| `ERR_TRN_PROFILE_SUSPENDED` | `400` | "Cannot schedule assignments. The trainer profile is suspended." | Resolve the compliance block to reactivate profile. |
| `ERR_TRN_BRANCH_INACTIVE` | `400` | "The target branch is currently inactive or under maintenance." | Select an active branch context. |
| `ERR_TRN_COURSE_INACTIVE` | `400` | "The selected course is inactive or not published." | Verify the course status in the Course Catalog. |

---

## 3. System Notification Events & Template Variables

The Faculty / Trainer Management module emits specific events to the outbox database table, triggering notification runners.

### 3.1 Event: `TrainerDocumentExpiring`
* **Trigger:** Daily cron job identifies a document with visa/license expiry $\le 30$ days.
* **Channels:** Email (Primary), Dashboard Alert (Internal).
* **Recipient Rules:** The trainer and the Branch Admin.
* **Template Variables Payload:**
```json
{
  "recipientName": "Ahmed Al-Said",
  "documentType": "Ministry Teaching License",
  "expiryDate": "2026-07-31",
  "daysRemaining": 30,
  "actionUrl": "https://portal.asti.edu.om/trainer/compliance",
  "branchName": "ASTI Muscat"
}
```
* **Bilingual Subject Line:** 
  * English: `Action Required: Your document is expiring in {daysRemaining} days`
  * Arabic: `إجراء مطلوب: ستنتهي صلاحية وثيقتك خلال {daysRemaining} يومًا`

---

### 3.2 Event: `TrainerStatusChanged`
* **Trigger:** Trainer profile transitions states (e.g., `Active` $\rightarrow$ `Suspended`).
* **Channels:** Email, SMS.
* **Recipient Rules:** Logged trainer.
* **Template Variables Payload:**
```json
{
  "recipientName": "Ahmed Al-Said",
  "oldStatus": "Active",
  "newStatus": "Suspended",
  "changeReason": "Visa documentation expired on 2026-06-30",
  "contactPhone": "+96824700000"
}
```
* **Bilingual Subject Line:**
  * English: `ASTI Profile Status Update: {newStatus}`
  * Arabic: `تحديث حالة ملف معهد أستي: {newStatus}`

---

### 3.3 Consumed Event: `TrainerAssignedToBatch` (from Training Delivery Context)
* **Trigger:** Subscribed event fired when Trainer is added as an instructor inside a `BatchTrainer` relation.
* **Action:** Recalculate local utilization snapshots (`TrainerUtilizationSnapshot`) and trigger notification routines.
* **Channels:** Email, WhatsApp.
* **Recipient Rules:** Assigned trainer.
* **Template Variables Payload:**
```json
{
  "recipientName": "Ahmed Al-Said",
  "courseName": "Advanced Ethical Hacking",
  "batchCode": "B-CS-200-MUS",
  "startDate": "2026-07-10",
  "scheduleSummary": "Mondays & Wednesdays, 09:00 - 12:00 GST",
  "branchName": "ASTI Muscat"
}
```
* **Bilingual Subject Line:**
  * English: `New Lecture Assignment: {courseName} - {batchCode}`
  * Arabic: `تكليف محاضرة جديد: {courseName} - {batchCode}`
