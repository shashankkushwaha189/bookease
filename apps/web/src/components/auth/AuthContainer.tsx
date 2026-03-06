import React, { useState } from 'react';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPanel } from './RegisterPanel';
import { ForgotPasswordPanel } from './ForgotPasswordPanel';
import { ResetPasswordPanel } from './ResetPasswordPanel';
import { AuthLanding } from './AuthLanding';

type AuthView = 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password';

export const AuthContainer: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('landing');

  const handleLoginClick = () => setCurrentView('login');
  const handleRegisterClick = () => setCurrentView('register');
  const handleBackToLanding = () => setCurrentView('landing');
  const handleForgotPassword = () => setCurrentView('forgot-password');
  const handleBackToLogin = () => setCurrentView('login');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <AuthLanding
            onLoginClick={handleLoginClick}
            onRegisterClick={handleRegisterClick}
          />
        );
      case 'login':
        return (
          <LoginPage
            onForgotPassword={handleForgotPassword}
            onRegister={handleRegisterClick}
          />
        );
      case 'register':
        return (
          <RegisterPanel
            onBack={handleBackToLanding}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPanel
            onBack={handleBackToLogin}
          />
        );
      case 'reset-password':
        return (
          <ResetPasswordPanel
            onBack={handleBackToLogin}
          />
        );
      default:
        return (
          <AuthLanding
            onLoginClick={handleLoginClick}
            onRegisterClick={handleRegisterClick}
          />
        );
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentView()}
    </div>
  );
};
