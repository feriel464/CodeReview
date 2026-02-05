-- Insertion des langues
INSERT INTO languages (code, name, flag) VALUES
('fr', 'Français', '🇫🇷'),
('en', 'English', '🇬🇧'),
('ar', 'العربية', '🇸🇦')
ON CONFLICT (code) DO NOTHING;

-- Insertion des clés de traduction
INSERT INTO translation_keys (key_name, section, description) VALUES
-- Navigation
('features', 'navigation', 'Lien menu Fonctionnalités'),
('pricing', 'navigation', 'Lien menu Tarifs'),
('docs', 'navigation', 'Lien menu Documentation'),
('start', 'navigation', 'Bouton Commencer'),
-- Hero
('hero', 'hero', 'Titre Hero partie 1'),
('heroHighlight', 'hero', 'Titre Hero partie 2'),
('heroDesc', 'hero', 'Description Hero'),
('tryFree', 'hero', 'Bouton Essai Gratuit'),
-- Input Methods
('uploadCode', 'inputMethods', 'Télécharger fichier'),
('pasteCode', 'inputMethods', 'Coller code'),
('uploadImage', 'inputMethods', 'Image'),
('pasteCodeHere', 'inputMethods', 'Placeholder'),
('selectLanguage', 'inputMethods', 'Sélectionner langage'),
('analyze', 'inputMethods', 'Bouton Analyser'),
('clear', 'inputMethods', 'Bouton Effacer'),
('uploadImageHere', 'inputMethods', 'Télécharger image'),
('dropHere', 'inputMethods', 'Déposer fichier'),
-- Analysis
('analyzing', 'analysis', 'Analyse en cours'),
('analysisComplete', 'analysis', 'Analyse terminée'),
('qualityScore', 'analysis', 'Score de qualité'),
('improvements', 'analysis', 'Améliorations'),
('smells', 'analysis', 'Code Smells'),
('documentation', 'analysis', 'Documentation'),
-- Features
('featuresTitle', 'features', 'Titre section'),
('featuresDesc', 'features', 'Description section'),
('featureMultiLang', 'features', 'Multi-langages titre'),
('featureMultiLangDesc', 'features', 'Multi-langages desc'),
('featureBugDetection', 'features', 'Détection bugs titre'),
('featureBugDetectionDesc', 'features', 'Détection bugs desc'),
('featureAutoDocs', 'features', 'Auto-docs titre'),
('featureAutoDocsDesc', 'features', 'Auto-docs desc'),
('featureSecurity', 'features', 'Sécurité titre'),
('featureSecurityDesc', 'features', 'Sécurité desc'),
('featureOptimization', 'features', 'Optimisation titre'),
('featureOptimizationDesc', 'features', 'Optimisation desc'),
('featureMetrics', 'features', 'Métriques titre'),
('featureMetricsDesc', 'features', 'Métriques desc'),
('featureSpeed', 'features', 'Vitesse titre'),
('featureSpeedDesc', 'features', 'Vitesse desc'),
('featureCollaboration', 'features', 'Collaboration titre'),
('featureCollaborationDesc', 'features', 'Collaboration desc'),
-- Stats
('stat1Number', 'stats', 'Stat 1 nombre'),
('stat1Label', 'stats', 'Stat 1 label'),
('stat2Number', 'stats', 'Stat 2 nombre'),
('stat2Label', 'stats', 'Stat 2 label'),
('stat3Number', 'stats', 'Stat 3 nombre'),
('stat3Label', 'stats', 'Stat 3 label'),
('stat4Number', 'stats', 'Stat 4 nombre'),
('stat4Label', 'stats', 'Stat 4 label'),
-- CTA
('ctaTitle', 'cta', 'Titre CTA'),
('ctaDesc', 'cta', 'Description CTA'),
('ctaButton', 'cta', 'Bouton CTA'),
-- Footer
('footerProduct', 'footer', 'Produit titre'),
('footerProductFeatures', 'footer', 'Fonctionnalités footer'),
('footerProductPricing', 'footer', 'Tarifs footer'),
('footerCompany', 'footer', 'Entreprise titre'),
('footerCompanyAbout', 'footer', 'À propos'),
('footerCompanyContact', 'footer', 'Contact'),
('footerResources', 'footer', 'Ressources titre'),
('footerResourcesDocs', 'footer', 'Documentation footer'),
('footerResourcesAPI', 'footer', 'API'),
('footerLegal', 'footer', 'Légal titre'),
('footerLegalPrivacy', 'footer', 'Confidentialité'),
('footerLegalTerms', 'footer', 'Conditions'),
('footerCopyright', 'footer', 'Copyright')
ON CONFLICT (key_name) DO NOTHING;

