// src/components/Login.tsx
import React from 'react';
import { signInWithGoogle } from '../lib/firebase'; // Import the function

const Login: React.FC = () => {
  const handleGoogleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      console.log('User successfully logged in:', user);
      // Handle successful login, e.g., redirect the user
    } else {
      console.error('Login failed.');
      // Handle login failure
    }
  };

  return (
    <div>
      <button id="googleSignInButton" onClick={handleGoogleSignIn}>
        Sign in with Google
      </button>
      {/* Other login elements */}
    </div>
  );
};

export default Login;
