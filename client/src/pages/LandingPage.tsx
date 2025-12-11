import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';
import styles from './LandingPage.module.css';

const LandingPage = () => (
  <div className={styles.container}>
    <section className={styles.hero}>
      <div>
        <p className={styles.tag}>Pokémon Soul Lock Companion</p>
        <h1>Coordinate your linked run in real time.</h1>
        <p className={styles.lead}>
          Launch a room instantly, let each trainer choose Omega Ruby or Alpha Sapphire inside, and keep every faint in sync with your partner.
        </p>
      </div>
    </section>
    <section className={styles.forms}>
      <CreateRoomForm />
      <JoinRoomForm />
    </section>
  </div>
);

export default LandingPage;