-- Traductions françaises
INSERT INTO translations (language_id, translation_key_id, value)
SELECT 
    (SELECT id FROM languages WHERE code = 'fr'),
    tk.id,
    CASE tk.key_name
        WHEN 'features' THEN 'Fonctionnalités'
        WHEN 'pricing' THEN 'Tarifs'
        WHEN 'docs' THEN 'Documentation'
        WHEN 'start' THEN 'Commencer'
        WHEN 'hero' THEN 'Revue de code,'
        WHEN 'heroHighlight' THEN 'Instantanément'
        WHEN 'heroDesc' THEN 'Optimisé par une IA qui comprend votre code. Détectez les erreurs, améliorez la qualité et générez la documentation automatiquement.'
        WHEN 'tryFree' THEN 'Essayer gratuitement'
        WHEN 'uploadCode' THEN 'Télécharger un fichier'
        WHEN 'pasteCode' THEN 'Coller le code'
        WHEN 'uploadImage' THEN 'Image'
        WHEN 'pasteCodeHere' THEN 'Collez votre code ici...'
        WHEN 'selectLanguage' THEN 'Sélectionner le langage'
        WHEN 'analyze' THEN 'Analyser'
        WHEN 'clear' THEN 'Effacer'
        WHEN 'uploadImageHere' THEN 'Télécharger une image ici'
        WHEN 'dropHere' THEN 'Déposez votre fichier ici'
        WHEN 'analyzing' THEN 'Analyse en cours...'
        WHEN 'analysisComplete' THEN 'Analyse terminée'
        WHEN 'qualityScore' THEN 'Score de qualité'
        WHEN 'improvements' THEN 'Améliorations'
        WHEN 'smells' THEN 'Code Smells'
        WHEN 'documentation' THEN 'Documentation'
        WHEN 'featuresTitle' THEN 'Des milliers d''outils en un'
        WHEN 'featuresDesc' THEN 'CodeReview analyse automatiquement votre code et fournit des suggestions de haute qualité pour tous les langages de programmation.'
        WHEN 'featureMultiLang' THEN 'Multi-langages'
        WHEN 'featureMultiLangDesc' THEN '20+ langages supportés'
        WHEN 'featureBugDetection' THEN 'Détection bugs'
        WHEN 'featureBugDetectionDesc' THEN 'Trouvez les erreurs cachées'
        WHEN 'featureAutoDocs' THEN 'Auto-docs'
        WHEN 'featureAutoDocsDesc' THEN 'Documentation automatique'
        WHEN 'featureSecurity' THEN 'Sécurité'
        WHEN 'featureSecurityDesc' THEN 'Analyse des vulnérabilités'
        WHEN 'featureOptimization' THEN 'Optimisation'
        WHEN 'featureOptimizationDesc' THEN 'Performances améliorées'
        WHEN 'featureMetrics' THEN 'Métriques'
        WHEN 'featureMetricsDesc' THEN 'Suivi de la qualité'
        WHEN 'featureSpeed' THEN 'Ultra-rapide'
        WHEN 'featureSpeedDesc' THEN 'Résultats en < 5s'
        WHEN 'featureCollaboration' THEN 'Collaboration'
        WHEN 'featureCollaborationDesc' THEN 'Travail d''équipe facilité'
        WHEN 'stat1Number' THEN '2000+'
        WHEN 'stat1Label' THEN 'Outils IA'
        WHEN 'stat2Number' THEN '10M+'
        WHEN 'stat2Label' THEN 'Analyses'
        WHEN 'stat3Number' THEN '100+'
        WHEN 'stat3Label' THEN 'Langues'
        WHEN 'stat4Number' THEN '24/7'
        WHEN 'stat4Label' THEN 'Disponible'
        WHEN 'ctaTitle' THEN 'Prêt à transformer votre code ?'
        WHEN 'ctaDesc' THEN 'Rejoignez des milliers de développeurs qui utilisent CodeReview pour écrire un meilleur code.'
        WHEN 'ctaButton' THEN 'Commencer gratuitement'
        WHEN 'footerProduct' THEN 'Produit'
        WHEN 'footerProductFeatures' THEN 'Fonctionnalités'
        WHEN 'footerProductPricing' THEN 'Tarifs'
        WHEN 'footerCompany' THEN 'Entreprise'
        WHEN 'footerCompanyAbout' THEN 'À propos'
        WHEN 'footerCompanyContact' THEN 'Contact'
        WHEN 'footerResources' THEN 'Ressources'
        WHEN 'footerResourcesDocs' THEN 'Documentation'
        WHEN 'footerResourcesAPI' THEN 'API'
        WHEN 'footerLegal' THEN 'Légal'
        WHEN 'footerLegalPrivacy' THEN 'Confidentialité'
        WHEN 'footerLegalTerms' THEN 'Conditions'
        WHEN 'footerCopyright' THEN '© 2026 CodeReview. Tous droits réservés.'
    END
