import { Button, Text, View } from 'react-native';

export default function OnboardingScreen({ onDone }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 18 }}>
        Bienvenue !
      </Text>
      <Text style={{ color: '#B3B3B3', fontSize: 18, marginBottom: 38, textAlign: 'center' }}>
        Gère facilement tes abonnements streaming. On commence ?
      </Text>
      <Button title="Commencer" onPress={onDone} color="#34B6FF" />
    </View>
  );
}
