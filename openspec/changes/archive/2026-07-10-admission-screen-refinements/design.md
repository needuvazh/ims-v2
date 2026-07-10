## Context

To improve the user experience for admissions operations at ASTI Training Institute, the Admission screen requires a layout overhaul and additional student registry options. The central concept is Enrollment, and the Student Profile is initialized during the admission process. Therefore, managing document checkers, student photos, and printing ID cards directly from the Admission Details screen is key to a smooth registrar workflow.

## Goals / Non-Goals

**Goals:**
* Restructure page grids to give details more visual prominence, pushing history to the bottom.
* Enable registrars to upload a student's profile photo and see it on both the UI and printed ID Cards.
* Resolve the "Pending Generation" state by letting registrars issue the first ID Card directly from the Admission screen.
* Standardize document listings into a clean multi-grid view with download/delete buttons.

**Non-Goals:**
* Modifying permissions system configurations.
* Creating duplicate profiles for students during ID Card generation.

## Decisions

1. **Query Enhancements:**
   - Update `AdmissionQueryService` in `packages/admissions-enrollment/src/application/admission-query-service.ts` to retrieve detailed `Person` columns:
     ```typescript
     person: {
       id: admission.personId,
       firstName: admission.person?.firstName,
       lastName: admission.person?.lastName,
       email: admission.person?.email,
       mobile: admission.person?.mobile,
       nationalId: admission.person?.nationalId,
       passportNumber: admission.person?.passportNumber,
       visaNumber: admission.person?.visaNumber,
       nationality: admission.person?.nationality,
       dateOfBirth: admission.person?.dateOfBirth,
       gender: admission.person?.gender,
       photoUrl: admission.person?.photoUrl,
     }
     ```

2. **Dedicated Upload API Route:**
   - Implement `apps/admin-portal/app/api/v1/admissions/[id]/profile-photo/route.ts`.
   - Validate using `withPermission(request, 'admission.create', ...)` or `student.write`.
   - Check branch permissions.
   - Upload file to Vercel Blob and write the URL to the database:
     ```typescript
     await prisma.person.update({
       where: { id: admission.personId },
       data: { photoUrl: blobResult.url }
     });
     ```

3. **UI Section Adjustments:**
   - **Timeline Placement:** Shift the workflow status timeline container to the bottom page boundary, matching the container styling of the other segments.
   - **Checklist Multi-grid:** Change document rows to:
     ```tsx
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {admission.documents.map(doc => (
         // Document Card
       ))}
     </div>
     ```
   - **Expandable profile section:** Use a simple react state `const [isExpanded, setIsExpanded] = useState(false)` to toggle the visibility of the extra `Person` attributes.
   - **Card Issuance Form:** Render an inline dialogue/modal when the "Issue ID Card" button is clicked. It will call `/api/v1/students/${studentProfileId}/id-card` with `eventType: 'Issue'` and prefilled values.

4. **PDF Generator Logo & Photo Loading:**
   - **Branding logo:** Load ASTI logo from local path:
     ```typescript
     const logoPath = path.join(process.cwd(), 'public/alsaud/logo.png');
     const logoBuffer = await fs.readFile(logoPath);
     const logoBase64 = logoBuffer.toString('base64');
     const logoImgData = `data:image/png;base64,${logoBase64}`;
     doc.addImage(logoImgData, 'PNG', 50, 4, 30, 8); // Adjust coordinates
     ```
   - **Student profile picture:** Fetch remote `person.photoUrl` inside the route handler, convert to Base64, and embed using `doc.addImage(...)`.

## Risks / Trade-offs

* **Network Latency:** Fetching the student's profile photo over the internet before generating the PDF adds some latency. We will wrap the fetch inside a `try/catch` and fall back to the default photo box placeholder if the download fails.
