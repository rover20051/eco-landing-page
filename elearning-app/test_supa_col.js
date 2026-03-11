import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yzsrfcttzkridsfibagk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log("Testing profiles!user_id...");
    const { data: q1, error: e1 } = await supabase
        .from('assignments')
        .select(`
            id,
            profiles!user_id(full_name)
        `)
        .limit(1);

    console.log("Q1 Error:", e1 ? e1.message : "None");
}

test();
