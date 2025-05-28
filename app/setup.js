import { useRouter } from 'expo-router';
import SetupAbosScreen from './SetupAbosScreen';

export default function SetupScreen() {
  const router = useRouter();

  return (
    <SetupAbosScreen
      onFinish={() => router.replace('/(main)/home')}
      // Passe aussi existingAbos si tu veux pré-remplir
    />
  );
}
