import GenericCrudPage from '../GenericCrudPage'
import { userCardDataApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'user', title: 'User', sortable: true, render: (item) => <span>{item.user_email || item.user || '--'}</span> },
  { key: 'card_name', title: 'Card Name', sortable: true },
  { key: 'business_name', title: 'Business Name', render: (item) => <span>{item.business_name || '--'}</span> },
  { key: 'phone', title: 'Phone', render: (item) => <span className="text-brand-text-muted">{item.phone || '--'}</span> },
  { key: 'created_at', title: 'Created', sortable: true, render: (item) => (
    <span className="text-brand-text-muted">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '--'}</span>
  )},
]

export default function UserCardDataPage() {
  return <GenericCrudPage title="User Card Data" api={userCardDataApi} columns={columns} readOnly />
}
