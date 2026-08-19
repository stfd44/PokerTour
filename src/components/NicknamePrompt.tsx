import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const NicknamePrompt = () => {
  const [nickname, setNickname] = useState('');
  const { setNickname: saveNickname, clearRequiresNickname } = useAuthStore();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less');
      return;
    }
    try {
      await saveNickname(nickname);
    } catch {
      setError('Failed to save nickname');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-white">Choose Your Nickname</h2>
        <p className="mb-4 text-gray-300">Please choose a nickname to display in the app</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="glass-input w-full mb-2"
            placeholder="Enter your nickname"
            maxLength={20}
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearRequiresNickname}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-blue"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