FROM translation_keys tk
ON CONFLICT (language_id, translation_key_id) DO NOTHING;

-- Traductions anglaises
INSERT INTO translations (language_id, translation_key_id, value)
SELECT 
    (SELECT id FROM languages WHERE code = 'en'),
    tk.id,
    CASE tk.key_name
        WHEN 'features' THEN 'Features'
        WHEN 'pricing' THEN 'Pricing'
        WHEN 'docs' THEN 'Documentation'
        WHEN 'start' THEN 'Get Started'
        WHEN 'hero' THEN 'Code Review,'
        WHEN 'heroHighlight' THEN 'Instantly'
        WHEN 'heroDesc' THEN 'Powered by AI that understands your code. Detect errors, improve quality, and generate documentation automatically.'
        WHEN 'tryFree' THEN 'Try for Free'
        WHEN 'uploadCode' THEN 'Upload File'
        WHEN 'pasteCode' THEN 'Paste Code'
        WHEN 'uploadImage' THEN 'Image'
        WHEN 'pasteCodeHere' THEN 'Paste your code here...'
        WHEN 'selectLanguage' THEN 'Select Language'
        WHEN 'analyze' THEN 'Analyze'
        WHEN 'clear' THEN 'Clear'
        WHEN 'uploadImageHere' THEN 'Upload image here'
        WHEN 'dropHere' THEN 'Drop your file here'
        WHEN 'analyzing' THEN 'Analyzing...'
        WHEN 'analysisComplete' THEN 'Analysis Complete'
        WHEN 'qualityScore' THEN 'Quality Score'
        WHEN 'improvements' THEN 'Improvements'
        WHEN 'smells' THEN 'Code Smells'
        WHEN 'documentation' THEN 'Documentation'
        WHEN 'featuresTitle' THEN 'Thousands of tools in one'
        WHEN 'featuresDesc' THEN 'CodeReview automatically analyzes your code and provides high-quality suggestions for all programming languages.'
        WHEN 'featureMultiLang' THEN 'Multi-languages'
        WHEN 'featureMultiLangDesc' THEN '20+ languages supported'
        WHEN 'featureBugDetection' THEN 'Bug Detection'
        WHEN 'featureBugDetectionDesc' THEN 'Find hidden errors'
        WHEN 'featureAutoDocs' THEN 'Auto-docs'
        WHEN 'featureAutoDocsDesc' THEN 'Automatic documentation'
        WHEN 'featureSecurity' THEN 'Security'
        WHEN 'featureSecurityDesc' THEN 'Vulnerability analysis'
        WHEN 'featureOptimization' THEN 'Optimization'
        WHEN 'featureOptimizationDesc' THEN 'Improved performance'
        WHEN 'featureMetrics' THEN 'Metrics'
        WHEN 'featureMetricsDesc' THEN 'Quality tracking'
        WHEN 'featureSpeed' THEN 'Ultra-fast'
        WHEN 'featureSpeedDesc' THEN 'Results in < 5s'
        WHEN 'featureCollaboration' THEN 'Collaboration'
        WHEN 'featureCollaborationDesc' THEN 'Easy teamwork'
        WHEN 'stat1Number' THEN '2000+'
        WHEN 'stat1Label' THEN 'AI Tools'
        WHEN 'stat2Number' THEN '10M+'
        WHEN 'stat2Label' THEN 'Analyses'
        WHEN 'stat3Number' THEN '100+'
        WHEN 'stat3Label' THEN 'Languages'
        WHEN 'stat4Number' THEN '24/7'
        WHEN 'stat4Label' THEN 'Available'
        WHEN 'ctaTitle' THEN 'Ready to transform your code?'
        WHEN 'ctaDesc' THEN 'Join thousands of developers using CodeReview to write better code.'
        WHEN 'ctaButton' THEN 'Get Started Free'
        WHEN 'footerProduct' THEN 'Product'
        WHEN 'footerProductFeatures' THEN 'Features'
        WHEN 'footerProductPricing' THEN 'Pricing'
        WHEN 'footerCompany' THEN 'Company'
        WHEN 'footerCompanyAbout' THEN 'About'
        WHEN 'footerCompanyContact' THEN 'Contact'
        WHEN 'footerResources' THEN 'Resources'
        WHEN 'footerResourcesDocs' THEN 'Documentation'
        WHEN 'footerResourcesAPI' THEN 'API'
        WHEN 'footerLegal' THEN 'Legal'
        WHEN 'footerLegalPrivacy' THEN 'Privacy'
        WHEN 'footerLegalTerms' THEN 'Terms'
        WHEN 'footerCopyright' THEN '© 2026 CodeReview. All rights reserved.'
    END
