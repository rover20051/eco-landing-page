import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://yzsrfcttzkridsfibagk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs'
)
const { data, error } = await supabase
  .from('lessons')
  .select('id, lesson_number, title, module_id, modules(module_number, title)')
  .order('lesson_number')
if (error) { console.error('ERROR', error); process.exit(1) }
console.log('Total lecciones:', data.length)
for (const l of data) {
  console.log(`[${l.id}] M${l.modules?.module_number ?? '?'} - L${l.lesson_number}: ${l.title}  (módulo: ${l.modules?.title ?? '?'})`)
}
