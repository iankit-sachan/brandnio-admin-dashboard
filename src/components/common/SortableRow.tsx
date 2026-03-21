import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export function SortableRow({ id, children }: { id: number | string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td className="w-8 cursor-grab" {...listeners}><GripVertical className="w-4 h-4 text-gray-400" /></td>
      {children}
    </tr>
  )
}