FROM translation_keys tk
ON CONFLICT (language_id, translation_key_id) DO NOTHING;

-- Traductions arabes
INSERT INTO translations (language_id, translation_key_id, value)
SELECT 
    (SELECT id FROM languages WHERE code = 'ar'),
    tk.id,
    CASE tk.key_name
        WHEN 'features' THEN 'المميزات'
        WHEN 'pricing' THEN 'الأسعار'
        WHEN 'docs' THEN 'التوثيق'
        WHEN 'start' THEN 'ابدأ'
        WHEN 'hero' THEN 'مراجعة الكود،'
        WHEN 'heroHighlight' THEN 'فوراً'
        WHEN 'heroDesc' THEN 'مدعوم بالذكاء الاصطناعي الذي يفهم الكود الخاص بك. اكتشف الأخطاء، حسّن الجودة، وأنشئ التوثيق تلقائياً.'
        WHEN 'tryFree' THEN 'جرب مجاناً'
        WHEN 'uploadCode' THEN 'رفع ملف'
        WHEN 'pasteCode' THEN 'لصق الكود'
        WHEN 'uploadImage' THEN 'صورة'
        WHEN 'pasteCodeHere' THEN 'الصق الكود هنا...'
        WHEN 'selectLanguage' THEN 'اختر اللغة'
        WHEN 'analyze' THEN 'تحليل'
        WHEN 'clear' THEN 'مسح'
        WHEN 'uploadImageHere' THEN 'تحميل صورة هنا'
        WHEN 'dropHere' THEN 'أسقط ملفك هنا'
        WHEN 'analyzing' THEN 'جاري التحليل...'
        WHEN 'analysisComplete' THEN 'اكتمل التحليل'
        WHEN 'qualityScore' THEN 'نقاط الجودة'
        WHEN 'improvements' THEN 'تحسينات'
        WHEN 'smells' THEN 'مشاكل الكود'
        WHEN 'documentation' THEN 'التوثيق'
        WHEN 'featuresTitle' THEN 'آلاف الأدوات في واحد'
        WHEN 'featuresDesc' THEN 'يقوم CodeReview بتحليل الكود الخاص بك تلقائياً ويوفر اقتراحات عالية الجودة لجميع لغات البرمجة.'
        WHEN 'featureMultiLang' THEN 'متعدد اللغات'
        WHEN 'featureMultiLangDesc' THEN '20+ لغة مدعومة'
        WHEN 'featureBugDetection' THEN 'اكتشاف الأخطاء'
        WHEN 'featureBugDetectionDesc' THEN 'اعثر على الأخطاء المخفية'
        WHEN 'featureAutoDocs' THEN 'توثيق تلقائي'
        WHEN 'featureAutoDocsDesc' THEN 'توثيق تلقائي'
        WHEN 'featureSecurity' THEN 'الأمان'
        WHEN 'featureSecurityDesc' THEN 'تحليل الثغرات'
        WHEN 'featureOptimization' THEN 'التحسين'
        WHEN 'featureOptimizationDesc' THEN 'أداء محسّن'
        WHEN 'featureMetrics' THEN 'المقاييس'
        WHEN 'featureMetricsDesc' THEN 'تتبع الجودة'
        WHEN 'featureSpeed' THEN 'سريع جداً'
        WHEN 'featureSpeedDesc' THEN 'النتائج في < 5 ثوانٍ'
        WHEN 'featureCollaboration' THEN 'التعاون'
        WHEN 'featureCollaborationDesc' THEN 'عمل جماعي سهل'
        WHEN 'stat1Number' THEN '2000+'
        WHEN 'stat1Label' THEN 'أدوات الذكاء الاصطناعي'
        WHEN 'stat2Number' THEN '10M+'
        WHEN 'stat2Label' THEN 'تحليلات'
        WHEN 'stat3Number' THEN '100+'
        WHEN 'stat3Label' THEN 'لغات'
        WHEN 'stat4Number' THEN '24/7'
        WHEN 'stat4Label' THEN 'متاح'
        WHEN 'ctaTitle' THEN 'هل أنت مستعد لتحويل الكود الخاص بك؟'
        WHEN 'ctaDesc' THEN 'انضم إلى آلاف المطورين الذين يستخدمون CodeReview لكتابة كود أفضل.'
        WHEN 'ctaButton' THEN 'ابدأ مجاناً'
        WHEN 'footerProduct' THEN 'المنتج'
        WHEN 'footerProductFeatures' THEN 'المميزات'
        WHEN 'footerProductPricing' THEN 'الأسعار'
        WHEN 'footerCompany' THEN 'الشركة'
        WHEN 'footerCompanyAbout' THEN 'حول'
        WHEN 'footerCompanyContact' THEN 'اتصل'
        WHEN 'footerResources' THEN 'الموارد'
        WHEN 'footerResourcesDocs' THEN 'التوثيق'
        WHEN 'footerResourcesAPI' THEN 'API'
        WHEN 'footerLegal' THEN 'القانوني'
        WHEN 'footerLegalPrivacy' THEN 'الخصوصية'
        WHEN 'footerLegalTerms' THEN 'الشروط'
        WHEN 'footerCopyright' THEN '© 2026 CodeReview. جميع الحقوق محفوظة.'
    END
FROM translation_keys tk
ON CONFLICT (language_id, translation_key_id) DO NOTHING;