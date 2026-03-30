import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AllLeads from "./pages/AllLeads";
import LeadOverview from "./pages/LeadOverview";
import Pipeline from "./pages/Pipeline";
import Team from "./pages/Team";
import PlaceholderPage from "./pages/PlaceholderPage";
import { Toaster } from "./components/ui/sonner";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public Route wrapper (redirect if logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="today" element={<PlaceholderPage title="Today's Follow-ups" description="View and manage leads scheduled for follow-up today." />} />
                <Route path="tomorrow" element={<PlaceholderPage title="Tomorrow's Follow-ups" description="View and manage leads scheduled for follow-up tomorrow." />} />
                <Route path="this-week" element={<PlaceholderPage title="This Week" description="View all leads scheduled for follow-up this week." />} />
                <Route path="leads" element={<AllLeads />} />
                <Route path="leads/:id" element={<LeadOverview />} />
                <Route path="pipeline" element={<Pipeline />} />
                
                {/* Category Routes */}
                <Route path="category/meeting-done" element={<PlaceholderPage title="Meeting Done" description="Leads where meetings have been completed." />} />
                <Route path="category/interested" element={<PlaceholderPage title="Interested" description="Leads who have shown interest." />} />
                <Route path="category/call-back" element={<PlaceholderPage title="Call Back" description="Leads who requested a callback." />} />
                <Route path="category/busy" element={<PlaceholderPage title="Busy" description="Leads who were busy during contact." />} />
                <Route path="category/no-response" element={<PlaceholderPage title="No Response" description="Leads who haven't responded." />} />
                <Route path="category/foreign" element={<PlaceholderPage title="Foreign" description="International leads." />} />
                <Route path="category/future-projection" element={<PlaceholderPage title="Future Projection" description="Leads for future follow-up." />} />
                <Route path="category/needs-review" element={<PlaceholderPage title="Needs Review" description="Leads that need review." />} />
                <Route path="category/not-interested" element={<PlaceholderPage title="Not Interested" description="Leads who are not interested." />} />
                
                {/* Other Routes */}
                <Route path="instagram" element={<PlaceholderPage title="Instagram Leads" description="Leads sourced from Instagram." />} />
                <Route path="whatsapp" element={<PlaceholderPage title="WhatsApp Leads" description="Leads with WhatsApp contacts." />} />
                <Route path="calendar" element={<PlaceholderPage title="Meetings Calendar" description="Calendar view of all scheduled meetings." />} />
                <Route path="reminders" element={<PlaceholderPage title="Reminders" description="View and manage your reminders." />} />
                <Route path="weekly-messages" element={<PlaceholderPage title="Weekly Messages" description="Weekly message templates and logs." />} />
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<PlaceholderPage title="Settings" description="Manage your account and app settings." />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster position="top-right" />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
