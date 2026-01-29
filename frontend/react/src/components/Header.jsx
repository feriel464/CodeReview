import { Terminal, Globe, ChevronDown, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({
  language,
  setLanguage,
  languages,
  t
}) {
  const navigate = useNavigate();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Terminal className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
            CodeReview
          </span>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            {t.features}
          </a>
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            {t.docs}
          </a>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200"
            >
              <Globe className="w-4 h-4" />
              {languages.find(l => l.code === language)?.flag}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-purple-50"
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold"
          >
            {t.start}
          </button>
        </nav>

        {/* Mobile Button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden"
        >
          {showMobileMenu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
