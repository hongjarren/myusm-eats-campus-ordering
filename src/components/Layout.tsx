import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { LogOut, User, ShoppingBag, Store, Bike, Settings, Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'student':
        return <ShoppingBag className="h-5 w-5" />;
      case 'vendor':
        return <Store className="h-5 w-5" />;
      case 'delivery':
        return <Bike className="h-5 w-5" />;
      case 'admin':
        return <Settings className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <Store className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="ml-2 text-base sm:text-xl font-bold truncate">MyUSM Eats</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={toggleDarkMode} 
                className="nav-tab min-h-[44px] px-2 sm:px-5" 
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
              </button>

              {profile && (
                <div className="flex items-center gap-1 sm:gap-3">
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    {getRoleIcon()}
                    <span className="font-medium">{profile.full_name}</span>
                    <span className="text-gray-500 dark:text-gray-400 capitalize">({profile.role})</span>
                  </div>
                  <button 
                    onClick={signOut} 
                    className="nav-tab min-h-[44px] px-2 sm:px-5"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
