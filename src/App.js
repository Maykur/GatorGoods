import { Show } from '@clerk/react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Layout } from './components/Layout';
import { UserProfile } from './components/UserProfile';
import { ConfirmDialogProvider, ToastProvider } from './components/ui';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignUp } from './pages/signup';
import { CreateListingPage } from './pages/CreateListingPage';
import { OffersPage } from './pages/OffersPage';
import { MessagesPage } from './pages/MessagesPage';
import { ChatThreadPage } from './pages/ChatThreadPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ItemPage } from './pages/ItemPage';
import {TransactPage} from './pages/transactPage'

function ProtectedRoute({ children }) {
  return (
    <Show when="signed-in" fallback={<Navigate to="/login" replace />}>
      {children}
    </Show>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <ConfirmDialogProvider>
          <Router>
            <UserProfile />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage forceSignedOutView />} />
                <Route path="/home" element={<Navigate to="/listings" replace />} />
                <Route path="/login/*" element={<LoginPage />} />
                <Route path="/signup/*" element={<SignUp />} />
                <Route path="/listings" element={<HomePage />} />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreateListingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offers"
                  element={
                    <ProtectedRoute>
                      <OffersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages/:conversationId"
                  element={
                    <ProtectedRoute>
                      <ChatThreadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/me"
                  element={
                    <ProtectedRoute>
                      <ProfilePage ownerView />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile/:id" element={<ProfilePage />} />
                <Route path="/items/:id" element={<ItemPage />} />
                <Route
                  path="transact/:orderId"
                  element={
                    <ProtectedRoute>
                      <TransactPage />
                    </ProtectedRoute>
                  }
                
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Router>
        </ConfirmDialogProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

export default App;
