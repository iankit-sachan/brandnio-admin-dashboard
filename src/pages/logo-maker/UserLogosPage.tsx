import GenericCrudPage from '../GenericCrudPage'
import { userLogosApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'user', title: 'User', sortable: true, render: (item) => <span>{item.user_email || item.user || '--'}</span> },
  { key: 'business_name', title: 'Business Name', sortable: true, render: (item) => <span>{item.business_name || '--'}</span> },
  { key: 'industry', title: 'Industry', render: (item) => <span className="text-brand-text-muted">{item.industry_name || item.industry || '--'}</span> },
  { key: 'style', title: 'Style', render: (item) => <span className="text-brand-text-muted">{item.style_name || item.style || '--'}</span> },
  { key: 'logo_url', title: 'Logo', render: (item) => item.logo_url ? (
    <img src={item.logo_url} alt="logo" className="h-8 w-8 rounded object-cover" />
  ) : <span className="text-brand-text-muted">--</span> },
  { key: 'created_at', title: 'Created', sortable: true, render: (item) => (
    <span className="text-brand-text-muted">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '--'}</span>
  )},
]

export default function UserLogosPage() {
  return <GenericCrudPage title="User Logos" api={userLogosApi} columns={columns} readOnly />
}
