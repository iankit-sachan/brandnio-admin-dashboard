import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { wizardConfigsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'badge_primary_text', title: 'Badge', sortable: true },
  { key: 'discount_text', title: 'Discount', sortable: true },
  { key: 'price_display', title: 'Price' },
  { key: 'price_original_display', title: 'Original Price' },
  { key: 'cta_primary_text', title: 'CTA' },
  { key: 'timer_duration_hours', title: 'Timer (hrs)', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'timer_duration_hours', label: 'Timer Duration (Hours)', type: 'number', required: true },
  { key: 'badge_primary_text', label: 'Badge Primary Text', type: 'text' },
  { key: 'badge_secondary_text', label: 'Badge Secondary Text', type: 'text' },
  { key: 'price_display', label: 'Price Display', type: 'text' },
  { key: 'price_original_display', label: 'Original Price Display', type: 'text' },
  { key: 'discount_text', label: 'Discount Text', type: 'text' },
  { key: 'period_text', label: 'Period Text', type: 'text' },
  { key: 'period_subtext', label: 'Period Subtext', type: 'text' },
  { key: 'cta_primary_text', label: 'CTA Primary Text', type: 'text' },
  { key: 'cta_secondary_text', label: 'CTA Secondary Text', type: 'text' },
  { key: 'browse_link_text', label: 'Browse Link Text', type: 'text' },
  { key: 'features_title', label: 'Features Title', type: 'text' },
  { key: 'preview_logo_hint', label: 'Preview Logo Hint', type: 'text' },
  { key: 'preview_tagline_hint', label: 'Preview Tagline Hint', type: 'text' },
  { key: 'offer_ends_label', label: 'Offer Ends Label', type: 'text' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function WizardConfigsPage() {
  return <GenericCrudPage title="Wizard Configs" api={wizardConfigsApi} columns={columns} fields={fields} />
}
