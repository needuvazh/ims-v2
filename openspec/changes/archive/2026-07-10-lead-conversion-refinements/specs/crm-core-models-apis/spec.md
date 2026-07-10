## ADDED Requirements

### Requirement: Lead Model Admission Number Schema Support
The Lead entity schema MUST support an optional, nullable `admissionNumber` field.

#### Scenario: Verify Field Presence
- **WHEN** a lead is retrieved via lead endpoints or domain repository queries
- **THEN** the Lead record MUST include the `admissionNumber` property.
