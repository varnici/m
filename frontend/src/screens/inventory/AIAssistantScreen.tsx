// @ts-nocheck
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Bot, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { ragService, RagCitation } from '@/services/ragService';
import type { RootStackScreenProps } from '@/navigation/types';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  citations?: RagCitation[];
}

const AIAssistantScreen = ({ navigation }: RootStackScreenProps<'AIAssistant'>) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'system-1',
      role: 'assistant',
      text: 'Hello! I am your VentureRoot assistant. Ask me anything about inventory, sales, suppliers, or business operations.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const addMessage = (message: AssistantMessage) => {
    setMessages((prev) => [...prev, message]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    addMessage(userMessage);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const response = await ragService.chat(user.id, trimmed, user.id);
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.answer || 'I could not find an answer. Please try a different question.',
        citations: response.citations,
      };
      addMessage(assistantMessage);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to the AI assistant.');
      const errorMessage: AssistantMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, I could not reach the assistant. Please try again in a moment.',
      };
      addMessage(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <View className="flex-1 px-2">
          <Text className="text-white text-base font-black">AI Assistant</Text>
          <Text className="text-slate-400 text-xs">Get business answers from the RAG agent.</Text>
        </View>
        <View className="w-10 h-10 rounded-2xl bg-emerald-600/15 items-center justify-center">
          <Bot size={20} color="#34D399" />
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            className={`mb-4 rounded-3xl p-4 ${
              message.role === 'user' ? 'bg-emerald-500/10 self-end' : 'bg-white/5 self-start'
            }`}
            style={{ maxWidth: '85%' }}
          >
            <Text className={`text-sm ${message.role === 'user' ? 'text-emerald-100' : 'text-white'}`}>
              {message.text}
            </Text>
            {message.citations?.length ? (
              <View className="mt-3 space-y-2">
                {message.citations.map((cite, index) => (
                  <View key={`${message.id}-cite-${index}`} className="rounded-2xl bg-slate-800/80 p-3">
                    <Text className="text-slate-300 text-[11px] uppercase tracking-[1px] font-bold mb-1">Citation</Text>
                    <Text className="text-slate-200 text-xs">{cite.title}</Text>
                    <Text className="text-slate-400 text-[10px] mt-1">{cite.excerpt}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        {isSending && (
          <View className="items-center justify-center py-6">
            <ActivityIndicator size="small" color="#34D399" />
            <Text className="text-slate-400 text-xs mt-2">Talking to the assistant...</Text>
          </View>
        )}

        {error ? (
          <View className="rounded-3xl bg-red-500/10 border border-red-500/20 p-4 mt-2">
            <Text className="text-red-200 text-xs">{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center border-t border-white/10 bg-slate-950 px-4 py-3">
          <View className="flex-1 mr-3 rounded-3xl bg-slate-900 px-4 py-3">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about sales, stock or suppliers..."
              placeholderTextColor="#94A3B8"
              multiline
              style={{ color: 'white', minHeight: 40, maxHeight: 120 }}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            className="rounded-full bg-emerald-500 p-3"
            onPress={handleSend}
            disabled={isSending || !input.trim()}
          >
            {isSending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AIAssistantScreen;
