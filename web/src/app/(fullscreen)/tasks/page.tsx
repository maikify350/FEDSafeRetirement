import type { Metadata } from 'next'
import TasksView from '@views/admin/TasksView'

export const metadata: Metadata = { title: 'Dev Tasks' }

export default function Page() {
  return <TasksView />
}
