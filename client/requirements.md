## Packages
recharts | Dashboard analytics charts and data visualization
@hookform/resolvers | Form validation with Zod
date-fns | Date formatting

## Notes
The backend generates `clientId` and `clientSecret` for OAuth clients upon creation. The UI will display these securely once immediately after creation.
The `config` field for Storage Adapters is handled as a stringified JSON in the form, and parsed to an object before sending to the API.
