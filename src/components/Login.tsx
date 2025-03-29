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
    <div className="flex flex-col items-center justify-center h-screen bg-poker-light">
      <h1 className="text-4xl font-bold text-poker-black mb-8">PokerTour</h1>
      <button
        onClick={handleGoogleSignIn}
        className="bg-poker-gold hover:bg-poker-dark text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out"
      >
        Se connecter avec Google
      </button>
    </div>
  );
};

export default Login;
