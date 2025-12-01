import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as React from "react";
const Index = React.lazy(() => import("./pages/Index"));
const Hotels = React.lazy(() => import("./pages/Hotels"));
const About = React.lazy(() => import("./pages/About"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Help = React.lazy(() => import("./pages/Help"));
const Cancellation = React.lazy(() => import("./pages/Cancellation"));
const SignIn = React.lazy(() => import("./pages/SignIn"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Register = React.lazy(() => import("./pages/Register"));
const HotelDetail = React.lazy(() => import("./pages/HotelDetail"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
import ProtectedRoute from "./components/ProtectedRoute";
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const UserDashboard = React.lazy(() => import("./pages/UserDashboard"));
const OwnerDashboard = React.lazy(() => import("./pages/OwnerDashboard"));
const OwnerCoupons = React.lazy(() => import("./pages/OwnerCoupons"));
const MessageInbox = React.lazy(() => import("./pages/MessageInbox"));
const UserDetails = React.lazy(() => import("./pages/UserDetails"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<div className="container py-8">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/cancellation" element={<Cancellation />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/hotel/:id" element={<HotelDetail />} />
          <Route path="/dashboard/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/admin/:feature" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/user" element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/user/details" element={<ProtectedRoute role="user"><UserDetails /></ProtectedRoute>} />
          <Route path="/dashboard/owner" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/owner/:feature" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/owner/coupons" element={<ProtectedRoute role="owner"><OwnerCoupons /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><MessageInbox /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
