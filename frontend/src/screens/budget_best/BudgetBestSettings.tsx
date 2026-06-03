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
import { X, Clock, Bell, Zap, CheckCircle2 } from 'lucide-react-native';
import {
  createReminder,
  updateReminder,
  getReminderForGoal,
  getAutoSweepForGoal,
  createAutoSweep,
  updateAutoSweep,
} from '@/services/budgetBestApi';
import { useBudgetBestGoals } from '@/hooks/useBudgetBest';

interface ReminderSetting {
  id?: string;
  goalId: string;
  reminderTime: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
}

interface AutoSaveSetting {
  id?: string;
  goalId: string;
  enabled: boolean;
  amount: string;
  time: string;
}

const BudgetBestSettings = ({ navigation }: any) => {
  const notificationsSupported = false;
  const { goals, loading: goalsLoading } = useBudgetBestGoals(true);

  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [autoSaves, setAutoSaves] = useState<AutoSaveSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Request notification permissions
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!goals.length) return;

    const loadGoalSettings = async () => {
      setSettingsLoading(true);
      try {
        const loadedReminders = await Promise.all(
          goals.map(async (goal) => {
            try {
              const r = await getReminderForGoal(goal.id);
              if (r) {
                const timeParts = r.reminder_time.split(':');
                const timeHHMM = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : '08:00';
                return {
                  id: r.id,
                  goalId: goal.id,
                  reminderTime: timeHHMM,
                  enabled: r.reminder_enabled,
                  frequency: r.reminder_frequency,
                };
              }
            } catch (err) {
              console.error(`Error loading reminder for goal ${goal.id}:`, err);
            }
            return {
              goalId: goal.id,
              reminderTime: '08:00',
              enabled: false,
              frequency: 'daily' as const,
            };
          })
        );
        setReminders(loadedReminders);

        const loadedAutoSaves = await Promise.all(
          goals.map(async (goal) => {
            try {
              const s = await getAutoSweepForGoal(goal.id);
              if (s) {
                const timeParts = s.auto_save_time.split(':');
                const timeHHMM = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : '08:00';
                return {
                  id: s.id,
                  goalId: goal.id,
                  enabled: s.auto_save_enabled,
                  amount: String(s.auto_save_amount),
                  time: timeHHMM,
                };
              }
            } catch (err) {
              console.error(`Error loading auto sweep for goal ${goal.id}:`, err);
            }
            return {
              goalId: goal.id,
              enabled: false,
              amount: '500',
              time: '08:00',
            };
          })
        );
        setAutoSaves(loadedAutoSaves);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadGoalSettings();
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
    setReminders((prev) =>
      prev.map((r) => (r.goalId === goalId ? { ...r, enabled } : r))
    );

    if (enabled) {
      const reminder = reminders.find((r) => r.goalId === goalId);
      if (reminder) {
        await scheduleReminder(goalId, reminder.reminderTime);
      }
    }
  };

  const handleUpdateReminderTime = (goalId: string, time: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.goalId === goalId ? { ...r, reminderTime: time } : r))
    );
  };

  const handleToggleAutoSave = (goalId: string, enabled: boolean) => {
    setAutoSaves((prev) =>
      prev.map((s) => (s.goalId === goalId ? { ...s, enabled } : s))
    );
  };

  const handleUpdateAutoSaveAmount = (goalId: string, amount: string) => {
    setAutoSaves((prev) =>
      prev.map((s) => (s.goalId === goalId ? { ...s, amount } : s))
    );
  };

  const handleUpdateAutoSaveTime = (goalId: string, time: string) => {
    setAutoSaves((prev) =>
      prev.map((s) => (s.goalId === goalId ? { ...s, time } : s))
    );
  };

  const scheduleReminder = async (goalId: string, time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;
      const now = new Date();
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

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

  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await Promise.all([
        ...reminders.map(async (reminder) => {
          if (reminder.enabled) {
            if (reminder.id) {
              await updateReminder(reminder.id, {
                reminder_enabled: true,
                reminder_time: `${reminder.reminderTime}:00`,
                reminder_frequency: reminder.frequency,
              });
            } else {
              const res = await createReminder({
                goal_id: reminder.goalId,
                reminder_time: `${reminder.reminderTime}:00`,
                reminder_frequency: reminder.frequency,
                reminder_enabled: true,
              });
              reminder.id = res.id;
            }
            await scheduleReminder(reminder.goalId, reminder.reminderTime);
          } else {
            if (reminder.id) {
              await updateReminder(reminder.id, {
                reminder_enabled: false,
              });
            }
          }
        }),
        ...autoSaves.map(async (autoSave) => {
          const numericAmount = Number(autoSave.amount);
          if (isNaN(numericAmount) || numericAmount < 0) {
            throw new Error(`Invalid auto-save amount for goal`);
          }

          if (autoSave.enabled) {
            if (autoSave.id) {
              await updateAutoSweep(autoSave.id, {
                auto_save_enabled: true,
                auto_save_amount: numericAmount,
                auto_save_time: `${autoSave.time}:00`,
              });
            } else {
              const res = await createAutoSweep({
                goal_id: autoSave.goalId,
                auto_save_enabled: true,
                auto_save_amount: numericAmount,
                auto_save_time: `${autoSave.time}:00`,
                payment_method: 'wallet',
              });
              autoSave.id = res.id;
            }
          } else {
            if (autoSave.id) {
              await updateAutoSweep(autoSave.id, {
                auto_save_enabled: false,
              });
            }
          }
        })
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
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
          {goalsLoading || settingsLoading ? (
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
                    {goal?.title || goal?.goal_name}
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
            <Text className="text-white text-lg font-bold">Auto-Save (Sweeps)</Text>
          </View>

          <Text className="text-white/60 text-sm mb-4">
            Automatically sweep daily savings from your wallet to specific goals.
          </Text>

          {/* Auto-Save Goal List */}
          {goalsLoading || settingsLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : autoSaves.map((autoSave) => {
            const goal = goals.find((g) => g.id === autoSave.goalId);
            return (
              <View
                key={autoSave.goalId}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold">
                    {goal?.title || goal?.goal_name}
                  </Text>
                  <Switch
                    value={autoSave.enabled}
                    onValueChange={(enabled) =>
                      handleToggleAutoSave(autoSave.goalId, enabled)
                    }
                    trackColor={{ false: '#374151', true: '#F97316' }}
                    thumbColor={autoSave.enabled ? '#fff' : '#9CA3AF'}
                  />
                </View>

                {autoSave.enabled && (
                  <View className="space-y-2 mt-2">
                    <View className="flex-row items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <Text className="text-white/60 text-xs font-semibold mr-1">AMOUNT (₦)</Text>
                      <TextInput
                        value={autoSave.amount}
                        onChangeText={(text) =>
                          handleUpdateAutoSaveAmount(autoSave.goalId, text)
                        }
                        placeholder="500"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        className="flex-1 text-white text-sm"
                      />
                    </View>
                    <View className="flex-row items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <Clock size={16} color="#F97316" />
                      <Text className="text-white/60 text-xs font-semibold mr-1">SWEEP TIME</Text>
                      <TextInput
                        value={autoSave.time}
                        onChangeText={(text) =>
                          handleUpdateAutoSaveTime(autoSave.goalId, text)
                        }
                        placeholder="08:00"
                        placeholderTextColor="#666"
                        className="flex-1 text-white text-sm font-mono"
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
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
        <View className="mb-12">
          {saveSuccess && (
            <View className="flex-row items-center justify-center gap-2 mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg py-3 px-4">
              <CheckCircle2 size={18} color="#10B981" />
              <Text className="text-emerald-400 text-sm font-semibold">Changes saved successfully to database!</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleSaveChanges}
            disabled={saving}
            className={`bg-emerald-500 rounded-lg py-4 flex-row items-center justify-center ${saving ? 'opacity-70' : ''}`}
          >
            {saving ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : null}
            <Text className="text-white text-center font-bold text-lg">
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetBestSettings;
