import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { platformIcons } from '../constants/platformIcons';


const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function getMonthKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export default function HomeScreen({ goToSetup }) {
  const [abos, setAbos] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState([]);
  const [abosData, setAbosData] = useState([]);

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
  }, []);

  const currentMonthKey = getMonthKey(currentDate);

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

      // Détermine la date effective à laquelle s'applique le prix
      const effectiveDate = isCurrentMonth
        ? dateEcheance
        : isFuture
          ? addMonths(dateEcheance, 1)
          : dateEcheance;

      let appliedPrice = abo.prix;

      // Vérifie s'il faut mettre à jour le prix selon la date de changement
      if (changeDate && effectiveDate >= changeDate) {
        appliedPrice = planData.price;
      } else if (changeDate && effectiveDate < changeDate && planData.oldPrice) {
        appliedPrice = planData.oldPrice;
      }

      return { ...abo, appliedPrice };
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
        onPress={goToSetup}
      >
        <Text style={{ color: '#34B6FF', fontWeight: 'bold' }}>Ajouter un abonnement</Text>
      </TouchableOpacity>

      <ScrollView>
        {displayAbos.map((abo, i) => {
          const date = new Date(abo.derniereEcheance);
          const isCurrentMonth = getMonthKey(date) === currentMonthKey;
          const isFuture = getMonthKey(addMonths(date, 1)) === currentMonthKey;
          const isGrayed = !isCurrentMonth;

          const day = date.getDate().toString().padStart(2, '0');
          const currentMonth = MONTHS[currentDate.getMonth()];
          const currentYear = currentDate.getFullYear();

          const nextDate = addMonths(date, 1);
          const nextDay = nextDate.getDate().toString().padStart(2, '0');
          const nextMonth = MONTHS[nextDate.getMonth()];
          const nextYear = nextDate.getFullYear();

          return (
            <View
              key={i}
              style={{
                backgroundColor: isGrayed ? '#1B1D24' : '#22242B',
                borderColor: isGrayed ? '#333642' : '#34B6FF',
                borderWidth: 1,
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
