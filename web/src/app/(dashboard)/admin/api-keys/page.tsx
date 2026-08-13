/**
 * API Keys Management Page
 *
 * Admin-only page for managing API keys.
 * Path: /admin/api-keys
 */

import ApiKeysView from '@/views/admin/ApiKeysView';

export const metadata = {
  title: 'API Keys',
  description: 'Manage API keys for external integrations',
};

export default function ApiKeysPage() {
  return <ApiKeysView />;
}
