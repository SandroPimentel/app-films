import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { platformIcons } from '../../constants/platformIcons';

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

function getMonthKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function dateToString(d) {
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HomeScreen() {
  const [abos, setAbos] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState([]);
  const [abosData, setAbosData] = useState([]);
  const [fakeToday, setFakeToday] = useState(null);
  const router = useRouter();

  // Debug : Reset onboarding
  const resetAll = async () => {
    await AsyncStorage.clear();
    // Redirige sur la racine, donc plus de tab bar (onboarding/setup)
    router.replace('/');
  };

  useEffect(() => {
    const fetchAbosData = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/SandroPimentel/abosData/main/abosData.json');
        const data = await res.json();
        setAbosData(data);
      } catch (error) {
        alert('Erreur de chargement des plateformes');
      }
    };
    fetchAbosData();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await AsyncStorage.getItem('abos');
      const list = data ? JSON.parse(data) : [];
      setAbos(list);
      const allDates = list.map(a => new Date(a.derniereEcheance));
      if (allDates.length === 0) {
        setVisibleMonths([getMonthKey(currentDate)]);
        return;
      }
      const minDate = new Date(Math.min(...allDates));
      const months = [];
      const now = new Date();
      const first = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 1);
      while (first <= last) {
        months.push(getMonthKey(first));
        first.setMonth(first.getMonth() + 1);
      }
      months.push(getMonthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1)));
      setVisibleMonths(months);
    })();
  }, [currentDate]);

  const currentMonthKey = getMonthKey(currentDate);

  // SIMULATEUR : on utilise fakeToday sinon today réel
  const today = fakeToday || new Date();

  const displayAbos = abos
    .filter((abo) => {
      const date = new Date(abo.derniereEcheance);
      const key = getMonthKey(date);

      if (key === currentMonthKey) return true;
      if (!abo.autoRenew) return false;

      const next = addMonths(date, 1);
      const futureKey = getMonthKey(next);
      return futureKey === currentMonthKey;
    })
    .map((abo) => {
      const plateformeData = abosData.find((p) => p.name === abo.plateforme);
      const planData = plateformeData?.plans.find((p) => p.name === abo.formule);
      const changeDate = planData?.priceChangeDate ? new Date(planData.priceChangeDate) : null;

      const dateEcheance = new Date(abo.derniereEcheance);
      const isCurrentMonth = getMonthKey(dateEcheance) === currentMonthKey;
      const isFuture = getMonthKey(addMonths(dateEcheance, 1)) === currentMonthKey;

      const effectiveDate = isCurrentMonth
        ? dateEcheance
        : isFuture
          ? addMonths(dateEcheance, 1)
          : dateEcheance;

      let appliedPrice = abo.prix;

      if (changeDate && effectiveDate >= changeDate) {
        appliedPrice = planData.price;
      } else if (changeDate && effectiveDate < changeDate && planData.oldPrice) {
        appliedPrice = planData.oldPrice;
      }

      return { ...abo, appliedPrice, dateEcheance };
    });

  const displayTotal = displayAbos.reduce((acc, abo) => acc + parseFloat(abo.appliedPrice || 0), 0);

  const deleteAbo = async (plateforme) => {
    Alert.alert(
      'Supprimer ?',
      `Supprimer l’abonnement ${plateforme} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const newAbos = abos.filter(a => a.plateforme !== plateforme);
            setAbos(newAbos);
            await AsyncStorage.setItem('abos', JSON.stringify(newAbos));
          }
        }
      ]
    );
  };

  const handlePrev = () => setCurrentDate(addMonths(currentDate, -1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <View style={{ flex: 1, backgroundColor: '#181A20', padding: 20 }}>

      {/* Simulateur de date (jour courant) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => setFakeToday(prev => {
            const d = new Date(prev || new Date());
            d.setDate(d.getDate() - 1);
            return d;
          })}
          style={{ marginHorizontal: 8, backgroundColor: "#34B6FF", borderRadius: 5, padding: 6 }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 16 }}>
          Jour simulé : {dateToString(today)}
        </Text>
        <TouchableOpacity
          onPress={() => setFakeToday(prev => {
            const d = new Date(prev || new Date());
            d.setDate(d.getDate() + 1);
            return d;
          })}
          style={{ marginHorizontal: 8, backgroundColor: "#34B6FF", borderRadius: 5, padding: 6 }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>{">"}</Text>
        </TouchableOpacity>
        {fakeToday && (
          <TouchableOpacity
            onPress={() => setFakeToday(null)}
            style={{ marginLeft: 10, backgroundColor: "#888", borderRadius: 5, padding: 6 }}
          >
            <Text style={{ color: "#fff" }}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Debug bouton */}
      <TouchableOpacity
        style={{
          backgroundColor: "#22242B",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          marginBottom: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#34B6FF"
        }}
        onPress={resetAll}
      >
        <Text style={{ color: "#34B6FF", fontWeight: "bold" }}>Debug : Reset onboarding</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <TouchableOpacity onPress={handlePrev} disabled={!visibleMonths.includes(getMonthKey(addMonths(currentDate, -1)))}>
          <Text style={{ fontSize: 24, color: '#34B6FF' }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginHorizontal: 12 }}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={handleNext} disabled={!visibleMonths.includes(getMonthKey(addMonths(currentDate, 1)))}>
          <Text style={{ fontSize: 24, color: '#34B6FF' }}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: '#34B6FF', fontSize: 18, marginBottom: 10 }}>
        Total : {displayTotal.toFixed(2)} €
      </Text>

      {/* Bouton ajouter */}
      <TouchableOpacity
        style={{
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#34B6FF',
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          marginBottom: 14,
        }}
        onPress={() => router.push('/setup')}
      >
        <Text style={{ color: '#34B6FF', fontWeight: 'bold' }}>Ajouter un abonnement</Text>
      </TouchableOpacity>

      <ScrollView>
        {displayAbos.map((abo, i) => {
          const date = abo.dateEcheance;
          const isCurrentMonth = getMonthKey(date) === currentMonthKey;
          const isFuture = getMonthKey(addMonths(date, 1)) === currentMonthKey;
          const isGrayed = !isCurrentMonth;

          // LOGIQUE CONTOUR BLEU : échéance == aujourd'hui
          const dayToday = today.getDate();
          const monthToday = today.getMonth();
          const yearToday = today.getFullYear();

          // L'échéance (prochaine) = au today
          const isEcheanceToday = abo.autoRenew && isFuture &&
            addMonths(date, 1).getDate() === dayToday &&
            addMonths(date, 1).getMonth() === monthToday &&
            addMonths(date, 1).getFullYear() === yearToday;

          const day = date.getDate().toString().padStart(2, '0');
          const nextDate = addMonths(date, 1);
          const nextDay = nextDate.getDate().toString().padStart(2, '0');
          const nextMonth = MONTHS[nextDate.getMonth()];
          const nextYear = nextDate.getFullYear();

          return (
            <View
              key={i}
              style={{
                backgroundColor: isGrayed ? '#1B1D24' : '#22242B',
                borderColor: isEcheanceToday ? '#0094FF' : (isGrayed ? '#333642' : '#34B6FF'),
                borderWidth: 2,
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Image
                source={platformIcons[abo.plateforme]}
                style={{ width: 32, height: 32, backgroundColor: '#fff', borderRadius: 6 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{abo.plateforme}</Text>
                <Text style={{ color: '#B3B3B3', fontSize: 15, marginTop: 2 }}>
                  {abo.gratuit
                    ? 'Prêté/Gratuit'
                    : `${abo.formule} — ${parseFloat(abo.appliedPrice).toFixed(2)} €/mois`}
                </Text>

                {isCurrentMonth && (
                  <Text style={{ color: '#34B6FF', marginTop: 6 }}>
                    Abonnement payé le {day} {MONTHS[date.getMonth()]} {date.getFullYear()}
                  </Text>
                )}

                {abo.autoRenew && isFuture && (
                  <Text style={{ color: '#34B6FF', marginTop: 6 }}>
                    Prochaine échéance le {nextDay} {nextMonth} {nextYear}
                  </Text>
                )}
                {isEcheanceToday && (
                  <Text style={{ color: '#0094FF', fontWeight: 'bold', marginTop: 4 }}>
                    👉 Échéance aujourd'hui !
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#D04444',
                  padding: 10,
                  borderRadius: 8,
                  marginLeft: 6,
                }}
                onPress={() => deleteAbo(abo.plateforme)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>X</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
