import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, buildRoomShareLink } from '../api/rooms';
import styles from './CreateRoomForm.module.css';

const CreateRoomForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { roomId: createdRoomId } = await createRoom();
      setRoomId(createdRoomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRoom = () => {
    if (roomId) {
      navigate(`/rooms/${roomId}`);
    }
  };

  return (
    <div className={styles.card}>
      <h2>Create a Soul Lock Room</h2>
      <p className={styles.subtitle}>
        Spin up a shared space instantly. Each trainer can choose Omega Ruby or Alpha Sapphire once inside the room.
      </p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Room'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {roomId && (
        <div className={styles.createdRoom}>
          <p>Room created! Share this link with your partner:</p>
          <code className={styles.link}>{buildRoomShareLink(roomId)}</code>
          <p className={styles.hint}>Both trainers can pick their game versions from within the room.</p>
          <button type="button" className={styles.openButton} onClick={handleOpenRoom}>
            Open Room
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateRoomForm;
