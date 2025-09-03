
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'bn' | 'gu' | 'mr' | 'pa';

export interface TranslationKeys {
  // Navigation
  'nav.home': string;
  'nav.search': string;
  'nav.create': string;
  'nav.profile': string;
  
  // Common
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.edit': string;
  'common.view': string;
  'common.close': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  
  // Authentication
  'auth.login': string;
  'auth.logout': string;
  'auth.register': string;
  'auth.email': string;
  'auth.password': string;
  'auth.confirm_password': string;
  
  // Food & Restaurant
  'food.order_now': string;
  'food.add_to_cart': string;
  'food.view_menu': string;
  'food.rating': string;
  'food.delivery_time': string;
  'food.price': string;
  'food.cuisine': string;
  'food.vegetarian': string;
  'food.non_vegetarian': string;
  'food.vegan': string;
  
  // Orders
  'order.placed': string;
  'order.confirmed': string;
  'order.preparing': string;
  'order.ready': string;
  'order.picked_up': string;
  'order.delivered': string;
  'order.cancelled': string;
  'order.track': string;
  'order.total': string;
  'order.subtotal': string;
  'order.delivery_fee': string;
  'order.taxes': string;
  
  // Video Content
  'video.like': string;
  'video.comment': string;
  'video.share': string;
  'video.views': string;
  'video.upload': string;
  'video.title': string;
  'video.description': string;
  'video.category': string;
  
  // Search
  'search.placeholder': string;
  'search.no_results': string;
  'search.filters': string;
  'search.sort_by': string;
  'search.price_range': string;
  'search.distance': string;
  'search.rating': string;
  'search.cuisine_type': string;
  
  // Delivery
  'delivery.partner': string;
  'delivery.estimated_time': string;
  'delivery.tracking': string;
  'delivery.location': string;
  'delivery.contact': string;
  'delivery.on_the_way': string;
  'delivery.arrived': string;
}

