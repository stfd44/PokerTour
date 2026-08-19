// src/components/Login.tsx
import React, { useEffect } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { user, setUser, requiresNickname } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !requiresNickname) {
      navigate('/');
    }
  }, [user, requiresNickname, navigate]);

  const handleGoogleSignIn = async () => {
    const userConnected = await signInWithGoogle();
    if(userConnected){
      setUser(userConnected);
    }
  };

  return (
    <div className="page-enter flex flex-col items-center justify-center min-h-screen px-4">
      <div className="glass-card w-full max-w-md px-8 py-12 text-center">
        <h1 className="mb-2 text-4xl font-bold text-white">PokerTour</h1>
        <p className="mb-8 text-gray-300">La table est prête. Rejoignez votre tournoi.</p>
        <button
          onClick={handleGoogleSignIn}
          className="btn btn-gold rounded-full px-6 py-3"
        >
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
};

export default Login;
