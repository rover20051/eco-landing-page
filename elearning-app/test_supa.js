import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yzsrfcttzkridsfibagk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    // Test the exact syntax from AssignmentGrader
    console.log("Testing Assignments Query Syntax...");
    const { data: q1, error: e1 } = await supabase
        .from('assignments')
        .select(`
            *,
            profiles!assignments_user_id_fkey(full_name, email),
            lessons(title, modules(module_number))
        `)
        .limit(1);

    console.log("Q1 Error:", e1 ? e1.message : "None", e1?.details || "");

    console.log("\nTesting Dashboard Query Syntax...");
    const { data: q2, error: e2 } = await supabase
        .from('assignments')
        .select(`
            id, 
            status, 
            submitted_at, 
            profiles!assignments_user_id_fkey (full_name),
            lessons (title, modules(module_number))
        `)
        .limit(1);

    console.log("Q2 Error:", e2 ? e2.message : "None", e2?.details || "");

    console.log("\nTesting Attendance Profiles Query...");
    const { data: q3, error: e3 } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status')
        .limit(1);

    console.log("Q3 Error:", e3 ? e3.message : "None");
}

test();