const translations: Record<Language, TranslationKeys> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.create': 'Create',
    'nav.profile': 'Profile',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    
    // Authentication
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    
    // Food & Restaurant
    'food.order_now': 'Order Now',
    'food.add_to_cart': 'Add to Cart',
    'food.view_menu': 'View Menu',
    'food.rating': 'Rating',
    'food.delivery_time': 'Delivery Time',
    'food.price': 'Price',
    'food.cuisine': 'Cuisine',
    'food.vegetarian': 'Vegetarian',
    'food.non_vegetarian': 'Non-Vegetarian',
    'food.vegan': 'Vegan',
    
    // Orders
    'order.placed': 'Order Placed',
    'order.confirmed': 'Confirmed',
    'order.preparing': 'Preparing',
    'order.ready': 'Ready',
    'order.picked_up': 'Picked Up',
    'order.delivered': 'Delivered',
    'order.cancelled': 'Cancelled',
    'order.track': 'Track Order',
    'order.total': 'Total',
    'order.subtotal': 'Subtotal',
    'order.delivery_fee': 'Delivery Fee',
    'order.taxes': 'Taxes',
    
    // Video Content
    'video.like': 'Like',
    'video.comment': 'Comment',
    'video.share': 'Share',
    'video.views': 'Views',
    'video.upload': 'Upload Video',
    'video.title': 'Title',
    'video.description': 'Description',
    'video.category': 'Category',
    
    // Search
    'search.placeholder': 'Search for restaurants, dishes, or creators...',
    'search.no_results': 'No results found',
    'search.filters': 'Filters',
    'search.sort_by': 'Sort By',
    'search.price_range': 'Price Range',
    'search.distance': 'Distance',
    'search.rating': 'Rating',
    'search.cuisine_type': 'Cuisine Type',
    
    // Delivery
    'delivery.partner': 'Delivery Partner',
    'delivery.estimated_time': 'Estimated Time',
    'delivery.tracking': 'Tracking',
    'delivery.location': 'Location',
    'delivery.contact': 'Contact',
    'delivery.on_the_way': 'On the way',
    'delivery.arrived': 'Arrived'
  },
  
  hi: {
    // Navigation
    'nav.home': 'होम',
    'nav.search': 'खोजें',
    'nav.create': 'बनाएं',
    'nav.profile': 'प्रोफाइल',
    
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'त्रुटि',
    'common.success': 'सफलता',
    'common.cancel': 'रद्द करें',
    'common.save': 'सेव करें',
    'common.delete': 'मिटाएं',
    'common.edit': 'संपादित करें',
    'common.view': 'देखें',
    'common.close': 'बंद करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.previous': 'पिछला',
    
    // Authentication
    'auth.login': 'लॉगिन',
    'auth.logout': 'लॉगआउट',
    'auth.register': 'रजिस्टर',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.confirm_password': 'पासवर्ड की पुष्टि करें',
    
    // Food & Restaurant
    'food.order_now': 'अभी ऑर्डर करें',
    'food.add_to_cart': 'कार्ट में जोड़ें',
    'food.view_menu': 'मेन्यू देखें',
    'food.rating': 'रेटिंग',
    'food.delivery_time': 'डिलीवरी समय',
    'food.price': 'कीमत',
    'food.cuisine': 'व्यंजन',
    'food.vegetarian': 'शाकाहारी',
    'food.non_vegetarian': 'मांसाहारी',
    'food.vegan': 'वीगन',
    
    // Orders
    'order.placed': 'ऑर्डर दिया गया',
    'order.confirmed': 'पुष्टि की गई',
    'order.preparing': 'तैयार हो रहा है',
    'order.ready': 'तैयार',
    'order.picked_up': 'उठाया गया',
    'order.delivered': 'डिलीवर किया गया',
    'order.cancelled': 'रद्द किया गया',
    'order.track': 'ऑर्डर ट्रैक करें',
    'order.total': 'कुल',
    'order.subtotal': 'उप योग',
    'order.delivery_fee': 'डिलीवरी शुल्क',
    'order.taxes': 'कर',
    
    // Video Content
    'video.like': 'लाइक',
    'video.comment': 'टिप्पणी',
    'video.share': 'शेयर',
    'video.views': 'व्यूज़',
    'video.upload': 'वीडियो अपलोड',
    'video.title': 'शीर्षक',
    'video.description': 'विवरण',
    'video.category': 'श्रेणी',
    
    // Search
    'search.placeholder': 'रेस्टोरेंट, व्यंजन या क्रिएटर खोजें...',
    'search.no_results': 'कोई परिणाम नहीं मिला',
    'search.filters': 'फिल्टर',
    'search.sort_by': 'इसके अनुसार क्रमबद्ध करें',
    'search.price_range': 'मूल्य सीमा',
    'search.distance': 'दूरी',
    'search.rating': 'रेटिंग',
    'search.cuisine_type': 'व्यंजन प्रकार',
    
    // Delivery
    'delivery.partner': 'डिलीवरी पार्टनर',
    'delivery.estimated_time': 'अनुमानित समय',
    'delivery.tracking': 'ट्रैकिंग',
    'delivery.location': 'स्थान',
    'delivery.contact': 'संपर्क',
    'delivery.on_the_way': 'रास्ते में',
    'delivery.arrived': 'पहुंच गया'
  },
  
  // Add other languages with similar structure
  te: {
    'nav.home': 'హోమ్',
    'nav.search': 'వెతుకు',
    'nav.create': 'సృష్టించు',
    'nav.profile': 'ప్రొఫైల్',
    'common.loading': 'లోడ్ అవుతోంది...',
    'food.order_now': 'ఇప్పుడే ఆర్డర్ చేయండి',
    'search.placeholder': 'రెస్టారెంట్లు, వంటకాలు లేదా క్రియేటర్లను వెతకండి...',
    // ... (rest of Telugu translations)
  } as TranslationKeys,
  
  ta: {
    'nav.home': 'முகப்பு',
    'nav.search': 'தேடுக',
    'nav.create': 'உருவாக்கு',
    'nav.profile': 'சுயவிவரம்',
    'common.loading': 'ஏற்றுகிறது...',
    'food.order_now': 'இப்போது ஆர்டர் செய்யுங்கள்',
    'search.placeholder': 'உணவகங்கள், உணவுகள் அல்லது படைப்பாளர்களைத் தேடுங்கள்...',
    // ... (rest of Tamil translations)
  } as TranslationKeys,
  
  // Add placeholder translations for other languages
  kn: {} as TranslationKeys,
  ml: {} as TranslationKeys,
  bn: {} as TranslationKeys,
  gu: {} as TranslationKeys,
  mr: {} as TranslationKeys,
  pa: {} as TranslationKeys,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  languages: { code: Language; name: string; nativeName: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te' as Language, name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta' as Language, name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn' as Language, name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml' as Language, name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn' as Language, name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu' as Language, name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr' as Language, name: 'Marathi', nativeName: 'मराठी' },
  { code: 'pa' as Language, name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof TranslationKeys): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};
