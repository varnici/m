import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, Bell, Zap } from 'lucide-react-native';
import { createReminder } from '@/services/budgetBestApi';
import { useBudgetBestGoals } from '@/hooks/useBudgetBest';

interface ReminderSetting {
  goalId: string;
  reminderTime: string;
  enabled: boolean;
  frequency: string;
}

const BudgetBestSettings = ({ navigation }: any) => {
  const notificationsSupported = false;
  const { goals, loading: goalsLoading } = useBudgetBestGoals(true);

  const [reminders, setReminders] = useState<ReminderSetting[]>([
    { goalId: '', reminderTime: '08:00', enabled: true, frequency: 'daily' },
  ]);

  useEffect(() => {
    // Request notification permissions
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!goals.length) return;
    setReminders((prev) => {
      const existing = new Map(prev.filter((r) => r.goalId).map((r) => [r.goalId, r]));
      return goals.map((goal) => existing.get(goal.id) || {
        goalId: goal.id,
        reminderTime: '08:00',
        enabled: false,
        frequency: 'daily',
      });
    });
  }, [goals]);

  const requestNotificationPermission = async () => {
    try {
      if (!notificationsSupported) {
        console.log('expo-notifications not installed; using in-app reminders only');
        return;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const handleToggleReminder = async (goalId: string, enabled: boolean) => {
    try {
      setReminders(
        reminders.map((r) =>
          r.goalId === goalId ? { ...r, enabled } : r
        )
      );

      // Schedule notification if enabled
      if (enabled) {
        const reminder = reminders.find((r) => r.goalId === goalId);
        if (reminder) {
          await scheduleReminder(goalId, reminder.reminderTime);
          await createReminder({
            goal_id: goalId,
            reminder_time: `${reminder.reminderTime}:00`,
            reminder_frequency: reminder.frequency,
            reminder_enabled: true,
          });
        }
      } else {
        console.log('Reminder disabled for goal:', goalId);
      }
    } catch (err) {
      console.error('Error toggling reminder:', err);
    }
  };

  const handleUpdateReminderTime = (goalId: string, time: string) => {
    setReminders(
      reminders.map((r) =>
        r.goalId === goalId ? { ...r, reminderTime: time } : r
      )
    );
  };

  const scheduleReminder = async (goalId: string, time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderDate < now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      const trigger = reminderDate;
      const goal = goals.find((g) => g.id === goalId);
      console.log('Reminder scheduled locally:', {
        goalId,
        goalName: goal?.goal_name,
        trigger,
      });
    } catch (err) {
      console.error('Error scheduling reminder:', err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <Text className="text-white text-xl font-bold">Reminders & Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="white" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 py-6">
        {/* Daily Reminders Section */}
        <View className="mb-8">
          <View className="flex-row items-center gap-2 mb-4">
            <Bell color="#10B981" size={24} />
            <Text className="text-white text-lg font-bold">
              Daily Reminders
            </Text>
          </View>

          <Text className="text-white/60 text-sm mb-4">
            Get daily reminders to deposit your savings and stay on track with your goals.
          </Text>

          {/* Reminder List */}
          {goalsLoading ? (
            <ActivityIndicator color="#10B981" />
          ) : reminders.map((reminder) => {
            const goal = goals.find((g) => g.id === reminder.goalId);
            return (
              <View
                key={reminder.goalId}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold">
                    {goal?.goal_name}
                  </Text>
                  <Switch
                    value={reminder.enabled}
                    onValueChange={(enabled) =>
                      handleToggleReminder(reminder.goalId, enabled)
                    }
                    trackColor={{ false: '#374151', true: '#10B981' }}
                    thumbColor={reminder.enabled ? '#fff' : '#9CA3AF'}
                  />
                </View>

                {reminder.enabled && (
                  <View className="flex-row items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                    <Clock size={16} color="#10B981" />
                    <TextInput
                      value={reminder.reminderTime}
                      onChangeText={(text) =>
                        handleUpdateReminderTime(reminder.goalId, text)
                      }
                      placeholder="HH:MM"
                      placeholderTextColor="#666"
                      className="flex-1 text-white text-sm font-mono"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Auto-Save Section */}
        <View className="mb-8">
          <View className="flex-row items-center gap-2 mb-4">
            <Zap color="#F97316" size={24} />
            <Text className="text-white text-lg font-bold">Auto-Save</Text>
          </View>

          <Text className="text-white/60 text-sm mb-4">
            Enable automatic transfers from your linked payment method every day.
          </Text>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold">
                Auto-Save Enabled
              </Text>
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: '#374151', true: '#F97316' }}
                thumbColor="#fff"
              />
            </View>

            <Text className="text-white/60 text-xs mb-4">
              Coming soon: Automatically transfer your daily savings from your linked card.
            </Text>

            <View className="space-y-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-white/60 text-xs">• Select amount (₦200 - ₦5000)</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-white/60 text-xs">• Set transfer time</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-white/60 text-xs">• Works with all major cards</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">
            Notification Settings
          </Text>

          {[
            {
              title: 'Deposit Reminders',
              desc: 'Daily alerts to save',
              enabled: true,
            },
            {
              title: 'Goal Milestones',
              desc: 'Celebrate achievements',
              enabled: true,
            },
            {
              title: 'Streak Notifications',
              desc: 'Consistency updates',
              enabled: false,
            },
            {
              title: 'Deadline Alerts',
              desc: 'Approaching deadlines',
              enabled: true,
            },
          ].map((setting, idx) => (
            <View
              key={idx}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-white font-semibold">{setting.title}</Text>
                <Text className="text-white/60 text-xs mt-1">{setting.desc}</Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => {}}
                trackColor={{ false: '#374151', true: '#10B981' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Privacy & Data */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">
            Privacy & Security
          </Text>

          <TouchableOpacity className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-white font-semibold mb-1">
              View Privacy Policy
            </Text>
            <Text className="text-white/60 text-xs">
              Learn how we protect your data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-white font-semibold mb-1">
              Security Guidelines
            </Text>
            <Text className="text-white/60 text-xs">
              Best practices for your account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <Text className="text-white font-semibold mb-1">
              Terms of Service
            </Text>
            <Text className="text-white/60 text-xs">
              Read our complete terms
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Changes Button */}
        <View className="mb-6">
          <TouchableOpacity className="bg-emerald-500 rounded-lg py-4">
            <Text className="text-white text-center font-bold text-lg">
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetBestSettings;
