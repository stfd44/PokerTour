import React from 'react';
import { User } from 'firebase/auth';

interface ProfileProps {
  user: User | null;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  return (
    <div>
      <h1>Profile</h1>
    </div>
  );
};

export default Profile;
