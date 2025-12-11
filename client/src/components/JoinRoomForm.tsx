import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JoinRoomForm.module.css';
import { getRoom } from '../api/rooms';

const JoinRoomForm = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomId.trim() || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await getRoom(roomId.trim());
      navigate(`/rooms/${roomId.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3>Join an existing room</h3>
      <p className={styles.subtitle}>Paste the invite link or room code to jump right into the action.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          Room ID
          <input
            className={styles.input}
            placeholder="e.g. 9af31b"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Checking…' : 'Join Room'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default JoinRoomForm;
