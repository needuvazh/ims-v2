## ADDED Requirements

### Requirement: Upload user profile photo
Users MUST be able to upload an image to be used as their profile photo. The photo SHALL be stored securely in Vercel Blob storage, and the image reference MUST be saved in the `Person` model associated with the user.

#### Scenario: Successful profile photo upload
- **WHEN** a user uploads a valid image file to `POST /api/v1/users/[id]/profile-photo`
- **THEN** the image MUST be saved in storage, the user's `Person` record updated with the storage URL, a `UserProfilePhotoUploaded` audit log recorded, and a success response containing the URL returned.

#### Scenario: Unauthorized upload attempt
- **WHEN** a user tries to upload a photo to `POST /api/v1/users/[id]/profile-photo` for a different user, and does not have the `iam.user.update` permission
- **THEN** the API MUST return a `403 Forbidden` response.

#### Scenario: Invalid file upload
- **WHEN** a user uploads a file with missing data or an incorrect content type (not multipart/form-data)
- **THEN** the API MUST return a `400 Bad Request` validation response.

### Requirement: View user profile photo
Users MUST be able to retrieve their profile photo securely through a dedicated route.

#### Scenario: Stream profile photo successfully
- **WHEN** a user requests `GET /api/v1/users/[id]/profile-photo/view` and the photo exists in storage
- **THEN** the API MUST retrieve the image from storage using the private access token and stream the image body with appropriate caching and image content type headers.

#### Scenario: Photo not set
- **WHEN** a user requests `GET /api/v1/users/[id]/profile-photo/view` but no photo has been uploaded (or was deleted)
- **THEN** the API MUST return a `404 Not Found` response.
