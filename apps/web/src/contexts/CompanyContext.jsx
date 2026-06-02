import React, { createContext, useContext, useState } from 'react';

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState('torres-tech');

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
};