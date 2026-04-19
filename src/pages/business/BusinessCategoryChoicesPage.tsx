import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { businessCategoryChoicesApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

/**
 * Admin CRUD for the BusinessCategoryChoice table (Gap 1 fix).
 *
 * Replaces the old hardcoded BusinessProfile.CATEGORY_CHOICES enum — admin
 * can now add/remove the category slugs that show up in the user's app and
 * the admin "Edit Business" form's Category dropdown without a code deploy.
 *
 * The 16 original choices (retail, restaurant, salon, gym, education,
 * healthcare, real_estate, automobile, electronics, clothing, photography,
 * event, travel, finance, legal, other) are seeded by migration 0018 so
 * existing data stays valid.
 */

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'slug', title: 'Slug', sortable: true, render: (item) => (
    <code className="text-brand-text-muted text-xs">{item.slug}</code>
  )},
  { key: 'icon_url', title: 'Icon URL', render: (item) => (
    <span className="text-brand-text-muted text-xs">{item.icon_url || '--'}</span>
  )},
  { key: 'sort_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name (display label)', type: 'text', required: true },
  { key: 'slug', label: 'Slug (machine key — lowercase, no spaces)', type: 'text', required: true },
  { key: 'icon_url', label: 'Icon URL (optional)', type: 'text' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function BusinessCategoryChoicesPage() {
  return (
    <GenericCrudPage
      title="Business Category Choices"
      api={businessCategoryChoicesApi}
      columns={columns}
      fields={fields}
    />
  )
}
