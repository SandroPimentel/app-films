// SetupAbosScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Modal,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { platformIcons } from '../constants/platformIcons';


const ABOS_URL =
  'https://raw.githubusercontent.com/SandroPimentel/abosData/main/abosData.json';

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function SetupAbosScreen({ onFinish, aboToEdit }) {
  const [abosData, setAbosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abos, setAbos] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [autoRenew, setAutoRenew] = useState(true);
  const [gratuit, setGratuit] = useState(false);

  useEffect(() => {
    const fetchAbosData = async () => {
      try {
        const res = await fetch(ABOS_URL);
        const data = await res.json();
        setAbosData(data);
      } catch {
        alert('Erreur de chargement des plateformes');
      } finally {
        setLoading(false);
      }
    };
    fetchAbosData();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const local = await AsyncStorage.getItem('abos');
      setAbos(local ? JSON.parse(local) : []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (aboToEdit && abosData.length) {
      const plateforme = abosData.find(p => p.name === aboToEdit.plateforme);
      const plan = plateforme?.plans.find(p => p.name === aboToEdit.formule);
      setCurrent(plateforme);
      setSelectedPlan(plan);
      setSelectedDate(new Date(aboToEdit.derniereEcheance));
      setAutoRenew(aboToEdit.autoRenew);
      setGratuit(aboToEdit.gratuit);
    }
  }, [aboToEdit, abosData]);

  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate() + 1);
  const maxDate = today;

  const openSetup = (item) => {
    setCurrent(item);
    setSelectedPlan(null);
    setSelectedDate(today);
    setAutoRenew(true);
    setGratuit(false);
  };

  const closeSetup = () => {
    setCurrent(null);
    if (!aboToEdit) onFinish(abos);
  };

  const validateAbo = async () => {
    const basePlan = current.plans.find((p) => p.name === selectedPlan.name);
    let finalPrice = basePlan.price;

    if (basePlan.oldPrice && basePlan.priceChangeDate) {
      const dateChange = new Date(basePlan.priceChangeDate);
      if (selectedDate < dateChange) {
        finalPrice = basePlan.oldPrice;
      }
    }

    let updatedAbos;

    if (aboToEdit) {
      updatedAbos = abos.map((a) => {
        const date = new Date(a.derniereEcheance);
        if (a.plateforme === current.name && date >= selectedDate) {
          return {
            ...a,
            formule: basePlan.name,
            prix: gratuit ? 0 : parseFloat(finalPrice),
            autoRenew,
            gratuit,
          };
        }
        return a;
      });
    } else {
      updatedAbos = [
        ...abos.filter((a) => a.plateforme !== current.name),
        {
          plateforme: current.name,
          formule: basePlan.name,
          prix: gratuit ? 0 : parseFloat(finalPrice),
          derniereEcheance: selectedDate.toISOString(),
          autoRenew,
          gratuit,
        },
      ];
    }

    setAbos(updatedAbos);
    await AsyncStorage.setItem('abos', JSON.stringify(updatedAbos));
    onFinish(updatedAbos);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#34B6FF" size="large" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#181A20', padding: 16 }}>
      {!aboToEdit && (
        <>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
            Sélectionne tes abonnements
          </Text>

          {abosData.map((item) => {
            const isAlreadyAdded = abos.find((a) => a.plateforme === item.name);
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => openSetup(item)}
                disabled={!!isAlreadyAdded}
                style={{
                  opacity: isAlreadyAdded ? 0.5 : 1,
                  backgroundColor: '#22242B',
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 12,
                  borderColor: '#333642',
                  borderWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Image
                  source={platformIcons[item.name]}
                  style={{ width: 24, height: 24, backgroundColor: '#fff', borderRadius: 4 }}
                />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <Modal visible={!!current || !!aboToEdit} transparent animationType="slide" onRequestClose={closeSetup}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#22242B', padding: 20, width: '90%', borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{current?.name || aboToEdit?.plateforme}</Text>
            <Text style={{ marginTop: 12, color: '#fff' }}>Choisis une formule :</Text>
            {current?.plans.map((plan) => {
              const isSelected = selectedPlan?.name === plan.name;
              const dateChange = plan.priceChangeDate ? new Date(plan.priceChangeDate) : null;
              const showOldPrice = dateChange && plan.oldPrice && dateChange >= minDate && dateChange <= maxDate;

              return (
                <TouchableOpacity
                  key={plan.name}
                  onPress={() => setSelectedPlan(plan)}
                  style={{
                    backgroundColor: isSelected ? '#34B6FF' : '#181A20',
                    padding: 10,
                    borderRadius: 6,
                    marginTop: 8,
                    minHeight: 60,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: isSelected ? '#181A20' : '#fff', fontSize: 16 }}>
                    {plan.name} — {plan.price}€/mois
                    {showOldPrice && ` (avant le ${dateChange.toLocaleDateString()}: ${plan.oldPrice}€)`}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Switch
                value={gratuit}
                onValueChange={setGratuit}
                thumbColor={gratuit ? '#34B6FF' : '#888'}
                trackColor={{ false: '#888', true: '#34B6FF' }}
              />
              <Text style={{ color: '#fff', marginLeft: 8 }}>Prêté/Gratuit</Text>
            </View>

            <Text style={{ color: '#fff', marginTop: 16 }}>Dernier paiement effectué le :</Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(event, date) => date && setSelectedDate(date)}
              minimumDate={minDate}
              maximumDate={maxDate}
              style={{ backgroundColor: '#181A20' }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
              <Switch
                value={autoRenew}
                onValueChange={setAutoRenew}
                thumbColor={autoRenew ? '#34B6FF' : '#888'}
                trackColor={{ false: '#888', true: '#34B6FF' }}
              />
              <Text style={{ color: '#fff', marginLeft: 8 }}>Renouvellement automatique</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button title="Annuler" onPress={closeSetup} color="#888" />
              <Button title="Valider" disabled={!selectedPlan} onPress={validateAbo} color="#34B6FF" />
            </View>
          </View>
        </View>
      </Modal>

      {!aboToEdit && (
        <Button
          title="Terminer et passer au dashboard"
          onPress={() => onFinish(abos)}
          disabled={abos.length === 0}
          color="#34B6FF"
        />
      )}
    </SafeAreaView>
  );
}
