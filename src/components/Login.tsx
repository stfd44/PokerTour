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
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md rounded-2xl border border-poker-gold/30 bg-white/95 px-8 py-12 text-center shadow-2xl backdrop-blur-sm">
        <h1 className="mb-2 text-4xl font-bold text-poker-black">PokerTour</h1>
        <p className="mb-8 text-gray-600">La table est prête. Rejoignez votre tournoi.</p>
        <button
          onClick={handleGoogleSignIn}
          className="rounded-full bg-poker-gold px-6 py-3 font-bold text-white shadow-lg transition duration-300 ease-in-out hover:bg-poker-dark"
        >
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
};

export default Login;
