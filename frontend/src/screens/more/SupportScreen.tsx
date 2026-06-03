import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Send,
  MessageSquare,
  Bot,
  User,
  HelpCircle,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

type Message = {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
};

type FAQ = {
  question: string;
  answer: string;
};

const SUGGESTED_FAQS: FAQ[] = [
  {
    question: 'How do I raise my Trust Score?',
    answer: 'You can increase your Trust Score by maintaining a high sales record, paying your loans back on time, completing KYC steps, and participating consistently in Cluster Group Buys.',
  },
  {
    question: 'Where is my cluster pickup point?',
    answer: 'Your cluster pickup point is determined by your LGA location. You can view the live coordinate handshake map in the "Logistics" tab of the dashboard.',
  },
  {
    question: 'My wallet is frozen, what should I do?',
    answer: 'Wallets are auto-frozen if there is a pending escrow verification or an overdue loan repayment. Once cleared, your wallet will unfreeze automatically.',
  },
  {
    question: 'How do I link a bank account?',
    answer: 'Go to Settings -> Business Profile -> Payment Methods. There, you can input your NUBAN account details and trigger instant BVN-name matching verification.',
  },
];

const SupportScreen = ({ navigation }: RootStackScreenProps<'Support'>) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I am your VentureRoot Business Assistant. How can I help you grow your retail business today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const simulateBotResponse = (userQuery: string) => {
    setIsTyping(true);
    setTimeout(() => {
      let botAnswer = "Thank you for reaching out! A VentureRoot customer success agent has been alerted and will respond shortly.";
      
      const matchedFaq = SUGGESTED_FAQS.find(faq =>
        userQuery.toLowerCase().includes(faq.question.toLowerCase()) ||
        faq.question.toLowerCase().includes(userQuery.toLowerCase()) ||
        userQuery.toLowerCase().split(' ').some(word => word.length > 3 && faq.question.toLowerCase().includes(word))
      );

      if (matchedFaq) {
        botAnswer = matchedFaq.answer;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: botAnswer,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1200);
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    simulateBotResponse(text);
  };

  const handleCreateTicket = () => {
    const ticketId = `VR-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketCreated(ticketId);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `🎫 Ticket ${ticketId} has been successfully created. Our support team will get in touch with you at your registered phone number.`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isBot = item.sender === 'bot';
    return (
      <View className={`flex-row mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && (
          <View className="w-8 h-8 rounded-full bg-ventureroot-green/10 items-center justify-center mr-2 self-end">
            <Bot size={16} color="#059669" />
          </View>
        )}
        <View
          style={{ maxWidth: '75%' }}
          className={`rounded-2xl px-4 py-3 ${
            isBot
              ? 'bg-slate-100 rounded-bl-none text-slate-800'
              : 'bg-ventureroot-green rounded-br-none text-white'
          }`}
        >
          <Text className={`text-sm ${isBot ? 'text-slate-800' : 'text-white'}`}>
            {item.text}
          </Text>
          <Text
            className={`text-[9px] mt-1 self-end ${
              isBot ? 'text-slate-400' : 'text-emerald-200/70'
            }`}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!isBot && (
          <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center ml-2 self-end">
            <User size={16} color="#475569" />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-slate-900 font-extrabold text-base">Support Assistant</Text>
            <Text className="text-emerald-600 text-xs font-semibold">🟢 Live Help Center</Text>
          </View>
          <TouchableOpacity
            onPress={handleCreateTicket}
            className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100"
          >
            <FileText size={14} color="#059669" />
            <Text className="text-emerald-700 text-[10px] font-bold ml-1">Create Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => (
              <>
                {isTyping && (
                  <View className="flex-row mb-4 justify-start items-center">
                    <View className="w-8 h-8 rounded-full bg-ventureroot-green/10 items-center justify-center mr-2">
                      <Bot size={16} color="#059669" />
                    </View>
                    <View className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-3 flex-row items-center">
                      <ActivityIndicator size="small" color="#059669" />
                      <Text className="text-xs text-slate-400 ml-2">Typing...</Text>
                    </View>
                  </View>
                )}
                
                {/* suggested FAQs list */}
                {messages.length === 1 && (
                  <View className="mt-4">
                    <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      Suggested Questions
                    </Text>
                    <View className="gap-2">
                      {SUGGESTED_FAQS.map((faq, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleSend(faq.question)}
                          className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1 mr-2">
                            <HelpCircle size={16} color="#059669" className="mr-2" />
                            <Text className="text-slate-700 text-xs font-semibold flex-1">
                              {faq.question}
                            </Text>
                          </View>
                          <ChevronLeft size={16} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          />

          {/* Bottom input area */}
          <View className="p-3 border-t border-slate-100 bg-white flex-row items-center gap-2">
            <TextInput
              placeholder="Ask support anything..."
              value={input}
              onChangeText={setInput}
              className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-slate-800 text-sm"
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              className="w-11 h-11 rounded-2xl bg-ventureroot-green items-center justify-center shadow-md shadow-emerald-700/20"
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default SupportScreen;
