import { Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-purple-400 mb-3">Produit</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Fonctionnalités</li>
              <li>Tarifs</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-pink-400 mb-3">Entreprise</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>À propos</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-blue-400 mb-3">Ressources</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Documentation</li>
              <li>API</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-green-400 mb-3">Légal</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Confidentialité</li>
              <li>Conditions</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CodeReview</span>
          </div>

          <p className="text-gray-400 text-sm">
            © 2026 CodeReview. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
