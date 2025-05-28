import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useState } from 'react';
import { Alert, Button, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TMDB_API_KEY = '09b94becbd1cfef2d186d4e8e9b32a25';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchMovies = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(query)}`
      );
      setResults(res.data.results);
    } catch (e) {
      alert('Erreur lors de la recherche');
    }
    setLoading(false);
  };

  const addToWishlist = async (movie) => {
    try {
      // Récupère la wishlist actuelle
      const data = await AsyncStorage.getItem('wishlist');
      const list = data ? JSON.parse(data) : [];
      if (list.some(m => m.id === movie.id)) {
        Alert.alert('Déjà dans ta wishlist !');
        return;
      }
      const newList = [...list, movie];
      await AsyncStorage.setItem('wishlist', JSON.stringify(newList));
      Alert.alert('Ajouté à ta wishlist !');
    } catch (err) {
      Alert.alert('Erreur lors de l\'ajout à la wishlist');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Cherche un film..."
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={searchMovies}
      />
      <Button title="Rechercher" onPress={searchMovies} disabled={loading} />
      <FlatList
        data={results}
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
              style={styles.addButton}
              onPress={() => addToWishlist(item)}
            >
              <Text style={{ color: 'white' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#f7f7f7', borderRadius: 10, padding: 10 },
  poster: { width: 50, height: 75, borderRadius: 4, marginRight: 10 },
  noPoster: { width: 50, height: 75, backgroundColor: '#ddd', borderRadius: 4, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: 'bold', fontSize: 16 },
  year: { color: '#888' },
  addButton: { backgroundColor: '#0d6efd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }
});
