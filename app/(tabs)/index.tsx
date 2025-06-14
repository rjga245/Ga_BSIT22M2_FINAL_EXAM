import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ------------------- Types -------------------

type PlayerRoute = {
  playerX: string;
  playerO: string;
};

type RootStackParamList = {
  Title: undefined;
  Home: undefined;
  Game: PlayerRoute;
  History: undefined;
};

// ------------------- Stack -------------------

const Stack = createNativeStackNavigator<RootStackParamList>();
const STORAGE_KEY = 'TIC_TAC_TOE_GAMES';

// ------------------- Screens -------------------

const TitleScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'Title'>) => (
  <View style={styles.centered}>
    <Text style={styles.titleBig}>Ascylla</Text>
    <TouchableOpacity
      style={styles.buttonGreen}
      onPress={() => navigation.navigate('Home')}
    >
      <Text style={styles.buttonText}>Enter Players</Text>
    </TouchableOpacity>
  </View>
);

const HomeScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) => {
  const [playerX, setPlayerX] = useState('');
  const [playerO, setPlayerO] = useState('');

  useFocusEffect(
    useCallback(() => {
      setPlayerX('');
      setPlayerO('');
    }, [])
  );

  const startGame = () => {
    if (!playerX.trim() || !playerO.trim()) {
      Alert.alert('Error', 'Enter both names');
      return;
    }
    navigation.navigate('Game', { playerX, playerO });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Player Names</Text>
      <TextInput
        style={styles.input}
        placeholder="Player X"
        value={playerX}
        onChangeText={setPlayerX}
      />
      <TextInput
        style={styles.input}
        placeholder="Player O"
        value={playerO}
        onChangeText={setPlayerO}
      />
      <TouchableOpacity style={styles.button} onPress={startGame}>
        <Text style={styles.buttonText}>Start Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const Board = ({
  board,
  onPress,
  winningCombo,
}: {
  board: (string | null)[];
  onPress: (index: number) => void;
  winningCombo: number[] | null;
}) => (
  <View style={styles.board}>
    {board.map((val, i) => (
      <TouchableOpacity
        key={i}
        style={[
          styles.cell,
          winningCombo?.includes(i) && styles.winningCell,
          val && styles.filledCell,
        ]}
        onPress={() => onPress(i)}
      >
        <Text style={[styles.cellText, val === 'X' ? styles.xText : styles.oText]}>
          {val}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const GameScreen = ({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Game'>) => {
  const { playerX = 'Player X', playerO = 'Player O' } = route.params || {};
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);

  const handlePress = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);

    const res = calculateWinner(newBoard);
    if (res) {
      const [winSymbol, combo] = res;
      const winName = winSymbol === 'X' ? playerX : playerO;
      setWinner(winName);
      setWinningCombo(combo);
      Alert.alert('Game Over', `${winName} wins`);
      saveGame(newBoard, `${winName} wins`);
    } else if (newBoard.every(Boolean)) {
      setWinner('Draw');
      Alert.alert('Game Over', 'Draw');
      saveGame(newBoard, 'Draw');
    }
  };

  const saveGame = async (boardState: (string | null)[], result: string) => {
    try {
      const game = {
        board: boardState,
        result,
        players: { X: playerX, O: playerO },
        timestamp: Date.now(),
      };
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const games = data ? JSON.parse(data) : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([game, ...games]));
    } catch {
      Alert.alert('Error', 'Failed to save the game.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tic Tac Toe</Text>
      <Board board={board} onPress={handlePress} winningCombo={winningCombo} />
      <Text style={styles.status}>
        {winner ? `Winner: ${winner}` : `Next: ${xIsNext ? playerX + ' (X)' : playerO + ' (O)'}`}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setBoard(Array(9).fill(null));
          setWinner(null);
          setWinningCombo(null);
          setXIsNext(true);
        }}
      >
        <Text style={styles.buttonText}>Restart</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.orange]}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>View History</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.purple]}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.buttonText}>Change Player Names</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const HistoryScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'History'>) => {
  const [games, setGames] = useState<any[]>([]);
  const isFocused = useIsFocused();

  const loadGames = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      setGames(data ? JSON.parse(data) : []);
    } catch {
      Alert.alert('Error', 'Failed to load game history.');
    }
  };

  useEffect(() => {
    if (isFocused) loadGames();
  }, [isFocused]);

  const deleteGame = (timestamp: number) => {
    Alert.alert('Confirm Deletion', 'Delete this game from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteGame(timestamp) },
    ]);
  };

  const handleDeleteGame = async (timestamp: number) => {
    try {
      const filtered = games.filter((g) => g.timestamp !== timestamp);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setGames(filtered);
      Alert.alert('Deleted', 'Game record has been removed.');
    } catch {
      Alert.alert('Error', 'Failed to delete the game record.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setGames([]);
      Alert.alert('Success', 'All history has been deleted.');
    } catch {
      Alert.alert('Error', 'Failed to delete history.');
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete all game history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: handleDeleteAll },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 10 }]}>Game History</Text>
      <FlatList
        data={games}
        keyExtractor={(item) => item.timestamp.toString()}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={{ flex: 1 }}>
              {item.result} – {item.players.X} vs {item.players.O}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteGame(item.timestamp)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <TouchableOpacity style={[styles.button, styles.red]} onPress={confirmDeleteAll}>
          <Text style={styles.buttonText}>Delete All History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.purple, { marginTop: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// ------------------- Utility -------------------

const calculateWinner = (b: (string | null)[]): [string, number[]] | null => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let [a, b1, c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return [b[a]!, [a, b1, c]];
  }
  return null;
};

// ------------------- App Entry -------------------

const App = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Title" component={TitleScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>

);

export default App;

// ------------------- Styles -------------------

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
    marginBottom: 20,
  },
  titleBig: {
    fontSize: 48,
    fontWeight: '800',
    color: '#3366FF',
    marginBottom: 40,
    textShadowColor: '#DDD',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
  input: {
    width: '85%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  board: {
    width: 310,
    height: 310,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 20,
    elevation: 4,
  },
  cell: {
    width: 103,
    height: 103,
    borderWidth: 0.5,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCell: {
    backgroundColor: '#F1F5F9',
  },
  winningCell: {
    backgroundColor: '#C7F9CC',
  },
  cellText: {
    fontSize: 38,
    fontWeight: '800',
  },
  xText: {
    color: '#2563EB',
  },
  oText: {
    color: '#EF4444',
  },
  status: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginVertical: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginVertical: 6,
    elevation: 2,
  },
  buttonGreen: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  orange: {
    backgroundColor: '#F59E0B',
  },
  purple: {
    backgroundColor: '#8B5CF6',
  },
  red: {
    backgroundColor: '#EF4444',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginVertical: 6,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
