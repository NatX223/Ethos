import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface UserProfile {
  username: string;
  display_name: string;
  pfp_url: string;
  fid?: string | number;
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  return (
    <UserProfileContext.Provider value={{ userProfile, setUserProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
} 