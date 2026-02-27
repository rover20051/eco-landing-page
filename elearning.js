// Supabase Setup
const SUPABASE_URL = 'https://yzsrfcttzkridsfibagk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs';

// Initialize Supabase (requires Supabase JS library via CDN in HTML)
let supabase;

document.addEventListener('DOMContentLoaded', () => {
    // Check if Supabase library is loaded
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
    } else {
        console.error('Supabase library not found. Please ensure the CDN script is included in elearning.html');
    }

    // Simple SPA Router Logic
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    function switchView(viewId) {
        // Update active nav button
        navItems.forEach(item => {
            if (item.dataset.view === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update active view section
        viewSections.forEach(section => {
            if (section.id === `view-${viewId}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Push state to browser history (optional, for simple URL updating)
        if (window.location.hash !== `#${viewId}`) {
            window.history.pushState(null, '', `#${viewId}`);
        }
    }

    // Add click listeners to sidebar navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            if (viewId) {
                switchView(viewId);
            }
        });
    });

    function initFromHash() {
        const hash = window.location.hash.replace('#', '') || 'dashboard'; // default to dashboard
        const exists = document.getElementById(`view-${hash}`);
        if (exists) {
            switchView(hash);
        }
    }

    // Handle initial load
    initFromHash();

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', initFromHash);

});

// Global function for Leccion Tabs
function switchLeccionTab(tabId) {
    // Update nav buttons
    document.querySelectorAll('.leccion-tabs-nav .tab-btn').forEach(btn => {
        if (btn.classList.contains('locked-tab')) return; // Ignore locked tabs
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.leccion-tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}
