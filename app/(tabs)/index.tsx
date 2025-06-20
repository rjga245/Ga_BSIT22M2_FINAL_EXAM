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
  SafeAreaView,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ------------------- Types -------------------

type PlayerRoute = {
  playerX: string;
  playerO: string;
  firstPlayer: 'X' | 'O';
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
  <SafeAreaView style={styles.centered}>
    <Text style={styles.titleBig}>Ascylla</Text>
    <Text style={styles.subtitle}>A Tic Tac Toe game</Text>
    <TouchableOpacity
      style={styles.buttonGreen}
      onPress={() => navigation.navigate('Home')}
    >
      <Text style={styles.buttonText}>Enter Players</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const HomeScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) => {
  const [playerX, setPlayerX] = useState('');
  const [playerO, setPlayerO] = useState('');
  const [firstPlayer, setFirstPlayer] = useState<'X' | 'O' | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPlayerX('');
      setPlayerO('');
      setFirstPlayer(null);
    }, [])
  );

const startGame = () => {
  const trimmedX = playerX.trim();
  const trimmedO = playerO.trim();

  if (!trimmedX || !trimmedO) {
    Alert.alert('Error', 'Enter both names');
    return;
  }

  if (!firstPlayer) {
    Alert.alert('Error', 'Select who goes first');
    return;
  }

  navigation.navigate('Game', {
    playerX: trimmedX,
    playerO: trimmedO,
    firstPlayer,
  });
};


  return (
    <SafeAreaView style={styles.container}>
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

      <Text style={{ fontSize: 16, marginBottom: 8, color: '#374151' }}>
        Who will be the first to take the turn?
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {['X', 'O'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.firstPlayerButton,
              firstPlayer === p && styles.firstPlayerSelected,
            ]}
            onPress={() => setFirstPlayer(p as 'X' | 'O')}
          >
            <Text style={styles.firstPlayerButtonText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={startGame}>
        <Text style={styles.buttonText}>Start Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.orange]}
        onPress={() => navigation.navigate('History')}
>
        <Text style={styles.buttonText}>Game History</Text>
      </TouchableOpacity>
      
      {/* New "Return to Title Screen" Button */}
      <TouchableOpacity
        style={[styles.button, styles.purple]}
        onPress={() => navigation.navigate('Title')}
      >
        <Text style={styles.buttonText}>Return to Title Screen</Text>
      </TouchableOpacity>
    </SafeAreaView>
    
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

const GameScreen = ({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) => {
  const { playerX, playerO, firstPlayer } = route.params;
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(firstPlayer === 'X');
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
    const trimmedX = playerX.trim();
    const trimmedO = playerO.trim();

    const game = {
      board: boardState,
      result,
      players: { X: trimmedX, O: trimmedO },
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
        {winner
          ? `Winner: ${winner}`
          : `Next turn: ${xIsNext ? playerX + ' (X)' : playerO + ' (O)'}`}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setBoard(Array(9).fill(null));
          setWinner(null);
          setWinningCombo(null);
          setXIsNext(firstPlayer === 'X');
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
        <Text style={styles.buttonText}>Change Players</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const HistoryScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'History'>) => {
  const [games, setGames] = useState<any[]>([]);
  const isFocused = useIsFocused();
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editedTitleText, setEditedTitleText] = useState('');


  const loadGames = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      setGames(parsed);
    } catch {
      Alert.alert('Error', 'Failed to load game history.');
    }
  };

  useEffect(() => {
    if (isFocused) loadGames();
  }, [isFocused]);

  const deleteGame = (timestamp: number) => {
    Alert.alert('Confirm Deletion', 'Delete this game record from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteGame(timestamp) },
    ]);
  };

  const handleDeleteGame = async (timestamp: number) => {
    try {
      const filtered = games.filter((g) => g.timestamp !== timestamp);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setGames(filtered);
    } catch {
      Alert.alert('Error', 'Failed to delete the game record.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setGames([]);
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
const handleSaveEditTitle = async (oldTitle: string) => {
  const trimmedNew = editedTitleText.trim();

  if (!trimmedNew) {
    Alert.alert('Error', 'Title cannot be empty');
    return;
  }

  if (groupGamesByPlayers().some((group) => group.title === trimmedNew && group.title !== oldTitle)) {
    Alert.alert('Error', 'Cannot have duplicate titles');
    return;
  }

  const [xNameOld, oNameOld] = oldTitle.split(' vs ');
  const [xNameNew, oNameNew] = trimmedNew.split(' vs ');

  if (!xNameNew || !oNameNew) {
    Alert.alert('Error', 'Title must follow format "PlayerX vs PlayerO"');
    return;
  }

  const updatedGames = games.map((game) => {
    if (game.players.X.trim() === xNameOld && game.players.O.trim() === oNameOld) {
      return {
        ...game,
        players: { X: xNameNew.trim(), O: oNameNew.trim() },
      };
    }
    return game;
  });

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGames));
    setGames(updatedGames);
    setEditingTitle(null);
    setEditedTitleText('');
  } catch {
    Alert.alert('Error', 'Failed to update titles');
  }
};

