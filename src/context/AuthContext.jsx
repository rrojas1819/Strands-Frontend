import { createContext } from 'react';

export const AuthContext = createContext(null);

// Rewards count for header
export const RewardsContext = createContext({
  rewardsCount: 0,
  setRewardsCount: () => {}
});
