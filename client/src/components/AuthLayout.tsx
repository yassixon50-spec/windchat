import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img src="/windchat.svg" alt="Windchat" className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          {subtitle && (
            <p className="text-telegram-text-secondary">{subtitle}</p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-telegram-bg-light rounded-2xl p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