const groupGamesByPlayers = () => {
  const groups: Record<string, any[]> = {};

  for (let game of games) {
    const X = game.players.X.trim();
    const O = game.players.O.trim();
    const key = `${X} vs ${O}`;
    
    if (!groups[key]) groups[key] = [];

    // Use normalized names inside the game record too
    groups[key].push({
      ...game,
      players: { X, O },
    });
  }

  return Object.entries(groups).map(([title, data]) => {
    let xWins = 0;
    let oWins = 0;
    let draws = 0;

    const numberedData = data.map((game, index) => {
      if (game.result === `${game.players.X} wins`) xWins++;
      else if (game.result === `${game.players.O} wins`) oWins++;
      else draws++;

      return {
        ...game,
        gameNumber: `Game ${index + 1}`,
      };
    });

    return {
      title,
      data: numberedData,
      stats: {
        [data[0].players.X]: xWins,
        [data[0].players.O]: oWins,
        Draws: draws,
      },
    };
  });
};



  const sections = groupGamesByPlayers();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 32 }]}>Game History</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.timestamp.toString()}
renderSectionHeader={({ section: { title, stats } }) => {
  const isEditing = editingTitle === title;

  return (
    <View style={{ backgroundColor: '#E5E7EB', padding: 12, marginTop: 12 }}>
      {isEditing ? (
        <>
          <TextInput
            value={editedTitleText}
            onChangeText={setEditedTitleText}
            style={[styles.input, { marginBottom: 8, fontSize: 18 }]}
            placeholder="Enter new title"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleSaveEditTitle(title)}
            >
              <Text style={styles.editActionText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingTitle(null);
                setEditedTitleText('');
              }}
            >
              <Text style={styles.editActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
          {Object.entries(stats).map(([player, count]) => (
            <Text key={player} style={{ fontSize: 14, color: '#374151' }}>
              {player}: {count} {player === 'Draws' ? `draw${count !== 1 ? 's' : ''}` : `win${count !== 1 ? 's' : ''}`}
            </Text>
          ))}
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 6, alignSelf: 'flex-start' }]}
            onPress={() => {
              setEditingTitle(title);
              setEditedTitleText(title);
            }}
          >
            <Text style={styles.editActionText}>Edit Title</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}}

        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={{ flex: 1 }}>
              {item.gameNumber} – {item.result}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteGame(item.timestamp)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
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
    </SafeAreaView>
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
  <>
    <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Title" component={TitleScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  </>
);

export default App;

// ------------------- Styles -------------------

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F0F4F8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  titleBig: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 32,
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  board: {
    width: 312,
    height: 312,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  cell: {
    width: 104,
    height: 104,
    borderWidth: 0.75,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCell: {
    backgroundColor: '#E5E7EB',
  },
  winningCell: {
    backgroundColor: '#BBF7D0',
  },
  cellText: {
    fontSize: 40,
    fontWeight: '800',
  },
  xText: {
    color: '#1D4ED8',
  },
  oText: {
    color: '#DC2626',
  },
  status: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginVertical: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginVertical: 6,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonGreen: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
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
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 10,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  firstPlayerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
  },
  firstPlayerSelected: {
    backgroundColor: '#E3963E',
    borderColor: '#2563EB',
  },
  firstPlayerButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  saveButton: {
    backgroundColor: '#10B981', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  cancelButton: {
    backgroundColor: '#6B7280', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  editButton: {
    backgroundColor: '#3B82F6', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  editActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
