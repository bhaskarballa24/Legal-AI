import React, { createContext, useState } from "react";

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("English");
  const [isTranslating, setIsTranslating] = useState(false);

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === language) return;
    
    setIsTranslating(true);
    // Simulate translation delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLanguage(newLanguage);
    setIsTranslating(false);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};
