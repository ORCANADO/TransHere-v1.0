export type Language = 'en' | 'es';

export const DICTIONARY = {
  en: {
    nav: {
      near: 'Near You',
      new: 'New',
      favorites: 'Favorites',
    },
    header: {
      modelsNear: 'Models Near',
      unknownCity: 'You',
    },
    scarcity: {
      title: "That's all for now!",
      subtitle: 'We are onboarding more models in',
      cta: 'Check back tomorrow',
    },
    buttons: {
      chat: 'Chat with',
      chatWithMe: 'Chat with Me',
      unlock: 'Unlock Exclusive Content',
    },
    tags: {},
  },
  es: {
    nav: {
      near: 'Cerca de Ti',
      new: 'Nuevas',
      favorites: 'Favoritas',
    },
    header: {
      modelsNear: 'Modelos en',
      unknownCity: 'Ti',
    },
    scarcity: {
      title: '¡Eso es todo por ahora!',
      subtitle: 'Estamos verificando más modelos en',
      cta: 'Vuelve mañana',
    },
    buttons: {
      chat: 'Chatear con',
      chatWithMe: 'Chatear Conmigo',
      unlock: 'Desbloquear Contenido',
    },
    tags: {
      'Latina': 'Latina',
      'Blonde': 'Rubia',
      'Brunette': 'Morena',
      'Petite': 'Petite',
      'Curvy': 'Curvy',
      'Tattooed': 'Tatuada',
      'Verified': 'Verificada',
      'New': 'Nueva',
    },
  },
};

export function getLanguage(countryCode: string): Language {
  const spanishCountries = [
    'CO',
    'MX',
    'ES',
    'AR',
    'PE',
    'CL',
    'VE',
    'EC',
    'GT',
    'CU',
    'BO',
    'DO',
    'HN',
    'PY',
    'SV',
    'NI',
    'CR',
    'PA',
    'UY',
  ];
  return spanishCountries.includes(countryCode.toUpperCase()) ? 'es' : 'en';
}

export function translateTags(tags: string[], lang: Language): string[] {
  const dict = DICTIONARY[lang].tags as Record<string, string> || {};
  return tags.map(tag => dict[tag] || tag); // Fallback to original if no translation found
}

