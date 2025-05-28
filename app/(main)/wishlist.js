import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

const TMDB_API_KEY = '09b94becbd1cfef2d186d4e8e9b32a25';

export default function WishlistScreen() {
  const [wishlist, setWishlist] = useState([]);
  const [loadingWhere, setLoadingWhere] = useState(false);

  // Recharge la wishlist à chaque focus sur l'écran
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('wishlist').then(data => {
        if (data) setWishlist(JSON.parse(data));
        else setWishlist([]);
      });
    }, [])
  );

  // Supprimer un film
  const removeFromWishlist = async (id) => {
    const newWishlist = wishlist.filter(f => f.id !== id);
    setWishlist(newWishlist);
    await AsyncStorage.setItem('wishlist', JSON.stringify(newWishlist));
    Alert.alert('Supprimé de ta wishlist !');
  };

  // Récupère les plateformes de streaming d'un film via TMDB
  async function getStreamingPlatforms(movieId) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
      );
      const data = await res.json();
      const platforms = data.results?.FR?.flatrate?.map(p => p.provider_name) || [];
      return platforms;
    } catch (e) {
      return [];
    }
  }

  // Récupère la liste des plateformes où l'utilisateur est abonné
  async function getUserAbos() {
    const data = await AsyncStorage.getItem('abos');
    return data ? JSON.parse(data).map(a => a.plateforme) : [];
  }

  const PLATFORM_MAPPING = {
  "Netflix": ["Netflix"],
  "Disney+": ["Disney Plus", "Disney+"],
  "Prime Video": ["Amazon Prime Video", "Prime Video"],
  "Apple TV+": ["Apple TV+"],
  "Paramount+": ["Paramount+", "Paramount Plus"]
};

async function handleWhereToWatch() {
  if (loadingWhere) return;
  setLoadingWhere(true);

  try {
    if (!wishlist.length) {
      Alert.alert('Ta wishlist est vide !');
      setLoadingWhere(false);
      return;
    }

    const abos = await getUserAbos();

    const results = await Promise.all(wishlist.map(async (movie) => {
      const platforms = await getStreamingPlatforms(movie.id);
      return { movie, platforms };
    }));

    let resultMsg = '';
    results.forEach(({ movie, platforms }) => {
      if (platforms.length === 0) {
        resultMsg += `\n${movie.title} : non dispo en streaming en France\n`;
      } else {
        resultMsg += `\n${movie.title} :\n`;
        // Pour chaque plateforme de TMDB, vérifie si user abonné (avec mapping)
        platforms.forEach(p => {
          // Match plateforme user ?
          let userAbonne = false;
          for (const myPlatform of abos) {
            const possibles = PLATFORM_MAPPING[myPlatform] || [];
            if (possibles.map(x => x.toLowerCase()).includes(p.toLowerCase())) {
              userAbonne = true;
              break;
            }
          }
          resultMsg += `  • ${p}  ${userAbonne ? '✅ abonné' : '❌ non abonné'}\n`;
        });
      }
    });

    Alert.alert('Où regarder ?', resultMsg.trim());
  } catch (err) {
    Alert.alert('Erreur', 'Impossible de récupérer les plateformes.');
  }

  setLoadingWhere(false);
}


  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={wishlist}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            {item.poster_path ? (
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w92${item.poster_path}` }}
                style={styles.poster}
              />
            ) : (
              <View style={styles.noPoster}><Text>?</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.year}>{item.release_date ? item.release_date.slice(0, 4) : 'Année ?'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: 'red' }]}
              onPress={() => removeFromWishlist(item.id)}
            >
              <Text style={{ color: 'white' }}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text>Ta wishlist est vide !</Text>}
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#34B6FF",
          padding: 16,
          borderRadius: 10,
          alignItems: 'center',
          marginTop: 18
        }}
        onPress={handleWhereToWatch}
        disabled={loadingWhere}
      >
        {loadingWhere ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Où regarder ?</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#f7f7f7', borderRadius: 10, padding: 10 },
  poster: { width: 50, height: 75, borderRadius: 4, marginRight: 10 },
  noPoster: { width: 50, height: 75, backgroundColor: '#ddd', borderRadius: 4, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: 'bold', fontSize: 16 },
  year: { color: '#888' },
  addButton: { backgroundColor: '#0d6efd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }
};
