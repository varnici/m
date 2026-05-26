/**
 * Notifications Handler for Budget_Best
 * Handles daily reminders and push notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { budgetBestApi } from './budgetBestApi';

const NOTIFICATION_TASK_NAME = 'BUDGET_BEST_REMINDER_TASK';
const DAILY_REMINDER_KEY = 'BUDGET_BEST_DAILY_REMINDERS';

const notificationUnavailable = () => {
  console.log('expo-notifications not installed; using in-app reminders only');
};

// Configure notification behavior
export function configureNotifications() {
  notificationUnavailable();
  return { remove: () => {} };
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission() {
  notificationUnavailable();
  return false;
}

/**
 * Schedule a daily reminder notification
 * @param goalId Goal ID
 * @param goalName Goal name
 * @param reminderTime Time in HH:MM format
 */
export async function scheduleDailyReminder(
  goalId: string,
  goalName: string,
  reminderTime: string
) {
  try {
    const [hours, minutes] = reminderTime.split(':').map(Number);

    // Create trigger for daily notification
    const trigger = {
      hour: hours,
      minute: minutes,
      repeats: true,
    };

    const notificationId = `local-${goalId}-${hours}-${minutes}`;

    // Store reminder mapping
    const reminders = await getStoredReminders();
    reminders[goalId] = {
      notificationId,
      goalName,
      reminderTime,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      DAILY_REMINDER_KEY,
      JSON.stringify(reminders)
    );

    return notificationId;
  } catch (err) {
    console.error('Error scheduling reminder:', err);
    throw err;
  }
}

/**
 * Cancel a reminder
 * @param goalId Goal ID
 */
export async function cancelReminder(goalId: string) {
  try {
    const reminders = await getStoredReminders();
    const reminder = reminders[goalId];

    if (reminder) {
      delete reminders[goalId];
      await AsyncStorage.setItem(
        DAILY_REMINDER_KEY,
        JSON.stringify(reminders)
      );
    }
  } catch (err) {
    console.error('Error canceling reminder:', err);
  }
}

/**
 * Get all stored reminders
 */
export async function getStoredReminders() {
  try {
    const stored = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Error getting stored reminders:', err);
    return {};
  }
}

/**
 * Update all reminders from backend
 */
export async function syncRemindersWithBackend() {
  try {
    // Get all goals with reminders enabled
    const goals = await budgetBestApi.listGoals(true);

    const reminders = await getStoredReminders();

    for (const goal of goals) {
      // TODO: Fetch reminder settings from backend
      // const reminder = await budgetBestApi.getReminder(goal.id);
      // if (reminder.reminder_enabled) {
      //   await scheduleDailyReminder(goal.id, goal.goal_name, reminder.reminder_time);
      // } else {
      //   await cancelReminder(goal.id);
      // }
    }
  } catch (err) {
    console.error('Error syncing reminders:', err);
  }
}

/**
 * Send immediate notification (for testing)
 */
export async function sendTestNotification() {
  notificationUnavailable();
}

/**
 * Handle milestone notifications
 * @param goalId Goal ID
 * @param milestone Milestone (e.g., "halfway", "goal_reached")
 * @param amount Amount saved
 * @param target Target amount
 */
export async function notifyMilestone(
  goalId: string,
  milestone: 'halfway' | 'goal_reached' | 'streaks' | 'tier_up',
  amount: number,
  target?: number
) {
  const messages = {
    halfway: `🎯 You're halfway there! ₦${amount.toLocaleString()} saved.`,
    goal_reached: `🎉 Goal completed! You saved ₦${amount.toLocaleString()}.`,
    streaks: `🔥 ${amount} day streak! Keep going!`,
    tier_up: `⬆️ Tier promoted! You reached ${target} tier.`,
  };

  console.log('Milestone notification:', { goalId, message: messages[milestone] });
}

/**
 * Register background task for scheduled reminders
 */
/**
 * Start background task for reminders
 */
export async function startBackgroundReminders() {
  notificationUnavailable();
}

/**
 * Stop background task
 */
export async function stopBackgroundReminders() {
  notificationUnavailable();
}

/**
 * Clear all reminders
 */
export async function clearAllReminders() {
  try {
    await AsyncStorage.removeItem(DAILY_REMINDER_KEY);
  } catch (err) {
    console.error('Error clearing reminders:', err);
  }
}

export default {
  configureNotifications,
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelReminder,
  getStoredReminders,
  syncRemindersWithBackend,
  sendTestNotification,
  notifyMilestone,
  startBackgroundReminders,
  stopBackgroundReminders,
  clearAllReminders,
};
