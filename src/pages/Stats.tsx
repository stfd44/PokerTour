import React from 'react';
import { User } from 'firebase/auth';

interface StatsProps {
  user: User | null;
}

const Stats: React.FC<StatsProps> = ({ user }) => {
  return (
    <div>
      <h1>Stats</h1>
    </div>
  );
};

export default Stats;
