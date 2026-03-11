import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yzsrfcttzkridsfibagk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log("Fetching ALL assignments directly...");
    const { data: q0, error: e0 } = await supabase
        .from('assignments')
        .select('*');

    console.log("Raw assignments count:", q0 ? q0.length : 0);
    console.log("Error:", e0);

    if (q0 && q0.length > 0) {
        console.log("First assignment:", JSON.stringify(q0[0], null, 2));
    }

    console.log("\nTesting AssignmentGrader Query Syntax...");
    const { data: q1, error: e1 } = await supabase
        .from('assignments')
        .select(`
            *,
            profiles!assignments_user_id_fkey(full_name, email),
            lessons(title, modules(module_number))
        `);

    console.log("Q1 Assignments Grader count:", q1 ? q1.length : 0);
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
        .eq('status', 'submitted');

    console.log("Q2 Dashboard count:", q2 ? q2.length : 0);
    console.log("Q2 Error:", e2 ? e2.message : "None", e2?.details || "");
}

test();
