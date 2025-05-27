import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import HomeScreen from './HomeScreen';
import OnboardingScreen from './OnboardingScreen';
import SetupAbosScreen from './SetupAbosScreen';

export default function Index() {
  const [screen, setScreen] = useState('loading');
  const [abos, setAbos] = useState([]);
  const [force, setForce] = useState(false);

  useEffect(() => {
    (async () => {
      const seenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      const abosData = await AsyncStorage.getItem('abos');
      setAbos(abosData ? JSON.parse(abosData) : []);
      if (seenOnboarding !== 'true') setScreen('onboarding');
      else if (!abosData) setScreen('setup');
      else setScreen('home');
    })();
  }, [force]);

  const handleFinishOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setScreen('setup');
  };

  const handleFinishSetup = async (abosList) => {
    setAbos(abosList);
    await AsyncStorage.setItem('abos', JSON.stringify(abosList));
    setScreen('home');
  };

  // Bouton debug foncé
  const resetAll = async () => {
    await AsyncStorage.clear();
    setForce(f => !f);
    setScreen('onboarding');
  };

  if (screen === 'loading') return null;
  return (
    <View style={{ flex: 1, backgroundColor: "#181A20" }}>
      <TouchableOpacity
        style={{
          backgroundColor: "#22242B",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          margin: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#34B6FF"
        }}
        onPress={resetAll}
      >
        <Text style={{ color: "#34B6FF", fontWeight: "bold" }}>Debug : Reset onboarding</Text>
      </TouchableOpacity>
      {screen === 'onboarding' && <OnboardingScreen onDone={handleFinishOnboarding} />}
      {screen === 'setup' && <SetupAbosScreen onFinish={handleFinishSetup} existingAbos={abos} />}
      {screen === 'home' && <HomeScreen goToSetup={() => setScreen('setup')} />}
    </View>
  );
}
